using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using PolloCentro.Api.Api.Middleware;
using PolloCentro.Api.Application;
using PolloCentro.Api.Infrastructure;
using PolloCentro.Api.Infrastructure.Seed;

// Licencia Community de QuestPDF (gratuita para empresas pequeñas) para generar PDFs.
QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

var builder = WebApplication.CreateBuilder(args);

// ----------------------------------------------------------------------------
// Servicios (composición de capas)
// ----------------------------------------------------------------------------
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddApplication();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

// CORS: orígenes EXPLÍCITOS y con credenciales (la cookie de auth viaja entre orígenes).
// No se permite AllowAnyOrigin porque es incompatible con AllowCredentials y menos seguro.
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
if (builder.Environment.IsDevelopment())
    allowedOrigins = allowedOrigins
        .Concat(["http://localhost:4200", "http://localhost:4300"])
        .Distinct()
        .ToArray();
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

// Reverse proxy: respeta X-Forwarded-For / -Proto para conocer la IP y el esquema reales
// (necesario para el rate limiting por IP y la redirección a HTTPS detrás de un proxy).
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    // En producción conviene restringir a los proxies/redes conocidos (KnownProxies/KnownNetworks).
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// Rate limiting: protege contra abuso y fuerza bruta.
//  - Global: por IP, un tope por minuto (anti-ráfaga) y un tope diario.
//  - Política "auth": límite estricto para el login (anti fuerza bruta).
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    static string ClientKey(HttpContext ctx) =>
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    options.GlobalLimiter = PartitionedRateLimiter.CreateChained(
        // Tope por minuto: frena ráfagas y ataques de denegación de servicio.
        PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
            RateLimitPartition.GetFixedWindowLimiter(ClientKey(ctx), _ =>
                new FixedWindowRateLimiterOptions { PermitLimit = 200, Window = TimeSpan.FromMinutes(1) })),
        // Tope diario por IP.
        PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
            RateLimitPartition.GetFixedWindowLimiter(ClientKey(ctx), _ =>
                new FixedWindowRateLimiterOptions { PermitLimit = 20000, Window = TimeSpan.FromDays(1) })));

    // Login: máx. 20 intentos por IP cada 15 minutos (anti fuerza bruta, pero
    // tolerante a una oficina con varios empleados detrás de una sola IP/NAT).
    options.AddPolicy("auth", ctx =>
        RateLimitPartition.GetFixedWindowLimiter(ClientKey(ctx), _ =>
            new FixedWindowRateLimiterOptions { PermitLimit = 20, Window = TimeSpan.FromMinutes(15) }));
});

var app = builder.Build();

// ----------------------------------------------------------------------------
// Comandos CLI
// ----------------------------------------------------------------------------
if (args.Length > 0 && args[0] == "seed-admin")
{
    // `dotnet run -- seed-admin` (reemplaza seed-user.js)
    await DatabaseSeeder.SeedAdminAsync(app.Services);
    return;
}
if (args.Length > 0 && args[0] == "db-init")
{
    // `dotnet run -- db-init`: crea tablas faltantes y siembra datos de demostración.
    await DatabaseInitializer.InitializeAsync(app.Services, seedData: true);
    return;
}

// Al arrancar: garantiza que existan las tablas operacionales. Siembra datos
// de demostración solo en Development o si Database:SeedOnStartup está activo.
var seedOnStartup = app.Environment.IsDevelopment()
    || app.Configuration.GetValue<bool>("Database:SeedOnStartup");
await DatabaseInitializer.InitializeAsync(app.Services, seedData: seedOnStartup);

// ----------------------------------------------------------------------------
// Pipeline HTTP
// ----------------------------------------------------------------------------
// Respeta las cabeceras del proxy inverso (debe ir lo más arriba posible).
app.UseForwardedHeaders();

app.UseMiddleware<ExceptionHandlingMiddleware>();

// Producción: fuerza HTTPS y activa HSTS.
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

// Cabeceras de seguridad básicas en todas las respuestas.
app.Use(async (context, next) =>
{
    var headers = context.Response.Headers;
    headers["X-Content-Type-Options"] = "nosniff";
    headers["X-Frame-Options"] = "DENY";
    headers["Referrer-Policy"] = "no-referrer";
    headers["X-XSS-Protection"] = "0";
    await next();
});

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health").AllowAnonymous();

var port = Environment.GetEnvironmentVariable("PORT") ?? "3000";
app.Urls.Add($"http://localhost:{port}");

app.Logger.LogInformation("PolloCentro API escuchando en http://localhost:{Port}", port);
app.Run();

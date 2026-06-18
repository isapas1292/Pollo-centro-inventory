using PolloCentro.Api.Api.Middleware;
using PolloCentro.Api.Application;
using PolloCentro.Api.Infrastructure;
using PolloCentro.Api.Infrastructure.Seed;

var builder = WebApplication.CreateBuilder(args);

// ----------------------------------------------------------------------------
// Servicios (composición de capas)
// ----------------------------------------------------------------------------
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddApplication();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

// CORS: orígenes configurables (Cors:AllowedOrigins). Sin orígenes definidos → abierto.
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
{
    if (allowedOrigins.Length > 0)
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod();
    else
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
}));

var app = builder.Build();

// ----------------------------------------------------------------------------
// Comando CLI: `dotnet run -- seed-admin` (reemplaza seed-user.js)
// ----------------------------------------------------------------------------
if (args.Length > 0 && args[0] == "seed-admin")
{
    await DatabaseSeeder.SeedAdminAsync(app.Services);
    return;
}

// ----------------------------------------------------------------------------
// Pipeline HTTP
// ----------------------------------------------------------------------------
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

var port = Environment.GetEnvironmentVariable("PORT") ?? "3000";
app.Urls.Add($"http://localhost:{port}");

app.Logger.LogInformation("PolloCentro API escuchando en http://localhost:{Port}", port);
app.Run();

using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using PolloCentro.Api.Application.Abstractions.Notifications;
using PolloCentro.Api.Application.Abstractions.Security;
using PolloCentro.Api.Application.Auth;
using PolloCentro.Api.Application.Common.Interfaces;
using PolloCentro.Api.Infrastructure.Notifications;
using PolloCentro.Api.Infrastructure.Persistence;
using PolloCentro.Api.Infrastructure.Security;

namespace PolloCentro.Api.Infrastructure;

public static class DependencyInjection
{
    /// <summary>Registra EF Core, seguridad (JWT + BCrypt), autenticación y health checks.</summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // --- EF Core + SQL Server con resiliencia de conexión ---
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Falta la cadena de conexión 'DefaultConnection'.");

        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(connectionString, sql =>
            {
                sql.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(10), errorNumbersToAdd: null);
                sql.CommandTimeout(30);
            }));

        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<AppDbContext>());

        // --- Seguridad ---
        services.AddOptions<JwtOptions>()
            .Bind(configuration.GetSection(JwtOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddSingleton<IPasswordHasher, BcryptPasswordHasher>();
        services.AddSingleton<IJwtTokenGenerator, JwtTokenGenerator>();

        // --- Notificaciones por WhatsApp (Meta Cloud API) ---
        services.AddOptions<WhatsAppOptions>()
            .Bind(configuration.GetSection(WhatsAppOptions.SectionName));
        services.AddHttpClient<IWhatsAppSender, MetaWhatsAppSender>();

        // --- Autenticación JWT ---
        var jwtSection = configuration.GetSection(JwtOptions.SectionName);
        var secret = jwtSection["Secret"]
            ?? throw new InvalidOperationException("Falta 'Jwt:Secret' en la configuración.");

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwtSection["Issuer"],
                    ValidateAudience = true,
                    ValidAudience = jwtSection["Audience"],
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
                    ClockSkew = TimeSpan.FromMinutes(1)
                };

                // El token se transporta en una cookie HttpOnly (más seguro frente a XSS
                // que localStorage). Si no viene en la cabecera Authorization, se lee de la cookie.
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        if (string.IsNullOrEmpty(context.Token) &&
                            context.Request.Cookies.TryGetValue(AuthCookie.Name, out var cookieToken))
                        {
                            context.Token = cookieToken;
                        }
                        return Task.CompletedTask;
                    }
                };
            });
        // Por defecto, TODOS los endpoints requieren un usuario autenticado.
        // Los endpoints públicos (login, health) se marcan con [AllowAnonymous].
        services.AddAuthorization(options =>
        {
            options.FallbackPolicy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build();
        });

        // --- Health checks (incluye verificación de la base de datos) ---
        services.AddHealthChecks()
            .AddDbContextCheck<AppDbContext>("database");

        return services;
    }
}

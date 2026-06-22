using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using PolloCentro.Api.Application.Abstractions.Security;
using PolloCentro.Api.Domain.Entities;
using PolloCentro.Api.Infrastructure.Persistence;

namespace PolloCentro.Api.Infrastructure.Seed;

/// <summary>Siembra de datos inicial. Reemplaza al antiguo <c>seed-user.js</c>.</summary>
public static class DatabaseSeeder
{
    public const string AdminEmail = "admin@pollocentro.com";

    public static async Task SeedAdminAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<AppDbContext>>();
        var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var adminPassword = configuration["SeedAdmin:Password"];

        if (string.IsNullOrWhiteSpace(adminPassword) || adminPassword.Length < 12)
            throw new InvalidOperationException(
                "Configura SeedAdmin:Password con al menos 12 caracteres antes de ejecutar seed-admin.");

        var adminRole = await db.Roles.FirstOrDefaultAsync(r => r.NombreRol == "admin", cancellationToken);
        if (adminRole is null)
        {
            logger.LogError("No se encontró el rol 'admin'. Asegúrate de sembrar la tabla Roles primero.");
            return;
        }

        if (await db.Usuarios.AnyAsync(u => u.Correo == AdminEmail, cancellationToken))
        {
            logger.LogInformation("El usuario administrador ya existe: {Correo}", AdminEmail);
            return;
        }

        db.Usuarios.Add(new Usuario
        {
            IdRol = adminRole.IdRol,
            Nombre = "Admin",
            Apellido = "Sistema",
            NombreUsuario = "admin",
            Correo = AdminEmail,
            Contrasena = hasher.Hash(adminPassword),
            Telefono = "809-555-5555",
            Estado = true
        });

        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Usuario administrador creado: {Correo}", AdminEmail);
    }

    public static async Task RotateLocalPasswordsAsync(
        IServiceProvider services, CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<AppDbContext>>();

        var accounts = new[]
        {
            (Email: "admin@pollocentro.com", Key: "LocalAccounts:AdminPassword"),
            (Email: "gerente@pollocentro.com", Key: "LocalAccounts:ManagerPassword"),
            (Email: "operador@pollocentro.com", Key: "LocalAccounts:OperationsPassword")
        };

        foreach (var account in accounts)
        {
            var password = configuration[account.Key];
            if (string.IsNullOrWhiteSpace(password) || password.Length < 16)
                throw new InvalidOperationException($"Falta una contraseña segura en {account.Key}.");

            var user = await db.Usuarios.FirstOrDefaultAsync(u => u.Correo == account.Email, cancellationToken)
                ?? throw new InvalidOperationException($"No existe la cuenta {account.Email}.");
            user.Contrasena = hasher.Hash(password);
        }

        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Contraseñas locales rotadas para {Count} cuentas.", accounts.Length);
    }
}

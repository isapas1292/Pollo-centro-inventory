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
    private const string AdminPassword = "admin123";

    public static async Task SeedAdminAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<AppDbContext>>();

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
            Contrasena = hasher.Hash(AdminPassword),
            Telefono = "809-555-5555",
            Estado = true
        });

        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Usuario administrador creado: {Correo}", AdminEmail);
    }
}

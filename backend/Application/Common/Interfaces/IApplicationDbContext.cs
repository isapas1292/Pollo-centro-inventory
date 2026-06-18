using Microsoft.EntityFrameworkCore;
using PolloCentro.Api.Domain.Entities;

namespace PolloCentro.Api.Application.Common.Interfaces;

/// <summary>
/// Abstracción del contexto de datos para la capa Application.
/// Permite escribir consultas LINQ (con proyecciones y AsNoTracking) sin acoplar
/// la lógica de negocio a la implementación concreta de EF Core.
/// </summary>
public interface IApplicationDbContext
{
    DbSet<Producto> Productos { get; }
    DbSet<Proveedor> Proveedores { get; }
    DbSet<Usuario> Usuarios { get; }
    DbSet<Rol> Roles { get; }
    DbSet<Receta> Recetas { get; }
    DbSet<RecetaIngrediente> RecetaIngredientes { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

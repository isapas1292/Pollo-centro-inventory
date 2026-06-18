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
    DbSet<Empleado> Empleados { get; }
    DbSet<Turno> Turnos { get; }
    DbSet<HistorialPrecio> HistorialPrecios { get; }
    DbSet<RegistroPreparacion> RegistroPreparaciones { get; }
    DbSet<Alerta> Alertas { get; }
    DbSet<Auditoria> Auditorias { get; }
    DbSet<Recepcion> Recepciones { get; }
    DbSet<CuentaContable> CuentasContables { get; }
    DbSet<TransaccionContable> TransaccionesContables { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

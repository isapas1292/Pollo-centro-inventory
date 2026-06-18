using Microsoft.EntityFrameworkCore;
using PolloCentro.Api.Application.Common.Interfaces;
using PolloCentro.Api.Domain.Entities;

namespace PolloCentro.Api.Infrastructure.Persistence;

public class AppDbContext : DbContext, IApplicationDbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Producto> Productos => Set<Producto>();
    public DbSet<Proveedor> Proveedores => Set<Proveedor>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Rol> Roles => Set<Rol>();
    public DbSet<Receta> Recetas => Set<Receta>();
    public DbSet<RecetaIngrediente> RecetaIngredientes => Set<RecetaIngrediente>();
    public DbSet<Empleado> Empleados => Set<Empleado>();
    public DbSet<Turno> Turnos => Set<Turno>();
    public DbSet<HistorialPrecio> HistorialPrecios => Set<HistorialPrecio>();
    public DbSet<RegistroPreparacion> RegistroPreparaciones => Set<RegistroPreparacion>();
    public DbSet<Alerta> Alertas => Set<Alerta>();
    public DbSet<Auditoria> Auditorias => Set<Auditoria>();
    public DbSet<Recepcion> Recepciones => Set<Recepcion>();
    public DbSet<CuentaContable> CuentasContables => Set<CuentaContable>();
    public DbSet<TransaccionContable> TransaccionesContables => Set<TransaccionContable>();
    public DbSet<Local> Locales => Set<Local>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Aplica todas las clases IEntityTypeConfiguration<> de este ensamblado.
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}

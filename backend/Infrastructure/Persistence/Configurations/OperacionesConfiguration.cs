using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PolloCentro.Api.Domain.Entities;

namespace PolloCentro.Api.Infrastructure.Persistence.Configurations;

// Tablas operacionales / de registro. Los ids son columnas indexadas (sin FK estricta)
// para tolerar el flujo optimista del frontend y el estilo "event log".

public class EmpleadoConfiguration : IEntityTypeConfiguration<Empleado>
{
    public void Configure(EntityTypeBuilder<Empleado> b)
    {
        b.ToTable("Empleados");
        b.HasKey(e => e.IdEmpleado);
        b.Property(e => e.Nombre).HasMaxLength(150).IsRequired();
        b.Property(e => e.Rol).HasMaxLength(100).IsRequired();
        b.Property(e => e.Telefono).HasMaxLength(20);
        b.Property(e => e.LocalNombre).HasMaxLength(150);
    }
}

public class TurnoConfiguration : IEntityTypeConfiguration<Turno>
{
    public void Configure(EntityTypeBuilder<Turno> b)
    {
        b.ToTable("Turnos");
        b.HasKey(t => t.IdTurno);
        b.Property(t => t.EmpleadoNombre).HasMaxLength(150).IsRequired();
        b.Property(t => t.UbicacionId).HasMaxLength(50).IsRequired();
        b.Property(t => t.UbicacionNombre).HasMaxLength(150).IsRequired();
        b.Property(t => t.HoraInicio).HasMaxLength(5).IsRequired();
        b.Property(t => t.HoraFin).HasMaxLength(5).IsRequired();
        b.Property(t => t.SemanaKey).HasMaxLength(10).IsRequired();
        b.HasIndex(t => t.SemanaKey);
        b.HasIndex(t => t.IdEmpleado);
    }
}

public class HistorialPrecioConfiguration : IEntityTypeConfiguration<HistorialPrecio>
{
    public void Configure(EntityTypeBuilder<HistorialPrecio> b)
    {
        b.ToTable("HistorialPrecios");
        b.HasKey(h => h.IdHistorial);
        b.Property(h => h.ProductoNombre).HasMaxLength(150);
        b.Property(h => h.Precio).HasPrecision(10, 2);
        b.Property(h => h.Proveedor).HasMaxLength(150);
        b.Property(h => h.RegistradoPor).HasMaxLength(150);
        b.Property(h => h.FechaRegistro).HasColumnType("datetime").HasDefaultValueSql("(getdate())");
        b.HasIndex(h => h.IdProducto);
    }
}

public class RegistroPreparacionConfiguration : IEntityTypeConfiguration<RegistroPreparacion>
{
    public void Configure(EntityTypeBuilder<RegistroPreparacion> b)
    {
        b.ToTable("RegistroPreparaciones");
        b.HasKey(r => r.IdRegistro);
        b.Property(r => r.RecetaNombre).HasMaxLength(150).IsRequired();
        b.Property(r => r.PreparadoPor).HasMaxLength(150);
        b.Property(r => r.CostoTotal).HasPrecision(10, 2);
        b.Property(r => r.FechaPreparacion).HasColumnType("datetime").HasDefaultValueSql("(getdate())");
    }
}

public class AlertaConfiguration : IEntityTypeConfiguration<Alerta>
{
    public void Configure(EntityTypeBuilder<Alerta> b)
    {
        b.ToTable("Alertas");
        b.HasKey(a => a.IdAlerta);
        b.Property(a => a.ProductoNombre).HasMaxLength(150).IsRequired();
        b.Property(a => a.StockActual).HasPrecision(10, 2);
        b.Property(a => a.StockMinimo).HasPrecision(10, 2);
        b.Property(a => a.Unidad).HasMaxLength(50);
        b.Property(a => a.Estado).HasMaxLength(20).IsRequired();
        b.Property(a => a.FechaCreacion).HasColumnType("datetime").HasDefaultValueSql("(getdate())");
        b.HasIndex(a => a.Estado);
        b.HasIndex(a => a.IdProducto).IsUnique();
        b.HasIndex(a => new { a.Estado, a.FechaCreacion });
    }
}

public class AuditoriaConfiguration : IEntityTypeConfiguration<Auditoria>
{
    public void Configure(EntityTypeBuilder<Auditoria> b)
    {
        b.ToTable("Auditoria");
        b.HasKey(a => a.IdAuditoria);
        b.Property(a => a.IdUsuario).HasMaxLength(50);
        b.Property(a => a.UsuarioNombre).HasMaxLength(150);
        b.Property(a => a.Accion).HasMaxLength(100).IsRequired();
        b.Property(a => a.Detalles).HasMaxLength(500);
        b.Property(a => a.FechaHora).HasColumnType("datetime").HasDefaultValueSql("(getdate())");
    }
}

public class RecepcionConfiguration : IEntityTypeConfiguration<Recepcion>
{
    public void Configure(EntityTypeBuilder<Recepcion> b)
    {
        b.ToTable("Recepciones");
        b.HasKey(r => r.IdRecepcion);
        b.Property(r => r.ProveedorNombre).HasMaxLength(150).IsRequired();
        b.Property(r => r.ProductoNombre).HasMaxLength(150).IsRequired();
        b.Property(r => r.Cantidad).HasPrecision(10, 2);
        b.Property(r => r.Precio).HasPrecision(10, 2);
        b.Property(r => r.Total).HasPrecision(10, 2);
        b.Property(r => r.Estado).HasMaxLength(20).IsRequired();
        b.Property(r => r.FechaRecepcion).HasColumnType("datetime").HasDefaultValueSql("(getdate())");
        b.HasIndex(r => r.FechaRecepcion);
        b.HasIndex(r => new { r.Estado, r.IdProducto });
    }
}

public class EnvioLocalConfiguration : IEntityTypeConfiguration<EnvioLocal>
{
    public void Configure(EntityTypeBuilder<EnvioLocal> b)
    {
        b.ToTable("Envios");
        b.HasKey(e => e.IdEnvio);
        b.Property(e => e.LocalNombre).HasMaxLength(150).IsRequired();
        b.Property(e => e.ItemsJson).IsRequired();
        b.Property(e => e.EnviadoPorId).HasMaxLength(50);
        b.Property(e => e.EnviadoPor).HasMaxLength(150);
        b.Property(e => e.Nota).HasMaxLength(500);
        b.Property(e => e.FechaEnvio).HasColumnType("datetime").HasDefaultValueSql("(getdate())");
        b.HasIndex(e => e.FechaEnvio);
        b.HasIndex(e => e.IdLocal);
    }
}

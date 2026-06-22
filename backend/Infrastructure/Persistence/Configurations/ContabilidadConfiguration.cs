using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PolloCentro.Api.Domain.Entities;

namespace PolloCentro.Api.Infrastructure.Persistence.Configurations;

public class CuentaContableConfiguration : IEntityTypeConfiguration<CuentaContable>
{
    public void Configure(EntityTypeBuilder<CuentaContable> b)
    {
        b.ToTable("CuentasContables");
        b.HasKey(c => c.IdCuenta);
        b.Property(c => c.Codigo).HasMaxLength(20).IsRequired();
        b.Property(c => c.Nombre).HasMaxLength(150).IsRequired();
        b.Property(c => c.Tipo).HasMaxLength(20).IsRequired();
        b.Property(c => c.Descripcion).HasMaxLength(255);
        b.HasIndex(c => c.Codigo).IsUnique();
    }
}

public class TransaccionContableConfiguration : IEntityTypeConfiguration<TransaccionContable>
{
    public void Configure(EntityTypeBuilder<TransaccionContable> b)
    {
        b.ToTable("TransaccionesContables");
        b.HasKey(t => t.IdTransaccion);
        b.Property(t => t.Tipo).HasMaxLength(20).IsRequired();
        b.Property(t => t.UbicacionId).HasMaxLength(50);
        b.Property(t => t.UbicacionNombre).HasMaxLength(150);
        b.Property(t => t.CuentaNombre).HasMaxLength(150).IsRequired();
        b.Property(t => t.Monto).HasPrecision(12, 2);
        b.Property(t => t.Descripcion).HasMaxLength(255);
        b.Property(t => t.MetodoPago).HasMaxLength(30);
        b.Property(t => t.Referencia).HasMaxLength(60);
        b.Property(t => t.Contacto).HasMaxLength(150);
        b.Property(t => t.RegistradoPor).HasMaxLength(150);
        b.Property(t => t.Fecha).HasColumnType("datetime");
        b.Property(t => t.FechaRegistro).HasColumnType("datetime").HasDefaultValueSql("(getdate())");
        b.HasIndex(t => t.Fecha);
        b.HasIndex(t => t.IdCuenta);
        b.HasIndex(t => t.Tipo);
        b.HasIndex(t => t.UbicacionId);
        b.HasIndex(t => t.Referencia).IsUnique().HasFilter("[Referencia] IS NOT NULL");
        b.HasIndex(t => new { t.UbicacionId, t.Fecha });
        b.HasIndex(t => new { t.Fecha, t.Tipo });
    }
}

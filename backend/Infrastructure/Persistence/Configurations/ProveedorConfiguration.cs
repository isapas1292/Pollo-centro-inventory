using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PolloCentro.Api.Domain.Entities;

namespace PolloCentro.Api.Infrastructure.Persistence.Configurations;

public class ProveedorConfiguration : IEntityTypeConfiguration<Proveedor>
{
    public void Configure(EntityTypeBuilder<Proveedor> b)
    {
        b.ToTable("Proveedores");
        b.HasKey(p => p.IdProveedor);

        b.Property(p => p.NombreProveedor).HasMaxLength(150).IsRequired();
        b.Property(p => p.RNC).HasMaxLength(20);
        b.Property(p => p.Telefono).HasMaxLength(20);
        b.Property(p => p.Correo).HasMaxLength(150);
        b.Property(p => p.Direccion).HasMaxLength(255);
        b.Property(p => p.FechaRegistro).HasColumnType("datetime").HasDefaultValueSql("(getdate())");

        b.HasMany(p => p.Productos)
            .WithOne(i => i.Proveedor)
            .HasForeignKey(i => i.IdProveedor)
            .OnDelete(DeleteBehavior.NoAction);
    }
}

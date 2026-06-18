using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PolloCentro.Api.Domain.Entities;

namespace PolloCentro.Api.Infrastructure.Persistence.Configurations;

public class ProductoConfiguration : IEntityTypeConfiguration<Producto>
{
    public void Configure(EntityTypeBuilder<Producto> b)
    {
        b.ToTable("Inventario");
        b.HasKey(p => p.IdProducto);

        b.Property(p => p.NombreProducto).HasMaxLength(150).IsRequired();
        b.Property(p => p.Descripcion).HasMaxLength(255);
        b.Property(p => p.Categoria).HasMaxLength(100);
        b.Property(p => p.UnidadMedida).HasMaxLength(50).IsRequired();
        b.Property(p => p.PackMeas).HasColumnType("nvarchar(100)");

        b.Property(p => p.CantidadDisponible).HasPrecision(10, 2);
        b.Property(p => p.StockMinimo).HasPrecision(10, 2);
        b.Property(p => p.CostoUnitario).HasPrecision(10, 2);
        b.Property(p => p.TotalUnits).HasPrecision(18, 2);

        b.Property(p => p.FechaRegistro).HasColumnType("datetime").HasDefaultValueSql("(getdate())");
        b.Property(p => p.FechaVencimiento).HasColumnType("date");

        // Índice para acelerar el ORDER BY / búsquedas por nombre de producto.
        b.HasIndex(p => p.NombreProducto);
        b.HasIndex(p => p.IdProveedor);
    }
}

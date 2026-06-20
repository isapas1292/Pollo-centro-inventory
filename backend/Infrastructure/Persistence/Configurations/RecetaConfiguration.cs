using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PolloCentro.Api.Domain.Entities;

namespace PolloCentro.Api.Infrastructure.Persistence.Configurations;

public class RecetaConfiguration : IEntityTypeConfiguration<Receta>
{
    public void Configure(EntityTypeBuilder<Receta> b)
    {
        b.ToTable("Recetas");
        b.HasKey(r => r.IdReceta);

        b.Property(r => r.NombreReceta).HasMaxLength(150).IsRequired();
        b.Property(r => r.Descripcion).HasMaxLength(255);
        b.Property(r => r.PrecioVenta).HasPrecision(10, 2);
        b.Property(r => r.StockPreparado).HasPrecision(10, 2).HasDefaultValue(0);
        b.Property(r => r.FechaCreacion).HasColumnType("datetime").HasDefaultValueSql("(getdate())");
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PolloCentro.Api.Domain.Entities;

namespace PolloCentro.Api.Infrastructure.Persistence.Configurations;

public class RecetaIngredienteConfiguration : IEntityTypeConfiguration<RecetaIngrediente>
{
    public void Configure(EntityTypeBuilder<RecetaIngrediente> b)
    {
        b.ToTable("RecetaIngredientes");
        b.HasKey(ri => ri.IdRecetaIngrediente);

        b.Property(ri => ri.CantidadNecesaria).HasPrecision(10, 2);
        b.Property(ri => ri.UnidadMedida).HasMaxLength(50).IsRequired();

        b.HasOne(ri => ri.Receta)
            .WithMany(r => r.RecetaIngredientes)
            .HasForeignKey(ri => ri.IdReceta)
            .OnDelete(DeleteBehavior.NoAction);

        b.HasOne(ri => ri.Producto)
            .WithMany(p => p.RecetaIngredientes)
            .HasForeignKey(ri => ri.IdProducto)
            .OnDelete(DeleteBehavior.NoAction);
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PolloCentro.Api.Domain.Entities;

namespace PolloCentro.Api.Infrastructure.Persistence.Configurations;

public class ImportacionCierreCajaConfiguration : IEntityTypeConfiguration<ImportacionCierreCaja>
{
    public void Configure(EntityTypeBuilder<ImportacionCierreCaja> b)
    {
        b.ToTable("ImportacionesCierreCaja");
        b.HasKey(x => x.IdImportacionCierre);
        b.Property(x => x.LocalCodigo).HasMaxLength(50).IsRequired();
        b.Property(x => x.LocalNombre).HasMaxLength(150).IsRequired();
        b.Property(x => x.NegocioPdf).HasMaxLength(150).IsRequired();
        b.Property(x => x.Caja).HasMaxLength(80);
        b.Property(x => x.Secuencia).HasMaxLength(50).IsRequired();
        b.Property(x => x.VentaNeta).HasPrecision(12, 2);
        b.Property(x => x.Impuesto).HasPrecision(12, 2);
        b.Property(x => x.CargoExtra).HasPrecision(12, 2);
        b.Property(x => x.VentaBruta).HasPrecision(12, 2);
        b.Property(x => x.Propinas).HasPrecision(12, 2);
        b.Property(x => x.TotalPago).HasPrecision(12, 2);
        b.Property(x => x.PagosJson).IsRequired();
        b.Property(x => x.ArchivoNombre).HasMaxLength(255).IsRequired();
        b.Property(x => x.ArchivoHash).HasMaxLength(64).IsFixedLength().IsRequired();
        b.Property(x => x.ImportadoPor).HasMaxLength(150);
        b.Property(x => x.FechaInicio).HasColumnType("datetime2");
        b.Property(x => x.FechaFin).HasColumnType("datetime2");
        b.Property(x => x.FechaImportacion).HasColumnType("datetime2").HasDefaultValueSql("(sysdatetime())");

        b.HasIndex(x => x.ArchivoHash).IsUnique();
        b.HasIndex(x => new { x.IdLocal, x.FechaFin });
        b.HasIndex(x => new { x.IdLocal, x.Secuencia, x.FechaFin }).IsUnique();
        b.HasOne(x => x.Local).WithMany().HasForeignKey(x => x.IdLocal).OnDelete(DeleteBehavior.NoAction);
        b.HasMany(x => x.Transacciones)
            .WithOne(x => x.ImportacionCierre)
            .HasForeignKey(x => x.IdImportacionCierre)
            .OnDelete(DeleteBehavior.NoAction);
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PolloCentro.Api.Domain.Entities;

namespace PolloCentro.Api.Infrastructure.Persistence.Configurations;

public class LocalConfiguration : IEntityTypeConfiguration<Local>
{
    public void Configure(EntityTypeBuilder<Local> b)
    {
        b.ToTable("Locales");
        b.HasKey(l => l.IdLocal);
        b.Property(l => l.Codigo).HasMaxLength(50).IsRequired();
        b.Property(l => l.Nombre).HasMaxLength(150).IsRequired();
        b.Property(l => l.Direccion).HasMaxLength(255);
        b.HasIndex(l => l.Codigo).IsUnique();
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PolloCentro.Api.Domain.Entities;

namespace PolloCentro.Api.Infrastructure.Persistence.Configurations;

public class RolConfiguration : IEntityTypeConfiguration<Rol>
{
    public void Configure(EntityTypeBuilder<Rol> b)
    {
        b.ToTable("Roles");
        b.HasKey(r => r.IdRol);

        b.Property(r => r.NombreRol).HasMaxLength(50).IsRequired();
        b.Property(r => r.Descripcion).HasMaxLength(255);
        b.Property(r => r.FechaCreacion).HasColumnType("datetime").HasDefaultValueSql("(getdate())");

        b.HasIndex(r => r.NombreRol).IsUnique();
    }
}

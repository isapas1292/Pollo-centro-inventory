using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PolloCentro.Api.Domain.Entities;

namespace PolloCentro.Api.Infrastructure.Persistence.Configurations;

public class UsuarioConfiguration : IEntityTypeConfiguration<Usuario>
{
    public void Configure(EntityTypeBuilder<Usuario> b)
    {
        b.ToTable("Usuarios");
        b.HasKey(u => u.IdUsuario);

        b.Property(u => u.Nombre).HasMaxLength(100).IsRequired();
        b.Property(u => u.Apellido).HasMaxLength(100).IsRequired();
        b.Property(u => u.NombreUsuario).HasColumnName("Usuario").HasMaxLength(50).IsRequired();
        b.Property(u => u.Correo).HasMaxLength(150).IsRequired();
        b.Property(u => u.Contrasena).HasMaxLength(255).IsRequired();
        b.Property(u => u.Telefono).HasMaxLength(20);
        b.Property(u => u.FechaCreacion).HasColumnType("datetime").HasDefaultValueSql("(getdate())");

        b.HasIndex(u => u.Correo).IsUnique();
        b.HasIndex(u => u.NombreUsuario).IsUnique();

        b.HasOne(u => u.Rol)
            .WithMany(r => r.Usuarios)
            .HasForeignKey(u => u.IdRol)
            .OnDelete(DeleteBehavior.NoAction);
    }
}

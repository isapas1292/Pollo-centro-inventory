namespace PolloCentro.Api.Domain.Entities;

/// <summary>Rol de usuario (tabla <c>Roles</c>).</summary>
public class Rol
{
    public int IdRol { get; set; }
    public string NombreRol { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public DateTime? FechaCreacion { get; set; }
    public bool? Estado { get; set; }

    public ICollection<Usuario> Usuarios { get; set; } = new List<Usuario>();
}

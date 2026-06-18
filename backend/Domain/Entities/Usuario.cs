namespace PolloCentro.Api.Domain.Entities;

/// <summary>Usuario del sistema (tabla <c>Usuarios</c>).</summary>
public class Usuario
{
    public int IdUsuario { get; set; }
    public int IdRol { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Apellido { get; set; } = string.Empty;

    /// <summary>Nombre de usuario para login. Mapeado a la columna <c>Usuario</c>.</summary>
    public string NombreUsuario { get; set; } = string.Empty;

    public string Correo { get; set; } = string.Empty;
    public string Contrasena { get; set; } = string.Empty;
    public string? Telefono { get; set; }
    public DateTime? FechaCreacion { get; set; }
    public bool? Estado { get; set; }

    public Rol Rol { get; set; } = null!;
}

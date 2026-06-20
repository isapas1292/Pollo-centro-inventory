using System.ComponentModel.DataAnnotations;

namespace PolloCentro.Api.Application.Users;

public class UserDto
{
    public string Uid { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public bool Active { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class UserInput
{
    [Required(ErrorMessage = "El correo es requerido")]
    [EmailAddress(ErrorMessage = "Correo inválido")]
    [StringLength(150)]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "El nombre es requerido")]
    [StringLength(150, MinimumLength = 1)]
    public string DisplayName { get; set; } = string.Empty;

    [Required(ErrorMessage = "El rol es requerido")]
    [RegularExpression("admin|manager|operations", ErrorMessage = "Rol inválido")]
    public string Role { get; set; } = string.Empty;

    [StringLength(30)]
    public string? Phone { get; set; }

    public bool Active { get; set; } = true;

    /// <summary>Obligatoria al crear; opcional al actualizar (si viene vacía no cambia).</summary>
    [MinLength(8, ErrorMessage = "La contraseña debe tener al menos 8 caracteres")]
    [StringLength(100)]
    public string? Password { get; set; }
}

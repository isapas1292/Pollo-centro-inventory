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
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "El nombre es requerido")]
    public string DisplayName { get; set; } = string.Empty;

    [Required(ErrorMessage = "El rol es requerido")]
    public string Role { get; set; } = string.Empty;

    public string? Phone { get; set; }
    public bool Active { get; set; } = true;

    /// <summary>Obligatoria al crear; opcional al actualizar (si viene vacía no cambia).</summary>
    public string? Password { get; set; }
}

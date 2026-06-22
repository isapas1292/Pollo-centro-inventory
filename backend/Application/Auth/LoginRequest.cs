using System.ComponentModel.DataAnnotations;

namespace PolloCentro.Api.Application.Auth;

/// <summary>Credenciales de inicio de sesión enviadas por el cliente.</summary>
public class LoginRequest
{
    [Required(ErrorMessage = "El correo es requerido")]
    [EmailAddress(ErrorMessage = "El correo no es válido")]
    [StringLength(150)]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "La contraseña es requerida")]
    [StringLength(128, MinimumLength = 1)]
    public string Password { get; set; } = string.Empty;
}

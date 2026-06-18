using System.ComponentModel.DataAnnotations;

namespace PolloCentro.Api.Application.Auth;

/// <summary>Credenciales de inicio de sesión enviadas por el cliente.</summary>
public class LoginRequest
{
    [Required(ErrorMessage = "El correo es requerido")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "La contraseña es requerida")]
    public string Password { get; set; } = string.Empty;
}

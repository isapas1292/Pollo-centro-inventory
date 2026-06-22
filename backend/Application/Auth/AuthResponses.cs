using System.Text.Json.Serialization;

namespace PolloCentro.Api.Application.Auth;

/// <summary>Usuario autenticado, con el shape que consume el frontend Angular.</summary>
public class AppUserDto
{
    [JsonPropertyName("uid")] public string Uid { get; set; } = string.Empty;
    [JsonPropertyName("email")] public string Email { get; set; } = string.Empty;
    [JsonPropertyName("displayName")] public string DisplayName { get; set; } = string.Empty;
    [JsonPropertyName("role")] public string Role { get; set; } = string.Empty;
    [JsonPropertyName("active")] public bool? Active { get; set; }
}

/// <summary>Respuesta de un login exitoso: token JWT + datos del usuario.</summary>
public class LoginResponse
{
    [JsonIgnore] public string Token { get; set; } = string.Empty;
    [JsonPropertyName("user")] public AppUserDto User { get; set; } = new();
}

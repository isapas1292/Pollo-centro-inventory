using System.ComponentModel.DataAnnotations;

namespace PolloCentro.Api.Infrastructure.Security;

/// <summary>Opciones de JWT enlazadas desde la sección <c>Jwt</c> de la configuración.</summary>
public class JwtOptions
{
    public const string SectionName = "Jwt";

    /// <summary>Clave de firma HMAC. Debe tener al menos 32 bytes (256 bits) para HS256.</summary>
    [Required, MinLength(32)]
    public string Secret { get; set; } = string.Empty;

    [Required, MinLength(3)]
    public string Issuer { get; set; } = string.Empty;

    [Required, MinLength(3)]
    public string Audience { get; set; } = string.Empty;

    [Range(1, 168)]
    public int ExpiryHours { get; set; } = 8;
}

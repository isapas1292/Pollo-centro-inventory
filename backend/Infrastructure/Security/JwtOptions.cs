using System.ComponentModel.DataAnnotations;

namespace PolloCentro.Api.Infrastructure.Security;

/// <summary>Opciones de JWT enlazadas desde la sección <c>Jwt</c> de la configuración.</summary>
public class JwtOptions
{
    public const string SectionName = "Jwt";

    /// <summary>Clave de firma HMAC. Debe tener al menos 32 bytes (256 bits) para HS256.</summary>
    [Required, MinLength(32)]
    public string Secret { get; set; } = string.Empty;

    public string? Issuer { get; set; }
    public string? Audience { get; set; }

    [Range(1, 168)]
    public int ExpiryHours { get; set; } = 8;
}

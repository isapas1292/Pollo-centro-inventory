namespace PolloCentro.Api.Domain.Entities;

/// <summary>
/// Envío de ingredientes o recetas a un local (tabla <c>Envios</c>).
/// Los items se guardan serializados en JSON para mantener una sola tabla.
/// </summary>
public class EnvioLocal
{
    public int IdEnvio { get; set; }
    public int IdLocal { get; set; }
    public string LocalNombre { get; set; } = string.Empty;

    /// <summary>JSON con la lista de items: [{ tipo, refId, nombre, cantidad, unidad }].</summary>
    public string ItemsJson { get; set; } = "[]";

    /// <summary>Id del usuario que registró el envío (trazabilidad).</summary>
    public string? EnviadoPorId { get; set; }
    /// <summary>Nombre del usuario que registró el envío.</summary>
    public string EnviadoPor { get; set; } = string.Empty;

    public string? Nota { get; set; }
    public DateTime FechaEnvio { get; set; }
}

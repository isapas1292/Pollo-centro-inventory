namespace PolloCentro.Api.Domain.Entities;

/// <summary>
/// Local/negocio de Pollo Centro (tabla <c>Locales</c>). Fuente de verdad para
/// cualquier funcionalidad que dependa de la ubicación (horarios, contabilidad, etc.).
/// </summary>
public class Local
{
    public int IdLocal { get; set; }

    /// <summary>Identificador estable usado por el resto del sistema, p. ej. "loc-union".</summary>
    public string Codigo { get; set; } = string.Empty;

    public string Nombre { get; set; } = string.Empty;
    public string? Direccion { get; set; }
    public bool Estado { get; set; } = true;
}

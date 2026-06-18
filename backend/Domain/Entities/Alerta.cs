namespace PolloCentro.Api.Domain.Entities;

/// <summary>Alerta de stock bajo (tabla <c>Alertas</c>).</summary>
public class Alerta
{
    public int IdAlerta { get; set; }
    public int IdProducto { get; set; }
    public string ProductoNombre { get; set; } = string.Empty;
    public decimal StockActual { get; set; }
    public decimal StockMinimo { get; set; }
    public string? Unidad { get; set; }
    public string Estado { get; set; } = "active"; // active | resolved
    public bool WhatsappEnviado { get; set; }
    public DateTime FechaCreacion { get; set; }
    public DateTime? FechaResolucion { get; set; }
}

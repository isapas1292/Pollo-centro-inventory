namespace PolloCentro.Api.Domain.Entities;

/// <summary>Registro histórico de precio de un producto (tabla <c>HistorialPrecios</c>).</summary>
public class HistorialPrecio
{
    public int IdHistorial { get; set; }
    public int IdProducto { get; set; }
    public string? ProductoNombre { get; set; }
    public decimal Precio { get; set; }
    public string? Proveedor { get; set; }
    public DateTime FechaRegistro { get; set; }
    public string? RegistradoPor { get; set; }
}

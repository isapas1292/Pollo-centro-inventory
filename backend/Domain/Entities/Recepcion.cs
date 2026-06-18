namespace PolloCentro.Api.Domain.Entities;

/// <summary>Recepción de mercancía de un proveedor (tabla <c>Recepciones</c>).</summary>
public class Recepcion
{
    public int IdRecepcion { get; set; }
    public int IdProveedor { get; set; }
    public string ProveedorNombre { get; set; } = string.Empty;
    public int IdProducto { get; set; }
    public string ProductoNombre { get; set; } = string.Empty;
    public decimal Cantidad { get; set; }
    public decimal Precio { get; set; }
    public decimal Total { get; set; }
    public DateTime FechaRecepcion { get; set; }
    public string? RecibidoPor { get; set; }
    public string Estado { get; set; } = "completed"; // pending | completed | cancelled
}

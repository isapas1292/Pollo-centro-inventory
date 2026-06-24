namespace PolloCentro.Api.Domain.Entities;

/// <summary>
/// Stock de un producto en un local (tabla <c>InventarioLocal</c>). El "almacén" usa la
/// tabla Inventario; cada local lleva su propio stock, alimentado por los envíos.
/// Se identifica el local por su código/slug (p. ej. "loc-broadway").
/// </summary>
public class InventarioLocal
{
    public int IdInventarioLocal { get; set; }
    public string IdLocal { get; set; } = string.Empty;
    public string LocalNombre { get; set; } = string.Empty;
    public int IdProducto { get; set; }
    public decimal Cantidad { get; set; }
    public decimal StockMinimo { get; set; }
    public DateTime FechaActualizacion { get; set; }
}

namespace PolloCentro.Api.Domain.Entities;

/// <summary>Producto de inventario (tabla <c>Inventario</c>).</summary>
public class Producto
{
    public int IdProducto { get; set; }
    public int? IdProveedor { get; set; }
    public string NombreProducto { get; set; } = string.Empty;
    public string? Categoria { get; set; }
    public string UnidadMedida { get; set; } = string.Empty;
    public decimal CantidadDisponible { get; set; }
    public decimal StockMinimo { get; set; }
    public decimal CostoUnitario { get; set; }
    public DateTime? FechaRegistro { get; set; }
    public bool? Estado { get; set; }
    public string? PackMeas { get; set; }

    public Proveedor? Proveedor { get; set; }
    public ICollection<RecetaIngrediente> RecetaIngredientes { get; set; } = new List<RecetaIngrediente>();
}

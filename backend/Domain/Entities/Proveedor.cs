namespace PolloCentro.Api.Domain.Entities;

/// <summary>Proveedor de productos (tabla <c>Proveedores</c>).</summary>
public class Proveedor
{
    public int IdProveedor { get; set; }
    public string NombreProveedor { get; set; } = string.Empty;
    public string? RNC { get; set; }
    public string? Telefono { get; set; }
    public string? Correo { get; set; }
    public string? Direccion { get; set; }
    public DateTime? FechaRegistro { get; set; }
    public bool? Estado { get; set; }

    public ICollection<Producto> Productos { get; set; } = new List<Producto>();
}

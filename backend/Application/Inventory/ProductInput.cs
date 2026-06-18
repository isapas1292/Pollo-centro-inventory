using System.ComponentModel.DataAnnotations;

namespace PolloCentro.Api.Application.Inventory;

/// <summary>Datos de entrada para crear o actualizar un producto de inventario.</summary>
public class ProductInput
{
    [Required(ErrorMessage = "El nombre del producto es requerido")]
    public string Name { get; set; } = string.Empty;

    public string? Category { get; set; }

    [Required(ErrorMessage = "La unidad de medida es requerida")]
    public string Unit { get; set; } = "unidad";

    public decimal CurrentStock { get; set; }
    public decimal MinStock { get; set; }
    public decimal CurrentPrice { get; set; }
    public string? SupplierId { get; set; }

    /// <summary>Solo informativo desde el frontend; no se persiste.</summary>
    public string? CreatedBy { get; set; }
}

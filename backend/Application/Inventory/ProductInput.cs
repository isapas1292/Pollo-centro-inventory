using System.ComponentModel.DataAnnotations;

namespace PolloCentro.Api.Application.Inventory;

/// <summary>Datos de entrada para crear o actualizar un producto de inventario.</summary>
public class ProductInput
{
    [Required(ErrorMessage = "El nombre del producto es requerido")]
    [StringLength(150, MinimumLength = 1, ErrorMessage = "El nombre no puede superar 150 caracteres")]
    public string Name { get; set; } = string.Empty;

    [StringLength(100)]
    public string? Category { get; set; }

    [Required(ErrorMessage = "La unidad de medida es requerida")]
    [StringLength(50)]
    public string Unit { get; set; } = "unidad";

    [Range(0, 1_000_000_000, ErrorMessage = "El stock no puede ser negativo")]
    public decimal CurrentStock { get; set; }

    [Range(0, 1_000_000_000, ErrorMessage = "El stock mínimo no puede ser negativo")]
    public decimal MinStock { get; set; }

    [Range(0, 1_000_000_000, ErrorMessage = "El precio no puede ser negativo")]
    public decimal CurrentPrice { get; set; }

    public string? SupplierId { get; set; }

    /// <summary>Solo informativo desde el frontend; no se persiste.</summary>
    public string? CreatedBy { get; set; }
}

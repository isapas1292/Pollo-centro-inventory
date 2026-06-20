using System.ComponentModel.DataAnnotations;

namespace PolloCentro.Api.Application.Dispatches;

/// <summary>Un item dentro de un envío: un ingrediente (producto) o una receta.</summary>
public class DispatchItemDto
{
    /// <summary>"ingrediente" | "receta".</summary>
    [RegularExpression("ingrediente|receta", ErrorMessage = "Tipo de item inválido")]
    public string Type { get; set; } = "ingrediente";

    [Required]
    public string RefId { get; set; } = string.Empty;

    [StringLength(150)]
    public string Name { get; set; } = string.Empty;

    [Range(0.0001, 1_000_000, ErrorMessage = "La cantidad debe ser mayor que cero")]
    public decimal Quantity { get; set; }

    [StringLength(50)]
    public string? Unit { get; set; }
}

public class DispatchDto
{
    public string Id { get; set; } = string.Empty;
    public string LocationId { get; set; } = string.Empty;
    public string LocationName { get; set; } = string.Empty;
    public List<DispatchItemDto> Items { get; set; } = new();
    public string? DispatchedById { get; set; }
    public string DispatchedBy { get; set; } = string.Empty;
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class DispatchInput
{
    [Required(ErrorMessage = "El local destino es requerido")]
    public string LocationId { get; set; } = string.Empty;

    [Required]
    [StringLength(150)]
    public string LocationName { get; set; } = string.Empty;

    [Required]
    [MinLength(1, ErrorMessage = "Debe incluir al menos un item")]
    public List<DispatchItemDto> Items { get; set; } = new();

    public string? DispatchedById { get; set; }
    public string? DispatchedBy { get; set; }

    [StringLength(500)]
    public string? Note { get; set; }
}

public interface IDispatchService
{
    Task<IReadOnlyList<DispatchDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<DispatchDto> CreateAsync(DispatchInput input, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}

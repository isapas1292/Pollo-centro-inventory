using System.ComponentModel.DataAnnotations;

namespace PolloCentro.Api.Application.Orders;

public class OrderReceptionDto
{
    public string Id { get; set; } = string.Empty;
    public string SupplierId { get; set; } = string.Empty;
    public string SupplierName { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal Price { get; set; }
    public decimal Total { get; set; }
    public DateTime ReceivedAt { get; set; }
    public string ReceivedBy { get; set; } = string.Empty;
    public string Status { get; set; } = "completed";
}

public class OrderReceptionInput
{
    [Required] public string SupplierId { get; set; } = string.Empty;
    [StringLength(150)] public string SupplierName { get; set; } = string.Empty;
    [Required] public string ProductId { get; set; } = string.Empty;
    [StringLength(150)] public string ProductName { get; set; } = string.Empty;

    [Range(0.0001, 1_000_000, ErrorMessage = "La cantidad debe ser mayor que cero")]
    public decimal Quantity { get; set; }

    [Range(0, 1_000_000_000, ErrorMessage = "El precio no puede ser negativo")]
    public decimal Price { get; set; }

    [Range(0, 1_000_000_000, ErrorMessage = "El total no puede ser negativo")]
    public decimal Total { get; set; }

    public string? ReceivedBy { get; set; }

    [RegularExpression("pending|completed|cancelled", ErrorMessage = "Estado inválido")]
    public string? Status { get; set; }
}

public interface IOrderService
{
    Task<IReadOnlyList<OrderReceptionDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<OrderReceptionDto> CreateAsync(OrderReceptionInput input, CancellationToken cancellationToken = default);
    Task<OrderReceptionDto> UpdateAsync(int id, OrderReceptionInput input, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}

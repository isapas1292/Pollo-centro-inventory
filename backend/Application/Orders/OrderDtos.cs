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
    public string SupplierId { get; set; } = string.Empty;
    public string SupplierName { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal Price { get; set; }
    public decimal Total { get; set; }
    public string? ReceivedBy { get; set; }
    public string? Status { get; set; }
}

public interface IOrderService
{
    Task<IReadOnlyList<OrderReceptionDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<OrderReceptionDto> CreateAsync(OrderReceptionInput input, CancellationToken cancellationToken = default);
    Task<OrderReceptionDto> UpdateAsync(int id, OrderReceptionInput input, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}

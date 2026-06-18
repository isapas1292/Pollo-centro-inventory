namespace PolloCentro.Api.Application.Prices;

public class PriceRecordDto
{
    public string Id { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string? ProductName { get; set; }
    public decimal Price { get; set; }
    public string? Supplier { get; set; }
    public DateTime RecordedAt { get; set; }
    public string RecordedBy { get; set; } = string.Empty;
}

public class PriceRecordInput
{
    public string ProductId { get; set; } = string.Empty;
    public string? ProductName { get; set; }
    public decimal Price { get; set; }
    public string? Supplier { get; set; }
    public string? RecordedBy { get; set; }
}

public interface IPriceService
{
    Task<IReadOnlyList<PriceRecordDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<PriceRecordDto> CreateAsync(PriceRecordInput input, CancellationToken cancellationToken = default);
}

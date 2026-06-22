using System.ComponentModel.DataAnnotations;

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
    [Required]
    public string ProductId { get; set; } = string.Empty;
    [StringLength(150)]
    public string? ProductName { get; set; }
    [Range(0, 1_000_000_000)]
    public decimal Price { get; set; }
    [StringLength(150)]
    public string? Supplier { get; set; }
    [StringLength(150)]
    public string? RecordedBy { get; set; }
}

public interface IPriceService
{
    Task<IReadOnlyList<PriceRecordDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<PriceRecordDto> CreateAsync(PriceRecordInput input, CancellationToken cancellationToken = default);
}

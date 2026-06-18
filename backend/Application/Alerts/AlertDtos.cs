namespace PolloCentro.Api.Application.Alerts;

public class AlertDto
{
    public string Id { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public decimal CurrentStock { get; set; }
    public decimal MinStock { get; set; }
    public string? Unit { get; set; }
    public string Status { get; set; } = "active";
    public bool WhatsappSent { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
}

public class AlertInput
{
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public decimal CurrentStock { get; set; }
    public decimal MinStock { get; set; }
    public string? Unit { get; set; }
    public string? Status { get; set; }
    public bool? WhatsappSent { get; set; }
}

public interface IAlertService
{
    Task<IReadOnlyList<AlertDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<AlertDto> CreateAsync(AlertInput input, CancellationToken cancellationToken = default);
    Task<AlertDto> UpdateAsync(int id, AlertInput input, CancellationToken cancellationToken = default);
    Task ResolveAsync(int id, CancellationToken cancellationToken = default);
    Task MarkWhatsappAsync(int id, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}

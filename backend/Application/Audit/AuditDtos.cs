namespace PolloCentro.Api.Application.Audit;

public class AuditLogDto
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}

public class AuditLogInput
{
    public string? UserId { get; set; }
    public string? UserName { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? Details { get; set; }
}

public interface IAuditService
{
    Task<IReadOnlyList<AuditLogDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<AuditLogDto> CreateAsync(AuditLogInput input, CancellationToken cancellationToken = default);
}

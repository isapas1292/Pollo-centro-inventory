namespace PolloCentro.Api.Application.Dispatches;

/// <summary>Un item dentro de un envío: un ingrediente (producto) o una receta.</summary>
public class DispatchItemDto
{
    /// <summary>"ingrediente" | "receta".</summary>
    public string Type { get; set; } = "ingrediente";
    public string RefId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
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
    public string LocationId { get; set; } = string.Empty;
    public string LocationName { get; set; } = string.Empty;
    public List<DispatchItemDto> Items { get; set; } = new();
    public string? DispatchedById { get; set; }
    public string? DispatchedBy { get; set; }
    public string? Note { get; set; }
}

public interface IDispatchService
{
    Task<IReadOnlyList<DispatchDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<DispatchDto> CreateAsync(DispatchInput input, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}

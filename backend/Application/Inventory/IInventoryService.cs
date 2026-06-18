namespace PolloCentro.Api.Application.Inventory;

public interface IInventoryService
{
    Task<IReadOnlyList<ProductDto>> GetProductsAsync(CancellationToken cancellationToken = default);
}

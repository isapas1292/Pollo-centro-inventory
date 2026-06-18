namespace PolloCentro.Api.Application.Inventory;

public interface IInventoryService
{
    Task<IReadOnlyList<ProductDto>> GetProductsAsync(CancellationToken cancellationToken = default);
    Task<ProductDto> CreateAsync(ProductInput input, CancellationToken cancellationToken = default);
    Task<ProductDto> UpdateAsync(int id, ProductInput input, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}

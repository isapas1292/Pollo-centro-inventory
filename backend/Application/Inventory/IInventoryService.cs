namespace PolloCentro.Api.Application.Inventory;

public interface IInventoryService
{
    Task<IReadOnlyList<ProductDto>> GetProductsAsync(CancellationToken cancellationToken = default);
    /// <summary>Inventario propio de un local (por código de local, p. ej. "loc-broadway").</summary>
    Task<IReadOnlyList<ProductDto>> GetByLocationAsync(string locationCode, CancellationToken cancellationToken = default);
    Task<ProductDto> CreateAsync(ProductInput input, CancellationToken cancellationToken = default);
    Task<ProductDto> UpdateAsync(int id, ProductInput input, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}

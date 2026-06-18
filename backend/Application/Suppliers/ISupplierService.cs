namespace PolloCentro.Api.Application.Suppliers;

public interface ISupplierService
{
    Task<IReadOnlyList<SupplierDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<SupplierDto> CreateAsync(SupplierInput input, CancellationToken cancellationToken = default);
    Task<SupplierDto> UpdateAsync(int id, SupplierInput input, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}

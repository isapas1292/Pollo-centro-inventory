using Microsoft.EntityFrameworkCore;
using PolloCentro.Api.Application.Common.Interfaces;

namespace PolloCentro.Api.Application.Inventory;

public class InventoryService : IInventoryService
{
    private readonly IApplicationDbContext _db;

    public InventoryService(IApplicationDbContext db) => _db = db;

    public async Task<IReadOnlyList<ProductDto>> GetProductsAsync(CancellationToken cancellationToken = default)
    {
        // Una sola consulta con LEFT JOIN al proveedor, proyectada a DTO en SQL y sin tracking.
        return await _db.Productos
            .AsNoTracking()
            .OrderBy(p => p.NombreProducto)
            .Select(p => new ProductDto
            {
                Id = p.IdProducto.ToString(),
                Name = p.NombreProducto,
                Category = string.IsNullOrEmpty(p.Categoria) ? "Otro" : p.Categoria,
                CurrentStock = p.CantidadDisponible,
                Unit = string.IsNullOrEmpty(p.UnidadMedida) ? "unidad" : p.UnidadMedida.ToLower(),
                MinStock = p.StockMinimo,
                CurrentPrice = p.CostoUnitario,
                SupplierId = p.IdProveedor == null ? null : p.IdProveedor.ToString(),
                SupplierName = p.Proveedor == null ? null : p.Proveedor.NombreProveedor,
                LastUpdated = p.FechaRegistro ?? DateTime.Now
            })
            .ToListAsync(cancellationToken);
    }
}

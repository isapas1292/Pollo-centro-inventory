using Microsoft.EntityFrameworkCore;
using PolloCentro.Api.Application.Common.Exceptions;
using PolloCentro.Api.Application.Common.Interfaces;
using PolloCentro.Api.Domain.Entities;

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

    public async Task<ProductDto> CreateAsync(ProductInput input, CancellationToken cancellationToken = default)
    {
        var producto = new Producto
        {
            NombreProducto = input.Name,
            Categoria = input.Category,
            UnidadMedida = string.IsNullOrWhiteSpace(input.Unit) ? "unidad" : input.Unit,
            CantidadDisponible = input.CurrentStock,
            StockMinimo = input.MinStock,
            CostoUnitario = input.CurrentPrice,
            IdProveedor = ParseId(input.SupplierId),
            Estado = true
        };

        _db.Productos.Add(producto);
        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(producto.IdProducto, cancellationToken);
    }

    public async Task<ProductDto> UpdateAsync(int id, ProductInput input, CancellationToken cancellationToken = default)
    {
        var producto = await _db.Productos.FirstOrDefaultAsync(p => p.IdProducto == id, cancellationToken)
            ?? throw new NotFoundException("Producto", id);

        producto.NombreProducto = input.Name;
        producto.Categoria = input.Category;
        producto.UnidadMedida = string.IsNullOrWhiteSpace(input.Unit) ? producto.UnidadMedida : input.Unit;
        producto.CantidadDisponible = input.CurrentStock;
        producto.StockMinimo = input.MinStock;
        producto.CostoUnitario = input.CurrentPrice;
        producto.IdProveedor = ParseId(input.SupplierId);
        producto.FechaRegistro = DateTime.Now;

        await _db.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(producto.IdProducto, cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var producto = await _db.Productos.FirstOrDefaultAsync(p => p.IdProducto == id, cancellationToken)
            ?? throw new NotFoundException("Producto", id);

        _db.Productos.Remove(producto);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task<ProductDto> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        return await _db.Productos
            .AsNoTracking()
            .Where(p => p.IdProducto == id)
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
            .FirstAsync(cancellationToken);
    }

    private static int? ParseId(string? value)
        => int.TryParse(value, out var id) ? id : null;
}

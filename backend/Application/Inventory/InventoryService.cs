using Microsoft.EntityFrameworkCore;
using PolloCentro.Api.Application.Common.Exceptions;
using PolloCentro.Api.Application.Common.Interfaces;
using PolloCentro.Api.Application.Alerts;
using PolloCentro.Api.Domain.Entities;

namespace PolloCentro.Api.Application.Inventory;

public class InventoryService : IInventoryService
{
    private readonly IApplicationDbContext _db;
    private readonly IAlertService _alerts;

    public InventoryService(IApplicationDbContext db, IAlertService alerts)
    {
        _db = db;
        _alerts = alerts;
    }

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

    public async Task<IReadOnlyList<ProductDto>> GetByLocationAsync(string locationCode, CancellationToken cancellationToken = default)
    {
        return await _db.InventariosLocales
            .AsNoTracking()
            .Where(il => il.IdLocal == locationCode)
            .Join(_db.Productos, il => il.IdProducto, p => p.IdProducto, (il, p) => new { il, p })
            .OrderBy(x => x.p.NombreProducto)
            .Select(x => new ProductDto
            {
                Id = x.p.IdProducto.ToString(),
                Name = x.p.NombreProducto,
                Category = string.IsNullOrEmpty(x.p.Categoria) ? "Otro" : x.p.Categoria,
                CurrentStock = x.il.Cantidad,
                Unit = string.IsNullOrEmpty(x.p.UnidadMedida) ? "unidad" : x.p.UnidadMedida.ToLower(),
                MinStock = x.il.StockMinimo,
                CurrentPrice = x.p.CostoUnitario,
                SupplierId = null,
                SupplierName = null,
                LastUpdated = x.il.FechaActualizacion
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<ProductDto> CreateAsync(ProductInput input, CancellationToken cancellationToken = default)
    {
        var supplierId = await ResolveSupplierIdAsync(input.SupplierId, cancellationToken);
        var producto = new Producto
        {
            NombreProducto = input.Name.Trim(),
            Categoria = input.Category?.Trim(),
            UnidadMedida = string.IsNullOrWhiteSpace(input.Unit) ? "unidad" : input.Unit.Trim(),
            CantidadDisponible = input.CurrentStock,
            StockMinimo = input.MinStock,
            CostoUnitario = input.CurrentPrice,
            IdProveedor = supplierId,
            Estado = true
        };

        _db.Productos.Add(producto);
        await _db.SaveChangesAsync(cancellationToken);
        await SyncLowStockAlertAsync(producto, cancellationToken);

        return await GetByIdAsync(producto.IdProducto, cancellationToken);
    }

    public async Task<ProductDto> UpdateAsync(int id, ProductInput input, CancellationToken cancellationToken = default)
    {
        var producto = await _db.Productos.FirstOrDefaultAsync(p => p.IdProducto == id, cancellationToken)
            ?? throw new NotFoundException("Producto", id);
        var supplierId = await ResolveSupplierIdAsync(input.SupplierId, cancellationToken);

        var stockIncreased = input.CurrentStock > producto.CantidadDisponible;

        producto.NombreProducto = input.Name.Trim();
        producto.Categoria = input.Category?.Trim();
        producto.UnidadMedida = string.IsNullOrWhiteSpace(input.Unit) ? producto.UnidadMedida : input.Unit.Trim();
        producto.CantidadDisponible = input.CurrentStock;
        producto.StockMinimo = input.MinStock;
        producto.CostoUnitario = input.CurrentPrice;
        producto.IdProveedor = supplierId;
        producto.FechaRegistro = DateTime.Now;

        if (stockIncreased)
        {
            var alertas = await _db.Alertas
                .Where(a => a.IdProducto == id)
                .ToListAsync(cancellationToken);
            if (alertas.Count > 0) _db.Alertas.RemoveRange(alertas);
        }
        await _db.SaveChangesAsync(cancellationToken);
        if (!stockIncreased)
            await SyncLowStockAlertAsync(producto, cancellationToken);
        return await GetByIdAsync(producto.IdProducto, cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var producto = await _db.Productos.FirstOrDefaultAsync(p => p.IdProducto == id, cancellationToken)
            ?? throw new NotFoundException("Producto", id);

        var hasHistory = await _db.RecetaIngredientes.AnyAsync(x => x.IdProducto == id, cancellationToken)
            || await _db.Recepciones.AnyAsync(x => x.IdProducto == id, cancellationToken)
            || await _db.HistorialPrecios.AnyAsync(x => x.IdProducto == id, cancellationToken);
        if (hasHistory)
            throw new ValidationException("El producto tiene movimientos históricos y no puede eliminarse.");

        var alerts = await _db.Alertas.Where(a => a.IdProducto == id).ToListAsync(cancellationToken);
        if (alerts.Count > 0) _db.Alertas.RemoveRange(alerts);
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

    private async Task<int?> ResolveSupplierIdAsync(string? value, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        if (!int.TryParse(value, out var id) || id <= 0)
            throw new ValidationException("El proveedor no es válido.");
        if (!await _db.Proveedores.AnyAsync(p => p.IdProveedor == id && p.Estado == true, cancellationToken))
            throw new NotFoundException("Proveedor activo", id);
        return id;
    }

    private async Task SyncLowStockAlertAsync(Producto product, CancellationToken cancellationToken)
    {
        if (product.CantidadDisponible <= product.StockMinimo * 1.5m)
        {
            await _alerts.CreateAsync(new AlertInput
            {
                ProductId = product.IdProducto.ToString(),
                ProductName = product.NombreProducto,
                CurrentStock = product.CantidadDisponible,
                MinStock = product.StockMinimo,
                Unit = product.UnidadMedida,
                Status = "active"
            }, cancellationToken);
            return;
        }

        var alerts = await _db.Alertas.Where(a => a.IdProducto == product.IdProducto).ToListAsync(cancellationToken);
        if (alerts.Count > 0)
        {
            _db.Alertas.RemoveRange(alerts);
            await _db.SaveChangesAsync(cancellationToken);
        }
    }
}

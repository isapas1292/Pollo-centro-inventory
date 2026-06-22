using Microsoft.EntityFrameworkCore;
using PolloCentro.Api.Application.Common.Exceptions;
using PolloCentro.Api.Application.Common.Interfaces;
using PolloCentro.Api.Domain.Entities;

namespace PolloCentro.Api.Application.Prices;

public class PriceService : IPriceService
{
    private readonly IApplicationDbContext _db;

    public PriceService(IApplicationDbContext db) => _db = db;

    public async Task<IReadOnlyList<PriceRecordDto>> GetAllAsync(CancellationToken cancellationToken = default)
        => await _db.HistorialPrecios
            .AsNoTracking()
            .OrderByDescending(h => h.FechaRegistro)
            .Select(h => new PriceRecordDto
            {
                Id = h.IdHistorial.ToString(),
                ProductId = h.IdProducto.ToString(),
                ProductName = h.ProductoNombre,
                Price = h.Precio,
                Supplier = h.Proveedor,
                RecordedAt = h.FechaRegistro,
                RecordedBy = h.RegistradoPor ?? string.Empty
            })
            .ToListAsync(cancellationToken);

    public async Task<PriceRecordDto> CreateAsync(PriceRecordInput input, CancellationToken cancellationToken = default)
    {
        if (!int.TryParse(input.ProductId, out var productId) || productId <= 0)
            throw new ValidationException("El producto no es válido.");
        var product = await _db.Productos.AsNoTracking()
            .FirstOrDefaultAsync(p => p.IdProducto == productId, cancellationToken)
            ?? throw new NotFoundException("Producto", productId);

        var registro = new HistorialPrecio
        {
            IdProducto = productId,
            ProductoNombre = product.NombreProducto,
            Precio = input.Price,
            Proveedor = input.Supplier?.Trim(),
            RegistradoPor = input.RecordedBy?.Trim(),
            FechaRegistro = DateTime.Now
        };
        _db.HistorialPrecios.Add(registro);
        await _db.SaveChangesAsync(cancellationToken);

        return new PriceRecordDto
        {
            Id = registro.IdHistorial.ToString(),
            ProductId = registro.IdProducto.ToString(),
            ProductName = registro.ProductoNombre,
            Price = registro.Precio,
            Supplier = registro.Proveedor,
            RecordedAt = registro.FechaRegistro,
            RecordedBy = registro.RegistradoPor ?? string.Empty
        };
    }
}

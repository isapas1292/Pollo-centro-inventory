using Microsoft.EntityFrameworkCore;
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
        var registro = new HistorialPrecio
        {
            IdProducto = int.TryParse(input.ProductId, out var pid) ? pid : 0,
            ProductoNombre = input.ProductName,
            Precio = input.Price,
            Proveedor = input.Supplier,
            RegistradoPor = input.RecordedBy,
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

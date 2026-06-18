using Microsoft.EntityFrameworkCore;
using PolloCentro.Api.Application.Common.Exceptions;
using PolloCentro.Api.Application.Common.Interfaces;
using PolloCentro.Api.Domain.Entities;

namespace PolloCentro.Api.Application.Orders;

public class OrderService : IOrderService
{
    private readonly IApplicationDbContext _db;

    public OrderService(IApplicationDbContext db) => _db = db;

    public async Task<IReadOnlyList<OrderReceptionDto>> GetAllAsync(CancellationToken cancellationToken = default)
        => await _db.Recepciones
            .AsNoTracking()
            .OrderByDescending(r => r.FechaRecepcion)
            .Select(r => ToDto(r))
            .ToListAsync(cancellationToken);

    public async Task<OrderReceptionDto> CreateAsync(OrderReceptionInput input, CancellationToken cancellationToken = default)
    {
        var recepcion = new Recepcion
        {
            IdProveedor = int.TryParse(input.SupplierId, out var sid) ? sid : 0,
            ProveedorNombre = input.SupplierName,
            IdProducto = int.TryParse(input.ProductId, out var pid) ? pid : 0,
            ProductoNombre = input.ProductName,
            Cantidad = input.Quantity,
            Precio = input.Price,
            Total = input.Total,
            RecibidoPor = input.ReceivedBy,
            Estado = string.IsNullOrEmpty(input.Status) ? "completed" : input.Status,
            FechaRecepcion = DateTime.Now
        };
        _db.Recepciones.Add(recepcion);

        // Si la recepción está completada, se suma al stock del producto.
        if (recepcion.Estado == "completed")
        {
            var producto = await _db.Productos.FirstOrDefaultAsync(p => p.IdProducto == recepcion.IdProducto, cancellationToken);
            if (producto is not null)
            {
                producto.CantidadDisponible += recepcion.Cantidad;
                producto.FechaRegistro = DateTime.Now;
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
        return ToDto(recepcion);
    }

    public async Task<OrderReceptionDto> UpdateAsync(int id, OrderReceptionInput input, CancellationToken cancellationToken = default)
    {
        var recepcion = await _db.Recepciones.FirstOrDefaultAsync(r => r.IdRecepcion == id, cancellationToken)
            ?? throw new NotFoundException("Recepción", id);

        recepcion.ProveedorNombre = input.SupplierName;
        recepcion.ProductoNombre = input.ProductName;
        recepcion.Cantidad = input.Quantity;
        recepcion.Precio = input.Price;
        recepcion.Total = input.Total;
        if (!string.IsNullOrEmpty(input.Status)) recepcion.Estado = input.Status;
        if (input.ReceivedBy is not null) recepcion.RecibidoPor = input.ReceivedBy;

        await _db.SaveChangesAsync(cancellationToken);
        return ToDto(recepcion);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var recepcion = await _db.Recepciones.FirstOrDefaultAsync(r => r.IdRecepcion == id, cancellationToken)
            ?? throw new NotFoundException("Recepción", id);

        _db.Recepciones.Remove(recepcion);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private static OrderReceptionDto ToDto(Recepcion r) => new()
    {
        Id = r.IdRecepcion.ToString(),
        SupplierId = r.IdProveedor.ToString(),
        SupplierName = r.ProveedorNombre,
        ProductId = r.IdProducto.ToString(),
        ProductName = r.ProductoNombre,
        Quantity = r.Cantidad,
        Price = r.Precio,
        Total = r.Total,
        ReceivedAt = r.FechaRecepcion,
        ReceivedBy = r.RecibidoPor ?? string.Empty,
        Status = r.Estado
    };
}

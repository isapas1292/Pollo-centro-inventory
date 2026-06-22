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
    {
        return await _db.Recepciones
            .AsNoTracking()
            .OrderByDescending(r => r.FechaRecepcion)
            .Select(r => ToDto(r))
            .ToListAsync(cancellationToken);
    }

    public async Task<OrderReceptionDto> CreateAsync(OrderReceptionInput input, CancellationToken cancellationToken = default)
    {
        var (supplier, product) = await ResolveReferencesAsync(input, cancellationToken);
        var recepcion = new Recepcion
        {
            IdProveedor = supplier.IdProveedor,
            ProveedorNombre = supplier.NombreProveedor,
            IdProducto = product.IdProducto,
            ProductoNombre = product.NombreProducto,
            Cantidad = input.Quantity,
            Precio = input.Price,
            Total = input.Quantity * input.Price,
            RecibidoPor = input.ReceivedBy?.Trim(),
            Estado = string.IsNullOrEmpty(input.Status) ? "completed" : input.Status,
            FechaRecepcion = DateTime.Now
        };
        _db.Recepciones.Add(recepcion);

        // Si la recepción está completada, se suma al stock del producto.
        if (recepcion.Estado == "completed")
            await ReplenishInventoryAsync(recepcion.IdProducto, recepcion.Cantidad, cancellationToken);
        else if (recepcion.Estado == "pending")
        {
            var alertas = await _db.Alertas
                .Where(a => a.IdProducto == recepcion.IdProducto && a.Estado == "active")
                .ToListAsync(cancellationToken);
            foreach (var alerta in alertas)
            {
                alerta.Estado = "resolved";
                alerta.FechaResolucion = DateTime.Now;
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
        await SyncOrderTransactionAsync(recepcion, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
        return ToDto(recepcion);
    }

    public async Task<OrderReceptionDto> UpdateAsync(int id, OrderReceptionInput input, CancellationToken cancellationToken = default)
    {
        var recepcion = await _db.Recepciones.FirstOrDefaultAsync(r => r.IdRecepcion == id, cancellationToken)
            ?? throw new NotFoundException("Recepción", id);

        if (recepcion.Estado != "pending")
            throw new ValidationException("Solo los pedidos pendientes pueden modificarse.");

        var (supplier, product) = await ResolveReferencesAsync(input, cancellationToken);
        var nextStatus = string.IsNullOrEmpty(input.Status) ? recepcion.Estado : input.Status;

        recepcion.IdProveedor = supplier.IdProveedor;
        recepcion.ProveedorNombre = supplier.NombreProveedor;
        recepcion.IdProducto = product.IdProducto;
        recepcion.ProductoNombre = product.NombreProducto;
        recepcion.Cantidad = input.Quantity;
        recepcion.Precio = input.Price;
        recepcion.Total = input.Quantity * input.Price;
        recepcion.Estado = nextStatus;
        if (input.ReceivedBy is not null) recepcion.RecibidoPor = input.ReceivedBy.Trim();

        if (nextStatus == "completed")
        {
            recepcion.FechaRecepcion = DateTime.Now;
            await ReplenishInventoryAsync(recepcion.IdProducto, recepcion.Cantidad, cancellationToken);
        }
        else if (nextStatus == "cancelled")
        {
            var alerts = await _db.Alertas
                .Where(a => a.IdProducto == recepcion.IdProducto && a.Estado == "resolved")
                .ToListAsync(cancellationToken);
            foreach (var alert in alerts)
            {
                alert.Estado = "active";
                alert.FechaResolucion = null;
            }
        }

        await SyncOrderTransactionAsync(recepcion, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
        return ToDto(recepcion);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var recepcion = await _db.Recepciones.FirstOrDefaultAsync(r => r.IdRecepcion == id, cancellationToken)
            ?? throw new NotFoundException("Recepción", id);

        if (recepcion.Estado == "completed")
            throw new ValidationException("Un pedido recibido no puede eliminarse porque ya afectó el inventario.");

        _db.Recepciones.Remove(recepcion);
        var reference = $"PEDIDO-{id}";
        var transaction = await _db.TransaccionesContables
            .FirstOrDefaultAsync(t => t.Referencia == reference, cancellationToken);
        if (transaction is not null) _db.TransaccionesContables.Remove(transaction);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task SyncOrderTransactionAsync(Recepcion order, CancellationToken cancellationToken)
    {
        var reference = $"PEDIDO-{order.IdRecepcion}";
        var transaction = await _db.TransaccionesContables
            .FirstOrDefaultAsync(t => t.Referencia == reference, cancellationToken);
        if (order.Estado == "cancelled")
        {
            if (transaction is not null) _db.TransaccionesContables.Remove(transaction);
            return;
        }

        var account = await EnsurePurchaseAccountAsync(cancellationToken);
        if (transaction is null)
        {
            _db.TransaccionesContables.Add(BuildOrderTransaction(order, account));
            return;
        }

        transaction.IdCuenta = account.IdCuenta;
        transaction.CuentaNombre = account.Nombre;
        transaction.Monto = OrderAmount(order);
        transaction.Descripcion = OrderDescription(order);
        transaction.Contacto = order.ProveedorNombre;
        transaction.RegistradoPor = order.RecibidoPor;
    }

    private async Task<CuentaContable> EnsurePurchaseAccountAsync(CancellationToken cancellationToken)
    {
        var account = await _db.CuentasContables
            .FirstOrDefaultAsync(c => c.Codigo == "5000", cancellationToken);
        if (account is not null) return account;

        account = new CuentaContable
        {
            Codigo = "5000",
            Nombre = "Compras de Mercancía",
            Tipo = "Gasto",
            Estado = true
        };
        _db.CuentasContables.Add(account);
        await _db.SaveChangesAsync(cancellationToken);
        return account;
    }

    private static TransaccionContable BuildOrderTransaction(Recepcion order, CuentaContable account) => new()
    {
        Fecha = order.FechaRecepcion,
        Tipo = "gasto",
        UbicacionId = "loc-prep",
        UbicacionNombre = "Pollo Centro - Prep",
        IdCuenta = account.IdCuenta,
        CuentaNombre = account.Nombre,
        Monto = OrderAmount(order),
        Descripcion = OrderDescription(order),
        MetodoPago = "pedido",
        Referencia = $"PEDIDO-{order.IdRecepcion}",
        Contacto = order.ProveedorNombre,
        RegistradoPor = order.RecibidoPor ?? "Sistema",
        FechaRegistro = DateTime.Now
    };

    private static decimal OrderAmount(Recepcion order)
        => order.Total > 0 ? order.Total : order.Cantidad * order.Precio;

    private static string OrderDescription(Recepcion order)
        => $"Pedido {(order.Estado == "completed" ? "recibido" : "pendiente")}: {order.Cantidad} de {order.ProductoNombre}";

    private async Task ReplenishInventoryAsync(int productId, decimal quantity, CancellationToken cancellationToken)
    {
        var producto = await _db.Productos.FirstOrDefaultAsync(p => p.IdProducto == productId, cancellationToken);
        if (producto is not null)
        {
            producto.CantidadDisponible += quantity;
            producto.FechaRegistro = DateTime.Now;
        }

        var alertas = await _db.Alertas
            .Where(a => a.IdProducto == productId)
            .ToListAsync(cancellationToken);
        if (alertas.Count > 0) _db.Alertas.RemoveRange(alertas);
    }

    private async Task<(Proveedor Supplier, Producto Product)> ResolveReferencesAsync(
        OrderReceptionInput input, CancellationToken cancellationToken)
    {
        if (!int.TryParse(input.SupplierId, out var supplierId) || supplierId <= 0)
            throw new ValidationException("El proveedor no es válido.");
        if (!int.TryParse(input.ProductId, out var productId) || productId <= 0)
            throw new ValidationException("El producto no es válido.");

        var supplier = await _db.Proveedores.AsNoTracking()
            .FirstOrDefaultAsync(p => p.IdProveedor == supplierId && p.Estado == true, cancellationToken)
            ?? throw new NotFoundException("Proveedor activo", supplierId);
        var product = await _db.Productos.AsNoTracking()
            .FirstOrDefaultAsync(p => p.IdProducto == productId && p.Estado != false, cancellationToken)
            ?? throw new NotFoundException("Producto activo", productId);
        return (supplier, product);
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

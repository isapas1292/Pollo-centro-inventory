using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PolloCentro.Api.Application.Common.Exceptions;
using PolloCentro.Api.Application.Common.Interfaces;
using PolloCentro.Api.Domain.Entities;

namespace PolloCentro.Api.Application.Dispatches;

public class DispatchService : IDispatchService
{
    private readonly IApplicationDbContext _db;

    public DispatchService(IApplicationDbContext db) => _db = db;

    public async Task<IReadOnlyList<DispatchDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var envios = await _db.Envios
            .AsNoTracking()
            .OrderByDescending(e => e.FechaEnvio)
            .ToListAsync(cancellationToken);
        return envios.Select(ToDto).ToList();
    }

    public async Task<DispatchDto> CreateAsync(DispatchInput input, CancellationToken cancellationToken = default)
    {
        var envio = new EnvioLocal
        {
            IdLocal = int.TryParse(input.LocationId, out var lid) ? lid : 0,
            LocalNombre = input.LocationName,
            ItemsJson = JsonSerializer.Serialize(input.Items ?? new()),
            EnviadoPorId = input.DispatchedById,
            EnviadoPor = input.DispatchedBy ?? string.Empty,
            Nota = input.Note,
            FechaEnvio = DateTime.Now
        };
        _db.Envios.Add(envio);

        var items = input.Items ?? new();
        decimal total = 0;

        // Precios de los ingredientes para valorar el envío.
        var prodIds = items.Where(i => i.Type == "ingrediente" && int.TryParse(i.RefId, out _))
                           .Select(i => int.Parse(i.RefId)).Distinct().ToList();
        var precios = prodIds.Count == 0
            ? new Dictionary<int, decimal>()
            : await _db.Productos.Where(p => prodIds.Contains(p.IdProducto))
                .ToDictionaryAsync(p => p.IdProducto, p => p.CostoUnitario, cancellationToken);

        foreach (var item in items)
        {
            if (item.Type == "receta" && int.TryParse(item.RefId, out var rid))
            {
                // Enviar una receta descuenta del stock de recetas YA preparadas (no los ingredientes,
                // que se descontaron al prepararla) y se valora a su precio de venta.
                var receta = await _db.Recetas.FirstOrDefaultAsync(r => r.IdReceta == rid, cancellationToken);
                if (receta is not null)
                {
                    receta.StockPreparado = Math.Max(0, receta.StockPreparado - item.Quantity);
                    total += item.Quantity * (receta.PrecioVenta ?? 0);
                }
            }
            else if (item.Type == "ingrediente" && int.TryParse(item.RefId, out var pid))
            {
                // Los ingredientes sueltos se valoran a su costo unitario. (El stock del producto
                // lo descuenta el frontend para disparar las alertas.)
                if (precios.TryGetValue(pid, out var costo)) total += item.Quantity * costo;
            }
        }

        await _db.SaveChangesAsync(cancellationToken);

        // Cada local es un cliente del almacén: el envío se registra como un INGRESO contable
        // atribuido a ese local.
        await RegisterIncomeTransactionAsync(envio, items, total, cancellationToken);

        return ToDto(envio);
    }

    /// <summary>Crea la transacción contable de ingreso para un envío a un local.</summary>
    private async Task RegisterIncomeTransactionAsync(
        EnvioLocal envio, List<DispatchItemDto> items, decimal total, CancellationToken cancellationToken)
    {
        var cuenta = await EnsureSalesAccountAsync(cancellationToken);

        var detalle = string.Join(", ", items.Select(i => $"{i.Quantity} {i.Name}"));
        var descripcion = $"Envío a {envio.LocalNombre}: {detalle}";
        if (descripcion.Length > 255) descripcion = descripcion[..255];

        _db.TransaccionesContables.Add(new TransaccionContable
        {
            Fecha = envio.FechaEnvio,
            Tipo = "ingreso",
            UbicacionId = envio.IdLocal.ToString(),
            UbicacionNombre = envio.LocalNombre,
            IdCuenta = cuenta.IdCuenta,
            CuentaNombre = cuenta.Nombre,
            Monto = total,
            Descripcion = descripcion,
            Contacto = envio.LocalNombre,
            Referencia = $"ENVIO-{envio.IdEnvio}",
            RegistradoPor = envio.EnviadoPor,
            FechaRegistro = DateTime.Now
        });
        await _db.SaveChangesAsync(cancellationToken);
    }

    /// <summary>Obtiene (o crea) la cuenta de ingreso "Ventas a Locales".</summary>
    private async Task<CuentaContable> EnsureSalesAccountAsync(CancellationToken cancellationToken)
    {
        var cuenta = await _db.CuentasContables.FirstOrDefaultAsync(c => c.Codigo == "4030", cancellationToken);
        if (cuenta is null)
        {
            cuenta = new CuentaContable { Codigo = "4030", Nombre = "Ventas a Locales", Tipo = "Ingreso", Estado = true };
            _db.CuentasContables.Add(cuenta);
            await _db.SaveChangesAsync(cancellationToken);
        }
        return cuenta;
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var envio = await _db.Envios.FirstOrDefaultAsync(e => e.IdEnvio == id, cancellationToken)
            ?? throw new NotFoundException("Envío", id);
        _db.Envios.Remove(envio);

        // Elimina también la transacción contable asociada al envío.
        var referencia = $"ENVIO-{id}";
        var tx = await _db.TransaccionesContables
            .Where(t => t.Referencia == referencia)
            .ToListAsync(cancellationToken);
        if (tx.Count > 0) _db.TransaccionesContables.RemoveRange(tx);

        await _db.SaveChangesAsync(cancellationToken);
    }

    private static DispatchDto ToDto(EnvioLocal e)
    {
        List<DispatchItemDto> items;
        try
        {
            items = JsonSerializer.Deserialize<List<DispatchItemDto>>(e.ItemsJson) ?? new();
        }
        catch
        {
            items = new();
        }

        return new DispatchDto
        {
            Id = e.IdEnvio.ToString(),
            LocationId = e.IdLocal.ToString(),
            LocationName = e.LocalNombre,
            Items = items,
            DispatchedById = e.EnviadoPorId,
            DispatchedBy = e.EnviadoPor,
            Note = e.Nota,
            CreatedAt = e.FechaEnvio
        };
    }
}

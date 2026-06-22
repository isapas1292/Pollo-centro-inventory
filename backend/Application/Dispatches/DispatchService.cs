using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PolloCentro.Api.Application.Alerts;
using PolloCentro.Api.Application.Common.Exceptions;
using PolloCentro.Api.Application.Common.Interfaces;
using PolloCentro.Api.Domain.Entities;

namespace PolloCentro.Api.Application.Dispatches;

public class DispatchService : IDispatchService
{
    private readonly IApplicationDbContext _db;
    private readonly IAlertService _alerts;

    public DispatchService(IApplicationDbContext db, IAlertService alerts)
    {
        _db = db;
        _alerts = alerts;
    }

    public async Task<IReadOnlyList<DispatchDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var envios = await _db.Envios
            .AsNoTracking()
            .OrderByDescending(e => e.FechaEnvio)
            .ToListAsync(cancellationToken);
        var localIds = envios.Select(e => e.IdLocal).Distinct().ToList();
        var locationCodes = await _db.Locales.AsNoTracking()
            .Where(l => localIds.Contains(l.IdLocal))
            .ToDictionaryAsync(l => l.IdLocal, l => l.Codigo, cancellationToken);
        return envios.Select(e => ToDto(e, locationCodes.GetValueOrDefault(e.IdLocal))).ToList();
    }

    public async Task<DispatchDto> CreateAsync(DispatchInput input, CancellationToken cancellationToken = default)
    {
        var local = await ResolveLocalAsync(input.LocationId, cancellationToken);
        var items = input.Items ?? [];
        if (items.Count == 0)
            throw new ValidationException("El envío debe contener al menos un artículo.");

        var envio = new EnvioLocal
        {
            IdLocal = local.IdLocal,
            LocalNombre = local.Nombre,
            ItemsJson = "[]",
            EnviadoPorId = input.DispatchedById,
            EnviadoPor = input.DispatchedBy ?? string.Empty,
            Nota = input.Note,
            FechaEnvio = DateTime.Now
        };
        _db.Envios.Add(envio);

        decimal total = 0;

        // Precios de los ingredientes para valorar el envío.
        var prodIds = items.Where(i => i.Type == "ingrediente" && int.TryParse(i.RefId, out _))
                           .Select(i => int.Parse(i.RefId)).Distinct().ToList();
        var products = prodIds.Count == 0
            ? new Dictionary<int, Producto>()
            : await _db.Productos.Where(p => prodIds.Contains(p.IdProducto))
                .ToDictionaryAsync(p => p.IdProducto, cancellationToken);

        var recipeIds = items.Where(i => i.Type == "receta" && int.TryParse(i.RefId, out _))
            .Select(i => int.Parse(i.RefId)).Distinct().ToList();
        var recipes = recipeIds.Count == 0
            ? new Dictionary<int, Receta>()
            : await _db.Recetas.Where(r => recipeIds.Contains(r.IdReceta))
                .ToDictionaryAsync(r => r.IdReceta, cancellationToken);

        foreach (var item in items)
        {
            if (item.Type == "receta" && int.TryParse(item.RefId, out var rid))
            {
                // Enviar una receta descuenta del stock de recetas YA preparadas (no los ingredientes,
                // que se descontaron al prepararla) y se valora a su precio de venta.
                if (!recipes.TryGetValue(rid, out var receta))
                    throw new NotFoundException("Receta", rid);
                if (receta.StockPreparado < item.Quantity)
                    throw new ValidationException($"Stock preparado insuficiente para {receta.NombreReceta}.");
                receta.StockPreparado -= item.Quantity;
                item.Name = receta.NombreReceta;
                total += item.Quantity * (receta.PrecioVenta ?? 0);
            }
            else if (item.Type == "ingrediente" && int.TryParse(item.RefId, out var pid))
            {
                if (!products.TryGetValue(pid, out var product))
                    throw new NotFoundException("Producto", pid);
                if (product.CantidadDisponible < item.Quantity)
                    throw new ValidationException($"Stock insuficiente para {product.NombreProducto}.");
                product.CantidadDisponible -= item.Quantity;
                product.FechaRegistro = DateTime.Now;
                item.Name = product.NombreProducto;
                item.Unit = product.UnidadMedida;
                total += item.Quantity * product.CostoUnitario;
            }
            else
                throw new ValidationException("El artículo del envío contiene una referencia inválida.");
        }

        if (total <= 0)
            throw new ValidationException("El envío no puede contabilizarse porque sus artículos no tienen valor.");
        envio.ItemsJson = JsonSerializer.Serialize(items);

        await _db.SaveChangesAsync(cancellationToken);

        foreach (var product in products.Values.Where(p => p.CantidadDisponible <= p.StockMinimo * 1.5m))
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
        }

        // Cada local es un cliente del almacén: el envío se registra como un INGRESO contable
        // atribuido a ese local.
        await RegisterIncomeTransactionAsync(envio, local.Codigo, items, total, cancellationToken);

        return ToDto(envio, local.Codigo);
    }

    /// <summary>Crea la transacción contable de ingreso para un envío a un local.</summary>
    private async Task RegisterIncomeTransactionAsync(
        EnvioLocal envio, string locationCode, List<DispatchItemDto> items, decimal total,
        CancellationToken cancellationToken)
    {
        var cuenta = await EnsureSalesAccountAsync(cancellationToken);

        var detalle = string.Join(", ", items.Select(i => $"{i.Quantity} {i.Name}"));
        var descripcion = $"Envío a {envio.LocalNombre}: {detalle}";
        if (descripcion.Length > 255) descripcion = descripcion[..255];

        _db.TransaccionesContables.Add(new TransaccionContable
        {
            Fecha = envio.FechaEnvio,
            Tipo = "ingreso",
            UbicacionId = locationCode,
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

    private async Task<Local> ResolveLocalAsync(string value, CancellationToken cancellationToken)
    {
        var numericId = int.TryParse(value, out var parsed) ? parsed : 0;
        return await _db.Locales.AsNoTracking()
            .FirstOrDefaultAsync(l => l.Estado && (l.Codigo == value || l.IdLocal == numericId), cancellationToken)
            ?? throw new ValidationException("El local destino no es válido.");
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

    private static DispatchDto ToDto(EnvioLocal e, string? locationCode)
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
            LocationId = locationCode ?? e.IdLocal.ToString(),
            LocationName = e.LocalNombre,
            Items = items,
            DispatchedById = e.EnviadoPorId,
            DispatchedBy = e.EnviadoPor,
            Note = e.Nota,
            CreatedAt = e.FechaEnvio
        };
    }
}

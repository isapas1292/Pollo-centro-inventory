using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PolloCentro.Api.Application.Abstractions.Notifications;
using PolloCentro.Api.Application.Common.Exceptions;
using PolloCentro.Api.Application.Common.Interfaces;
using PolloCentro.Api.Domain.Entities;

namespace PolloCentro.Api.Application.Alerts;

public class AlertService : IAlertService
{
    private readonly IApplicationDbContext _db;
    private readonly IWhatsAppSender _whatsapp;
    private readonly ILogger<AlertService> _logger;

    public AlertService(IApplicationDbContext db, IWhatsAppSender whatsapp, ILogger<AlertService> logger)
    {
        _db = db;
        _whatsapp = whatsapp;
        _logger = logger;
    }

    public async Task<IReadOnlyList<AlertDto>> GetAllAsync(CancellationToken cancellationToken = default)
        => await _db.Alertas
            .AsNoTracking()
            .OrderByDescending(a => a.FechaCreacion)
            .Select(a => ToDto(a))
            .ToListAsync(cancellationToken);

    public async Task<AlertDto> CreateAsync(AlertInput input, CancellationToken cancellationToken = default)
    {
        var alerta = new Alerta
        {
            IdProducto = int.TryParse(input.ProductId, out var pid) ? pid : 0,
            ProductoNombre = input.ProductName,
            StockActual = input.CurrentStock,
            StockMinimo = input.MinStock,
            Unidad = input.Unit,
            Estado = string.IsNullOrEmpty(input.Status) ? "active" : input.Status,
            WhatsappEnviado = input.WhatsappSent ?? false,
            FechaCreacion = DateTime.Now
        };
        _db.Alertas.Add(alerta);
        await _db.SaveChangesAsync(cancellationToken);

        // Envío automático: solo cuando la alerta está activa y el stock ya llegó (o bajó) del mínimo.
        if (alerta.Estado == "active" && alerta.StockActual <= alerta.StockMinimo)
        {
            var sent = await TrySendWhatsappAsync(alerta, cancellationToken);
            if (sent && !alerta.WhatsappEnviado)
            {
                alerta.WhatsappEnviado = true;
                await _db.SaveChangesAsync(cancellationToken);
            }
        }

        return ToDto(alerta);
    }

    public async Task<bool> NotifyAsync(int id, CancellationToken cancellationToken = default)
    {
        var alerta = await Find(id, cancellationToken);
        var sent = await TrySendWhatsappAsync(alerta, cancellationToken);
        if (sent && !alerta.WhatsappEnviado)
        {
            alerta.WhatsappEnviado = true;
            await _db.SaveChangesAsync(cancellationToken);
        }
        return sent;
    }

    /// <summary>Intenta enviar el WhatsApp de una alerta sin propagar errores.</summary>
    private async Task<bool> TrySendWhatsappAsync(Alerta alerta, CancellationToken cancellationToken)
    {
        try
        {
            return await _whatsapp.SendStockAlertAsync(
                alerta.ProductoNombre, alerta.StockActual, alerta.StockMinimo, alerta.Unidad, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error enviando WhatsApp para la alerta {Id} ({Producto}).", alerta.IdAlerta, alerta.ProductoNombre);
            return false;
        }
    }

    public async Task<AlertDto> UpdateAsync(int id, AlertInput input, CancellationToken cancellationToken = default)
    {
        var alerta = await Find(id, cancellationToken);
        alerta.StockActual = input.CurrentStock;
        alerta.StockMinimo = input.MinStock;
        if (!string.IsNullOrEmpty(input.Unit)) alerta.Unidad = input.Unit;
        if (!string.IsNullOrEmpty(input.Status))
        {
            alerta.Estado = input.Status;
            alerta.FechaResolucion = input.Status == "resolved" ? DateTime.Now : null;
        }
        if (input.WhatsappSent.HasValue) alerta.WhatsappEnviado = input.WhatsappSent.Value;

        await _db.SaveChangesAsync(cancellationToken);
        return ToDto(alerta);
    }

    public async Task ResolveAsync(int id, CancellationToken cancellationToken = default)
    {
        var alerta = await Find(id, cancellationToken);
        alerta.Estado = "resolved";
        alerta.FechaResolucion = DateTime.Now;
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task MarkWhatsappAsync(int id, CancellationToken cancellationToken = default)
    {
        var alerta = await Find(id, cancellationToken);
        alerta.WhatsappEnviado = true;
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var alerta = await Find(id, cancellationToken);
        _db.Alertas.Remove(alerta);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task<Alerta> Find(int id, CancellationToken cancellationToken)
        => await _db.Alertas.FirstOrDefaultAsync(a => a.IdAlerta == id, cancellationToken)
           ?? throw new NotFoundException("Alerta", id);

    private static AlertDto ToDto(Alerta a) => new()
    {
        Id = a.IdAlerta.ToString(),
        ProductId = a.IdProducto.ToString(),
        ProductName = a.ProductoNombre,
        CurrentStock = a.StockActual,
        MinStock = a.StockMinimo,
        Unit = a.Unidad,
        Status = a.Estado,
        WhatsappSent = a.WhatsappEnviado,
        CreatedAt = a.FechaCreacion,
        ResolvedAt = a.FechaResolucion
    };
}

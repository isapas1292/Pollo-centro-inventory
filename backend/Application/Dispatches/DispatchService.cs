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
        await _db.SaveChangesAsync(cancellationToken);
        return ToDto(envio);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var envio = await _db.Envios.FirstOrDefaultAsync(e => e.IdEnvio == id, cancellationToken)
            ?? throw new NotFoundException("Envío", id);
        _db.Envios.Remove(envio);
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

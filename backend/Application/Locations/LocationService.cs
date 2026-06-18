using Microsoft.EntityFrameworkCore;
using PolloCentro.Api.Application.Common.Interfaces;

namespace PolloCentro.Api.Application.Locations;

public class LocationDto
{
    public string Id { get; set; } = string.Empty;     // Codigo (p. ej. "loc-union")
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
}

public interface ILocationService
{
    Task<IReadOnlyList<LocationDto>> GetAllAsync(CancellationToken cancellationToken = default);
}

public class LocationService : ILocationService
{
    private readonly IApplicationDbContext _db;

    public LocationService(IApplicationDbContext db) => _db = db;

    public async Task<IReadOnlyList<LocationDto>> GetAllAsync(CancellationToken cancellationToken = default)
        => await _db.Locales
            .AsNoTracking()
            .Where(l => l.Estado)
            .OrderBy(l => l.Nombre)
            .Select(l => new LocationDto { Id = l.Codigo, Name = l.Nombre, Address = l.Direccion })
            .ToListAsync(cancellationToken);
}

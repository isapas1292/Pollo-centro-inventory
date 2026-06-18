using Microsoft.EntityFrameworkCore;
using PolloCentro.Api.Application.Common.Interfaces;
using PolloCentro.Api.Domain.Entities;

namespace PolloCentro.Api.Application.Audit;

public class AuditService : IAuditService
{
    private readonly IApplicationDbContext _db;

    public AuditService(IApplicationDbContext db) => _db = db;

    public async Task<IReadOnlyList<AuditLogDto>> GetAllAsync(CancellationToken cancellationToken = default)
        => await _db.Auditorias
            .AsNoTracking()
            .OrderByDescending(a => a.FechaHora)
            .Select(a => new AuditLogDto
            {
                Id = a.IdAuditoria.ToString(),
                UserId = a.IdUsuario ?? string.Empty,
                UserName = a.UsuarioNombre ?? string.Empty,
                Action = a.Accion,
                Details = a.Detalles ?? string.Empty,
                Timestamp = a.FechaHora
            })
            .ToListAsync(cancellationToken);

    public async Task<AuditLogDto> CreateAsync(AuditLogInput input, CancellationToken cancellationToken = default)
    {
        var entry = new Auditoria
        {
            IdUsuario = input.UserId,
            UsuarioNombre = input.UserName,
            Accion = input.Action,
            Detalles = input.Details,
            FechaHora = DateTime.Now
        };
        _db.Auditorias.Add(entry);
        await _db.SaveChangesAsync(cancellationToken);

        return new AuditLogDto
        {
            Id = entry.IdAuditoria.ToString(),
            UserId = entry.IdUsuario ?? string.Empty,
            UserName = entry.UsuarioNombre ?? string.Empty,
            Action = entry.Accion,
            Details = entry.Detalles ?? string.Empty,
            Timestamp = entry.FechaHora
        };
    }
}

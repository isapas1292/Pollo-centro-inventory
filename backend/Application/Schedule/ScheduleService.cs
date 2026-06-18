using Microsoft.EntityFrameworkCore;
using PolloCentro.Api.Application.Common.Exceptions;
using PolloCentro.Api.Application.Common.Interfaces;
using PolloCentro.Api.Domain.Entities;

namespace PolloCentro.Api.Application.Schedule;

public class ScheduleService : IScheduleService
{
    private readonly IApplicationDbContext _db;

    public ScheduleService(IApplicationDbContext db) => _db = db;

    public async Task<IReadOnlyList<ShiftDto>> GetAllAsync(string? weekKey, CancellationToken cancellationToken = default)
    {
        var query = _db.Turnos.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(weekKey))
            query = query.Where(t => t.SemanaKey == weekKey);

        return await query
            .Select(t => new ShiftDto
            {
                Id = t.IdTurno.ToString(),
                EmployeeId = t.IdEmpleado.ToString(),
                EmployeeName = t.EmpleadoNombre,
                LocationId = t.UbicacionId,
                LocationName = t.UbicacionNombre,
                DayOfWeek = t.DiaSemana,
                StartTime = t.HoraInicio,
                EndTime = t.HoraFin,
                WeekKey = t.SemanaKey
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<ShiftDto> CreateAsync(ShiftInput input, CancellationToken cancellationToken = default)
    {
        var turno = Map(new Turno(), input);
        _db.Turnos.Add(turno);
        await _db.SaveChangesAsync(cancellationToken);
        return ToDto(turno);
    }

    public async Task<ShiftDto> UpdateAsync(int id, ShiftInput input, CancellationToken cancellationToken = default)
    {
        var turno = await _db.Turnos.FirstOrDefaultAsync(t => t.IdTurno == id, cancellationToken)
            ?? throw new NotFoundException("Turno", id);

        Map(turno, input);
        await _db.SaveChangesAsync(cancellationToken);
        return ToDto(turno);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var turno = await _db.Turnos.FirstOrDefaultAsync(t => t.IdTurno == id, cancellationToken)
            ?? throw new NotFoundException("Turno", id);

        _db.Turnos.Remove(turno);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private static Turno Map(Turno t, ShiftInput i)
    {
        t.IdEmpleado = int.TryParse(i.EmployeeId, out var eid) ? eid : 0;
        t.EmpleadoNombre = i.EmployeeName;
        t.UbicacionId = i.LocationId;
        t.UbicacionNombre = i.LocationName;
        t.DiaSemana = i.DayOfWeek;
        t.HoraInicio = i.StartTime;
        t.HoraFin = i.EndTime;
        t.SemanaKey = i.WeekKey;
        return t;
    }

    private static ShiftDto ToDto(Turno t) => new()
    {
        Id = t.IdTurno.ToString(),
        EmployeeId = t.IdEmpleado.ToString(),
        EmployeeName = t.EmpleadoNombre,
        LocationId = t.UbicacionId,
        LocationName = t.UbicacionNombre,
        DayOfWeek = t.DiaSemana,
        StartTime = t.HoraInicio,
        EndTime = t.HoraFin,
        WeekKey = t.SemanaKey
    };
}

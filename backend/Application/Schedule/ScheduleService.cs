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
        var references = await ResolveReferencesAsync(input, cancellationToken);
        var turno = Map(new Turno(), input, references.Employee, references.Location);
        _db.Turnos.Add(turno);
        await _db.SaveChangesAsync(cancellationToken);
        return ToDto(turno);
    }

    public async Task<int> CreateManyAsync(BulkShiftInput input, CancellationToken cancellationToken = default)
    {
        if (!string.IsNullOrWhiteSpace(input.ReplaceWeekKey))
        {
            var existing = await _db.Turnos
                .Where(t => t.SemanaKey == input.ReplaceWeekKey)
                .ToListAsync(cancellationToken);
            _db.Turnos.RemoveRange(existing);
        }

        var nuevos = new List<Turno>();
        foreach (var shift in input.Shifts ?? [])
        {
            var references = await ResolveReferencesAsync(shift, cancellationToken);
            nuevos.Add(Map(new Turno(), shift, references.Employee, references.Location));
        }
        _db.Turnos.AddRange(nuevos);
        await _db.SaveChangesAsync(cancellationToken);
        return nuevos.Count;
    }

    public async Task<ShiftDto> UpdateAsync(int id, ShiftInput input, CancellationToken cancellationToken = default)
    {
        var turno = await _db.Turnos.FirstOrDefaultAsync(t => t.IdTurno == id, cancellationToken)
            ?? throw new NotFoundException("Turno", id);

        var references = await ResolveReferencesAsync(input, cancellationToken);
        Map(turno, input, references.Employee, references.Location);
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

    private static Turno Map(Turno t, ShiftInput i, Empleado employee, Local location)
    {
        t.IdEmpleado = employee.IdEmpleado;
        t.EmpleadoNombre = employee.Nombre;
        t.UbicacionId = location.Codigo;
        t.UbicacionNombre = location.Nombre;
        t.DiaSemana = i.DayOfWeek;
        t.HoraInicio = i.StartTime;
        t.HoraFin = i.EndTime;
        t.SemanaKey = i.WeekKey;
        return t;
    }

    private async Task<(Empleado Employee, Local Location)> ResolveReferencesAsync(
        ShiftInput input, CancellationToken cancellationToken)
    {
        if (!int.TryParse(input.EmployeeId, out var employeeId) || employeeId <= 0)
            throw new ValidationException("El empleado no es válido.");
        if (string.CompareOrdinal(input.StartTime, input.EndTime) >= 0)
            throw new ValidationException("La hora de salida debe ser posterior a la hora de entrada.");

        var employee = await _db.Empleados.AsNoTracking()
            .FirstOrDefaultAsync(e => e.IdEmpleado == employeeId && e.Estado, cancellationToken)
            ?? throw new NotFoundException("Empleado activo", employeeId);
        var numericLocationId = int.TryParse(input.LocationId, out var parsed) ? parsed : 0;
        var location = await _db.Locales.AsNoTracking()
            .FirstOrDefaultAsync(l => l.Estado && (l.Codigo == input.LocationId || l.IdLocal == numericLocationId), cancellationToken)
            ?? throw new ValidationException("El local no es válido.");
        return (employee, location);
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

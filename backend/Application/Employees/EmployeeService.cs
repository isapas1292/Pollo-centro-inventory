using Microsoft.EntityFrameworkCore;
using PolloCentro.Api.Application.Common.Exceptions;
using PolloCentro.Api.Application.Common.Interfaces;
using PolloCentro.Api.Domain.Entities;

namespace PolloCentro.Api.Application.Employees;

public class EmployeeService : IEmployeeService
{
    private readonly IApplicationDbContext _db;

    public EmployeeService(IApplicationDbContext db) => _db = db;

    public async Task<IReadOnlyList<EmployeeDto>> GetAllAsync(CancellationToken cancellationToken = default)
        => await _db.Empleados
            .AsNoTracking()
            .OrderBy(e => e.Nombre)
            .Select(e => new EmployeeDto
            {
                Id = e.IdEmpleado.ToString(),
                Name = e.Nombre,
                Role = e.Rol,
                Phone = e.Telefono,
                Active = e.Estado,
                LocationId = e.IdLocal == null ? null : e.IdLocal.ToString(),
                LocationName = e.LocalNombre
            })
            .ToListAsync(cancellationToken);

    public async Task<EmployeeDto> CreateAsync(EmployeeInput input, CancellationToken cancellationToken = default)
    {
        var empleado = new Empleado
        {
            Nombre = input.Name,
            Rol = input.Role,
            Telefono = input.Phone,
            Estado = input.Active,
            IdLocal = int.TryParse(input.LocationId, out var lid) ? lid : null,
            LocalNombre = input.LocationName
        };
        _db.Empleados.Add(empleado);
        await _db.SaveChangesAsync(cancellationToken);
        return ToDto(empleado);
    }

    public async Task<EmployeeDto> UpdateAsync(int id, EmployeeInput input, CancellationToken cancellationToken = default)
    {
        var empleado = await _db.Empleados.FirstOrDefaultAsync(e => e.IdEmpleado == id, cancellationToken)
            ?? throw new NotFoundException("Empleado", id);

        empleado.Nombre = input.Name;
        empleado.Rol = input.Role;
        empleado.Telefono = input.Phone;
        empleado.Estado = input.Active;
        empleado.IdLocal = int.TryParse(input.LocationId, out var lid) ? lid : null;
        empleado.LocalNombre = input.LocationName;

        await _db.SaveChangesAsync(cancellationToken);
        return ToDto(empleado);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var empleado = await _db.Empleados.FirstOrDefaultAsync(e => e.IdEmpleado == id, cancellationToken)
            ?? throw new NotFoundException("Empleado", id);

        // También se eliminan los turnos del empleado (no hay cascada por FK).
        var turnos = await _db.Turnos.Where(t => t.IdEmpleado == id).ToListAsync(cancellationToken);
        _db.Turnos.RemoveRange(turnos);
        _db.Empleados.Remove(empleado);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private static EmployeeDto ToDto(Empleado e) => new()
    {
        Id = e.IdEmpleado.ToString(),
        Name = e.Nombre,
        Role = e.Rol,
        Phone = e.Telefono,
        LocationId = e.IdLocal?.ToString(),
        LocationName = e.LocalNombre,
        Active = e.Estado
    };
}

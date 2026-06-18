using Microsoft.EntityFrameworkCore;
using PolloCentro.Api.Application.Common.Exceptions;
using PolloCentro.Api.Application.Common.Interfaces;
using PolloCentro.Api.Domain.Entities;

namespace PolloCentro.Api.Application.Accounting;

public class AccountService : IAccountService
{
    private readonly IApplicationDbContext _db;

    public AccountService(IApplicationDbContext db) => _db = db;

    public async Task<IReadOnlyList<AccountDto>> GetAllAsync(CancellationToken cancellationToken = default)
        => await _db.CuentasContables
            .AsNoTracking()
            .OrderBy(c => c.Codigo)
            .Select(c => new AccountDto
            {
                Id = c.IdCuenta.ToString(),
                Code = c.Codigo,
                Name = c.Nombre,
                Type = c.Tipo,
                Description = c.Descripcion,
                Active = c.Estado
            })
            .ToListAsync(cancellationToken);

    public async Task<AccountDto> CreateAsync(AccountInput input, CancellationToken cancellationToken = default)
    {
        if (await _db.CuentasContables.AnyAsync(c => c.Codigo == input.Code, cancellationToken))
            throw new ValidationException($"Ya existe una cuenta con el código '{input.Code}'");

        var cuenta = new CuentaContable
        {
            Codigo = input.Code,
            Nombre = input.Name,
            Tipo = input.Type,
            Descripcion = input.Description,
            Estado = input.Active
        };
        _db.CuentasContables.Add(cuenta);
        await _db.SaveChangesAsync(cancellationToken);
        return ToDto(cuenta);
    }

    public async Task<AccountDto> UpdateAsync(int id, AccountInput input, CancellationToken cancellationToken = default)
    {
        var cuenta = await _db.CuentasContables.FirstOrDefaultAsync(c => c.IdCuenta == id, cancellationToken)
            ?? throw new NotFoundException("Cuenta", id);

        cuenta.Codigo = input.Code;
        cuenta.Nombre = input.Name;
        cuenta.Tipo = input.Type;
        cuenta.Descripcion = input.Description;
        cuenta.Estado = input.Active;

        await _db.SaveChangesAsync(cancellationToken);
        return ToDto(cuenta);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var cuenta = await _db.CuentasContables.FirstOrDefaultAsync(c => c.IdCuenta == id, cancellationToken)
            ?? throw new NotFoundException("Cuenta", id);

        if (await _db.TransaccionesContables.AnyAsync(t => t.IdCuenta == id, cancellationToken))
            throw new ValidationException("No se puede eliminar una cuenta con transacciones asociadas. Desactívela en su lugar.");

        _db.CuentasContables.Remove(cuenta);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private static AccountDto ToDto(CuentaContable c) => new()
    {
        Id = c.IdCuenta.ToString(),
        Code = c.Codigo,
        Name = c.Nombre,
        Type = c.Tipo,
        Description = c.Descripcion,
        Active = c.Estado
    };
}

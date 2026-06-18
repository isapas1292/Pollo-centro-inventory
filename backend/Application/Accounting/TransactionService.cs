using Microsoft.EntityFrameworkCore;
using PolloCentro.Api.Application.Common.Exceptions;
using PolloCentro.Api.Application.Common.Interfaces;
using PolloCentro.Api.Domain.Entities;

namespace PolloCentro.Api.Application.Accounting;

public class TransactionService : ITransactionService
{
    private static readonly string[] MesesAbrev =
        ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

    private readonly IApplicationDbContext _db;

    public TransactionService(IApplicationDbContext db) => _db = db;

    public async Task<IReadOnlyList<TransactionDto>> GetAllAsync(
        DateTime? from, DateTime? to, CancellationToken cancellationToken = default)
    {
        var query = _db.TransaccionesContables.AsNoTracking().AsQueryable();
        if (from.HasValue) query = query.Where(t => t.Fecha >= from.Value);
        if (to.HasValue) query = query.Where(t => t.Fecha <= to.Value);

        return await query
            .OrderByDescending(t => t.Fecha)
            .Select(t => new TransactionDto
            {
                Id = t.IdTransaccion.ToString(),
                Date = t.Fecha,
                Type = t.Tipo,
                AccountId = t.IdCuenta.ToString(),
                AccountName = t.CuentaNombre,
                AccountType = _db.CuentasContables
                    .Where(c => c.IdCuenta == t.IdCuenta)
                    .Select(c => c.Tipo)
                    .FirstOrDefault() ?? string.Empty,
                Amount = t.Monto,
                Description = t.Descripcion,
                PaymentMethod = t.MetodoPago,
                Reference = t.Referencia,
                Contact = t.Contacto,
                RecordedBy = t.RegistradoPor
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<TransactionDto> CreateAsync(TransactionInput input, CancellationToken cancellationToken = default)
    {
        var cuenta = await ResolveAccountAsync(input.AccountId, cancellationToken);

        var tx = new TransaccionContable
        {
            Fecha = input.Date ?? DateTime.Now,
            Tipo = NormalizeType(input.Type),
            IdCuenta = cuenta.IdCuenta,
            CuentaNombre = cuenta.Nombre,
            Monto = input.Amount,
            Descripcion = input.Description,
            MetodoPago = input.PaymentMethod,
            Referencia = input.Reference,
            Contacto = input.Contact,
            RegistradoPor = input.RecordedBy,
            FechaRegistro = DateTime.Now
        };
        _db.TransaccionesContables.Add(tx);
        await _db.SaveChangesAsync(cancellationToken);
        return ToDto(tx, cuenta.Tipo);
    }

    public async Task<TransactionDto> UpdateAsync(int id, TransactionInput input, CancellationToken cancellationToken = default)
    {
        var tx = await _db.TransaccionesContables.FirstOrDefaultAsync(t => t.IdTransaccion == id, cancellationToken)
            ?? throw new NotFoundException("Transacción", id);

        var cuenta = await ResolveAccountAsync(input.AccountId, cancellationToken);

        tx.Fecha = input.Date ?? tx.Fecha;
        tx.Tipo = NormalizeType(input.Type);
        tx.IdCuenta = cuenta.IdCuenta;
        tx.CuentaNombre = cuenta.Nombre;
        tx.Monto = input.Amount;
        tx.Descripcion = input.Description;
        tx.MetodoPago = input.PaymentMethod;
        tx.Referencia = input.Reference;
        tx.Contacto = input.Contact;

        await _db.SaveChangesAsync(cancellationToken);
        return ToDto(tx, cuenta.Tipo);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var tx = await _db.TransaccionesContables.FirstOrDefaultAsync(t => t.IdTransaccion == id, cancellationToken)
            ?? throw new NotFoundException("Transacción", id);

        _db.TransaccionesContables.Remove(tx);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<AccountingSummaryDto> GetSummaryAsync(
        DateTime? from, DateTime? to, CancellationToken cancellationToken = default)
    {
        var query = _db.TransaccionesContables.AsNoTracking().AsQueryable();
        if (from.HasValue) query = query.Where(t => t.Fecha >= from.Value);
        if (to.HasValue) query = query.Where(t => t.Fecha <= to.Value);

        var data = await query
            .Select(t => new { t.Tipo, t.CuentaNombre, t.Monto, t.Fecha })
            .ToListAsync(cancellationToken);

        var income = data.Where(d => d.Tipo == "ingreso").ToList();
        var expense = data.Where(d => d.Tipo == "gasto").ToList();

        var summary = new AccountingSummaryDto
        {
            TotalIncome = income.Sum(d => d.Monto),
            TotalExpenses = expense.Sum(d => d.Monto),
            TransactionCount = data.Count,
            IncomeByAccount = income
                .GroupBy(d => d.CuentaNombre)
                .Select(g => new CategoryAmountDto { Account = g.Key, Amount = g.Sum(x => x.Monto) })
                .OrderByDescending(c => c.Amount).ToList(),
            ExpenseByAccount = expense
                .GroupBy(d => d.CuentaNombre)
                .Select(g => new CategoryAmountDto { Account = g.Key, Amount = g.Sum(x => x.Monto) })
                .OrderByDescending(c => c.Amount).ToList(),
            Monthly = data
                .GroupBy(d => new { d.Fecha.Year, d.Fecha.Month })
                .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
                .Select(g => new MonthlyPointDto
                {
                    Period = $"{g.Key.Year}-{g.Key.Month:D2}",
                    Label = $"{MesesAbrev[g.Key.Month - 1]} {g.Key.Year}",
                    Income = g.Where(x => x.Tipo == "ingreso").Sum(x => x.Monto),
                    Expense = g.Where(x => x.Tipo == "gasto").Sum(x => x.Monto)
                }).ToList()
        };
        summary.NetProfit = summary.TotalIncome - summary.TotalExpenses;
        return summary;
    }

    private async Task<CuentaContable> ResolveAccountAsync(string accountId, CancellationToken cancellationToken)
    {
        if (!int.TryParse(accountId, out var id))
            throw new ValidationException("Cuenta inválida");
        return await _db.CuentasContables.FirstOrDefaultAsync(c => c.IdCuenta == id, cancellationToken)
            ?? throw new ValidationException($"No existe la cuenta con id {accountId}");
    }

    private static string NormalizeType(string type)
    {
        var t = type.Trim().ToLowerInvariant();
        return t == "ingreso" || t == "gasto" ? t : "gasto";
    }

    private static TransactionDto ToDto(TransaccionContable t, string accountType) => new()
    {
        Id = t.IdTransaccion.ToString(),
        Date = t.Fecha,
        Type = t.Tipo,
        AccountId = t.IdCuenta.ToString(),
        AccountName = t.CuentaNombre,
        AccountType = accountType,
        Amount = t.Monto,
        Description = t.Descripcion,
        PaymentMethod = t.MetodoPago,
        Reference = t.Referencia,
        Contact = t.Contacto,
        RecordedBy = t.RegistradoPor
    };
}

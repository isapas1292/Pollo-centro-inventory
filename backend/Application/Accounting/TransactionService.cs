using ClosedXML.Excel;
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

    private IQueryable<TransaccionContable> Filtered(string? local, DateTime? from, DateTime? to)
    {
        var query = _db.TransaccionesContables.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(local) && local != "all")
            query = query.Where(t => t.UbicacionId == local);
        if (from.HasValue) query = query.Where(t => t.Fecha >= from.Value);
        if (to.HasValue) query = query.Where(t => t.Fecha <= to.Value);
        return query;
    }

    public async Task<IReadOnlyList<TransactionDto>> GetAllAsync(
        string? local, DateTime? from, DateTime? to, CancellationToken cancellationToken = default)
    {
        return await Filtered(local, from, to)
            .OrderByDescending(t => t.Fecha)
            .Select(t => new TransactionDto
            {
                Id = t.IdTransaccion.ToString(),
                Date = t.Fecha,
                Type = t.Tipo,
                LocalId = t.UbicacionId,
                LocalName = t.UbicacionNombre,
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
        var localNombre = await ResolveLocalNameAsync(input.LocalId, cancellationToken);

        var tx = new TransaccionContable
        {
            Fecha = input.Date ?? DateTime.Now,
            Tipo = NormalizeType(input.Type),
            UbicacionId = input.LocalId,
            UbicacionNombre = localNombre,
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
        tx.UbicacionId = input.LocalId;
        tx.UbicacionNombre = await ResolveLocalNameAsync(input.LocalId, cancellationToken);
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
        string? local, DateTime? from, DateTime? to, CancellationToken cancellationToken = default)
    {
        var data = await Filtered(local, from, to)
            .Select(t => new { t.Tipo, t.CuentaNombre, t.Monto, t.Fecha })
            .ToListAsync(cancellationToken);

        return BuildSummary(data.Select(d => (d.Tipo, d.CuentaNombre, d.Monto, d.Fecha)));
    }

    public async Task<byte[]> ExportExcelAsync(
        string? local, DateTime? from, DateTime? to, CancellationToken cancellationToken = default)
    {
        var rows = await Filtered(local, from, to)
            .OrderBy(t => t.Fecha)
            .Select(t => new
            {
                t.Fecha, t.Tipo, t.UbicacionNombre, t.CuentaNombre, t.Descripcion,
                t.Contacto, t.MetodoPago, t.Referencia, t.Monto
            })
            .ToListAsync(cancellationToken);

        var summary = BuildSummary(rows.Select(r => (r.Tipo, r.CuentaNombre, r.Monto, r.Fecha)));
        var localName = string.IsNullOrWhiteSpace(local) || local == "all"
            ? "Todos los locales"
            : await ResolveLocalNameAsync(local, cancellationToken) ?? local;

        using var wb = new XLWorkbook();

        // ---- Hoja Resumen (Estado de Resultados) ----
        var ws = wb.Worksheets.Add("Resumen");
        ws.Cell("A1").Value = "Pollo Centro — Estado de Resultados";
        ws.Cell("A1").Style.Font.Bold = true;
        ws.Cell("A1").Style.Font.FontSize = 14;
        ws.Cell("A2").Value = "Local:";
        ws.Cell("B2").Value = localName;
        ws.Cell("A3").Value = "Generado:";
        ws.Cell("B3").Value = DateTime.Now.ToString("dd/MM/yyyy HH:mm");

        var row = 5;
        ws.Cell(row, 1).Value = "INGRESOS"; ws.Cell(row, 1).Style.Font.Bold = true; row++;
        foreach (var inc in summary.IncomeByAccount)
        {
            ws.Cell(row, 1).Value = inc.Account;
            ws.Cell(row, 2).Value = inc.Amount;
            ws.Cell(row, 2).Style.NumberFormat.Format = "#,##0.00";
            row++;
        }
        ws.Cell(row, 1).Value = "Total Ingresos"; ws.Cell(row, 1).Style.Font.Bold = true;
        ws.Cell(row, 2).Value = summary.TotalIncome; ws.Cell(row, 2).Style.Font.Bold = true;
        ws.Cell(row, 2).Style.NumberFormat.Format = "#,##0.00"; row += 2;

        ws.Cell(row, 1).Value = "GASTOS"; ws.Cell(row, 1).Style.Font.Bold = true; row++;
        foreach (var exp in summary.ExpenseByAccount)
        {
            ws.Cell(row, 1).Value = exp.Account;
            ws.Cell(row, 2).Value = exp.Amount;
            ws.Cell(row, 2).Style.NumberFormat.Format = "#,##0.00";
            row++;
        }
        ws.Cell(row, 1).Value = "Total Gastos"; ws.Cell(row, 1).Style.Font.Bold = true;
        ws.Cell(row, 2).Value = summary.TotalExpenses; ws.Cell(row, 2).Style.Font.Bold = true;
        ws.Cell(row, 2).Style.NumberFormat.Format = "#,##0.00"; row += 2;

        ws.Cell(row, 1).Value = summary.NetProfit >= 0 ? "UTILIDAD NETA" : "PÉRDIDA NETA";
        ws.Cell(row, 1).Style.Font.Bold = true;
        ws.Cell(row, 2).Value = summary.NetProfit;
        ws.Cell(row, 2).Style.Font.Bold = true;
        ws.Cell(row, 2).Style.NumberFormat.Format = "#,##0.00";
        ws.Cell(row, 2).Style.Fill.BackgroundColor = summary.NetProfit >= 0 ? XLColor.LightGreen : XLColor.LightPink;
        ws.Columns().AdjustToContents();

        // ---- Hoja Transacciones ----
        var wt = wb.Worksheets.Add("Transacciones");
        string[] headers = ["Fecha", "Tipo", "Local", "Cuenta", "Descripción", "Contacto", "Método", "Referencia", "Monto"];
        for (var i = 0; i < headers.Length; i++)
        {
            var cell = wt.Cell(1, i + 1);
            cell.Value = headers[i];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#16213E");
            cell.Style.Font.FontColor = XLColor.White;
        }
        var r = 2;
        foreach (var t in rows)
        {
            wt.Cell(r, 1).Value = t.Fecha;
            wt.Cell(r, 1).Style.DateFormat.Format = "dd/MM/yyyy";
            wt.Cell(r, 2).Value = t.Tipo == "ingreso" ? "Ingreso" : "Gasto";
            wt.Cell(r, 3).Value = t.UbicacionNombre;
            wt.Cell(r, 4).Value = t.CuentaNombre;
            wt.Cell(r, 5).Value = t.Descripcion;
            wt.Cell(r, 6).Value = t.Contacto;
            wt.Cell(r, 7).Value = t.MetodoPago;
            wt.Cell(r, 8).Value = t.Referencia;
            wt.Cell(r, 9).Value = t.Tipo == "gasto" ? -t.Monto : t.Monto;
            wt.Cell(r, 9).Style.NumberFormat.Format = "#,##0.00";
            r++;
        }
        wt.Columns().AdjustToContents();
        wt.SheetView.FreezeRows(1);

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    // ---------------------------------------------------------------- helpers
    private AccountingSummaryDto BuildSummary(IEnumerable<(string Tipo, string Cuenta, decimal Monto, DateTime Fecha)> data)
    {
        var list = data.ToList();
        var income = list.Where(d => d.Tipo == "ingreso").ToList();
        var expense = list.Where(d => d.Tipo == "gasto").ToList();

        var summary = new AccountingSummaryDto
        {
            TotalIncome = income.Sum(d => d.Monto),
            TotalExpenses = expense.Sum(d => d.Monto),
            TransactionCount = list.Count,
            IncomeByAccount = income
                .GroupBy(d => d.Cuenta)
                .Select(g => new CategoryAmountDto { Account = g.Key, Amount = g.Sum(x => x.Monto) })
                .OrderByDescending(c => c.Amount).ToList(),
            ExpenseByAccount = expense
                .GroupBy(d => d.Cuenta)
                .Select(g => new CategoryAmountDto { Account = g.Key, Amount = g.Sum(x => x.Monto) })
                .OrderByDescending(c => c.Amount).ToList(),
            Monthly = list
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

    // Resuelve el nombre del local desde la tabla Locales (fuente de verdad en la BD).
    private async Task<string?> ResolveLocalNameAsync(string? localId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(localId)) return null;
        return await _db.Locales
            .Where(l => l.Codigo == localId)
            .Select(l => l.Nombre)
            .FirstOrDefaultAsync(cancellationToken) ?? localId;
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
        LocalId = t.UbicacionId,
        LocalName = t.UbicacionNombre,
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

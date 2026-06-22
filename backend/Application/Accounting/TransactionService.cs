using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using PolloCentro.Api.Application.Common.Exceptions;
using PolloCentro.Api.Application.Common.Interfaces;
using PolloCentro.Api.Domain.Entities;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

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
        if (to.HasValue)
        {
            var exclusiveEnd = to.Value.Date.AddDays(1);
            query = query.Where(t => t.Fecha < exclusiveEnd);
        }
        return query;
    }

    public async Task<IReadOnlyList<TransactionDto>> GetAllAsync(
        string? local, DateTime? from, DateTime? to, CancellationToken cancellationToken = default)
    {
        var filtered = Filtered(local, from, to);
        var query = from t in filtered
            join account in _db.CuentasContables.AsNoTracking() on t.IdCuenta equals account.IdCuenta
            orderby t.Fecha descending
            select new TransactionDto
            {
                Id = t.IdTransaccion.ToString(),
                Date = t.Fecha,
                Type = t.Tipo,
                LocalId = t.UbicacionId,
                LocalName = t.UbicacionNombre,
                AccountId = t.IdCuenta.ToString(),
                AccountName = t.CuentaNombre,
                AccountType = account.Tipo,
                Amount = t.Monto,
                Description = t.Descripcion,
                PaymentMethod = t.MetodoPago,
                Reference = t.Referencia,
                Contact = t.Contacto,
                RecordedBy = t.RegistradoPor
            };
        return await query.ToListAsync(cancellationToken);
    }

    public async Task<TransactionDto> CreateAsync(TransactionInput input, CancellationToken cancellationToken = default)
    {
        var cuenta = await ResolveAccountAsync(input.AccountId, cancellationToken);
        var localNombre = await ResolveLocalNameAsync(input.LocalId, cancellationToken);
        await EnsureUniqueReferenceAsync(input.Reference, null, cancellationToken);

        var tx = new TransaccionContable
        {
            Fecha = input.Date ?? DateTime.Now,
            Tipo = NormalizeType(input.Type),
            UbicacionId = input.LocalId.Trim(),
            UbicacionNombre = localNombre,
            IdCuenta = cuenta.IdCuenta,
            CuentaNombre = cuenta.Nombre,
            Monto = input.Amount,
            Descripcion = NullIfWhiteSpace(input.Description),
            MetodoPago = NullIfWhiteSpace(input.PaymentMethod),
            Referencia = NullIfWhiteSpace(input.Reference),
            Contacto = NullIfWhiteSpace(input.Contact),
            RegistradoPor = NullIfWhiteSpace(input.RecordedBy),
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
        await EnsureUniqueReferenceAsync(input.Reference, id, cancellationToken);

        tx.Fecha = input.Date ?? tx.Fecha;
        tx.Tipo = NormalizeType(input.Type);
        tx.UbicacionId = input.LocalId.Trim();
        tx.UbicacionNombre = await ResolveLocalNameAsync(input.LocalId, cancellationToken);
        tx.IdCuenta = cuenta.IdCuenta;
        tx.CuentaNombre = cuenta.Nombre;
        tx.Monto = input.Amount;
        tx.Descripcion = NullIfWhiteSpace(input.Description);
        tx.MetodoPago = NullIfWhiteSpace(input.PaymentMethod);
        tx.Referencia = NullIfWhiteSpace(input.Reference);
        tx.Contacto = NullIfWhiteSpace(input.Contact);

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

    public async Task<byte[]> ExportPdfAsync(
        string? local, DateTime? from, DateTime? to, CancellationToken cancellationToken = default)
    {
        var rows = await Filtered(local, from, to)
            .OrderBy(t => t.Fecha)
            .Select(t => new { t.Fecha, t.Tipo, t.UbicacionNombre, t.CuentaNombre, t.Descripcion, t.Monto })
            .ToListAsync(cancellationToken);

        var summary = BuildSummary(rows.Select(r => (r.Tipo, r.CuentaNombre, r.Monto, r.Fecha)));
        var localName = string.IsNullOrWhiteSpace(local) || local == "all"
            ? "Todos los locales"
            : await ResolveLocalNameAsync(local, cancellationToken) ?? local;
        var periodo = $"{(from.HasValue ? from.Value.ToString("dd/MM/yyyy") : "inicio")} — {(to.HasValue ? to.Value.ToString("dd/MM/yyyy") : "hoy")}";

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(28);
                page.DefaultTextStyle(x => x.FontSize(9).FontColor(Colors.Black));

                page.Header().Column(h =>
                {
                    h.Item().Text("Pollo Centro — Estado de Resultados").FontSize(16).Bold();
                    h.Item().Text($"Local: {localName}").FontSize(10);
                    h.Item().Text($"Período: {periodo}").FontSize(10);
                    h.Item().Text($"Generado: {DateTime.Now:dd/MM/yyyy HH:mm}").FontSize(8).FontColor(Colors.Grey.Medium);
                });

                page.Content().PaddingVertical(12).Column(col =>
                {
                    col.Spacing(12);

                    col.Item().Background(Colors.Grey.Lighten4).Padding(8).Row(r =>
                    {
                        r.RelativeItem().Column(c => { c.Item().Text("INGRESOS").FontSize(8).FontColor(Colors.Grey.Darken1); c.Item().Text($"RD$ {summary.TotalIncome:N2}").Bold().FontColor(Colors.Green.Darken2); });
                        r.RelativeItem().Column(c => { c.Item().Text("GASTOS").FontSize(8).FontColor(Colors.Grey.Darken1); c.Item().Text($"RD$ {summary.TotalExpenses:N2}").Bold().FontColor(Colors.Red.Darken2); });
                        r.RelativeItem().Column(c => { c.Item().Text(summary.NetProfit >= 0 ? "UTILIDAD NETA" : "PÉRDIDA NETA").FontSize(8).FontColor(Colors.Grey.Darken1); c.Item().Text($"RD$ {summary.NetProfit:N2}").Bold(); });
                    });

                    if (summary.IncomeByAccount.Count > 0)
                    {
                        col.Item().Text("Ingresos por cuenta").Bold();
                        col.Item().Table(t =>
                        {
                            t.ColumnsDefinition(c => { c.RelativeColumn(3); c.RelativeColumn(1); });
                            foreach (var inc in summary.IncomeByAccount)
                            {
                                t.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).PaddingVertical(2).Text(inc.Account);
                                t.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).PaddingVertical(2).AlignRight().Text($"RD$ {inc.Amount:N2}");
                            }
                        });
                    }

                    if (summary.ExpenseByAccount.Count > 0)
                    {
                        col.Item().Text("Gastos por cuenta").Bold();
                        col.Item().Table(t =>
                        {
                            t.ColumnsDefinition(c => { c.RelativeColumn(3); c.RelativeColumn(1); });
                            foreach (var exp in summary.ExpenseByAccount)
                            {
                                t.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).PaddingVertical(2).Text(exp.Account);
                                t.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).PaddingVertical(2).AlignRight().Text($"RD$ {exp.Amount:N2}");
                            }
                        });
                    }

                    col.Item().Text($"Transacciones ({rows.Count})").Bold();
                    col.Item().Table(t =>
                    {
                        t.ColumnsDefinition(c => { c.ConstantColumn(52); c.RelativeColumn(2); c.RelativeColumn(2); c.RelativeColumn(3); c.ConstantColumn(72); });
                        t.Header(header =>
                        {
                            header.Cell().Background(Colors.Grey.Darken3).Padding(3).Text("Fecha").FontColor(Colors.White).FontSize(8).Bold();
                            header.Cell().Background(Colors.Grey.Darken3).Padding(3).Text("Local").FontColor(Colors.White).FontSize(8).Bold();
                            header.Cell().Background(Colors.Grey.Darken3).Padding(3).Text("Cuenta").FontColor(Colors.White).FontSize(8).Bold();
                            header.Cell().Background(Colors.Grey.Darken3).Padding(3).Text("Descripción").FontColor(Colors.White).FontSize(8).Bold();
                            header.Cell().Background(Colors.Grey.Darken3).Padding(3).AlignRight().Text("Monto").FontColor(Colors.White).FontSize(8).Bold();
                        });
                        foreach (var r in rows)
                        {
                            var signed = r.Tipo == "gasto" ? -r.Monto : r.Monto;
                            t.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten3).Padding(3).Text(r.Fecha.ToString("dd/MM/yy")).FontSize(8);
                            t.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten3).Padding(3).Text(r.UbicacionNombre ?? "").FontSize(8);
                            t.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten3).Padding(3).Text(r.CuentaNombre).FontSize(8);
                            t.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten3).Padding(3).Text(r.Descripcion ?? "").FontSize(8);
                            t.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten3).Padding(3).AlignRight()
                                .Text($"RD$ {signed:N2}").FontSize(8)
                                .FontColor(r.Tipo == "gasto" ? Colors.Red.Darken1 : Colors.Green.Darken1);
                        }
                    });
                });

                page.Footer().AlignCenter().Text(x =>
                {
                    x.Span("Página ").FontSize(8);
                    x.CurrentPageNumber().FontSize(8);
                    x.Span(" de ").FontSize(8);
                    x.TotalPages().FontSize(8);
                });
            });
        });

        return document.GeneratePdf();
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
            .Where(l => l.Codigo == localId && l.Estado)
            .Select(l => l.Nombre)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new ValidationException("El local indicado no existe o está inactivo.");
    }

    private static string NormalizeType(string type)
    {
        var t = type.Trim().ToLowerInvariant();
        if (t is not ("ingreso" or "gasto"))
            throw new ValidationException("El tipo debe ser ingreso o gasto.");
        return t;
    }

    private async Task EnsureUniqueReferenceAsync(
        string? reference, int? currentId, CancellationToken cancellationToken)
    {
        var normalized = NullIfWhiteSpace(reference);
        if (normalized is null) return;
        var exists = await _db.TransaccionesContables.AsNoTracking()
            .AnyAsync(t => t.Referencia == normalized && (!currentId.HasValue || t.IdTransaccion != currentId), cancellationToken);
        if (exists) throw new ValidationException("Ya existe una transacción con esa referencia.");
    }

    private static string? NullIfWhiteSpace(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

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

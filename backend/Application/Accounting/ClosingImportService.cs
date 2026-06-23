using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using PolloCentro.Api.Application.Common.Exceptions;
using PolloCentro.Api.Application.Common.Interfaces;
using PolloCentro.Api.Domain.Entities;
using UglyToad.PdfPig;
using UglyToad.PdfPig.DocumentLayoutAnalysis.TextExtractor;

namespace PolloCentro.Api.Application.Accounting;

public partial class ClosingImportService : IClosingImportService
{
    private const decimal ReconciliationTolerance = 0.02m;
    private readonly IApplicationDbContext _db;

    public ClosingImportService(IApplicationDbContext db) => _db = db;

    public async Task<CashClosingPreviewDto> PreviewAsync(
        byte[] pdfBytes, string fileName, CancellationToken cancellationToken = default)
    {
        var preview = Parse(pdfBytes, fileName);
        preview.AlreadyImported = await _db.ImportacionesCierreCaja.AsNoTracking()
            .AnyAsync(x => x.ArchivoHash == preview.FileHash, cancellationToken);

        var locations = await _db.Locales.AsNoTracking().Where(x => x.Estado).ToListAsync(cancellationToken);
        var business = NormalizeName(preview.BusinessName);
        preview.SuggestedLocalId = locations
            .Where(x => business.Contains(NormalizeName(x.Nombre).Replace("pollocentro", string.Empty)))
            .Select(x => x.Codigo)
            .FirstOrDefault();
        return preview;
    }

    public async Task<CashClosingImportResultDto> ImportAsync(
        byte[] pdfBytes, string fileName, string localId, string importedBy,
        CancellationToken cancellationToken = default)
    {
        var preview = await PreviewAsync(pdfBytes, fileName, cancellationToken);
        if (preview.AlreadyImported)
            throw new ValidationException("Este cierre de caja ya fue importado.");

        var local = await _db.Locales.FirstOrDefaultAsync(
            x => x.Codigo == localId && x.Estado, cancellationToken)
            ?? throw new ValidationException("El local seleccionado no existe o está inactivo.");
        if (await _db.ImportacionesCierreCaja.AsNoTracking().AnyAsync(
                x => x.IdLocal == local.IdLocal && x.Secuencia == preview.Sequence && x.FechaFin == preview.EndDate,
                cancellationToken))
            throw new ValidationException("Este local ya tiene importado el mismo cierre y secuencia.");
        var salesAccount = await _db.CuentasContables.FirstOrDefaultAsync(
            x => x.Codigo == "4000" && x.Estado, cancellationToken)
            ?? throw new ValidationException("No existe la cuenta contable activa 4000 para registrar las ventas.");

        var import = new ImportacionCierreCaja
        {
            IdLocal = local.IdLocal,
            LocalCodigo = local.Codigo,
            LocalNombre = local.Nombre,
            NegocioPdf = preview.BusinessName,
            Caja = preview.Machine,
            Secuencia = preview.Sequence,
            FechaInicio = preview.StartDate,
            FechaFin = preview.EndDate,
            VentaNeta = preview.NetSales,
            Impuesto = preview.Tax,
            CargoExtra = preview.ExtraFee,
            VentaBruta = preview.GrossSales,
            Propinas = preview.Tips,
            TotalPago = preview.TotalPayment,
            ConteoOrdenes = preview.OrderCount,
            ConteoClientes = preview.GuestCount,
            PagosJson = JsonSerializer.Serialize(preview.Payments),
            ArchivoNombre = fileName,
            ArchivoHash = preview.FileHash,
            ImportadoPor = importedBy,
            FechaImportacion = DateTime.Now
        };
        _db.ImportacionesCierreCaja.Add(import);

        for (var i = 0; i < preview.Payments.Count; i++)
        {
            var payment = preview.Payments[i];
            import.Transacciones.Add(new TransaccionContable
            {
                Fecha = preview.EndDate,
                Tipo = "ingreso",
                UbicacionId = local.Codigo,
                UbicacionNombre = local.Nombre,
                IdCuenta = salesAccount.IdCuenta,
                CuentaNombre = salesAccount.Nombre,
                Monto = payment.Amount,
                Descripcion = $"Cierre POS {preview.Sequence} - {payment.Name}",
                MetodoPago = payment.Method,
                Referencia = $"CIERRE-{preview.FileHash[..12]}-{i + 1:D2}",
                Contacto = preview.BusinessName,
                RegistradoPor = importedBy,
                FechaRegistro = DateTime.Now
            });
        }
        _db.Auditorias.Add(new Auditoria
        {
            IdUsuario = importedBy,
            UsuarioNombre = importedBy,
            Accion = "Importación de cierre de caja",
            Detalles = $"{local.Nombre}; secuencia {preview.Sequence}; {preview.Payments.Count} movimientos; total {preview.TotalPayment:F2}",
            FechaHora = DateTime.Now
        });

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            throw new ValidationException("No se pudo importar el cierre; puede que ya exista un registro equivalente.");
        }

        return new CashClosingImportResultDto
        {
            ImportId = import.IdImportacionCierre.ToString(CultureInfo.InvariantCulture),
            LocalId = local.Codigo,
            LocalName = local.Nombre,
            ClosingDate = preview.EndDate,
            TotalPayment = preview.TotalPayment,
            TransactionsCreated = import.Transacciones.Count
        };
    }

    public async Task<IReadOnlyList<CashClosingImportRecordDto>> GetRecentAsync(
        CancellationToken cancellationToken = default)
        => await _db.ImportacionesCierreCaja.AsNoTracking()
            .OrderByDescending(x => x.FechaImportacion)
            .Take(20)
            .Select(x => new CashClosingImportRecordDto
            {
                Id = x.IdImportacionCierre.ToString(),
                FileName = x.ArchivoNombre,
                LocalId = x.LocalCodigo,
                LocalName = x.LocalNombre,
                Sequence = x.Secuencia,
                ClosingDate = x.FechaFin,
                TotalPayment = x.TotalPago,
                TransactionCount = x.Transacciones.Count,
                ImportedBy = x.ImportadoPor ?? string.Empty,
                ImportedAt = x.FechaImportacion
            })
            .ToListAsync(cancellationToken);

    private static CashClosingPreviewDto Parse(byte[] pdfBytes, string fileName)
    {
        string text;
        try
        {
            using var stream = new MemoryStream(pdfBytes, writable: false);
            using var document = PdfDocument.Open(stream);
            if (document.NumberOfPages is < 1 or > 10)
                throw new ValidationException("El PDF debe contener entre 1 y 10 páginas.");

            var builder = new StringBuilder();
            foreach (var page in document.GetPages())
                builder.AppendLine(ContentOrderTextExtractor.GetText(page));
            text = builder.ToString().Replace("\r\n", "\n", StringComparison.Ordinal);
        }
        catch (ValidationException)
        {
            throw;
        }
        catch
        {
            throw new ValidationException("No fue posible leer el PDF. Verifica que no esté dañado o protegido.");
        }

        if (!text.Contains("CLOSING RECEIPT", StringComparison.OrdinalIgnoreCase))
            throw new ValidationException("El archivo no corresponde a un cierre de caja compatible.");

        var preview = new CashClosingPreviewDto
        {
            FileName = fileName,
            FileHash = Convert.ToHexString(SHA256.HashData(pdfBytes)),
            BusinessName = Required(text, @"(?im)^\*{3}\s*CLOSING RECEIPT\s*\*{3}\s*\n(?<v>[^\n]+)"),
            Machine = Optional(text, @"(?im)^Machine:\s*(?<v>.+)$"),
            Sequence = Required(text, @"(?im)^Sequence:\s*(?<v>\S+)\s*$"),
            Cashier = Optional(text, @"(?im)^Cashier:\s*(?<v>.+)$"),
            StartDate = ReadDate(text, "Start date"),
            EndDate = ReadDate(text, "End date"),
            NetSales = ReadMoney(text, "NET SALES"),
            Tax = ReadMoney(text, "TOTAL TAX"),
            ExtraFee = ReadMoney(text, "EXTRA FEE"),
            GrossSales = ReadMoney(text, "GROSS SALES"),
            Tips = ReadMoney(text, "TOTAL TIPS"),
            TotalPayment = ReadMoney(text, "TOTAL PAYMENT"),
            OrderCount = ReadInt(text, "TOTAL ORDER COUNT"),
            GuestCount = ReadInt(text, "TOTAL GUEST COUNT"),
            Payments = ReadPayments(text)
        };

        if (preview.EndDate <= preview.StartDate)
            throw new ValidationException("El rango de fechas del cierre no es válido.");
        var paymentSum = preview.Payments.Sum(x => x.Amount);
        if (Math.Abs(paymentSum - preview.TotalPayment) > ReconciliationTolerance)
            throw new ValidationException($"Los pagos ({paymentSum:C}) no cuadran con el total ({preview.TotalPayment:C}).");
        var calculatedTotal = preview.NetSales + preview.Tax + preview.ExtraFee + preview.Tips;
        if (Math.Abs(calculatedTotal - preview.TotalPayment) > ReconciliationTolerance)
            throw new ValidationException("Ventas, impuestos, cargos y propinas no cuadran con el total del cierre.");
        return preview;
    }

    private static List<CashClosingPaymentDto> ReadPayments(string text)
    {
        var start = text.IndexOf("\nPayments\n", StringComparison.OrdinalIgnoreCase);
        var end = text.IndexOf("\nVoids\n", StringComparison.OrdinalIgnoreCase);
        if (start < 0 || end <= start)
            throw new ValidationException("No se encontró la sección de pagos del cierre.");
        var section = text[start..end];
        var definitions = new[]
        {
            (Label: "MasterCard", Method: "mastercard"),
            (Label: "Visa", Method: "visa"),
            (Label: "Discover", Method: "discover"),
            (Label: "Amex", Method: "amex"),
            (Label: "Cash", Method: "efectivo"),
            (Label: "Online Card", Method: "tarjeta online")
        };
        var result = new List<CashClosingPaymentDto>();
        foreach (var definition in definitions)
        {
            var match = Regex.Match(section,
                $@"(?im)^{Regex.Escape(definition.Label)}\s+(?<count>\d+)\s+\$?(?<amount>[\d,]+\.\d{{2}})\s*$");
            if (!match.Success) continue;
            var amount = ParseMoney(match.Groups["amount"].Value);
            if (amount <= 0) continue;
            result.Add(new CashClosingPaymentDto
            {
                Name = definition.Label,
                Method = definition.Method,
                Count = int.Parse(match.Groups["count"].Value, CultureInfo.InvariantCulture),
                Amount = amount
            });
        }
        if (result.Count == 0)
            throw new ValidationException("El cierre no contiene pagos importables.");
        return result;
    }

    private static string Required(string text, string pattern)
        => Optional(text, pattern)
           ?? throw new ValidationException("Falta información requerida en el cierre de caja.");

    private static string? Optional(string text, string pattern)
    {
        var match = Regex.Match(text, pattern);
        return match.Success ? match.Groups["v"].Value.Trim() : null;
    }

    private static DateTime ReadDate(string text, string label)
    {
        var value = Required(text, $@"(?im)^{Regex.Escape(label)}:\s*(?<v>.+)$");
        var formats = new[] { "MM/dd/yyyy h:mmtt", "MM/dd/yyyy hh:mmtt", "M/d/yyyy h:mmtt" };
        if (!DateTime.TryParseExact(value.Replace(" ", string.Empty),
                formats.Select(x => x.Replace(" ", string.Empty)).ToArray(),
                CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces, out var date))
            throw new ValidationException($"La fecha '{label}' no tiene un formato reconocido.");
        return date;
    }

    private static decimal ReadMoney(string text, string label)
    {
        var value = Required(text,
            $@"(?im)^{Regex.Escape(label)}\s+\$?(?<v>[\d,]+\.\d{{2}})\s*$");
        return ParseMoney(value);
    }

    private static decimal ParseMoney(string value)
        => decimal.Parse(value.Replace(",", string.Empty), NumberStyles.Number, CultureInfo.InvariantCulture);

    private static int ReadInt(string text, string label)
        => int.Parse(Required(text, $@"(?im)^{Regex.Escape(label)}\s+(?<v>\d+)\s*$"),
            CultureInfo.InvariantCulture);

    private static string NormalizeName(string value)
        => NonAlphaNumeric().Replace(value.ToLowerInvariant(), string.Empty);

    [GeneratedRegex("[^a-z0-9]", RegexOptions.CultureInvariant)]
    private static partial Regex NonAlphaNumeric();
}

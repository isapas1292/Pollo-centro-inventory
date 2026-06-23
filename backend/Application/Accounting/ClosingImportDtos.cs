namespace PolloCentro.Api.Application.Accounting;

public class CashClosingPaymentDto
{
    public string Name { get; set; } = string.Empty;
    public string Method { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal Amount { get; set; }
}

public class CashClosingPreviewDto
{
    public string FileName { get; set; } = string.Empty;
    public string FileHash { get; set; } = string.Empty;
    public string BusinessName { get; set; } = string.Empty;
    public string? Machine { get; set; }
    public string Sequence { get; set; } = string.Empty;
    public string? Cashier { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal NetSales { get; set; }
    public decimal Tax { get; set; }
    public decimal ExtraFee { get; set; }
    public decimal GrossSales { get; set; }
    public decimal Tips { get; set; }
    public decimal TotalPayment { get; set; }
    public int OrderCount { get; set; }
    public int GuestCount { get; set; }
    public string? SuggestedLocalId { get; set; }
    public bool AlreadyImported { get; set; }
    public List<CashClosingPaymentDto> Payments { get; set; } = new();
}

public class CashClosingImportResultDto
{
    public string ImportId { get; set; } = string.Empty;
    public string LocalId { get; set; } = string.Empty;
    public string LocalName { get; set; } = string.Empty;
    public DateTime ClosingDate { get; set; }
    public decimal TotalPayment { get; set; }
    public int TransactionsCreated { get; set; }
}

public class CashClosingImportRecordDto
{
    public string Id { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string LocalId { get; set; } = string.Empty;
    public string LocalName { get; set; } = string.Empty;
    public string Sequence { get; set; } = string.Empty;
    public DateTime ClosingDate { get; set; }
    public decimal TotalPayment { get; set; }
    public int TransactionCount { get; set; }
    public string ImportedBy { get; set; } = string.Empty;
    public DateTime ImportedAt { get; set; }
}

public interface IClosingImportService
{
    Task<CashClosingPreviewDto> PreviewAsync(
        byte[] pdfBytes, string fileName, CancellationToken cancellationToken = default);
    Task<CashClosingImportResultDto> ImportAsync(
        byte[] pdfBytes, string fileName, string localId, string importedBy,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CashClosingImportRecordDto>> GetRecentAsync(
        CancellationToken cancellationToken = default);
}

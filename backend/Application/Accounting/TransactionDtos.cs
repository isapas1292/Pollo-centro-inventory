using System.ComponentModel.DataAnnotations;

namespace PolloCentro.Api.Application.Accounting;

public class TransactionDto
{
    public string Id { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public string Type { get; set; } = string.Empty;        // ingreso | gasto
    public string AccountId { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string AccountType { get; set; } = string.Empty; // Ingreso | Gasto | ...
    public decimal Amount { get; set; }
    public string? Description { get; set; }
    public string? PaymentMethod { get; set; }
    public string? Reference { get; set; }
    public string? Contact { get; set; }
    public string? RecordedBy { get; set; }
}

public class TransactionInput
{
    public DateTime? Date { get; set; }

    [Required(ErrorMessage = "El tipo (ingreso/gasto) es requerido")]
    public string Type { get; set; } = string.Empty;

    [Required(ErrorMessage = "La cuenta es requerida")]
    public string AccountId { get; set; } = string.Empty;

    [Range(0.01, double.MaxValue, ErrorMessage = "El monto debe ser mayor que cero")]
    public decimal Amount { get; set; }

    public string? Description { get; set; }
    public string? PaymentMethod { get; set; }
    public string? Reference { get; set; }
    public string? Contact { get; set; }
    public string? RecordedBy { get; set; }
}

// ----- Resumen / Estado de Resultados -----
public class CategoryAmountDto
{
    public string Account { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}

public class MonthlyPointDto
{
    public string Period { get; set; } = string.Empty; // "2026-06"
    public string Label { get; set; } = string.Empty;  // "Jun 2026"
    public decimal Income { get; set; }
    public decimal Expense { get; set; }
}

public class AccountingSummaryDto
{
    public decimal TotalIncome { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal NetProfit { get; set; }
    public int TransactionCount { get; set; }
    public List<CategoryAmountDto> IncomeByAccount { get; set; } = new();
    public List<CategoryAmountDto> ExpenseByAccount { get; set; } = new();
    public List<MonthlyPointDto> Monthly { get; set; } = new();
}

public interface ITransactionService
{
    Task<IReadOnlyList<TransactionDto>> GetAllAsync(DateTime? from, DateTime? to, CancellationToken cancellationToken = default);
    Task<TransactionDto> CreateAsync(TransactionInput input, CancellationToken cancellationToken = default);
    Task<TransactionDto> UpdateAsync(int id, TransactionInput input, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
    Task<AccountingSummaryDto> GetSummaryAsync(DateTime? from, DateTime? to, CancellationToken cancellationToken = default);
}

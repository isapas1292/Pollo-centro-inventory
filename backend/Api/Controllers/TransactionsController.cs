using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PolloCentro.Api.Application.Accounting;

namespace PolloCentro.Api.Api.Controllers;

/// <summary>Transacciones contables y Estado de Resultados (por local). Solo para administradores.</summary>
[ApiController]
[Route("api/accounting/transactions")]
[Authorize(Roles = "admin")]
public class TransactionsController : ControllerBase
{
    private const string ExcelContentType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private readonly ITransactionService _transactions;

    public TransactionsController(ITransactionService transactions) => _transactions = transactions;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TransactionDto>>> GetAll(
        [FromQuery] string? local, [FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken cancellationToken)
        => Ok(await _transactions.GetAllAsync(local, from, to, cancellationToken));

    [HttpGet("summary")]
    public async Task<ActionResult<AccountingSummaryDto>> GetSummary(
        [FromQuery] string? local, [FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken cancellationToken)
        => Ok(await _transactions.GetSummaryAsync(local, from, to, cancellationToken));

    /// <summary>Exporta las transacciones y el Estado de Resultados del local a un archivo Excel.</summary>
    [HttpGet("export")]
    public async Task<IActionResult> Export(
        [FromQuery] string? local, [FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken cancellationToken)
    {
        var bytes = await _transactions.ExportExcelAsync(local, from, to, cancellationToken);
        var slug = string.IsNullOrWhiteSpace(local) || local == "all" ? "todos" : local;
        var fileName = $"Contabilidad_{slug}_{DateTime.Now:yyyyMMdd}.xlsx";
        return File(bytes, ExcelContentType, fileName);
    }

    [HttpPost]
    public async Task<ActionResult<TransactionDto>> Create(
        [FromBody] TransactionInput input, CancellationToken cancellationToken)
    {
        var created = await _transactions.CreateAsync(input, cancellationToken);
        return Created($"/api/accounting/transactions/{created.Id}", created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<TransactionDto>> Update(
        int id, [FromBody] TransactionInput input, CancellationToken cancellationToken)
        => Ok(await _transactions.UpdateAsync(id, input, cancellationToken));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await _transactions.DeleteAsync(id, cancellationToken);
        return Ok(new { success = true });
    }
}

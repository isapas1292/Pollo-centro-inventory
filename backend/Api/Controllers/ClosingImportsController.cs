using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PolloCentro.Api.Application.Accounting;
using PolloCentro.Api.Application.Common.Exceptions;

namespace PolloCentro.Api.Api.Controllers;

[ApiController]
[Route("api/accounting/closing-imports")]
[Authorize(Roles = "admin")]
public class ClosingImportsController : ControllerBase
{
    private const long MaxPdfSize = 1_000_000;
    private readonly IClosingImportService _imports;

    public ClosingImportsController(IClosingImportService imports) => _imports = imports;

    [HttpPost("preview")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxPdfSize)]
    public async Task<ActionResult<CashClosingPreviewDto>> Preview(
        IFormFile file, CancellationToken cancellationToken)
    {
        var bytes = await ReadPdfAsync(file, cancellationToken);
        return Ok(await _imports.PreviewAsync(bytes, Path.GetFileName(file.FileName), cancellationToken));
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxPdfSize)]
    public async Task<ActionResult<CashClosingImportResultDto>> Import(
        IFormFile file, [FromForm] string localId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(localId))
            throw new ValidationException("Selecciona el local al que pertenece el cierre.");

        var bytes = await ReadPdfAsync(file, cancellationToken);
        var importedBy = User.FindFirstValue(ClaimTypes.Email)
            ?? User.Identity?.Name
            ?? "Sistema";
        var result = await _imports.ImportAsync(
            bytes, Path.GetFileName(file.FileName), localId, importedBy, cancellationToken);
        return Created($"/api/accounting/closing-imports/{result.ImportId}", result);
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CashClosingImportRecordDto>>> GetRecent(
        CancellationToken cancellationToken)
        => Ok(await _imports.GetRecentAsync(cancellationToken));

    private static async Task<byte[]> ReadPdfAsync(IFormFile file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
            throw new ValidationException("Selecciona un archivo PDF.");
        if (file.Length > MaxPdfSize)
            throw new ValidationException("El PDF no puede superar 1 MB.");
        if (!string.Equals(Path.GetExtension(file.FileName), ".pdf", StringComparison.OrdinalIgnoreCase))
            throw new ValidationException("Solo se permiten archivos PDF.");

        await using var stream = file.OpenReadStream();
        using var memory = new MemoryStream((int)file.Length);
        await stream.CopyToAsync(memory, cancellationToken);
        var bytes = memory.ToArray();
        if (bytes.Length < 5 || bytes[0] != '%' || bytes[1] != 'P' || bytes[2] != 'D' || bytes[3] != 'F' || bytes[4] != '-')
            throw new ValidationException("El archivo no contiene una firma PDF válida.");
        return bytes;
    }
}

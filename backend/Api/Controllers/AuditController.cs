using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PolloCentro.Api.Application.Audit;

namespace PolloCentro.Api.Api.Controllers;

[ApiController]
[Route("api/audit")]
[Authorize(Roles = "admin,manager")]
public class AuditController : ControllerBase
{
    private readonly IAuditService _audit;

    public AuditController(IAuditService audit) => _audit = audit;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AuditLogDto>>> GetAll(CancellationToken cancellationToken)
        => Ok(await _audit.GetAllAsync(cancellationToken));

    [HttpPost]
    public async Task<ActionResult<AuditLogDto>> Create(
        [FromBody] AuditLogInput input, CancellationToken cancellationToken)
    {
        var created = await _audit.CreateAsync(input, cancellationToken);
        return Created($"/api/audit/{created.Id}", created);
    }
}

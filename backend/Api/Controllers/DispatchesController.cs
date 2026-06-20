using Microsoft.AspNetCore.Mvc;
using PolloCentro.Api.Application.Dispatches;

namespace PolloCentro.Api.Api.Controllers;

/// <summary>Envíos de ingredientes/recetas a locales (tabla Envios).</summary>
[ApiController]
[Route("api/dispatches")]
public class DispatchesController : ControllerBase
{
    private readonly IDispatchService _dispatches;

    public DispatchesController(IDispatchService dispatches) => _dispatches = dispatches;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<DispatchDto>>> GetAll(CancellationToken cancellationToken)
        => Ok(await _dispatches.GetAllAsync(cancellationToken));

    [HttpPost]
    public async Task<ActionResult<DispatchDto>> Create(
        [FromBody] DispatchInput input, CancellationToken cancellationToken)
    {
        var created = await _dispatches.CreateAsync(input, cancellationToken);
        return Created($"/api/dispatches/{created.Id}", created);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await _dispatches.DeleteAsync(id, cancellationToken);
        return Ok(new { success = true });
    }
}

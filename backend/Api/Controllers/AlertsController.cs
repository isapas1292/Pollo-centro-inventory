using Microsoft.AspNetCore.Mvc;
using PolloCentro.Api.Application.Alerts;

namespace PolloCentro.Api.Api.Controllers;

[ApiController]
[Route("api/alerts")]
public class AlertsController : ControllerBase
{
    private readonly IAlertService _alerts;

    public AlertsController(IAlertService alerts) => _alerts = alerts;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AlertDto>>> GetAll(CancellationToken cancellationToken)
        => Ok(await _alerts.GetAllAsync(cancellationToken));

    [HttpPost]
    public async Task<ActionResult<AlertDto>> Create(
        [FromBody] AlertInput input, CancellationToken cancellationToken)
    {
        var created = await _alerts.CreateAsync(input, cancellationToken);
        return Created($"/api/alerts/{created.Id}", created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<AlertDto>> Update(
        int id, [FromBody] AlertInput input, CancellationToken cancellationToken)
        => Ok(await _alerts.UpdateAsync(id, input, cancellationToken));

    [HttpPut("{id:int}/resolve")]
    public async Task<IActionResult> Resolve(int id, CancellationToken cancellationToken)
    {
        await _alerts.ResolveAsync(id, cancellationToken);
        return Ok(new { success = true });
    }

    [HttpPut("{id:int}/whatsapp")]
    public async Task<IActionResult> MarkWhatsapp(int id, CancellationToken cancellationToken)
    {
        await _alerts.MarkWhatsappAsync(id, cancellationToken);
        return Ok(new { success = true });
    }

    /// <summary>Envía (o reenvía) la alerta por WhatsApp al número configurado.</summary>
    [HttpPost("{id:int}/notify")]
    public async Task<IActionResult> Notify(int id, CancellationToken cancellationToken)
    {
        var sent = await _alerts.NotifyAsync(id, cancellationToken);
        return Ok(new { success = sent });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await _alerts.DeleteAsync(id, cancellationToken);
        return Ok(new { success = true });
    }
}

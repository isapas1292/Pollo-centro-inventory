using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PolloCentro.Api.Application.Schedule;

namespace PolloCentro.Api.Api.Controllers;

[ApiController]
[Route("api/schedules")]
[Authorize(Roles = "admin")]
public class ScheduleController : ControllerBase
{
    private readonly IScheduleService _schedule;

    public ScheduleController(IScheduleService schedule) => _schedule = schedule;

    /// <summary>Lista los turnos. Filtra por semana con ?weekKey=2026-W23.</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ShiftDto>>> GetAll(
        [FromQuery] string? weekKey, CancellationToken cancellationToken)
        => Ok(await _schedule.GetAllAsync(weekKey, cancellationToken));

    [HttpPost]
    public async Task<ActionResult<ShiftDto>> Create(
        [FromBody] ShiftInput input, CancellationToken cancellationToken)
    {
        var created = await _schedule.CreateAsync(input, cancellationToken);
        return Created($"/api/schedules/{created.Id}", created);
    }

    /// <summary>Alta masiva de turnos (con opción de reemplazar la semana). Usado por el horario automático.</summary>
    [HttpPost("bulk")]
    public async Task<IActionResult> CreateMany(
        [FromBody] BulkShiftInput input, CancellationToken cancellationToken)
    {
        var count = await _schedule.CreateManyAsync(input, cancellationToken);
        return Ok(new { success = true, count });
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ShiftDto>> Update(
        int id, [FromBody] ShiftInput input, CancellationToken cancellationToken)
        => Ok(await _schedule.UpdateAsync(id, input, cancellationToken));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await _schedule.DeleteAsync(id, cancellationToken);
        return Ok(new { success = true });
    }
}

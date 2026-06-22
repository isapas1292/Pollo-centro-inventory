using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PolloCentro.Api.Application.Employees;

namespace PolloCentro.Api.Api.Controllers;

[ApiController]
[Route("api/employees")]
[Authorize(Roles = "admin")]
public class EmployeesController : ControllerBase
{
    private readonly IEmployeeService _employees;

    public EmployeesController(IEmployeeService employees) => _employees = employees;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<EmployeeDto>>> GetAll(CancellationToken cancellationToken)
        => Ok(await _employees.GetAllAsync(cancellationToken));

    [HttpPost]
    public async Task<ActionResult<EmployeeDto>> Create(
        [FromBody] EmployeeInput input, CancellationToken cancellationToken)
    {
        var created = await _employees.CreateAsync(input, cancellationToken);
        return Created($"/api/employees/{created.Id}", created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<EmployeeDto>> Update(
        int id, [FromBody] EmployeeInput input, CancellationToken cancellationToken)
        => Ok(await _employees.UpdateAsync(id, input, cancellationToken));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await _employees.DeleteAsync(id, cancellationToken);
        return Ok(new { success = true });
    }
}

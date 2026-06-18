using Microsoft.AspNetCore.Mvc;
using PolloCentro.Api.Application.Suppliers;

namespace PolloCentro.Api.Api.Controllers;

[ApiController]
[Route("api/suppliers")]
public class SuppliersController : ControllerBase
{
    private readonly ISupplierService _suppliers;

    public SuppliersController(ISupplierService suppliers) => _suppliers = suppliers;

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<SupplierDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SupplierDto>>> GetAll(CancellationToken cancellationToken)
        => Ok(await _suppliers.GetAllAsync(cancellationToken));

    [HttpPost]
    [ProducesResponseType(typeof(SupplierDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SupplierDto>> Create(
        [FromBody] SupplierInput input, CancellationToken cancellationToken)
    {
        var created = await _suppliers.CreateAsync(input, cancellationToken);
        return Created($"/api/suppliers/{created.Id}", created);
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(SupplierDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupplierDto>> Update(
        int id, [FromBody] SupplierInput input, CancellationToken cancellationToken)
        => Ok(await _suppliers.UpdateAsync(id, input, cancellationToken));

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await _suppliers.DeleteAsync(id, cancellationToken);
        return Ok(new { success = true });
    }
}

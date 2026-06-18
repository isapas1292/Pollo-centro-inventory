using Microsoft.AspNetCore.Mvc;
using PolloCentro.Api.Application.Inventory;

namespace PolloCentro.Api.Api.Controllers;

[ApiController]
[Route("api/inventory")]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventory;

    public InventoryController(IInventoryService inventory) => _inventory = inventory;

    /// <summary>Devuelve todos los productos del inventario con su proveedor.</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProductDto>>> GetAll(CancellationToken cancellationToken)
        => Ok(await _inventory.GetProductsAsync(cancellationToken));

    [HttpPost]
    public async Task<ActionResult<ProductDto>> Create(
        [FromBody] ProductInput input, CancellationToken cancellationToken)
    {
        var created = await _inventory.CreateAsync(input, cancellationToken);
        return Created($"/api/inventory/{created.Id}", created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ProductDto>> Update(
        int id, [FromBody] ProductInput input, CancellationToken cancellationToken)
        => Ok(await _inventory.UpdateAsync(id, input, cancellationToken));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await _inventory.DeleteAsync(id, cancellationToken);
        return Ok(new { success = true });
    }
}

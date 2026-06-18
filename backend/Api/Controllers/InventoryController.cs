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
    [ProducesResponseType(typeof(IReadOnlyList<ProductDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ProductDto>>> GetAll(CancellationToken cancellationToken)
        => Ok(await _inventory.GetProductsAsync(cancellationToken));
}

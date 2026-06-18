using Microsoft.AspNetCore.Mvc;
using PolloCentro.Api.Application.Orders;

namespace PolloCentro.Api.Api.Controllers;

[ApiController]
[Route("api/orders")]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orders;

    public OrdersController(IOrderService orders) => _orders = orders;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<OrderReceptionDto>>> GetAll(CancellationToken cancellationToken)
        => Ok(await _orders.GetAllAsync(cancellationToken));

    [HttpPost]
    public async Task<ActionResult<OrderReceptionDto>> Create(
        [FromBody] OrderReceptionInput input, CancellationToken cancellationToken)
    {
        var created = await _orders.CreateAsync(input, cancellationToken);
        return Created($"/api/orders/{created.Id}", created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<OrderReceptionDto>> Update(
        int id, [FromBody] OrderReceptionInput input, CancellationToken cancellationToken)
        => Ok(await _orders.UpdateAsync(id, input, cancellationToken));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await _orders.DeleteAsync(id, cancellationToken);
        return Ok(new { success = true });
    }
}

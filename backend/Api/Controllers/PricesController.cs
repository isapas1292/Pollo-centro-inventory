using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PolloCentro.Api.Application.Prices;

namespace PolloCentro.Api.Api.Controllers;

[ApiController]
[Route("api/prices")]
[Authorize(Roles = "admin,manager")]
public class PricesController : ControllerBase
{
    private readonly IPriceService _prices;

    public PricesController(IPriceService prices) => _prices = prices;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PriceRecordDto>>> GetAll(CancellationToken cancellationToken)
        => Ok(await _prices.GetAllAsync(cancellationToken));

    [HttpPost]
    public async Task<ActionResult<PriceRecordDto>> Create(
        [FromBody] PriceRecordInput input, CancellationToken cancellationToken)
    {
        var created = await _prices.CreateAsync(input, cancellationToken);
        return Created($"/api/prices/{created.Id}", created);
    }
}

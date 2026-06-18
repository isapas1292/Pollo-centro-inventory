using Microsoft.AspNetCore.Mvc;
using PolloCentro.Api.Application.Locations;

namespace PolloCentro.Api.Api.Controllers;

/// <summary>Catálogo de locales/negocios. Lo consumen varias pantallas (horarios, contabilidad, etc.).</summary>
[ApiController]
[Route("api/locations")]
public class LocationsController : ControllerBase
{
    private readonly ILocationService _locations;

    public LocationsController(ILocationService locations) => _locations = locations;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<LocationDto>>> GetAll(CancellationToken cancellationToken)
        => Ok(await _locations.GetAllAsync(cancellationToken));
}

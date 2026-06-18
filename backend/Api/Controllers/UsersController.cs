using Microsoft.AspNetCore.Mvc;
using PolloCentro.Api.Application.Users;

namespace PolloCentro.Api.Api.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly IUserService _users;

    public UsersController(IUserService users) => _users = users;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UserDto>>> GetAll(CancellationToken cancellationToken)
        => Ok(await _users.GetAllAsync(cancellationToken));

    [HttpPost]
    public async Task<ActionResult<UserDto>> Create(
        [FromBody] UserInput input, CancellationToken cancellationToken)
    {
        var created = await _users.CreateAsync(input, cancellationToken);
        return Created($"/api/users/{created.Uid}", created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<UserDto>> Update(
        int id, [FromBody] UserInput input, CancellationToken cancellationToken)
        => Ok(await _users.UpdateAsync(id, input, cancellationToken));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await _users.DeleteAsync(id, cancellationToken);
        return Ok(new { success = true });
    }
}

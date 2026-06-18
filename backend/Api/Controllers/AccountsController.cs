using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PolloCentro.Api.Application.Accounting;

namespace PolloCentro.Api.Api.Controllers;

/// <summary>Plan de cuentas (Chart of Accounts). Solo accesible para administradores.</summary>
[ApiController]
[Route("api/accounting/accounts")]
[Authorize(Roles = "admin")]
public class AccountsController : ControllerBase
{
    private readonly IAccountService _accounts;

    public AccountsController(IAccountService accounts) => _accounts = accounts;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AccountDto>>> GetAll(CancellationToken cancellationToken)
        => Ok(await _accounts.GetAllAsync(cancellationToken));

    [HttpPost]
    public async Task<ActionResult<AccountDto>> Create(
        [FromBody] AccountInput input, CancellationToken cancellationToken)
    {
        var created = await _accounts.CreateAsync(input, cancellationToken);
        return Created($"/api/accounting/accounts/{created.Id}", created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<AccountDto>> Update(
        int id, [FromBody] AccountInput input, CancellationToken cancellationToken)
        => Ok(await _accounts.UpdateAsync(id, input, cancellationToken));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await _accounts.DeleteAsync(id, cancellationToken);
        return Ok(new { success = true });
    }
}

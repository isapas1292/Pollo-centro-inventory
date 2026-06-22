using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PolloCentro.Api.Application.Recipes;

namespace PolloCentro.Api.Api.Controllers;

[ApiController]
[Route("api/recipes")]
[Authorize(Roles = "admin,operations")]
public class RecipesController : ControllerBase
{
    private readonly IRecipeService _recipes;

    public RecipesController(IRecipeService recipes) => _recipes = recipes;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RecipeDto>>> GetAll(CancellationToken cancellationToken)
        => Ok(await _recipes.GetAllAsync(cancellationToken));

    [HttpGet("logs")]
    public async Task<ActionResult<IReadOnlyList<RecipeLogDto>>> GetLogs(CancellationToken cancellationToken)
        => Ok(await _recipes.GetLogsAsync(cancellationToken));

    [HttpPost]
    [Authorize(Roles = "admin")]
    public async Task<ActionResult<RecipeDto>> Create(
        [FromBody] RecipeInput input, CancellationToken cancellationToken)
    {
        var created = await _recipes.CreateAsync(input, cancellationToken);
        return Created($"/api/recipes/{created.Id}", created);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "admin")]
    public async Task<ActionResult<RecipeDto>> Update(
        int id, [FromBody] RecipeInput input, CancellationToken cancellationToken)
        => Ok(await _recipes.UpdateAsync(id, input, cancellationToken));

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await _recipes.DeleteAsync(id, cancellationToken);
        return Ok(new { success = true });
    }

    [HttpPost("{id:int}/prepare")]
    public async Task<ActionResult<RecipeLogDto>> Prepare(
        int id, [FromBody] PrepareRecipeRequest request, CancellationToken cancellationToken)
        => Ok(await _recipes.PrepareAsync(id, request, cancellationToken));
}

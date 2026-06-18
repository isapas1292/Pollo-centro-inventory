namespace PolloCentro.Api.Application.Recipes;

public interface IRecipeService
{
    Task<IReadOnlyList<RecipeDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<RecipeDto> CreateAsync(RecipeInput input, CancellationToken cancellationToken = default);
    Task<RecipeDto> UpdateAsync(int id, RecipeInput input, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);

    /// <summary>Prepara una receta: valida y descuenta stock, y registra la preparación.</summary>
    Task<RecipeLogDto> PrepareAsync(int id, PrepareRecipeRequest request, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<RecipeLogDto>> GetLogsAsync(CancellationToken cancellationToken = default);
}

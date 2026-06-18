using System.ComponentModel.DataAnnotations;

namespace PolloCentro.Api.Application.Recipes;

public class RecipeIngredientDto
{
    public string ProductId { get; set; } = string.Empty;
    public string? ProductName { get; set; }
    public decimal Quantity { get; set; }
}

public class RecipeDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<RecipeIngredientDto> Ingredients { get; set; } = new();
    public decimal EstimatedCost { get; set; }
    public DateTime CreatedAt { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
}

public class RecipeInput
{
    [Required(ErrorMessage = "El nombre de la receta es requerido")]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }
    public List<RecipeIngredientDto> Ingredients { get; set; } = new();
    public decimal EstimatedCost { get; set; }
    public string? CreatedBy { get; set; }
}

public class PrepareRecipeRequest
{
    public string? PreparedBy { get; set; }
    public int Quantity { get; set; } = 1;
}

public class RecipeLogDto
{
    public string Id { get; set; } = string.Empty;
    public string RecipeId { get; set; } = string.Empty;
    public string RecipeName { get; set; } = string.Empty;
    public string PreparedBy { get; set; } = string.Empty;
    public DateTime PreparedAt { get; set; }
    public List<RecipeIngredientDto> IngredientsUsed { get; set; } = new();
    public decimal TotalCost { get; set; }
    public int Quantity { get; set; }
}

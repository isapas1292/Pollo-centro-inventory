namespace PolloCentro.Api.Domain.Entities;

/// <summary>Ingrediente de una receta (tabla <c>RecetaIngredientes</c>).</summary>
public class RecetaIngrediente
{
    public int IdRecetaIngrediente { get; set; }
    public int IdReceta { get; set; }
    public int IdProducto { get; set; }
    public decimal CantidadNecesaria { get; set; }
    public string UnidadMedida { get; set; } = string.Empty;

    public Receta Receta { get; set; } = null!;
    public Producto Producto { get; set; } = null!;
}

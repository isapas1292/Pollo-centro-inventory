namespace PolloCentro.Api.Domain.Entities;

/// <summary>Receta de cocina (tabla <c>Recetas</c>).</summary>
public class Receta
{
    public int IdReceta { get; set; }
    public string NombreReceta { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public int Porciones { get; set; }
    public int? TiempoPreparacionMinutos { get; set; }
    public decimal? PrecioVenta { get; set; }
    public DateTime? FechaCreacion { get; set; }
    public bool? Estado { get; set; }

    public ICollection<RecetaIngrediente> RecetaIngredientes { get; set; } = new List<RecetaIngrediente>();
}

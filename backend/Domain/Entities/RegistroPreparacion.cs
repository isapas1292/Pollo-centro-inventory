namespace PolloCentro.Api.Domain.Entities;

/// <summary>Registro de una preparación de receta (tabla <c>RegistroPreparaciones</c>).</summary>
public class RegistroPreparacion
{
    public int IdRegistro { get; set; }
    public int IdReceta { get; set; }
    public string RecetaNombre { get; set; } = string.Empty;
    public string? PreparadoPor { get; set; }
    public DateTime FechaPreparacion { get; set; }
    public int Cantidad { get; set; } = 1;
    public decimal CostoTotal { get; set; }

    /// <summary>Ingredientes usados, serializados como JSON.</summary>
    public string? IngredientesJson { get; set; }
}

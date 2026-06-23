namespace PolloCentro.Api.Domain.Catalogs;

/// <summary>
/// Catálogo de locales/negocios de Pollo Centro. Cada local lleva su propia contabilidad.
/// Debe mantenerse alineado con <c>LOCATIONS</c> del frontend.
/// </summary>
public static class Locales
{
    public static readonly IReadOnlyList<(string Id, string Nombre)> Todos =
    [
        ("loc-union", "Pollo Centro - S. Union"),
        ("loc-broadway", "Pollo Centro - Broadway"),
        ("loc-haverhill", "Pollo Centro - Haverhill"),
        ("loc-lawrence", "Pollo Centro - Lawrence"),
        ("loc-lynn", "Pollo Centro - Lynn"),
        ("loc-prep", "Pollo Centro - Prep"),
        ("loc-worcester", "Pollo Centro - Worcester"),
    ];

    /// <summary>Devuelve el nombre del local o null si el id no existe.</summary>
    public static string? Nombre(string? id)
    {
        if (string.IsNullOrEmpty(id)) return null;
        foreach (var l in Todos)
            if (l.Id == id) return l.Nombre;
        return null;
    }
}

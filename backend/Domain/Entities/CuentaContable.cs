namespace PolloCentro.Api.Domain.Entities;

/// <summary>
/// Cuenta del plan de cuentas (Chart of Accounts), al estilo QuickBooks.
/// Tabla <c>CuentasContables</c>.
/// </summary>
public class CuentaContable
{
    public int IdCuenta { get; set; }

    /// <summary>Código contable, p. ej. "4000".</summary>
    public string Codigo { get; set; } = string.Empty;

    public string Nombre { get; set; } = string.Empty;

    /// <summary>Tipo: Activo, Pasivo, Capital, Ingreso o Gasto.</summary>
    public string Tipo { get; set; } = string.Empty;

    public string? Descripcion { get; set; }
    public bool Estado { get; set; } = true;
}

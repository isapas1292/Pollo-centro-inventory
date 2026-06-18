namespace PolloCentro.Api.Domain.Entities;

/// <summary>
/// Asiento/transacción contable de ingreso o gasto (tabla <c>TransaccionesContables</c>).
/// Se clasifica contra una cuenta del plan de cuentas y alimenta el Estado de Resultados.
/// </summary>
public class TransaccionContable
{
    public int IdTransaccion { get; set; }
    public DateTime Fecha { get; set; }

    /// <summary>Tipo de movimiento: "ingreso" o "gasto".</summary>
    public string Tipo { get; set; } = string.Empty;

    /// <summary>Local/negocio al que pertenece la transacción (cada local lleva su contabilidad).</summary>
    public string? UbicacionId { get; set; }
    public string? UbicacionNombre { get; set; }

    public int IdCuenta { get; set; }
    public string CuentaNombre { get; set; } = string.Empty;
    public decimal Monto { get; set; }
    public string? Descripcion { get; set; }

    /// <summary>Método de pago: efectivo, tarjeta, transferencia, cheque.</summary>
    public string? MetodoPago { get; set; }

    /// <summary>Número de documento/factura de referencia.</summary>
    public string? Referencia { get; set; }

    /// <summary>Cliente o proveedor asociado.</summary>
    public string? Contacto { get; set; }

    public string? RegistradoPor { get; set; }
    public DateTime FechaRegistro { get; set; }
}

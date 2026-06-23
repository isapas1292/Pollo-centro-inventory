namespace PolloCentro.Api.Domain.Entities;

/// <summary>Cierre diario importado desde un reporte PDF del punto de venta.</summary>
public class ImportacionCierreCaja
{
    public int IdImportacionCierre { get; set; }
    public int IdLocal { get; set; }
    public string LocalCodigo { get; set; } = string.Empty;
    public string LocalNombre { get; set; } = string.Empty;
    public string NegocioPdf { get; set; } = string.Empty;
    public string? Caja { get; set; }
    public string Secuencia { get; set; } = string.Empty;
    public DateTime FechaInicio { get; set; }
    public DateTime FechaFin { get; set; }
    public decimal VentaNeta { get; set; }
    public decimal Impuesto { get; set; }
    public decimal CargoExtra { get; set; }
    public decimal VentaBruta { get; set; }
    public decimal Propinas { get; set; }
    public decimal TotalPago { get; set; }
    public int ConteoOrdenes { get; set; }
    public int ConteoClientes { get; set; }
    public string PagosJson { get; set; } = "[]";
    public string ArchivoNombre { get; set; } = string.Empty;
    public string ArchivoHash { get; set; } = string.Empty;
    public string? ImportadoPor { get; set; }
    public DateTime FechaImportacion { get; set; }

    public Local Local { get; set; } = null!;
    public ICollection<TransaccionContable> Transacciones { get; set; } = new List<TransaccionContable>();
}

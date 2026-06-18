namespace PolloCentro.Api.Domain.Entities;

/// <summary>Entrada del registro de auditoría (tabla <c>Auditoria</c>).</summary>
public class Auditoria
{
    public int IdAuditoria { get; set; }
    public string? IdUsuario { get; set; }
    public string? UsuarioNombre { get; set; }
    public string Accion { get; set; } = string.Empty;
    public string? Detalles { get; set; }
    public DateTime FechaHora { get; set; }
}

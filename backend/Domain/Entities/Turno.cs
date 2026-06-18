namespace PolloCentro.Api.Domain.Entities;

/// <summary>Turno de horario de un empleado (tabla <c>Turnos</c>).</summary>
public class Turno
{
    public int IdTurno { get; set; }
    public int IdEmpleado { get; set; }
    public string EmpleadoNombre { get; set; } = string.Empty;
    public string UbicacionId { get; set; } = string.Empty;
    public string UbicacionNombre { get; set; } = string.Empty;
    public int DiaSemana { get; set; }
    public string HoraInicio { get; set; } = string.Empty;
    public string HoraFin { get; set; } = string.Empty;
    public string SemanaKey { get; set; } = string.Empty;
}

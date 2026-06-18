namespace PolloCentro.Api.Domain.Entities;

/// <summary>Empleado del negocio (tabla <c>Empleados</c>).</summary>
public class Empleado
{
    public int IdEmpleado { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Rol { get; set; } = string.Empty;
    public string? Telefono { get; set; }
    public bool Estado { get; set; } = true;
}

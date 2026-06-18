using System.ComponentModel.DataAnnotations;

namespace PolloCentro.Api.Application.Employees;

public class EmployeeDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public bool Active { get; set; }
}

public class EmployeeInput
{
    [Required(ErrorMessage = "El nombre es requerido")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "El puesto es requerido")]
    public string Role { get; set; } = string.Empty;

    public string? Phone { get; set; }
    public bool Active { get; set; } = true;
}

public interface IEmployeeService
{
    Task<IReadOnlyList<EmployeeDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<EmployeeDto> CreateAsync(EmployeeInput input, CancellationToken cancellationToken = default);
    Task<EmployeeDto> UpdateAsync(int id, EmployeeInput input, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}

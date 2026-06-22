using System.ComponentModel.DataAnnotations;

namespace PolloCentro.Api.Application.Employees;

public class EmployeeDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public bool Active { get; set; }
    public string? LocationId { get; set; }
    public string? LocationName { get; set; }
}

public class EmployeeInput
{
    [Required(ErrorMessage = "El nombre es requerido")]
    [StringLength(150)]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "El puesto es requerido")]
    [StringLength(100)]
    public string Role { get; set; } = string.Empty;

    [StringLength(20)]
    public string? Phone { get; set; }

    public bool Active { get; set; } = true;

    public string? LocationId { get; set; }

    [StringLength(150)]
    public string? LocationName { get; set; }
}

public interface IEmployeeService
{
    Task<IReadOnlyList<EmployeeDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<EmployeeDto> CreateAsync(EmployeeInput input, CancellationToken cancellationToken = default);
    Task<EmployeeDto> UpdateAsync(int id, EmployeeInput input, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}

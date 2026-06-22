using System.ComponentModel.DataAnnotations;

namespace PolloCentro.Api.Application.Schedule;

public class ShiftDto
{
    public string Id { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string LocationId { get; set; } = string.Empty;
    public string LocationName { get; set; } = string.Empty;
    public int DayOfWeek { get; set; }
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public string WeekKey { get; set; } = string.Empty;
}

public class ShiftInput
{
    [Required]
    public string EmployeeId { get; set; } = string.Empty;
    [Required, StringLength(150)]
    public string EmployeeName { get; set; } = string.Empty;
    [Required, StringLength(50)]
    public string LocationId { get; set; } = string.Empty;
    [Required, StringLength(150)]
    public string LocationName { get; set; } = string.Empty;
    [Range(0, 6)]
    public int DayOfWeek { get; set; }
    [Required, RegularExpression("^([01]\\d|2[0-3]):[0-5]\\d$")]
    public string StartTime { get; set; } = string.Empty;
    [Required, RegularExpression("^([01]\\d|2[0-3]):[0-5]\\d$")]
    public string EndTime { get; set; } = string.Empty;
    [Required, RegularExpression("^\\d{4}-W\\d{2}$")]
    public string WeekKey { get; set; } = string.Empty;
}

/// <summary>Alta masiva de turnos, con opción de reemplazar primero los de una semana.</summary>
public class BulkShiftInput
{
    /// <summary>Si viene, se borran los turnos de esa semana antes de insertar (horario automático).</summary>
    public string? ReplaceWeekKey { get; set; }
    [MinLength(1)]
    public List<ShiftInput> Shifts { get; set; } = new();
}

public interface IScheduleService
{
    Task<IReadOnlyList<ShiftDto>> GetAllAsync(string? weekKey, CancellationToken cancellationToken = default);
    Task<ShiftDto> CreateAsync(ShiftInput input, CancellationToken cancellationToken = default);
    Task<int> CreateManyAsync(BulkShiftInput input, CancellationToken cancellationToken = default);
    Task<ShiftDto> UpdateAsync(int id, ShiftInput input, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}

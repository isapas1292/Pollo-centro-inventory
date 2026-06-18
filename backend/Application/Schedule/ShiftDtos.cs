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
    public string EmployeeId { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string LocationId { get; set; } = string.Empty;
    public string LocationName { get; set; } = string.Empty;
    public int DayOfWeek { get; set; }
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public string WeekKey { get; set; } = string.Empty;
}

public interface IScheduleService
{
    Task<IReadOnlyList<ShiftDto>> GetAllAsync(string? weekKey, CancellationToken cancellationToken = default);
    Task<ShiftDto> CreateAsync(ShiftInput input, CancellationToken cancellationToken = default);
    Task<ShiftDto> UpdateAsync(int id, ShiftInput input, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}

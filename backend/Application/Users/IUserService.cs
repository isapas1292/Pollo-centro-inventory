namespace PolloCentro.Api.Application.Users;

public interface IUserService
{
    Task<IReadOnlyList<UserDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<UserDto> CreateAsync(UserInput input, CancellationToken cancellationToken = default);
    Task<UserDto> UpdateAsync(int id, UserInput input, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}

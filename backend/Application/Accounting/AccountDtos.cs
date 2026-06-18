using System.ComponentModel.DataAnnotations;

namespace PolloCentro.Api.Application.Accounting;

public class AccountDto
{
    public string Id { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool Active { get; set; }
}

public class AccountInput
{
    [Required(ErrorMessage = "El código es requerido")]
    public string Code { get; set; } = string.Empty;

    [Required(ErrorMessage = "El nombre es requerido")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "El tipo es requerido")]
    public string Type { get; set; } = string.Empty;

    public string? Description { get; set; }
    public bool Active { get; set; } = true;
}

public interface IAccountService
{
    Task<IReadOnlyList<AccountDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<AccountDto> CreateAsync(AccountInput input, CancellationToken cancellationToken = default);
    Task<AccountDto> UpdateAsync(int id, AccountInput input, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}

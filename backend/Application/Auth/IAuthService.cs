namespace PolloCentro.Api.Application.Auth;

public interface IAuthService
{
    /// <summary>Valida credenciales y devuelve token JWT + usuario. Lanza excepción si fallan.</summary>
    Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);

    /// <summary>Re-emite el token (sesión deslizante) para un usuario ya autenticado y activo.</summary>
    Task<LoginResponse> RefreshAsync(int userId, CancellationToken cancellationToken = default);
}

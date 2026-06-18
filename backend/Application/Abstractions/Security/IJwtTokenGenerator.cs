namespace PolloCentro.Api.Application.Abstractions.Security;

/// <summary>Genera tokens JWT firmados para los usuarios autenticados.</summary>
public interface IJwtTokenGenerator
{
    string GenerateToken(int userId, string role, string email);
}

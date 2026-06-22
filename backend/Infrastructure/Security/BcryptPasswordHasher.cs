using PolloCentro.Api.Application.Abstractions.Security;

namespace PolloCentro.Api.Infrastructure.Security;

/// <summary>Implementación de hashing de contraseñas con BCrypt (compatible con los hashes existentes).</summary>
public class BcryptPasswordHasher : IPasswordHasher
{
    private const int WorkFactor = 12;

    public string Hash(string password) => BCrypt.Net.BCrypt.HashPassword(password, WorkFactor);

    public bool Verify(string password, string hash) => BCrypt.Net.BCrypt.Verify(password, hash);
}

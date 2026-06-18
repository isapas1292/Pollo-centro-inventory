namespace PolloCentro.Api.Application.Abstractions.Security;

/// <summary>Abstracción del hashing de contraseñas (implementado con BCrypt en Infrastructure).</summary>
public interface IPasswordHasher
{
    string Hash(string password);
    bool Verify(string password, string hash);
}

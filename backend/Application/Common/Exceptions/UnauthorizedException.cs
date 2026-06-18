namespace PolloCentro.Api.Application.Common.Exceptions;

/// <summary>Se lanza ante credenciales inválidas o usuario inactivo. El middleware la traduce a HTTP 401.</summary>
public class UnauthorizedException : Exception
{
    public UnauthorizedException(string message) : base(message) { }
}

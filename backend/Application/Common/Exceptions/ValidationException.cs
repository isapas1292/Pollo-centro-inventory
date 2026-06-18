namespace PolloCentro.Api.Application.Common.Exceptions;

/// <summary>Se lanza ante datos de entrada inválidos. El middleware la traduce a HTTP 400.</summary>
public class ValidationException : Exception
{
    public ValidationException(string message) : base(message) { }
}

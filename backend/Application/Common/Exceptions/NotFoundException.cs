namespace PolloCentro.Api.Application.Common.Exceptions;

/// <summary>Se lanza cuando una entidad solicitada no existe. El middleware la traduce a HTTP 404.</summary>
public class NotFoundException : Exception
{
    public NotFoundException(string message) : base(message) { }

    public NotFoundException(string entity, object key)
        : base($"No se encontró \"{entity}\" con identificador ({key}).") { }
}

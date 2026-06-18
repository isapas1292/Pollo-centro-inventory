using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using PolloCentro.Api.Application.Common.Exceptions;

namespace PolloCentro.Api.Api.Middleware;

/// <summary>
/// Captura las excepciones no controladas y las traduce a respuestas HTTP consistentes
/// (formato ProblemDetails). Evita repetir try/catch en cada controlador.
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _env;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger,
        IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleAsync(context, ex);
        }
    }

    private async Task HandleAsync(HttpContext context, Exception ex)
    {
        var (status, title) = ex switch
        {
            ValidationException => (StatusCodes.Status400BadRequest, ex.Message),
            UnauthorizedException => (StatusCodes.Status401Unauthorized, ex.Message),
            NotFoundException => (StatusCodes.Status404NotFound, ex.Message),
            _ => (StatusCodes.Status500InternalServerError, "Ocurrió un error inesperado en el servidor.")
        };

        if (status == StatusCodes.Status500InternalServerError)
            _logger.LogError(ex, "Excepción no controlada en {Path}", context.Request.Path);
        else
            _logger.LogWarning("{Title} en {Path}", title, context.Request.Path);

        var problem = new ProblemDetails
        {
            Status = status,
            Title = title,
            Type = $"https://httpstatuses.io/{status}",
            Instance = context.Request.Path
        };

        // En desarrollo exponemos detalles para depurar errores 500.
        if (status == StatusCodes.Status500InternalServerError && _env.IsDevelopment())
            problem.Detail = ex.ToString();

        context.Response.StatusCode = status;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(problem));
    }
}

using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PolloCentro.Api.Application.Abstractions.Notifications;

namespace PolloCentro.Api.Infrastructure.Notifications;

/// <summary>
/// Envío de WhatsApp vía Graph API de Meta:
/// POST {ApiBaseUrl}/{ApiVersion}/{PhoneNumberId}/messages
/// </summary>
public class MetaWhatsAppSender : IWhatsAppSender
{
    private readonly HttpClient _http;
    private readonly WhatsAppOptions _options;
    private readonly ILogger<MetaWhatsAppSender> _logger;

    public MetaWhatsAppSender(HttpClient http, IOptions<WhatsAppOptions> options, ILogger<MetaWhatsAppSender> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;
    }

    public bool IsEnabled =>
        _options.Enabled
        && !string.IsNullOrWhiteSpace(_options.AccessToken)
        && !string.IsNullOrWhiteSpace(_options.PhoneNumberId)
        && !string.IsNullOrWhiteSpace(_options.RecipientNumber);

    public async Task<bool> SendStockAlertAsync(
        string productName, decimal currentStock, decimal minStock, string? unit,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled)
        {
            _logger.LogWarning(
                "WhatsApp no configurado (Enabled/AccessToken/PhoneNumberId/RecipientNumber). " +
                "Se omite el envío de la alerta de '{Producto}'.", productName);
            return false;
        }

        var u = string.IsNullOrWhiteSpace(unit) ? string.Empty : " " + unit;
        var actual = $"{currentStock}{u}";
        var minimo = $"{minStock}{u}";

        var url = $"{_options.ApiBaseUrl.TrimEnd('/')}/{_options.ApiVersion}/{_options.PhoneNumberId}/messages";
        var payload = BuildPayload(productName, actual, minimo);

        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
            };
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.AccessToken);

            using var res = await _http.SendAsync(req, cancellationToken);
            var body = await res.Content.ReadAsStringAsync(cancellationToken);

            if (res.IsSuccessStatusCode)
            {
                _logger.LogInformation("WhatsApp enviado para '{Producto}'. Respuesta Meta: {Body}", productName, body);
                return true;
            }

            _logger.LogError(
                "Meta rechazó el WhatsApp para '{Producto}'. HTTP {Status}. Cuerpo: {Body}",
                productName, (int)res.StatusCode, body);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fallo de red enviando WhatsApp para '{Producto}'.", productName);
            return false;
        }
    }

    /// <summary>
    /// Construye el cuerpo de Meta. Con plantilla (mensajes proactivos) o texto plano
    /// (solo dentro de la ventana de 24h; pensado para pruebas).
    /// </summary>
    private object BuildPayload(string productName, string actual, string minimo)
    {
        if (!string.IsNullOrWhiteSpace(_options.TemplateName))
        {
            return new
            {
                messaging_product = "whatsapp",
                to = _options.RecipientNumber,
                type = "template",
                template = new
                {
                    name = _options.TemplateName,
                    language = new { code = _options.TemplateLanguage },
                    components = new[]
                    {
                        new
                        {
                            type = "body",
                            parameters = new[]
                            {
                                new { type = "text", text = productName },
                                new { type = "text", text = actual },
                                new { type = "text", text = minimo },
                            }
                        }
                    }
                }
            };
        }

        var texto =
            "🚨 *Alerta de Stock - Pollo Centro*\n\n" +
            $"El producto *{productName}* llegó a su nivel mínimo.\n" +
            $"Stock actual: {actual}\n" +
            $"Mínimo requerido: {minimo}\n\n" +
            "Por favor, reabastecer lo antes posible.";

        return new
        {
            messaging_product = "whatsapp",
            to = _options.RecipientNumber,
            type = "text",
            text = new { body = texto }
        };
    }
}

namespace PolloCentro.Api.Infrastructure.Notifications;

/// <summary>
/// Opciones de WhatsApp Business Cloud API (Meta), enlazadas desde la sección <c>WhatsApp</c>.
///
/// Los SECRETOS (AccessToken, PhoneNumberId) NO se guardan en appsettings.json.
/// En desarrollo usa User Secrets o variables de entorno:
///   WhatsApp__AccessToken, WhatsApp__PhoneNumberId
/// </summary>
public class WhatsAppOptions
{
    public const string SectionName = "WhatsApp";

    /// <summary>Interruptor general del envío automático.</summary>
    public bool Enabled { get; set; } = true;

    /// <summary>Base de la Graph API. Normalmente no se cambia.</summary>
    public string ApiBaseUrl { get; set; } = "https://graph.facebook.com";

    /// <summary>Versión de la Graph API (p. ej. v21.0).</summary>
    public string ApiVersion { get; set; } = "v21.0";

    /// <summary>Token de acceso permanente del System User / App (SECRETO).</summary>
    public string AccessToken { get; set; } = string.Empty;

    /// <summary>ID del número de teléfono de WhatsApp Business (SECRETO/identificador).</summary>
    public string PhoneNumberId { get; set; } = string.Empty;

    /// <summary>Número destino en formato internacional sin '+', p. ej. 18098506034.</summary>
    public string RecipientNumber { get; set; } = "18098506034";

    /// <summary>
    /// Nombre de la plantilla aprobada en Meta para mensajes proactivos.
    /// Si se deja vacío se envía como texto plano (solo funciona dentro de la ventana
    /// de 24h tras un mensaje del destinatario; útil para pruebas).
    /// </summary>
    public string TemplateName { get; set; } = string.Empty;

    /// <summary>Código de idioma de la plantilla (p. ej. es, es_DO, en_US).</summary>
    public string TemplateLanguage { get; set; } = "es";
}

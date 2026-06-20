namespace PolloCentro.Api.Application.Abstractions.Notifications;

/// <summary>
/// Envía notificaciones por WhatsApp (WhatsApp Business Cloud API de Meta).
/// La implementación vive en la capa Infrastructure.
/// </summary>
public interface IWhatsAppSender
{
    /// <summary>True si hay credenciales configuradas y el envío está habilitado.</summary>
    bool IsEnabled { get; }

    /// <summary>
    /// Envía la alerta de stock al número configurado. Devuelve true si Meta aceptó el mensaje.
    /// No lanza excepción: ante error registra el log y devuelve false.
    /// </summary>
    Task<bool> SendStockAlertAsync(
        string productName, decimal currentStock, decimal minStock, string? unit,
        CancellationToken cancellationToken = default);
}

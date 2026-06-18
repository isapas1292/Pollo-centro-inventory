using Microsoft.Extensions.DependencyInjection;
using PolloCentro.Api.Application.Auth;
using PolloCentro.Api.Application.Inventory;
using PolloCentro.Api.Application.Suppliers;

namespace PolloCentro.Api.Application;

public static class DependencyInjection
{
    /// <summary>Registra los servicios de la capa Application (lógica de negocio).</summary>
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ISupplierService, SupplierService>();
        services.AddScoped<IInventoryService, InventoryService>();
        return services;
    }
}

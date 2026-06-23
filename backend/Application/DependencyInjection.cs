using Microsoft.Extensions.DependencyInjection;
using PolloCentro.Api.Application.Accounting;
using PolloCentro.Api.Application.Alerts;
using PolloCentro.Api.Application.Audit;
using PolloCentro.Api.Application.Auth;
using PolloCentro.Api.Application.Dispatches;
using PolloCentro.Api.Application.Employees;
using PolloCentro.Api.Application.Inventory;
using PolloCentro.Api.Application.Locations;
using PolloCentro.Api.Application.Orders;
using PolloCentro.Api.Application.Prices;
using PolloCentro.Api.Application.Recipes;
using PolloCentro.Api.Application.Schedule;
using PolloCentro.Api.Application.Suppliers;
using PolloCentro.Api.Application.Users;

namespace PolloCentro.Api.Application;

public static class DependencyInjection
{
    /// <summary>Registra los servicios de la capa Application (lógica de negocio).</summary>
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ISupplierService, SupplierService>();
        services.AddScoped<IInventoryService, InventoryService>();
        services.AddScoped<IRecipeService, RecipeService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IEmployeeService, EmployeeService>();
        services.AddScoped<IScheduleService, ScheduleService>();
        services.AddScoped<IPriceService, PriceService>();
        services.AddScoped<IAlertService, AlertService>();
        services.AddScoped<IOrderService, OrderService>();
        services.AddScoped<IDispatchService, DispatchService>();
        services.AddScoped<IAuditService, AuditService>();
        services.AddScoped<IAccountService, AccountService>();
        services.AddScoped<ITransactionService, TransactionService>();
        services.AddScoped<IClosingImportService, ClosingImportService>();
        services.AddScoped<ILocationService, LocationService>();
        return services;
    }
}

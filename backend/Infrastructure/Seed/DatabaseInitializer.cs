using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using PolloCentro.Api.Domain.Catalogs;
using PolloCentro.Api.Domain.Entities;
using PolloCentro.Api.Infrastructure.Persistence;

namespace PolloCentro.Api.Infrastructure.Seed;

/// <summary>
/// Crea (de forma idempotente) las tablas operacionales que no formaban parte del
/// esquema original y siembra datos de demostración en las tablas vacías.
/// No modifica las tablas existentes salvo asignar stock inicial a productos en cero.
/// </summary>
public static class DatabaseInitializer
{
    private static readonly (string Id, string Name)[] Locations =
    [
        ("loc-union", "Pollo Centro - S. Union"),
        ("loc-broadway", "Pollo Centro - Broadway"),
        ("loc-haverhill", "Pollo Centro - Haverhill"),
        ("loc-lynn", "Pollo Centro - Lynn"),
        ("loc-prep", "Pollo Centro - Prep"),
        ("loc-worcester", "Pollo Centro - Worcester"),
    ];

    public static async Task InitializeAsync(IServiceProvider services, bool seedData, CancellationToken ct = default)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<AppDbContext>>();

        await EnsureTablesAsync(db, ct);
        logger.LogInformation("Tablas operacionales verificadas/creadas.");

        // Datos de referencia (siempre): catálogo de locales.
        await SeedLocalesAsync(db, ct);

        // Asigna local a las transacciones contables existentes que aún no lo tengan.
        await BackfillTransactionLocationsAsync(db, ct);

        // Asegura un precio de venta con margen en recetas que aún no lo tengan.
        await BackfillRecipeSalePricesAsync(db, ct);

        if (seedData)
        {
            await SeedEmpleadosYTurnosAsync(db, ct);
            await SeedRecetasAsync(db, ct);
            await EnsureProductStockAsync(db, ct);
            await SeedHistorialPreciosAsync(db, ct);
            await SeedAlertasAsync(db, ct);
            await SeedRecepcionesAsync(db, ct);
            await SeedAuditoriaAsync(db, ct);
            await SeedContabilidadAsync(db, ct);
        }

        await ReconcilePendingOrderAlertsAsync(db, ct);
        await BackfillOrderTransactionsAsync(db, ct);
        await EnsureDatabaseOptimizationsAsync(db, ct);

        logger.LogInformation("Inicialización y optimización de base de datos completadas.");
    }

    // ------------------------------------------------------------------ esquema
    private const string CreateTablesSql = @"
IF OBJECT_ID(N'dbo.Empleados', N'U') IS NULL
CREATE TABLE dbo.Empleados (
    IdEmpleado INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Nombre VARCHAR(150) NOT NULL,
    Rol VARCHAR(100) NOT NULL,
    Telefono VARCHAR(20) NULL,
    Estado BIT NOT NULL DEFAULT(1)
);
IF OBJECT_ID(N'dbo.Turnos', N'U') IS NULL
CREATE TABLE dbo.Turnos (
    IdTurno INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    IdEmpleado INT NOT NULL,
    EmpleadoNombre VARCHAR(150) NOT NULL,
    UbicacionId VARCHAR(50) NOT NULL,
    UbicacionNombre VARCHAR(150) NOT NULL,
    DiaSemana INT NOT NULL,
    HoraInicio VARCHAR(5) NOT NULL,
    HoraFin VARCHAR(5) NOT NULL,
    SemanaKey VARCHAR(10) NOT NULL
);
IF OBJECT_ID(N'dbo.HistorialPrecios', N'U') IS NULL
CREATE TABLE dbo.HistorialPrecios (
    IdHistorial INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    IdProducto INT NOT NULL,
    ProductoNombre VARCHAR(150) NULL,
    Precio DECIMAL(10,2) NOT NULL,
    Proveedor VARCHAR(150) NULL,
    FechaRegistro DATETIME NOT NULL DEFAULT(getdate()),
    RegistradoPor VARCHAR(150) NULL
);
IF OBJECT_ID(N'dbo.RegistroPreparaciones', N'U') IS NULL
CREATE TABLE dbo.RegistroPreparaciones (
    IdRegistro INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    IdReceta INT NOT NULL,
    RecetaNombre VARCHAR(150) NOT NULL,
    PreparadoPor VARCHAR(150) NULL,
    FechaPreparacion DATETIME NOT NULL DEFAULT(getdate()),
    Cantidad INT NOT NULL DEFAULT(1),
    CostoTotal DECIMAL(10,2) NOT NULL DEFAULT(0),
    IngredientesJson NVARCHAR(MAX) NULL
);
IF OBJECT_ID(N'dbo.Alertas', N'U') IS NULL
CREATE TABLE dbo.Alertas (
    IdAlerta INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    IdProducto INT NOT NULL,
    ProductoNombre VARCHAR(150) NOT NULL,
    StockActual DECIMAL(10,2) NOT NULL,
    StockMinimo DECIMAL(10,2) NOT NULL,
    Unidad VARCHAR(50) NULL,
    Estado VARCHAR(20) NOT NULL DEFAULT('active'),
    WhatsappEnviado BIT NOT NULL DEFAULT(0),
    FechaCreacion DATETIME NOT NULL DEFAULT(getdate()),
    FechaResolucion DATETIME NULL
);
IF OBJECT_ID(N'dbo.Auditoria', N'U') IS NULL
CREATE TABLE dbo.Auditoria (
    IdAuditoria INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    IdUsuario VARCHAR(50) NULL,
    UsuarioNombre VARCHAR(150) NULL,
    Accion VARCHAR(100) NOT NULL,
    Detalles VARCHAR(500) NULL,
    FechaHora DATETIME NOT NULL DEFAULT(getdate())
);
IF OBJECT_ID(N'dbo.Recepciones', N'U') IS NULL
CREATE TABLE dbo.Recepciones (
    IdRecepcion INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    IdProveedor INT NOT NULL,
    ProveedorNombre VARCHAR(150) NOT NULL,
    IdProducto INT NOT NULL,
    ProductoNombre VARCHAR(150) NOT NULL,
    Cantidad DECIMAL(10,2) NOT NULL,
    Precio DECIMAL(10,2) NOT NULL,
    Total DECIMAL(10,2) NOT NULL,
    FechaRecepcion DATETIME NOT NULL DEFAULT(getdate()),
    RecibidoPor VARCHAR(150) NULL,
    Estado VARCHAR(20) NOT NULL DEFAULT('completed')
);
IF OBJECT_ID(N'dbo.CuentasContables', N'U') IS NULL
CREATE TABLE dbo.CuentasContables (
    IdCuenta INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Codigo VARCHAR(20) NOT NULL,
    Nombre VARCHAR(150) NOT NULL,
    Tipo VARCHAR(20) NOT NULL,
    Descripcion VARCHAR(255) NULL,
    Estado BIT NOT NULL DEFAULT(1)
);
IF OBJECT_ID(N'dbo.TransaccionesContables', N'U') IS NULL
CREATE TABLE dbo.TransaccionesContables (
    IdTransaccion INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Fecha DATETIME NOT NULL,
    Tipo VARCHAR(20) NOT NULL,
    UbicacionId VARCHAR(50) NULL,
    UbicacionNombre VARCHAR(150) NULL,
    IdCuenta INT NOT NULL,
    CuentaNombre VARCHAR(150) NOT NULL,
    Monto DECIMAL(12,2) NOT NULL,
    Descripcion VARCHAR(255) NULL,
    MetodoPago VARCHAR(30) NULL,
    Referencia VARCHAR(60) NULL,
    Contacto VARCHAR(150) NULL,
    RegistradoPor VARCHAR(150) NULL,
    FechaRegistro DATETIME NOT NULL DEFAULT(getdate())
);
IF COL_LENGTH(N'dbo.TransaccionesContables', 'UbicacionId') IS NULL
    ALTER TABLE dbo.TransaccionesContables ADD UbicacionId VARCHAR(50) NULL;
IF COL_LENGTH(N'dbo.TransaccionesContables', 'UbicacionNombre') IS NULL
    ALTER TABLE dbo.TransaccionesContables ADD UbicacionNombre VARCHAR(150) NULL;
IF OBJECT_ID(N'dbo.Recetas', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.Recetas', 'StockPreparado') IS NULL
    ALTER TABLE dbo.Recetas ADD StockPreparado DECIMAL(10,2) NOT NULL DEFAULT(0);
IF COL_LENGTH(N'dbo.Empleados', 'IdLocal') IS NULL
    ALTER TABLE dbo.Empleados ADD IdLocal INT NULL;
IF COL_LENGTH(N'dbo.Empleados', 'LocalNombre') IS NULL
    ALTER TABLE dbo.Empleados ADD LocalNombre VARCHAR(150) NULL;
IF OBJECT_ID(N'dbo.Locales', N'U') IS NULL
CREATE TABLE dbo.Locales (
    IdLocal INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Codigo VARCHAR(50) NOT NULL UNIQUE,
    Nombre VARCHAR(150) NOT NULL,
    Direccion VARCHAR(255) NULL,
    Estado BIT NOT NULL DEFAULT(1)
);
IF OBJECT_ID(N'dbo.InventarioLocal', N'U') IS NULL
CREATE TABLE dbo.InventarioLocal (
    IdInventarioLocal INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    IdLocal VARCHAR(50) NOT NULL,
    LocalNombre VARCHAR(150) NULL,
    IdProducto INT NOT NULL,
    Cantidad DECIMAL(10,2) NOT NULL DEFAULT(0),
    StockMinimo DECIMAL(10,2) NOT NULL DEFAULT(0),
    FechaActualizacion DATETIME NOT NULL DEFAULT(getdate()),
    CONSTRAINT UQ_InventarioLocal UNIQUE (IdLocal, IdProducto)
);
IF OBJECT_ID(N'dbo.Envios', N'U') IS NULL
CREATE TABLE dbo.Envios (
    IdEnvio INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    IdLocal INT NOT NULL,
    LocalNombre VARCHAR(150) NOT NULL,
    ItemsJson NVARCHAR(MAX) NOT NULL,
    EnviadoPorId VARCHAR(50) NULL,
    EnviadoPor VARCHAR(150) NULL,
    Nota VARCHAR(500) NULL,
    FechaEnvio DATETIME NOT NULL DEFAULT(getdate())
);
IF OBJECT_ID(N'dbo.ImportacionesCierreCaja', N'U') IS NULL
CREATE TABLE dbo.ImportacionesCierreCaja (
    IdImportacionCierre INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    IdLocal INT NOT NULL,
    LocalCodigo VARCHAR(50) NOT NULL,
    LocalNombre VARCHAR(150) NOT NULL,
    NegocioPdf VARCHAR(150) NOT NULL,
    Caja VARCHAR(80) NULL,
    Secuencia VARCHAR(50) NOT NULL,
    FechaInicio DATETIME2 NOT NULL,
    FechaFin DATETIME2 NOT NULL,
    VentaNeta DECIMAL(12,2) NOT NULL,
    Impuesto DECIMAL(12,2) NOT NULL,
    CargoExtra DECIMAL(12,2) NOT NULL,
    VentaBruta DECIMAL(12,2) NOT NULL,
    Propinas DECIMAL(12,2) NOT NULL,
    TotalPago DECIMAL(12,2) NOT NULL,
    ConteoOrdenes INT NOT NULL,
    ConteoClientes INT NOT NULL,
    PagosJson NVARCHAR(MAX) NOT NULL,
    ArchivoNombre VARCHAR(255) NOT NULL,
    ArchivoHash NCHAR(64) NOT NULL,
    ImportadoPor VARCHAR(150) NULL,
    FechaImportacion DATETIME2 NOT NULL DEFAULT(sysdatetime())
);
IF COL_LENGTH(N'dbo.TransaccionesContables', 'IdImportacionCierre') IS NULL
    ALTER TABLE dbo.TransaccionesContables ADD IdImportacionCierre INT NULL;";

    private static Task EnsureTablesAsync(AppDbContext db, CancellationToken ct)
        => db.Database.ExecuteSqlRawAsync(CreateTablesSql, ct);

    // ------------------------------------------------------------------ empleados/turnos
    private static async Task SeedEmpleadosYTurnosAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.Empleados.AnyAsync(ct)) return;

        var empleados = new List<Empleado>
        {
            new() { Nombre = "Juan Pérez", Rol = "Cocinero", Telefono = "555-0101" },
            new() { Nombre = "María Gómez", Rol = "Cajera", Telefono = "555-0102" },
            new() { Nombre = "Carlos Díaz", Rol = "Delivery", Telefono = "555-0103" },
            new() { Nombre = "Ana López", Rol = "Manager", Telefono = "555-0104" },
            new() { Nombre = "Luis Torres", Rol = "Ayudante", Telefono = "555-0105" },
            new() { Nombre = "Sofía Ruiz", Rol = "Cajera", Telefono = "555-0106" },
            new() { Nombre = "Miguel Ángel", Rol = "Cocinero", Telefono = "555-0107" },
            new() { Nombre = "Laura Cruz", Rol = "Limpieza", Telefono = "555-0108" },
        };
        db.Empleados.AddRange(empleados);
        await db.SaveChangesAsync(ct);

        var weekKey = GetCurrentWeekKey();
        var turnos = new List<Turno>();
        for (var index = 0; index < empleados.Count; index++)
        {
            var emp = empleados[index];
            var loc = Locations[index % Locations.Length];
            var start = index % 2 == 0 ? "08:00" : "12:00";
            var end = index % 2 == 0 ? "16:00" : "20:00";
            for (var day = 0; day < 5; day++)
            {
                turnos.Add(new Turno
                {
                    IdEmpleado = emp.IdEmpleado,
                    EmpleadoNombre = emp.Nombre,
                    UbicacionId = loc.Id,
                    UbicacionNombre = loc.Name,
                    DiaSemana = day,
                    HoraInicio = start,
                    HoraFin = end,
                    SemanaKey = weekKey
                });
            }
        }
        db.Turnos.AddRange(turnos);
        await db.SaveChangesAsync(ct);
    }

    // ------------------------------------------------------------------ recetas
    private static async Task SeedRecetasAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.Recetas.AnyAsync(ct)) return;

        var prods = await db.Productos.OrderBy(p => p.IdProducto).Take(10).ToListAsync(ct);
        if (prods.Count < 4) return;

        Receta Build(string nombre, string desc, params (Producto p, decimal qty)[] ings)
        {
            var receta = new Receta
            {
                NombreReceta = nombre,
                Descripcion = desc,
                Porciones = 1,
                Estado = true,
                // Precio de venta al consumidor ≈ costo × 2.8 (margen ~64%, food cost ~36%).
                PrecioVenta = Math.Round(ings.Sum(i => i.qty * i.p.CostoUnitario) * 2.8m, 2),
                RecetaIngredientes = ings.Select(i => new RecetaIngrediente
                {
                    IdProducto = i.p.IdProducto,
                    CantidadNecesaria = i.qty,
                    UnidadMedida = string.IsNullOrEmpty(i.p.UnidadMedida) ? "unidad" : i.p.UnidadMedida
                }).ToList()
            };
            return receta;
        }

        var recetas = new List<Receta>
        {
            Build("Combo de Pollo", "Plato estrella de la casa", (prods[0], 2), (prods[1], 1), (prods[2], 0.5m)),
            Build("Especial Criollo", "Receta tradicional", (prods[2], 1), (prods[3], 2), (prods[4], 1)),
            Build("Empanizado de la Casa", "Crujiente y dorado", (prods[4], 1.5m), (prods[5], 1)),
            Build("Plato Familiar", "Porción grande para compartir", (prods[6], 2), (prods[7], 1), (prods[8 % prods.Count], 1)),
        };
        db.Recetas.AddRange(recetas);
        await db.SaveChangesAsync(ct);
    }

    // ------------------------------------------------------------------ stock inicial
    private static async Task EnsureProductStockAsync(AppDbContext db, CancellationToken ct)
    {
        // Si todos los productos están en cero, asignamos stock/mínimos variados para
        // que el inventario y el dashboard muestren datos realistas.
        var hayStock = await db.Productos.AnyAsync(p => p.CantidadDisponible > 0, ct);
        if (hayStock) return;

        var prods = await db.Productos.OrderBy(p => p.IdProducto).Take(60).ToListAsync(ct);
        var rnd = new Random(42);
        foreach (var p in prods)
        {
            var min = rnd.Next(5, 30);
            // ~25% por debajo del mínimo (para alertas), el resto con stock holgado.
            var below = rnd.NextDouble() < 0.25;
            p.StockMinimo = min;
            p.CantidadDisponible = below ? rnd.Next(0, min) : min + rnd.Next(10, 120);
            p.FechaRegistro = DateTime.Now;
        }
        await db.SaveChangesAsync(ct);
    }

    // ------------------------------------------------------------------ historial de precios
    private static async Task SeedHistorialPreciosAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.HistorialPrecios.AnyAsync(ct)) return;

        var prods = await db.Productos.OrderBy(p => p.IdProducto).Take(30).ToListAsync(ct);
        var rnd = new Random(7);
        var registros = new List<HistorialPrecio>();
        foreach (var p in prods)
        {
            // Dos puntos de histórico por producto para que se vea una tendencia.
            registros.Add(new HistorialPrecio
            {
                IdProducto = p.IdProducto, ProductoNombre = p.NombreProducto,
                Precio = Math.Round(p.CostoUnitario * (decimal)(0.9 + rnd.NextDouble() * 0.1), 2),
                RegistradoPor = "admin", FechaRegistro = DateTime.Now.AddDays(-rnd.Next(20, 40))
            });
            registros.Add(new HistorialPrecio
            {
                IdProducto = p.IdProducto, ProductoNombre = p.NombreProducto,
                Precio = p.CostoUnitario, RegistradoPor = "admin",
                FechaRegistro = DateTime.Now.AddDays(-rnd.Next(1, 10))
            });
        }
        db.HistorialPrecios.AddRange(registros);
        await db.SaveChangesAsync(ct);
    }

    // ------------------------------------------------------------------ alertas
    private static async Task SeedAlertasAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.Alertas.AnyAsync(ct)) return;

        var bajos = await db.Productos
            .Where(p => p.CantidadDisponible <= p.StockMinimo && p.StockMinimo > 0)
            .OrderBy(p => p.IdProducto)
            .Take(8)
            .ToListAsync(ct);

        var alertas = bajos.Select((p, i) => new Alerta
        {
            IdProducto = p.IdProducto,
            ProductoNombre = p.NombreProducto,
            StockActual = p.CantidadDisponible,
            StockMinimo = p.StockMinimo,
            Unidad = p.UnidadMedida,
            Estado = "active",
            WhatsappEnviado = i % 3 == 0,
            FechaCreacion = DateTime.Now.AddHours(-i * 5)
        }).ToList();

        db.Alertas.AddRange(alertas);
        await db.SaveChangesAsync(ct);
    }

    // ------------------------------------------------------------------ recepciones
    private static async Task SeedRecepcionesAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.Recepciones.AnyAsync(ct)) return;

        var prods = await db.Productos
            .Where(p => p.IdProveedor != null)
            .Include(p => p.Proveedor)
            .OrderBy(p => p.IdProducto)
            .Take(8)
            .ToListAsync(ct);
        if (prods.Count == 0) return;

        var rnd = new Random(11);
        string[] estados = ["completed", "completed", "pending", "completed", "cancelled"];
        var recepciones = prods.Select((p, i) =>
        {
            decimal qty = rnd.Next(5, 50);
            return new Recepcion
            {
                IdProveedor = p.IdProveedor!.Value,
                ProveedorNombre = p.Proveedor?.NombreProveedor ?? "Proveedor",
                IdProducto = p.IdProducto,
                ProductoNombre = p.NombreProducto,
                Cantidad = qty,
                Precio = p.CostoUnitario,
                Total = qty * p.CostoUnitario,
                RecibidoPor = "admin",
                Estado = estados[i % estados.Length],
                FechaRecepcion = DateTime.Now.AddDays(-i)
            };
        }).ToList();

        db.Recepciones.AddRange(recepciones);
        await db.SaveChangesAsync(ct);
    }

    // ------------------------------------------------------------------ auditoría
    private static async Task SeedAuditoriaAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.Auditorias.AnyAsync(ct)) return;

        var entradas = new List<Auditoria>
        {
            new() { IdUsuario = "1", UsuarioNombre = "Admin Sistema", Accion = "login", Detalles = "Inicio de sesión", FechaHora = DateTime.Now.AddHours(-6) },
            new() { IdUsuario = "1", UsuarioNombre = "Admin Sistema", Accion = "inventory.create", Detalles = "Creó un producto", FechaHora = DateTime.Now.AddHours(-5) },
            new() { IdUsuario = "1", UsuarioNombre = "Admin Sistema", Accion = "prices.edit", Detalles = "Actualizó precios", FechaHora = DateTime.Now.AddHours(-4) },
            new() { IdUsuario = "1", UsuarioNombre = "Admin Sistema", Accion = "orders.create", Detalles = "Registró una recepción", FechaHora = DateTime.Now.AddHours(-2) },
        };
        db.Auditorias.AddRange(entradas);
        await db.SaveChangesAsync(ct);
    }

    // ------------------------------------------------------------------ contabilidad
    private static async Task SeedContabilidadAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.CuentasContables.AnyAsync(ct)) return;

        var cuentas = new List<CuentaContable>
        {
            new() { Codigo = "1000", Nombre = "Caja", Tipo = "Activo" },
            new() { Codigo = "1010", Nombre = "Banco", Tipo = "Activo" },
            new() { Codigo = "2000", Nombre = "Cuentas por Pagar", Tipo = "Pasivo" },
            new() { Codigo = "2100", Nombre = "ITBIS por Pagar", Tipo = "Pasivo" },
            new() { Codigo = "3000", Nombre = "Capital", Tipo = "Capital" },
            new() { Codigo = "4000", Nombre = "Ventas de Comida", Tipo = "Ingreso" },
            new() { Codigo = "4010", Nombre = "Ventas de Bebidas", Tipo = "Ingreso" },
            new() { Codigo = "4020", Nombre = "Ventas por Delivery", Tipo = "Ingreso" },
            new() { Codigo = "4090", Nombre = "Otros Ingresos", Tipo = "Ingreso" },
            new() { Codigo = "5000", Nombre = "Compras de Mercancía", Tipo = "Gasto" },
            new() { Codigo = "6000", Nombre = "Salarios y Sueldos", Tipo = "Gasto" },
            new() { Codigo = "6100", Nombre = "Renta del Local", Tipo = "Gasto" },
            new() { Codigo = "6200", Nombre = "Servicios (Luz, Agua, Gas)", Tipo = "Gasto" },
            new() { Codigo = "6300", Nombre = "Marketing y Publicidad", Tipo = "Gasto" },
            new() { Codigo = "6400", Nombre = "Mantenimiento", Tipo = "Gasto" },
            new() { Codigo = "6500", Nombre = "Suministros y Empaques", Tipo = "Gasto" },
            new() { Codigo = "6600", Nombre = "Impuestos (ITBIS/DGII)", Tipo = "Gasto" },
            new() { Codigo = "6900", Nombre = "Otros Gastos", Tipo = "Gasto" },
        };
        db.CuentasContables.AddRange(cuentas);
        await db.SaveChangesAsync(ct);

        var byCode = cuentas.ToDictionary(c => c.Codigo);
        var rnd = new Random(99);
        string[] pagos = ["efectivo", "tarjeta", "transferencia"];
        string[] proveedores = ["Gordon", "Col Fresh", "Alimentos Austra", "Main Commissary"];
        var txs = new List<TransaccionContable>();

        void Add(string code, string tipo, decimal monto, int daysAgo, string desc,
                 string? contacto = null, string? metodo = null, string? referencia = null)
        {
            var c = byCode[code];
            var local = Locales.Todos[rnd.Next(Locales.Todos.Count)];
            txs.Add(new TransaccionContable
            {
                Fecha = DateTime.Now.Date.AddDays(-daysAgo).AddHours(rnd.Next(8, 20)),
                Tipo = tipo,
                UbicacionId = local.Id,
                UbicacionNombre = local.Nombre,
                IdCuenta = c.IdCuenta,
                CuentaNombre = c.Nombre,
                Monto = monto,
                Descripcion = desc,
                MetodoPago = metodo ?? pagos[rnd.Next(pagos.Length)],
                Referencia = referencia,
                Contacto = contacto,
                RegistradoPor = "admin",
                FechaRegistro = DateTime.Now
            });
        }

        // Ingresos: ventas a lo largo de ~60 días.
        for (var d = 60; d >= 0; d -= 3)
        {
            Add("4000", "ingreso", rnd.Next(15000, 45000), d, "Ventas de comida del día");
            if (rnd.NextDouble() < 0.85) Add("4010", "ingreso", rnd.Next(3000, 9000), d, "Ventas de bebidas");
            if (rnd.NextDouble() < 0.5) Add("4020", "ingreso", rnd.Next(4000, 12000), d, "Ventas por delivery");
        }

        // Gastos recurrentes y variables.
        Add("6100", "gasto", 45000, 55, "Renta mensual del local", "Inmobiliaria Central", "transferencia", "RENT-05");
        Add("6100", "gasto", 45000, 25, "Renta mensual del local", "Inmobiliaria Central", "transferencia", "RENT-06");
        foreach (var d in new[] { 52, 38, 24, 10 })
            Add("6000", "gasto", rnd.Next(55000, 70000), d, "Nómina quincenal", "Personal", "transferencia");
        Add("6200", "gasto", rnd.Next(9000, 15000), 50, "Factura de electricidad", "EDESUR", "transferencia");
        Add("6200", "gasto", rnd.Next(9000, 15000), 20, "Factura de electricidad y agua", "EDESUR", "transferencia");
        foreach (var d in new[] { 58, 48, 40, 33, 27, 18, 12, 5 })
            Add("5000", "gasto", rnd.Next(8000, 30000), d, "Compra de mercancía", proveedores[rnd.Next(proveedores.Length)]);
        Add("6300", "gasto", 5000, 44, "Publicidad en redes sociales");
        Add("6300", "gasto", 7500, 15, "Volantes y promoción");
        foreach (var d in new[] { 49, 35, 22, 8 })
            Add("6500", "gasto", rnd.Next(3000, 8000), d, "Compra de empaques y suministros");
        Add("6600", "gasto", rnd.Next(12000, 20000), 30, "Pago de ITBIS", "DGII", "transferencia", "ITBIS-05");
        Add("6400", "gasto", rnd.Next(3000, 9000), 28, "Reparación de equipo de cocina");

        db.TransaccionesContables.AddRange(txs);
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedLocalesAsync(AppDbContext db, CancellationToken ct)
    {
        foreach (var (id, nombre) in Locales.Todos)
        {
            if (!await db.Locales.AnyAsync(l => l.Codigo == id, ct))
                db.Locales.Add(new Local { Codigo = id, Nombre = nombre, Estado = true });
        }
        await db.SaveChangesAsync(ct);
    }

    private static async Task BackfillRecipeSalePricesAsync(AppDbContext db, CancellationToken ct)
    {
        var recetas = await db.Recetas.Include(r => r.RecetaIngredientes).ToListAsync(ct);
        if (recetas.Count == 0) return;

        var productIds = recetas.SelectMany(r => r.RecetaIngredientes.Select(ri => ri.IdProducto)).Distinct().ToList();
        var costos = await db.Productos
            .Where(p => productIds.Contains(p.IdProducto))
            .ToDictionaryAsync(p => p.IdProducto, p => p.CostoUnitario, ct);

        var changed = false;
        foreach (var r in recetas)
        {
            var costo = r.RecetaIngredientes.Sum(ri => ri.CantidadNecesaria * (costos.TryGetValue(ri.IdProducto, out var c) ? c : 0));
            // Si prácticamente no hay margen (precio de venta <= costo×1.05), asigna un precio con markup.
            if ((r.PrecioVenta ?? 0) <= costo * 1.05m && costo > 0)
            {
                r.PrecioVenta = Math.Round(costo * 2.8m, 2);
                changed = true;
            }
        }
        if (changed) await db.SaveChangesAsync(ct);
    }

    private static async Task BackfillTransactionLocationsAsync(AppDbContext db, CancellationToken ct)
    {
        var sinLocal = await db.TransaccionesContables
            .Where(t => t.UbicacionId == null)
            .ToListAsync(ct);
        if (sinLocal.Count == 0) return;

        for (var i = 0; i < sinLocal.Count; i++)
        {
            var local = Locales.Todos[i % Locales.Todos.Count];
            sinLocal[i].UbicacionId = local.Id;
            sinLocal[i].UbicacionNombre = local.Nombre;
        }
        await db.SaveChangesAsync(ct);
    }

    private static async Task ReconcilePendingOrderAlertsAsync(AppDbContext db, CancellationToken ct)
    {
        var pendingProductIds = await db.Recepciones
            .Where(r => r.Estado == "pending")
            .Select(r => r.IdProducto)
            .Distinct()
            .ToListAsync(ct);
        if (pendingProductIds.Count == 0) return;

        var alerts = await db.Alertas
            .Where(a => a.Estado == "active" && pendingProductIds.Contains(a.IdProducto))
            .ToListAsync(ct);
        foreach (var alert in alerts)
        {
            alert.Estado = "resolved";
            alert.FechaResolucion = DateTime.Now;
        }
        if (alerts.Count > 0) await db.SaveChangesAsync(ct);
    }

    private static async Task BackfillOrderTransactionsAsync(AppDbContext db, CancellationToken ct)
    {
        var orders = await db.Recepciones.AsNoTracking().ToListAsync(ct);
        if (orders.Count == 0) return;

        var cancelledReferences = orders
            .Where(o => o.Estado == "cancelled")
            .Select(o => $"PEDIDO-{o.IdRecepcion}")
            .ToList();
        if (cancelledReferences.Count > 0)
        {
            var cancelledTransactions = await db.TransaccionesContables
                .Where(t => t.Referencia != null && cancelledReferences.Contains(t.Referencia))
                .ToListAsync(ct);
            if (cancelledTransactions.Count > 0)
                db.TransaccionesContables.RemoveRange(cancelledTransactions);
        }

        var account = await db.CuentasContables.FirstOrDefaultAsync(c => c.Codigo == "5000", ct);
        if (account is null)
        {
            account = new CuentaContable
            {
                Codigo = "5000",
                Nombre = "Compras de Mercancía",
                Tipo = "Gasto",
                Estado = true
            };
            db.CuentasContables.Add(account);
            await db.SaveChangesAsync(ct);
        }

        var validOrders = orders.Where(o => o.Estado != "cancelled").ToList();
        var references = validOrders.Select(o => $"PEDIDO-{o.IdRecepcion}").ToList();
        var existing = await db.TransaccionesContables
            .Where(t => t.Referencia != null && references.Contains(t.Referencia))
            .Select(t => t.Referencia!)
            .ToListAsync(ct);
        var existingSet = existing.ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var order in validOrders.Where(o => !existingSet.Contains($"PEDIDO-{o.IdRecepcion}")))
        {
            db.TransaccionesContables.Add(new TransaccionContable
            {
                Fecha = order.FechaRecepcion,
                Tipo = "gasto",
                UbicacionId = "loc-prep",
                UbicacionNombre = "Pollo Centro - Prep",
                IdCuenta = account.IdCuenta,
                CuentaNombre = account.Nombre,
                Monto = order.Total > 0 ? order.Total : order.Cantidad * order.Precio,
                Descripcion = $"Pedido {(order.Estado == "completed" ? "recibido" : "pendiente")}: {order.Cantidad} de {order.ProductoNombre}",
                MetodoPago = "pedido",
                Referencia = $"PEDIDO-{order.IdRecepcion}",
                Contacto = order.ProveedorNombre,
                RegistradoPor = order.RecibidoPor ?? "Sistema",
                FechaRegistro = DateTime.Now
            });
        }
        await db.SaveChangesAsync(ct);
    }

    private const string DatabaseOptimizationsSql = @"
DECLARE @dropSql nvarchar(max);

IF COL_LENGTH(N'dbo.Inventario', 'Descripcion') IS NOT NULL
BEGIN
    SET @dropSql = N'IF NOT EXISTS (SELECT 1 FROM dbo.Inventario WHERE Descripcion IS NOT NULL)
    BEGIN
        DECLARE @dc sysname, @sql nvarchar(500);
        SELECT @dc = d.name FROM sys.default_constraints d JOIN sys.columns c ON c.default_object_id = d.object_id
        WHERE c.object_id = OBJECT_ID(N''dbo.Inventario'') AND c.name = N''Descripcion'';
        IF @dc IS NOT NULL BEGIN SET @sql = N''ALTER TABLE dbo.Inventario DROP CONSTRAINT '' + QUOTENAME(@dc); EXEC sp_executesql @sql; END;
        ALTER TABLE dbo.Inventario DROP COLUMN Descripcion;
    END;';
    EXEC sp_executesql @dropSql;
END;

IF COL_LENGTH(N'dbo.Inventario', 'FechaVencimiento') IS NOT NULL
BEGIN
    SET @dropSql = N'IF NOT EXISTS (SELECT 1 FROM dbo.Inventario WHERE FechaVencimiento IS NOT NULL)
    BEGIN
        DECLARE @dc sysname, @sql nvarchar(500);
        SELECT @dc = d.name FROM sys.default_constraints d JOIN sys.columns c ON c.default_object_id = d.object_id
        WHERE c.object_id = OBJECT_ID(N''dbo.Inventario'') AND c.name = N''FechaVencimiento'';
        IF @dc IS NOT NULL BEGIN SET @sql = N''ALTER TABLE dbo.Inventario DROP CONSTRAINT '' + QUOTENAME(@dc); EXEC sp_executesql @sql; END;
        ALTER TABLE dbo.Inventario DROP COLUMN FechaVencimiento;
    END;';
    EXEC sp_executesql @dropSql;
END;

IF COL_LENGTH(N'dbo.Inventario', 'TotalUnits') IS NOT NULL
BEGIN
    SET @dropSql = N'IF NOT EXISTS (SELECT 1 FROM dbo.Inventario WHERE TotalUnits <> 0)
    BEGIN
        DECLARE @dc sysname, @sql nvarchar(500);
        SELECT @dc = d.name FROM sys.default_constraints d JOIN sys.columns c ON c.default_object_id = d.object_id
        WHERE c.object_id = OBJECT_ID(N''dbo.Inventario'') AND c.name = N''TotalUnits'';
        IF @dc IS NOT NULL BEGIN SET @sql = N''ALTER TABLE dbo.Inventario DROP CONSTRAINT '' + QUOTENAME(@dc); EXEC sp_executesql @sql; END;
        ALTER TABLE dbo.Inventario DROP COLUMN TotalUnits;
    END;';
    EXEC sp_executesql @dropSql;
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Inventario') AND name = N'IX_Inventario_NombreProducto')
    CREATE INDEX IX_Inventario_NombreProducto ON dbo.Inventario(NombreProducto);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Inventario') AND name = N'IX_Inventario_IdProveedor')
    CREATE INDEX IX_Inventario_IdProveedor ON dbo.Inventario(IdProveedor) WHERE IdProveedor IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Alertas') AND name = N'UX_Alertas_IdProducto')
    CREATE UNIQUE INDEX UX_Alertas_IdProducto ON dbo.Alertas(IdProducto);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Alertas') AND name = N'IX_Alertas_Estado_Fecha')
    CREATE INDEX IX_Alertas_Estado_Fecha ON dbo.Alertas(Estado, FechaCreacion DESC) INCLUDE (IdProducto);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Recepciones') AND name = N'IX_Recepciones_Estado_Producto')
    CREATE INDEX IX_Recepciones_Estado_Producto ON dbo.Recepciones(Estado, IdProducto) INCLUDE (FechaRecepcion);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Recepciones') AND name = N'IX_Recepciones_Fecha')
    CREATE INDEX IX_Recepciones_Fecha ON dbo.Recepciones(FechaRecepcion DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.TransaccionesContables') AND name = N'IX_Transacciones_Ubicacion_Fecha')
    CREATE INDEX IX_Transacciones_Ubicacion_Fecha ON dbo.TransaccionesContables(UbicacionId, Fecha DESC) INCLUDE (Tipo, IdCuenta, Monto, CuentaNombre);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.TransaccionesContables') AND name = N'IX_Transacciones_Fecha_Tipo')
    CREATE INDEX IX_Transacciones_Fecha_Tipo ON dbo.TransaccionesContables(Fecha DESC, Tipo) INCLUDE (Monto, IdCuenta);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.TransaccionesContables') AND name = N'UX_Transacciones_Referencia')
    CREATE UNIQUE INDEX UX_Transacciones_Referencia ON dbo.TransaccionesContables(Referencia) WHERE Referencia IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.CuentasContables') AND name = N'UX_CuentasContables_Codigo')
    CREATE UNIQUE INDEX UX_CuentasContables_Codigo ON dbo.CuentasContables(Codigo);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.RecetaIngredientes') AND name = N'UX_RecetaIngredientes_Receta_Producto')
    CREATE UNIQUE INDEX UX_RecetaIngredientes_Receta_Producto ON dbo.RecetaIngredientes(IdReceta, IdProducto);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Turnos') AND name = N'IX_Turnos_SemanaKey')
    CREATE INDEX IX_Turnos_SemanaKey ON dbo.Turnos(SemanaKey);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Turnos') AND name = N'IX_Turnos_IdEmpleado')
    CREATE INDEX IX_Turnos_IdEmpleado ON dbo.Turnos(IdEmpleado);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.HistorialPrecios') AND name = N'IX_HistorialPrecios_Producto_Fecha')
    CREATE INDEX IX_HistorialPrecios_Producto_Fecha ON dbo.HistorialPrecios(IdProducto, FechaRegistro DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Envios') AND name = N'IX_Envios_FechaEnvio')
    CREATE INDEX IX_Envios_FechaEnvio ON dbo.Envios(FechaEnvio DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Auditoria') AND name = N'IX_Auditoria_FechaHora')
    CREATE INDEX IX_Auditoria_FechaHora ON dbo.Auditoria(FechaHora DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.RegistroPreparaciones') AND name = N'IX_RegistroPreparaciones_Fecha')
    CREATE INDEX IX_RegistroPreparaciones_Fecha ON dbo.RegistroPreparaciones(FechaPreparacion DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.ImportacionesCierreCaja') AND name = N'UX_ImportacionesCierreCaja_ArchivoHash')
    CREATE UNIQUE INDEX UX_ImportacionesCierreCaja_ArchivoHash ON dbo.ImportacionesCierreCaja(ArchivoHash);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.ImportacionesCierreCaja') AND name = N'IX_ImportacionesCierreCaja_Local_Fecha')
    CREATE INDEX IX_ImportacionesCierreCaja_Local_Fecha ON dbo.ImportacionesCierreCaja(IdLocal, FechaFin DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.ImportacionesCierreCaja') AND name = N'UX_ImportacionesCierreCaja_Local_Secuencia_Fecha')
    CREATE UNIQUE INDEX UX_ImportacionesCierreCaja_Local_Secuencia_Fecha ON dbo.ImportacionesCierreCaja(IdLocal, Secuencia, FechaFin);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.TransaccionesContables') AND name = N'IX_Transacciones_IdImportacionCierre')
    CREATE INDEX IX_Transacciones_IdImportacionCierre ON dbo.TransaccionesContables(IdImportacionCierre) WHERE IdImportacionCierre IS NOT NULL;

IF OBJECT_ID(N'dbo.CK_Inventario_ValoresNoNegativos', N'C') IS NULL
    ALTER TABLE dbo.Inventario WITH CHECK ADD CONSTRAINT CK_Inventario_ValoresNoNegativos CHECK (CantidadDisponible >= 0 AND StockMinimo >= 0 AND CostoUnitario >= 0);
IF OBJECT_ID(N'dbo.CK_Alertas_EstadoValores', N'C') IS NULL
    ALTER TABLE dbo.Alertas WITH CHECK ADD CONSTRAINT CK_Alertas_EstadoValores CHECK (Estado IN ('active','resolved') AND StockActual >= 0 AND StockMinimo >= 0);
IF OBJECT_ID(N'dbo.CK_Recepciones_Valores', N'C') IS NULL
    ALTER TABLE dbo.Recepciones WITH CHECK ADD CONSTRAINT CK_Recepciones_Valores CHECK (Estado IN ('pending','completed','cancelled') AND Cantidad > 0 AND Precio >= 0 AND Total >= 0);
IF OBJECT_ID(N'dbo.CK_Transacciones_Valores', N'C') IS NULL
    ALTER TABLE dbo.TransaccionesContables WITH CHECK ADD CONSTRAINT CK_Transacciones_Valores CHECK (Tipo IN ('ingreso','gasto') AND Monto > 0);
IF OBJECT_ID(N'dbo.CK_CuentasContables_Tipo', N'C') IS NULL
    ALTER TABLE dbo.CuentasContables WITH CHECK ADD CONSTRAINT CK_CuentasContables_Tipo CHECK (Tipo IN ('Activo','Pasivo','Capital','Ingreso','Gasto'));
IF OBJECT_ID(N'dbo.CK_Turnos_DiaSemana', N'C') IS NULL
    ALTER TABLE dbo.Turnos WITH CHECK ADD CONSTRAINT CK_Turnos_DiaSemana CHECK (DiaSemana BETWEEN 0 AND 6);
IF OBJECT_ID(N'dbo.CK_RecetaIngredientes_Cantidad', N'C') IS NULL
    ALTER TABLE dbo.RecetaIngredientes WITH CHECK ADD CONSTRAINT CK_RecetaIngredientes_Cantidad CHECK (CantidadNecesaria > 0);
IF OBJECT_ID(N'dbo.CK_HistorialPrecios_Precio', N'C') IS NULL
    ALTER TABLE dbo.HistorialPrecios WITH CHECK ADD CONSTRAINT CK_HistorialPrecios_Precio CHECK (Precio >= 0);
IF OBJECT_ID(N'dbo.CK_Envios_ItemsJson', N'C') IS NULL
    ALTER TABLE dbo.Envios WITH CHECK ADD CONSTRAINT CK_Envios_ItemsJson CHECK (ISJSON(ItemsJson) = 1);
IF OBJECT_ID(N'dbo.CK_ImportacionesCierreCaja_Valores', N'C') IS NULL
    ALTER TABLE dbo.ImportacionesCierreCaja WITH CHECK ADD CONSTRAINT CK_ImportacionesCierreCaja_Valores CHECK (
        FechaFin > FechaInicio AND VentaNeta >= 0 AND Impuesto >= 0 AND CargoExtra >= 0
        AND VentaBruta >= 0 AND Propinas >= 0 AND TotalPago > 0
        AND ConteoOrdenes >= 0 AND ConteoClientes >= 0 AND ISJSON(PagosJson) = 1);

IF OBJECT_ID(N'dbo.FK_Alertas_Inventario', N'F') IS NULL
    ALTER TABLE dbo.Alertas WITH CHECK ADD CONSTRAINT FK_Alertas_Inventario FOREIGN KEY (IdProducto) REFERENCES dbo.Inventario(IdProducto);
IF OBJECT_ID(N'dbo.FK_Recepciones_Inventario', N'F') IS NULL
    ALTER TABLE dbo.Recepciones WITH CHECK ADD CONSTRAINT FK_Recepciones_Inventario FOREIGN KEY (IdProducto) REFERENCES dbo.Inventario(IdProducto);
IF OBJECT_ID(N'dbo.FK_Recepciones_Proveedores', N'F') IS NULL
    ALTER TABLE dbo.Recepciones WITH CHECK ADD CONSTRAINT FK_Recepciones_Proveedores FOREIGN KEY (IdProveedor) REFERENCES dbo.Proveedores(IdProveedor);
IF OBJECT_ID(N'dbo.FK_Turnos_Empleados', N'F') IS NULL
    ALTER TABLE dbo.Turnos WITH CHECK ADD CONSTRAINT FK_Turnos_Empleados FOREIGN KEY (IdEmpleado) REFERENCES dbo.Empleados(IdEmpleado);
IF OBJECT_ID(N'dbo.FK_Empleados_Locales', N'F') IS NULL
    ALTER TABLE dbo.Empleados WITH CHECK ADD CONSTRAINT FK_Empleados_Locales FOREIGN KEY (IdLocal) REFERENCES dbo.Locales(IdLocal);
IF OBJECT_ID(N'dbo.FK_Envios_Locales', N'F') IS NULL
    ALTER TABLE dbo.Envios WITH CHECK ADD CONSTRAINT FK_Envios_Locales FOREIGN KEY (IdLocal) REFERENCES dbo.Locales(IdLocal);
IF OBJECT_ID(N'dbo.FK_Transacciones_CuentasContables', N'F') IS NULL
    ALTER TABLE dbo.TransaccionesContables WITH CHECK ADD CONSTRAINT FK_Transacciones_CuentasContables FOREIGN KEY (IdCuenta) REFERENCES dbo.CuentasContables(IdCuenta);
IF OBJECT_ID(N'dbo.FK_RegistroPreparaciones_Recetas', N'F') IS NULL
    ALTER TABLE dbo.RegistroPreparaciones WITH CHECK ADD CONSTRAINT FK_RegistroPreparaciones_Recetas FOREIGN KEY (IdReceta) REFERENCES dbo.Recetas(IdReceta);
IF OBJECT_ID(N'dbo.FK_ImportacionesCierreCaja_Locales', N'F') IS NULL
    ALTER TABLE dbo.ImportacionesCierreCaja WITH CHECK ADD CONSTRAINT FK_ImportacionesCierreCaja_Locales FOREIGN KEY (IdLocal) REFERENCES dbo.Locales(IdLocal);
IF OBJECT_ID(N'dbo.FK_Transacciones_ImportacionesCierreCaja', N'F') IS NULL
    ALTER TABLE dbo.TransaccionesContables WITH CHECK ADD CONSTRAINT FK_Transacciones_ImportacionesCierreCaja FOREIGN KEY (IdImportacionCierre) REFERENCES dbo.ImportacionesCierreCaja(IdImportacionCierre);
";

    private static Task EnsureDatabaseOptimizationsAsync(AppDbContext db, CancellationToken ct)
        => db.Database.ExecuteSqlRawAsync(DatabaseOptimizationsSql, ct);

    // ------------------------------------------------------------------ util
    private static string GetCurrentWeekKey()
    {
        var now = DateTime.Now;
        var week = ISOWeek.GetWeekOfYear(now);
        var year = ISOWeek.GetYear(now);
        return $"{year}-W{week.ToString("D2", CultureInfo.InvariantCulture)}";
    }
}

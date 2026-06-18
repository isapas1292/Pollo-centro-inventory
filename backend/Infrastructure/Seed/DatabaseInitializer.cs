using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using PolloCentro.Api.Application.Abstractions.Security;
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
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<AppDbContext>>();

        await EnsureTablesAsync(db, ct);
        logger.LogInformation("Tablas operacionales verificadas/creadas.");

        if (!seedData) return;

        await SeedExtraUsersAsync(db, hasher, ct);
        await SeedEmpleadosYTurnosAsync(db, ct);
        await SeedRecetasAsync(db, ct);
        await EnsureProductStockAsync(db, ct);
        await SeedHistorialPreciosAsync(db, ct);
        await SeedAlertasAsync(db, ct);
        await SeedRecepcionesAsync(db, ct);
        await SeedAuditoriaAsync(db, ct);
        await SeedContabilidadAsync(db, ct);

        logger.LogInformation("Siembra de datos de demostración completada.");
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
    IdCuenta INT NOT NULL,
    CuentaNombre VARCHAR(150) NOT NULL,
    Monto DECIMAL(12,2) NOT NULL,
    Descripcion VARCHAR(255) NULL,
    MetodoPago VARCHAR(30) NULL,
    Referencia VARCHAR(60) NULL,
    Contacto VARCHAR(150) NULL,
    RegistradoPor VARCHAR(150) NULL,
    FechaRegistro DATETIME NOT NULL DEFAULT(getdate())
);";

    private static Task EnsureTablesAsync(AppDbContext db, CancellationToken ct)
        => db.Database.ExecuteSqlRawAsync(CreateTablesSql, ct);

    // ------------------------------------------------------------------ usuarios
    private static async Task SeedExtraUsersAsync(AppDbContext db, IPasswordHasher hasher, CancellationToken ct)
    {
        if (await db.Usuarios.CountAsync(ct) > 1) return;

        var roles = await db.Roles.ToListAsync(ct);
        int RoleId(string name) => roles.FirstOrDefault(r => r.NombreRol == name)?.IdRol ?? roles[0].IdRol;

        var nuevos = new[]
        {
            new Usuario { IdRol = RoleId("manager"), Nombre = "Gerente", Apellido = "General", NombreUsuario = "gerente",
                Correo = "gerente@pollocentro.com", Contrasena = hasher.Hash("manager123"), Telefono = "809-555-1001", Estado = true },
            new Usuario { IdRol = RoleId("operations"), Nombre = "Operador", Apellido = "Tienda", NombreUsuario = "operador",
                Correo = "operador@pollocentro.com", Contrasena = hasher.Hash("oper123"), Telefono = "809-555-1002", Estado = true },
        };
        db.Usuarios.AddRange(nuevos.Where(u => !db.Usuarios.Any(x => x.Correo == u.Correo)));
        await db.SaveChangesAsync(ct);
    }

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
                PrecioVenta = ings.Sum(i => i.qty * i.p.CostoUnitario),
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
            txs.Add(new TransaccionContable
            {
                Fecha = DateTime.Now.Date.AddDays(-daysAgo).AddHours(rnd.Next(8, 20)),
                Tipo = tipo,
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

    // ------------------------------------------------------------------ util
    private static string GetCurrentWeekKey()
    {
        var now = DateTime.Now;
        var week = ISOWeek.GetWeekOfYear(now);
        var year = ISOWeek.GetYear(now);
        return $"{year}-W{week.ToString("D2", CultureInfo.InvariantCulture)}";
    }
}

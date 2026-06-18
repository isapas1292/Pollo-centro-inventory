# PolloCentro API (.NET)

Backend de **ASP.NET Core Web API** (.NET 10) con **Entity Framework Core** sobre **SQL Server**,
organizado en **arquitectura por capas** (un solo proyecto). Reemplaza al antiguo backend de
Node.js (Express + Prisma) manteniendo el mismo contrato de API, de modo que el frontend Angular
funciona sin cambios.

## Arquitectura

El proyecto separa responsabilidades en cuatro capas (carpetas + namespaces):

```
backend/
├── Domain/                     # Entidades del dominio (POCOs, sin dependencias)
│   └── Entities/
├── Application/                # Lógica de negocio, organizada por feature
│   ├── Common/                 #   - Interfaces (IApplicationDbContext) y excepciones
│   ├── Abstractions/Security/  #   - Contratos de seguridad (IPasswordHasher, IJwtTokenGenerator)
│   ├── Auth/                   #   - DTOs + IAuthService + AuthService
│   ├── Suppliers/              #   - DTOs + ISupplierService + SupplierService
│   ├── Inventory/              #   - DTOs + IInventoryService + InventoryService
│   └── DependencyInjection.cs  #   - AddApplication()
├── Infrastructure/             # Detalles técnicos (EF Core, seguridad, seed)
│   ├── Persistence/            #   - AppDbContext + Configurations (Fluent API)
│   ├── Security/               #   - JwtOptions, JwtTokenGenerator, BcryptPasswordHasher
│   ├── Seed/                   #   - DatabaseSeeder
│   └── DependencyInjection.cs  #   - AddInfrastructure()
├── Api/                        # Capa web
│   ├── Controllers/            #   - Controladores delgados (solo orquestan)
│   └── Middleware/             #   - ExceptionHandlingMiddleware (ProblemDetails)
└── Program.cs                  # Composition root
```

**Reglas de dependencia:** `Api → Application → Domain`, e `Infrastructure → Application + Domain`.
La capa Application no depende de la implementación concreta de EF: usa la abstracción
`IApplicationDbContext`, lo que la hace testeable.

## Requisitos

- .NET SDK 10
- SQL Server con la base de datos `PolloCentro` ya creada (tablas `Inventario`, `Proveedores`,
  `Recetas`, `RecetaIngredientes`, `Roles`, `Usuarios`).

> **Enfoque database-first:** EF Core mapea las tablas existentes mediante configuraciones Fluent
> (`Infrastructure/Persistence/Configurations`). **No** se usan migraciones, por lo que el esquema
> de tu base de datos nunca se altera.

## Configuración

`appsettings.json` (valores por defecto) y `appsettings.Development.json` (override local):

```json
"ConnectionStrings": {
  "DefaultConnection": "Server=localhost,1433;Database=PolloCentro;Trusted_Connection=True;TrustServerCertificate=True;"
},
"Jwt": { "Secret": "...", "Issuer": "PolloCentro.Api", "Audience": "PolloCentro.Client", "ExpiryHours": 8 },
"Cors": { "AllowedOrigins": [ "http://localhost:4200" ] }
```

- **Conexión:** usa autenticación integrada de Windows (`Trusted_Connection=True`). Para usuario/
  contraseña de SQL, cámbiala por `User Id=...;Password=...;`.
- **JWT:** el secreto **no** se guarda en el repositorio (mín. 32 bytes, validado al arrancar).
  - Desarrollo: `dotnet user-secrets set "Jwt:Secret" "<clave-larga>"` (ya configurado).
  - Producción: variable de entorno `Jwt__Secret`.
- **CORS:** si `AllowedOrigins` está vacío (como en Development), se permite cualquier origen.

## Ejecutar

```powershell
cd backend
dotnet run
```

El servidor escucha en `http://localhost:3000` (mismo puerto que el frontend espera).
Puedes cambiar el puerto con la variable de entorno `PORT`.

## Base de datos: tablas y siembra de datos

El esquema original solo tenía `Inventario`, `Proveedores`, `Recetas`, `RecetaIngredientes`,
`Roles` y `Usuarios`. La aplicación crea (de forma **idempotente**, sin tocar las existentes) las
tablas operacionales que faltaban: `Empleados`, `Turnos`, `HistorialPrecios`,
`RegistroPreparaciones`, `Alertas`, `Auditoria`, `Recepciones`, `CuentasContables`,
`TransaccionesContables`, `Locales`.

La tabla **`Locales`** es el catálogo de negocios (datos de referencia, sembrados siempre desde
`Domain/Catalogs/Locales.cs`). Es la fuente de verdad para todo lo que dependa de la ubicación
(horarios, contabilidad por local, etc.) y se expone vía `GET /api/locations`.

- **Al arrancar** (`dotnet run`): se garantiza que las tablas existan. En *Development* (o si
  `Database:SeedOnStartup=true`) además se siembran datos de demostración en las tablas vacías.
- **Manual:** `dotnet run -- db-init` crea las tablas y siembra datos de ejemplo.
- **Solo admin:** `dotnet run -- seed-admin` (equivalente al antiguo `seed-user.js`).

**Usuarios de demostración:**

| Correo                      | Contraseña  | Rol         |
|-----------------------------|-------------|-------------|
| `admin@pollocentro.com`     | `admin123`  | admin       |
| `gerente@pollocentro.com`   | `manager123`| manager     |
| `operador@pollocentro.com`  | `oper123`   | operations  |

## Endpoints

| Recurso       | Métodos                                              |
|---------------|------------------------------------------------------|
| `/api/auth/login`   | POST (BCrypt + JWT)                            |
| `/api/inventory`    | GET, POST, PUT `{id}`, DELETE `{id}`          |
| `/api/suppliers`    | GET, POST, PUT `{id}`, DELETE `{id}`          |
| `/api/recipes`      | GET, POST, PUT `{id}`, DELETE `{id}`, POST `{id}/prepare`, GET `logs` |
| `/api/users`        | GET, POST, PUT `{id}`, DELETE `{id}`          |
| `/api/employees`    | GET, POST, PUT `{id}`, DELETE `{id}`          |
| `/api/schedules`    | GET (`?weekKey=`), POST, PUT `{id}`, DELETE `{id}` |
| `/api/prices`       | GET, POST                                     |
| `/api/alerts`       | GET, POST, PUT `{id}`, PUT `{id}/resolve`, PUT `{id}/whatsapp`, DELETE `{id}` |
| `/api/orders`       | GET, POST, PUT `{id}`, DELETE `{id}`          |
| `/api/audit`        | GET, POST                                     |
| `/api/locations`    | GET (catálogo de locales desde la BD)         |
| `/api/accounting/accounts` 🔒 | GET, POST, PUT `{id}`, DELETE `{id}` |
| `/api/accounting/transactions` 🔒 | GET (`?from=&to=`), POST, PUT `{id}`, DELETE `{id}`, GET `summary` |
| `/health`           | GET (incluye verificación de la BD)           |

🔒 = **Módulo de Contabilidad**, protegido con `[Authorize(Roles = "admin")]`. Requiere enviar el
JWT (`Authorization: Bearer …`). El frontend lo adjunta con un interceptor HTTP. Sin token → 401;
con un rol distinto de admin → 403.

### Contabilidad (estilo QuickBooks)

- **Plan de Cuentas** (`CuentasContables`): Activo, Pasivo, Capital, Ingreso, Gasto. Es compartido.
- **Transacciones** (`TransaccionesContables`): ingresos/gastos clasificados por cuenta **y por local**
  (`UbicacionId`). Cada local lleva su propia contabilidad; el catálogo de locales está en
  `Domain/Catalogs/Locales.cs` (alineado con `LOCATIONS` del frontend).
- **Filtro por local:** `?local=<id>` en `transactions`, `summary` y `export` (sin el parámetro, o
  `local=all`, se obtiene el consolidado de todos los locales).
- **Estado de Resultados (P&L)**: `GET /api/accounting/transactions/summary` devuelve totales,
  desglose por cuenta y tendencia mensual.
- **Exportar a Excel:** `GET /api/accounting/transactions/export` genera un `.xlsx` (ClosedXML) con
  una hoja **Resumen** (P&L) y una hoja **Transacciones**, respetando el filtro de local y fechas.
- Todo el módulo es solo del rol **admin** (`/contabilidad` en el frontend).

Las respuestas de error usan el formato estándar **ProblemDetails**.
Ver `PolloCentro.Api.http` para ejemplos de peticiones.

## Optimizaciones de datos

- Consultas de lectura con **`AsNoTracking()`** (sin overhead de change-tracking).
- **Proyección a DTO en SQL** (`Select`): solo se traen las columnas necesarias.
- El inventario se resuelve en **una sola consulta** con `LEFT JOIN` al proveedor (sin N+1).
- **Resiliencia de conexión** (`EnableRetryOnFailure`) ante fallos transitorios de SQL Server.
- Índices declarados sobre las columnas más consultadas (nombre de producto, claves foráneas).

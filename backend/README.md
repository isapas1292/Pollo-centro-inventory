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
- **JWT:** el secreto debe tener al menos 32 bytes (lo valida `JwtOptions` al arrancar).
  Para producción, ponlo en *User Secrets* o variables de entorno, no en el repositorio.
- **CORS:** si `AllowedOrigins` está vacío (como en Development), se permite cualquier origen.

## Ejecutar

```powershell
cd backend
dotnet run
```

El servidor escucha en `http://localhost:3000` (mismo puerto que el frontend espera).
Puedes cambiar el puerto con la variable de entorno `PORT`.

## Sembrar el usuario administrador

Equivalente al antiguo `seed-user.js`. Crea `admin@pollocentro.com` / `admin123` (rol `admin`):

```powershell
dotnet run -- seed-admin
```

## Endpoints

| Método | Ruta                  | Descripción                          |
|--------|-----------------------|--------------------------------------|
| POST   | `/api/auth/login`     | Login con BCrypt + JWT (8 h)         |
| GET    | `/api/inventory`      | Lista de productos del inventario    |
| GET    | `/api/suppliers`      | Lista de proveedores                 |
| POST   | `/api/suppliers`      | Crear proveedor                      |
| PUT    | `/api/suppliers/{id}` | Actualizar proveedor                 |
| DELETE | `/api/suppliers/{id}` | Eliminar proveedor                   |
| GET    | `/health`             | Health check (incluye la BD)         |

Las respuestas de error usan el formato estándar **ProblemDetails**.
Ver `PolloCentro.Api.http` para ejemplos de peticiones.

## Optimizaciones de datos

- Consultas de lectura con **`AsNoTracking()`** (sin overhead de change-tracking).
- **Proyección a DTO en SQL** (`Select`): solo se traen las columnas necesarias.
- El inventario se resuelve en **una sola consulta** con `LEFT JOIN` al proveedor (sin N+1).
- **Resiliencia de conexión** (`EnableRetryOnFailure`) ante fallos transitorios de SQL Server.
- Índices declarados sobre las columnas más consultadas (nombre de producto, claves foráneas).

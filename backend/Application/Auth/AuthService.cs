using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PolloCentro.Api.Application.Abstractions.Security;
using PolloCentro.Api.Application.Common.Exceptions;
using PolloCentro.Api.Application.Common.Interfaces;

namespace PolloCentro.Api.Application.Auth;

public class AuthService : IAuthService
{
    private readonly IApplicationDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _tokenGenerator;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IApplicationDbContext db,
        IPasswordHasher passwordHasher,
        IJwtTokenGenerator tokenGenerator,
        ILogger<AuthService> logger)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _tokenGenerator = tokenGenerator;
        _logger = logger;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            throw new ValidationException("Email y contraseña requeridos");

        // Proyección mínima: solo las columnas necesarias para autenticar, sin tracking.
        var user = await _db.Usuarios
            .AsNoTracking()
            .Where(u => u.Correo == request.Email)
            .Select(u => new
            {
                u.IdUsuario,
                u.Nombre,
                u.Apellido,
                u.Correo,
                u.Contrasena,
                u.Estado,
                Rol = u.Rol.NombreRol
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (user is null || user.Estado != true)
            throw new UnauthorizedException("Credenciales inválidas o usuario inactivo");

        if (!_passwordHasher.Verify(request.Password, user.Contrasena))
            throw new UnauthorizedException("Credenciales inválidas");

        var token = _tokenGenerator.GenerateToken(user.IdUsuario, user.Rol, user.Correo);
        _logger.LogInformation("Usuario {Correo} inició sesión correctamente", user.Correo);

        return new LoginResponse
        {
            Token = token,
            User = new AppUserDto
            {
                Uid = user.IdUsuario.ToString(),
                Email = user.Correo,
                DisplayName = $"{user.Nombre} {user.Apellido}".Trim(),
                Role = user.Rol,
                Active = user.Estado
            }
        };
    }
}

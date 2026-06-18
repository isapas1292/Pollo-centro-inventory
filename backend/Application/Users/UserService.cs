using Microsoft.EntityFrameworkCore;
using PolloCentro.Api.Application.Abstractions.Security;
using PolloCentro.Api.Application.Common.Exceptions;
using PolloCentro.Api.Application.Common.Interfaces;
using PolloCentro.Api.Domain.Entities;

namespace PolloCentro.Api.Application.Users;

public class UserService : IUserService
{
    private readonly IApplicationDbContext _db;
    private readonly IPasswordHasher _passwordHasher;

    public UserService(IApplicationDbContext db, IPasswordHasher passwordHasher)
    {
        _db = db;
        _passwordHasher = passwordHasher;
    }

    public async Task<IReadOnlyList<UserDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _db.Usuarios
            .AsNoTracking()
            .OrderBy(u => u.Nombre)
            .Select(u => new UserDto
            {
                Uid = u.IdUsuario.ToString(),
                Email = u.Correo,
                DisplayName = (u.Nombre + " " + u.Apellido).Trim(),
                Role = u.Rol.NombreRol,
                Phone = u.Telefono,
                Active = u.Estado ?? true,
                CreatedAt = u.FechaCreacion ?? DateTime.Now
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<UserDto> CreateAsync(UserInput input, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(input.Password))
            throw new ValidationException("La contraseña es requerida al crear un usuario");

        var rol = await ResolveRoleAsync(input.Role, cancellationToken);
        var (nombre, apellido) = SplitName(input.DisplayName);

        var usuario = new Usuario
        {
            IdRol = rol.IdRol,
            Nombre = nombre,
            Apellido = apellido,
            NombreUsuario = await GenerateUsernameAsync(input.Email, cancellationToken),
            Correo = input.Email,
            Contrasena = _passwordHasher.Hash(input.Password),
            Telefono = input.Phone,
            Estado = input.Active
        };

        _db.Usuarios.Add(usuario);
        await _db.SaveChangesAsync(cancellationToken);

        return ToDto(usuario, rol.NombreRol);
    }

    public async Task<UserDto> UpdateAsync(int id, UserInput input, CancellationToken cancellationToken = default)
    {
        var usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.IdUsuario == id, cancellationToken)
            ?? throw new NotFoundException("Usuario", id);

        var rol = await ResolveRoleAsync(input.Role, cancellationToken);
        var (nombre, apellido) = SplitName(input.DisplayName);

        usuario.IdRol = rol.IdRol;
        usuario.Nombre = nombre;
        usuario.Apellido = apellido;
        usuario.Correo = input.Email;
        usuario.Telefono = input.Phone;
        usuario.Estado = input.Active;

        if (!string.IsNullOrWhiteSpace(input.Password))
            usuario.Contrasena = _passwordHasher.Hash(input.Password);

        await _db.SaveChangesAsync(cancellationToken);
        return ToDto(usuario, rol.NombreRol);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.IdUsuario == id, cancellationToken)
            ?? throw new NotFoundException("Usuario", id);

        _db.Usuarios.Remove(usuario);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task<Rol> ResolveRoleAsync(string roleName, CancellationToken cancellationToken)
        => await _db.Roles.FirstOrDefaultAsync(r => r.NombreRol == roleName, cancellationToken)
           ?? throw new ValidationException($"Rol inválido: '{roleName}'");

    private async Task<string> GenerateUsernameAsync(string email, CancellationToken cancellationToken)
    {
        var baseName = email.Split('@')[0];
        var candidate = baseName;
        var i = 1;
        while (await _db.Usuarios.AnyAsync(u => u.NombreUsuario == candidate, cancellationToken))
            candidate = $"{baseName}{i++}";
        return candidate;
    }

    private static (string nombre, string apellido) SplitName(string displayName)
    {
        var parts = displayName.Trim().Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
        return parts.Length switch
        {
            0 => ("Usuario", ""),
            1 => (parts[0], ""),
            _ => (parts[0], parts[1])
        };
    }

    private static UserDto ToDto(Usuario u, string role) => new()
    {
        Uid = u.IdUsuario.ToString(),
        Email = u.Correo,
        DisplayName = $"{u.Nombre} {u.Apellido}".Trim(),
        Role = role,
        Phone = u.Telefono,
        Active = u.Estado ?? true,
        CreatedAt = u.FechaCreacion ?? DateTime.Now
    };
}

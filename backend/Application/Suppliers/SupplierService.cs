using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using PolloCentro.Api.Application.Common.Exceptions;
using PolloCentro.Api.Application.Common.Interfaces;
using PolloCentro.Api.Domain.Entities;

namespace PolloCentro.Api.Application.Suppliers;

public class SupplierService : ISupplierService
{
    private readonly IApplicationDbContext _db;

    public SupplierService(IApplicationDbContext db) => _db = db;

    // Expresión de proyección: EF la traduce a SQL (solo selecciona las columnas usadas);
    // su versión compilada se reutiliza para mapear entidades ya materializadas en memoria.
    private static readonly Expression<Func<Proveedor, SupplierDto>> Projection = p => new SupplierDto
    {
        Id = p.IdProveedor.ToString(),
        Name = p.NombreProveedor,
        ContactName = p.Direccion ?? string.Empty,
        Phone = p.Telefono ?? string.Empty,
        Email = p.Correo ?? string.Empty,
        Active = p.Estado,
        Notes = p.RNC ?? string.Empty
    };

    private static readonly Func<Proveedor, SupplierDto> ToDto = Projection.Compile();

    public async Task<IReadOnlyList<SupplierDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _db.Proveedores
            .AsNoTracking()
            .OrderBy(p => p.NombreProveedor)
            .Select(Projection)
            .ToListAsync(cancellationToken);
    }

    public async Task<SupplierDto> CreateAsync(SupplierInput input, CancellationToken cancellationToken = default)
    {
        var proveedor = new Proveedor
        {
            NombreProveedor = input.Name,
            Direccion = input.ContactName,
            Telefono = input.Phone,
            Correo = input.Email,
            Estado = input.Active ?? true,
            RNC = input.Notes
        };

        _db.Proveedores.Add(proveedor);
        await _db.SaveChangesAsync(cancellationToken);

        return ToDto(proveedor);
    }

    public async Task<SupplierDto> UpdateAsync(int id, SupplierInput input, CancellationToken cancellationToken = default)
    {
        var proveedor = await _db.Proveedores.FirstOrDefaultAsync(p => p.IdProveedor == id, cancellationToken)
            ?? throw new NotFoundException("Proveedor", id);

        proveedor.NombreProveedor = input.Name;
        proveedor.Direccion = input.ContactName;
        proveedor.Telefono = input.Phone;
        proveedor.Correo = input.Email;
        proveedor.Estado = input.Active;
        proveedor.RNC = input.Notes;

        await _db.SaveChangesAsync(cancellationToken);
        return ToDto(proveedor);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var proveedor = await _db.Proveedores.FirstOrDefaultAsync(p => p.IdProveedor == id, cancellationToken)
            ?? throw new NotFoundException("Proveedor", id);

        _db.Proveedores.Remove(proveedor);
        await _db.SaveChangesAsync(cancellationToken);
    }
}

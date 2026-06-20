using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PolloCentro.Api.Application.Common.Exceptions;
using PolloCentro.Api.Application.Common.Interfaces;
using PolloCentro.Api.Domain.Entities;

namespace PolloCentro.Api.Application.Recipes;

public class RecipeService : IRecipeService
{
    private readonly IApplicationDbContext _db;

    public RecipeService(IApplicationDbContext db) => _db = db;

    public async Task<IReadOnlyList<RecipeDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _db.Recetas
            .AsNoTracking()
            .OrderBy(r => r.NombreReceta)
            .Select(r => new RecipeDto
            {
                Id = r.IdReceta.ToString(),
                Name = r.NombreReceta,
                Description = r.Descripcion ?? string.Empty,
                EstimatedCost = r.RecetaIngredientes.Sum(ri => ri.CantidadNecesaria * ri.Producto.CostoUnitario),
                SalePrice = r.PrecioVenta ?? 0,
                PreparedStock = r.StockPreparado,
                CreatedAt = r.FechaCreacion ?? DateTime.Now,
                Ingredients = r.RecetaIngredientes.Select(ri => new RecipeIngredientDto
                {
                    ProductId = ri.IdProducto.ToString(),
                    ProductName = ri.Producto.NombreProducto,
                    Quantity = ri.CantidadNecesaria
                }).ToList()
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<RecipeDto> CreateAsync(RecipeInput input, CancellationToken cancellationToken = default)
    {
        var receta = new Receta
        {
            NombreReceta = input.Name,
            Descripcion = input.Description,
            PrecioVenta = input.SalePrice,
            Porciones = 1,
            Estado = true,
            RecetaIngredientes = await BuildIngredientesAsync(input.Ingredients, cancellationToken)
        };

        _db.Recetas.Add(receta);
        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(receta.IdReceta, cancellationToken);
    }

    public async Task<RecipeDto> UpdateAsync(int id, RecipeInput input, CancellationToken cancellationToken = default)
    {
        var receta = await _db.Recetas
            .Include(r => r.RecetaIngredientes)
            .FirstOrDefaultAsync(r => r.IdReceta == id, cancellationToken)
            ?? throw new NotFoundException("Receta", id);

        receta.NombreReceta = input.Name;
        receta.Descripcion = input.Description;
        receta.PrecioVenta = input.SalePrice;

        // Reemplaza la lista de ingredientes.
        _db.RecetaIngredientes.RemoveRange(receta.RecetaIngredientes);
        receta.RecetaIngredientes = await BuildIngredientesAsync(input.Ingredients, cancellationToken);

        await _db.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(receta.IdReceta, cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var receta = await _db.Recetas
            .Include(r => r.RecetaIngredientes)
            .FirstOrDefaultAsync(r => r.IdReceta == id, cancellationToken)
            ?? throw new NotFoundException("Receta", id);

        _db.RecetaIngredientes.RemoveRange(receta.RecetaIngredientes);
        _db.Recetas.Remove(receta);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<RecipeLogDto> PrepareAsync(int id, PrepareRecipeRequest request, CancellationToken cancellationToken = default)
    {
        var quantity = request.Quantity <= 0 ? 1 : request.Quantity;

        var receta = await _db.Recetas
            .Include(r => r.RecetaIngredientes)
            .FirstOrDefaultAsync(r => r.IdReceta == id, cancellationToken)
            ?? throw new NotFoundException("Receta", id);

        var productIds = receta.RecetaIngredientes.Select(ri => ri.IdProducto).ToList();
        var productos = await _db.Productos
            .Where(p => productIds.Contains(p.IdProducto))
            .ToListAsync(cancellationToken);

        // Validar stock.
        var faltantes = new List<string>();
        foreach (var ing in receta.RecetaIngredientes)
        {
            var prod = productos.FirstOrDefault(p => p.IdProducto == ing.IdProducto);
            var needed = ing.CantidadNecesaria * quantity;
            if (prod is null)
                faltantes.Add($"Producto {ing.IdProducto} no existe");
            else if (prod.CantidadDisponible < needed)
                faltantes.Add($"{prod.NombreProducto}: necesita {needed}, tiene {prod.CantidadDisponible}");
        }
        if (faltantes.Count > 0)
            throw new ValidationException("Stock insuficiente: " + string.Join("; ", faltantes));

        // Descontar stock y construir el detalle.
        var usados = new List<RecipeIngredientDto>();
        decimal totalCost = 0;
        foreach (var ing in receta.RecetaIngredientes)
        {
            var prod = productos.First(p => p.IdProducto == ing.IdProducto);
            var used = ing.CantidadNecesaria * quantity;
            prod.CantidadDisponible -= used;
            totalCost += used * prod.CostoUnitario;
            usados.Add(new RecipeIngredientDto { ProductId = prod.IdProducto.ToString(), ProductName = prod.NombreProducto, Quantity = used });
        }

        var registro = new RegistroPreparacion
        {
            IdReceta = receta.IdReceta,
            RecetaNombre = receta.NombreReceta,
            PreparadoPor = request.PreparedBy,
            FechaPreparacion = DateTime.Now,
            Cantidad = quantity,
            CostoTotal = totalCost,
            IngredientesJson = JsonSerializer.Serialize(usados)
        };
        _db.RegistroPreparaciones.Add(registro);

        // La receta queda "hecha" en inventario.
        receta.StockPreparado += quantity;

        await _db.SaveChangesAsync(cancellationToken);

        return new RecipeLogDto
        {
            Id = registro.IdRegistro.ToString(),
            RecipeId = receta.IdReceta.ToString(),
            RecipeName = receta.NombreReceta,
            PreparedBy = request.PreparedBy ?? string.Empty,
            PreparedAt = registro.FechaPreparacion,
            IngredientsUsed = usados,
            TotalCost = totalCost,
            Quantity = quantity
        };
    }

    public async Task<IReadOnlyList<RecipeLogDto>> GetLogsAsync(CancellationToken cancellationToken = default)
    {
        var registros = await _db.RegistroPreparaciones
            .AsNoTracking()
            .OrderByDescending(r => r.FechaPreparacion)
            .ToListAsync(cancellationToken);

        return registros.Select(r => new RecipeLogDto
        {
            Id = r.IdRegistro.ToString(),
            RecipeId = r.IdReceta.ToString(),
            RecipeName = r.RecetaNombre,
            PreparedBy = r.PreparadoPor ?? string.Empty,
            PreparedAt = r.FechaPreparacion,
            TotalCost = r.CostoTotal,
            Quantity = r.Cantidad,
            IngredientsUsed = string.IsNullOrEmpty(r.IngredientesJson)
                ? new List<RecipeIngredientDto>()
                : JsonSerializer.Deserialize<List<RecipeIngredientDto>>(r.IngredientesJson) ?? new()
        }).ToList();
    }

    private async Task<List<RecetaIngrediente>> BuildIngredientesAsync(
        List<RecipeIngredientDto> ingredients, CancellationToken cancellationToken)
    {
        var ids = ingredients
            .Select(i => int.TryParse(i.ProductId, out var pid) ? pid : 0)
            .Where(pid => pid > 0)
            .ToList();

        var units = await _db.Productos
            .Where(p => ids.Contains(p.IdProducto))
            .Select(p => new { p.IdProducto, p.UnidadMedida })
            .ToDictionaryAsync(p => p.IdProducto, p => p.UnidadMedida, cancellationToken);

        var result = new List<RecetaIngrediente>();
        foreach (var ing in ingredients)
        {
            if (!int.TryParse(ing.ProductId, out var pid) || pid <= 0) continue;
            result.Add(new RecetaIngrediente
            {
                IdProducto = pid,
                CantidadNecesaria = ing.Quantity,
                UnidadMedida = units.TryGetValue(pid, out var u) && !string.IsNullOrEmpty(u) ? u : "unidad"
            });
        }
        return result;
    }

    private async Task<RecipeDto> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        return await _db.Recetas
            .AsNoTracking()
            .Where(r => r.IdReceta == id)
            .Select(r => new RecipeDto
            {
                Id = r.IdReceta.ToString(),
                Name = r.NombreReceta,
                Description = r.Descripcion ?? string.Empty,
                EstimatedCost = r.RecetaIngredientes.Sum(ri => ri.CantidadNecesaria * ri.Producto.CostoUnitario),
                SalePrice = r.PrecioVenta ?? 0,
                PreparedStock = r.StockPreparado,
                CreatedAt = r.FechaCreacion ?? DateTime.Now,
                Ingredients = r.RecetaIngredientes.Select(ri => new RecipeIngredientDto
                {
                    ProductId = ri.IdProducto.ToString(),
                    ProductName = ri.Producto.NombreProducto,
                    Quantity = ri.CantidadNecesaria
                }).ToList()
            })
            .FirstAsync(cancellationToken);
    }
}

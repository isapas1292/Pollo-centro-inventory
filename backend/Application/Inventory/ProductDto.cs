using System.Text.Json.Serialization;

namespace PolloCentro.Api.Application.Inventory;

/// <summary>Producto de inventario con el shape que consume el frontend Angular.</summary>
public class ProductDto
{
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;
    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;
    [JsonPropertyName("category")] public string Category { get; set; } = string.Empty;
    [JsonPropertyName("currentStock")] public decimal CurrentStock { get; set; }
    [JsonPropertyName("unit")] public string Unit { get; set; } = string.Empty;
    [JsonPropertyName("minStock")] public decimal MinStock { get; set; }
    [JsonPropertyName("currentPrice")] public decimal CurrentPrice { get; set; }
    [JsonPropertyName("supplierId")] public string? SupplierId { get; set; }
    [JsonPropertyName("supplierName")] public string? SupplierName { get; set; }
    [JsonPropertyName("lastUpdated")] public DateTime LastUpdated { get; set; }
}

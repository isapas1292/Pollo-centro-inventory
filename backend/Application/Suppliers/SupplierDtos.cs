using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace PolloCentro.Api.Application.Suppliers;

/// <summary>Proveedor con el shape que consume el frontend Angular.</summary>
public class SupplierDto
{
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;
    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;
    [JsonPropertyName("contactName")] public string ContactName { get; set; } = string.Empty;
    [JsonPropertyName("phone")] public string Phone { get; set; } = string.Empty;
    [JsonPropertyName("email")] public string Email { get; set; } = string.Empty;
    [JsonPropertyName("active")] public bool? Active { get; set; }
    [JsonPropertyName("notes")] public string Notes { get; set; } = string.Empty;
}

/// <summary>Datos de entrada para crear o actualizar un proveedor.</summary>
public class SupplierInput
{
    [Required(ErrorMessage = "El nombre del proveedor es requerido")]
    [StringLength(150, MinimumLength = 1)]
    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;

    [StringLength(150)]
    [JsonPropertyName("contactName")] public string? ContactName { get; set; }

    [StringLength(30)]
    [JsonPropertyName("phone")] public string? Phone { get; set; }

    [EmailAddress(ErrorMessage = "Correo inválido")]
    [StringLength(150)]
    [JsonPropertyName("email")] public string? Email { get; set; }

    [JsonPropertyName("active")] public bool? Active { get; set; }

    [StringLength(500)]
    [JsonPropertyName("notes")] public string? Notes { get; set; }
}

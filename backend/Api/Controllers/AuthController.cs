using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using PolloCentro.Api.Application.Auth;

namespace PolloCentro.Api.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IWebHostEnvironment _env;
    private readonly int _expiryHours;

    public AuthController(IAuthService authService, IWebHostEnvironment env, IConfiguration config)
    {
        _authService = authService;
        _env = env;
        _expiryHours = config.GetValue("Jwt:ExpiryHours", 8);
    }

    /// <summary>Inicia sesión: devuelve el usuario y deja el JWT en una cookie HttpOnly.</summary>
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("login")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LoginResponse>> Login(
        [FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var result = await _authService.LoginAsync(request, cancellationToken);
        SetAuthCookie(result.Token);
        return Ok(result);
    }

    /// <summary>Renueva la sesión (sliding) re-emitiendo el token en la cookie.</summary>
    [Authorize]
    [HttpPost("refresh")]
    public async Task<ActionResult<LoginResponse>> Refresh(CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
            return Unauthorized();

        var result = await _authService.RefreshAsync(userId, cancellationToken);
        SetAuthCookie(result.Token);
        return Ok(result);
    }

    /// <summary>Cierra sesión eliminando la cookie de autenticación.</summary>
    [AllowAnonymous]
    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete(AuthCookie.Name, new CookieOptions
        {
            Path = "/",
            Secure = !_env.IsDevelopment(),
            SameSite = SameSiteMode.Lax
        });
        return Ok(new { success = true });
    }

    private void SetAuthCookie(string token)
    {
        Response.Cookies.Append(AuthCookie.Name, token, new CookieOptions
        {
            HttpOnly = true,                       // inaccesible para JavaScript (anti-XSS)
            Secure = !_env.IsDevelopment(),        // solo HTTPS en producción
            SameSite = SameSiteMode.Lax,           // mitiga CSRF en peticiones de escritura
            Path = "/",
            Expires = DateTimeOffset.UtcNow.AddHours(_expiryHours)
        });
    }
}

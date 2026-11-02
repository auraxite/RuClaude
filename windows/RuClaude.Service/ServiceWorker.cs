using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace RuClaude.Core;

public sealed class ServiceWorker(ILogger<ServiceWorker> logger) : BackgroundService
{
    // Create a new handler for every check, so VPN/proxy changes do not reuse pooled connections.
    private static HttpClient CreateClient() => new(new SocketsHttpHandler {
        PooledConnectionLifetime = TimeSpan.Zero,
        UseProxy = true
    }) { Timeout = TimeSpan.FromSeconds(8) };
    private bool? _blocked;
    private bool _installed;
    private string _lastRefreshRequest = "";

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                if (!_installed)
                {
                    await FirewallRules.EnsureInstalledAsync(stoppingToken);
                    _installed = true;
                    _blocked = true; // New rules are initially enabled.
                }
                var settings = RuClaudeStore.LoadSettings();
                RuClaudeStatus state;
                bool block;
                if (!settings.Enabled)
                {
                    block = false;
                    state = new RuClaudeStatus { State = "disabled", Detail = "Protection disabled by user" };
                }
                else
                {
                    // Immediately block when the protection is switched on, before network lookup.
                    if (_blocked != true)
                    {
                        await FirewallRules.SetBlockedAsync(true, stoppingToken);
                        _blocked = true;
                    }
                    // Fail closed when country check is unavailable or unexpected.
                    (string ip, string country) = await LookupLocationAsync(stoppingToken);
                    block = !country.Equals(settings.AllowedCountry, StringComparison.OrdinalIgnoreCase);
                    state = new RuClaudeStatus
                    {
                        State = block ? "blocked" : "allowed", Ip = ip, Country = country,
                        Detail = block ? "Public IP country is not allowed" : "Public IP country matched"
                    };
                }
                if (_blocked != block)
                {
                    await FirewallRules.SetBlockedAsync(block, stoppingToken);
                    _blocked = block;
                }
                state.CheckedUtc = DateTime.UtcNow;
                RuClaudeStore.SaveStatus(state);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                logger.LogError(ex, "Country check / firewall update failed");
                try
                {
                    if (_installed)
                    {
                        await FirewallRules.SetBlockedAsync(true, stoppingToken);
                        _blocked = true;
                    }
                    RuClaudeStore.SaveStatus(new RuClaudeStatus { State = "error", Detail = ex.Message, CheckedUtc = DateTime.UtcNow });
                }
                catch (Exception fallbackError) { logger.LogError(fallbackError, "Fail-closed update failed"); }
            }
            // Refresh on demand within ~1s; otherwise check at most every 10s.
            try {
                string oldRequest = File.Exists(RuClaudeStore.RefreshPath)
                    ? File.ReadAllText(RuClaudeStore.RefreshPath) : "";
                for (int i=0; i<10; i++) {
                    await Task.Delay(TimeSpan.FromSeconds(1), stoppingToken);
                    string request = File.Exists(RuClaudeStore.RefreshPath)
                        ? File.ReadAllText(RuClaudeStore.RefreshPath) : "";
                    if (request != oldRequest || request != _lastRefreshRequest) {
                        _lastRefreshRequest = request;
                        break;
                    }
                }
            } catch (OperationCanceledException) { break; }
              catch (IOException) { /* Retry at normal interval */ }
        }
        // Best effort: keep blocked on graceful service shutdown.
        try { if (_installed && RuClaudeStore.LoadSettings().Enabled) await FirewallRules.SetBlockedAsync(true, CancellationToken.None); }
        catch (Exception ex) { logger.LogError(ex, "Could not restore blocking on service stop"); }
    }

    private static async Task<(string Ip, string Country)> LookupLocationAsync(CancellationToken token)
    {
        using var client = CreateClient();
        try
        {
            var a = await client.GetFromJsonAsync<IpWho>("https://ipwho.is/", token);
            if (a?.Success == true && IsCountry(a.CountryCode) && !string.IsNullOrWhiteSpace(a.Ip))
                return (a.Ip, a.CountryCode!);
        }
        catch (OperationCanceledException) when (token.IsCancellationRequested) { throw; }
        catch (Exception) { /* fallback */ }
        var b = await client.GetFromJsonAsync<IpApi>("https://ipapi.co/json/", token);
        if (b is null || !IsCountry(b.CountryCode) || string.IsNullOrWhiteSpace(b.Ip))
            throw new InvalidOperationException("Unable to verify public IP location");
        return (b.Ip, b.CountryCode!);
    }

    private static bool IsCountry(string? country) => country is { Length: 2 } && country.All(char.IsAsciiLetterUpper);

    private sealed class IpWho
    {
        [JsonPropertyName("success")] public bool Success { get; set; }
        [JsonPropertyName("ip")] public string? Ip { get; set; }
        [JsonPropertyName("country_code")] public string? CountryCode { get; set; }
    }
    private sealed class IpApi
    {
        [JsonPropertyName("ip")] public string? Ip { get; set; }
        [JsonPropertyName("country_code")] public string? CountryCode { get; set; }
    }
}

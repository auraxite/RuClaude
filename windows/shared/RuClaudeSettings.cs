using System;
using System.IO;
using System.Text.Json;

namespace RuClaude.Core;

public sealed class RuClaudeSettings
{
    public bool Enabled { get; set; } = false;
    public string AllowedCountry { get; set; } = "";
    public string Language { get; set; } = "ru";
}

public sealed class RuClaudeStatus
{
    public string State { get; set; } = "starting";
    public string Country { get; set; } = "";
    public string Ip { get; set; } = "";
    public string Detail { get; set; } = "";
    public DateTime CheckedUtc { get; set; } = DateTime.MinValue;
}

public static class RuClaudeStore
{
    public static string Folder => Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "RuClaude");
    public static string SettingsPath => Path.Combine(Folder, "settings.json");
    public static string StatusPath => Path.Combine(Folder, "status.json");
    public static string RefreshPath => Path.Combine(Folder, "refresh.request");
    public static void RequestRefresh() {
        Directory.CreateDirectory(Folder);
        File.WriteAllText(RefreshPath, DateTime.UtcNow.Ticks.ToString());
    }
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true, PropertyNameCaseInsensitive = true };

    public static RuClaudeSettings LoadSettings()
    {
        try
        {
            var value = JsonSerializer.Deserialize<RuClaudeSettings>(File.ReadAllText(SettingsPath), JsonOptions);
            if (value is not null && System.Text.RegularExpressions.Regex.IsMatch(value.AllowedCountry ?? "", "^([A-Z]{2})?$") && (value.Language == "ru" || value.Language == "en"))
                return value;
        }
        catch (IOException) { }
        catch (UnauthorizedAccessException) { }
        catch (JsonException) { }
        return new RuClaudeSettings();
    }

    public static RuClaudeStatus LoadStatus()
    {
        try { return JsonSerializer.Deserialize<RuClaudeStatus>(File.ReadAllText(StatusPath), JsonOptions) ?? new RuClaudeStatus(); }
        catch (IOException) { }
        catch (UnauthorizedAccessException) { }
        catch (JsonException) { }
        return new RuClaudeStatus();
    }

    public static void SaveSettings(RuClaudeSettings settings) => SaveAtomic(SettingsPath, settings);
    public static void SaveStatus(RuClaudeStatus status) => SaveAtomic(StatusPath, status);

    private static void SaveAtomic<T>(string path, T value)
    {
        Directory.CreateDirectory(Folder);
        string tmp = Path.Combine(Folder, Guid.NewGuid().ToString("N") + ".tmp");
        try
        {
            File.WriteAllText(tmp, JsonSerializer.Serialize(value, JsonOptions));
            File.Move(tmp, path, true);
        }
        finally { try { if (File.Exists(tmp)) File.Delete(tmp); } catch (IOException) { } }
    }
}

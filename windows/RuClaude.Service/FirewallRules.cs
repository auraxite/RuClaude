using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;

namespace RuClaude.Core;

// Windows Defender Firewall FQDN dynamic keywords, applying to all local processes.
// This is a DNS/IP-based rule set, NOT a WFP network callout or a VPN kill switch.
public static class FirewallRules
{
    private static readonly string[] Domains =
    [
        "claude.ai", "*.claude.ai", "anthropic.com", "*.anthropic.com",
        "claude.com", "*.claude.com"
    ];

    private static string IdFor(int index)
    {
        byte[] digest = SHA256.HashData(Encoding.UTF8.GetBytes("RuClaude::" + Domains[index]));
        return "{" + new Guid(digest.AsSpan(0, 16)).ToString() + "}";
    }

    private static string SetupScript()
    {
        var code = new StringBuilder("$ErrorActionPreference='Stop'; Import-Module NetSecurity; ");
        for (int i = 0; i < Domains.Length; ++i)
        {
            string id = IdFor(i);
            string name = "RuClaude-FQDN-" + i;
            code.Append($"if (-not (Get-NetFirewallDynamicKeywordAddress -Id '{id}' -ErrorAction SilentlyContinue)) {{ New-NetFirewallDynamicKeywordAddress -Id '{id}' -Keyword '{Domains[i]}' -AutoResolve $true | Out-Null }}; ");
            code.Append($"if (-not (Get-NetFirewallRule -Name '{name}' -ErrorAction SilentlyContinue)) {{ New-NetFirewallRule -Name '{name}' -DisplayName '{name}' -Group 'RuClaude' -Action Block -Direction Outbound -RemoteDynamicKeywordAddresses '{id}' -Profile Any -Enabled True | Out-Null }}; ");
        }
        return code.ToString();
    }

    public static Task EnsureInstalledAsync(CancellationToken token) => RunAsync(SetupScript(), token);

    public static Task SetBlockedAsync(bool blocked, CancellationToken token)
    {
        string state = blocked ? "True" : "False";
        return RunAsync($"$ErrorActionPreference='Stop'; Get-NetFirewallRule -Group 'RuClaude' -ErrorAction Stop | Set-NetFirewallRule -Enabled {state} -ErrorAction Stop", token);
    }

    public static Task RemoveAsync(CancellationToken token)
    {
        var script = new StringBuilder("$ErrorActionPreference='Stop'; Get-NetFirewallRule -Group 'RuClaude' -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction Stop; ");
        foreach (int i in Enumerable.Range(0, Domains.Length))
        {
            string id = IdFor(i);
            script.Append($"Get-NetFirewallDynamicKeywordAddress -Id '{id}' -ErrorAction SilentlyContinue | Remove-NetFirewallDynamicKeywordAddress -ErrorAction Stop; ");
        }
        return RunAsync(script.ToString(), token);
    }

    private static async Task RunAsync(string script, CancellationToken token)
    {
        // Launch Windows PowerShell's inbox NetSecurity module; no user .ps1 scripts.
        var info = new ProcessStartInfo("powershell.exe")
        {
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardError = true,
            RedirectStandardOutput = true
        };
        info.ArgumentList.Add("-NoLogo");
        info.ArgumentList.Add("-NoProfile");
        info.ArgumentList.Add("-NonInteractive");
        info.ArgumentList.Add("-EncodedCommand");
        info.ArgumentList.Add(Convert.ToBase64String(Encoding.Unicode.GetBytes(script)));
        using var proc = Process.Start(info) ?? throw new InvalidOperationException("Cannot start Windows PowerShell");
        Task<string> stdout = proc.StandardOutput.ReadToEndAsync(token);
        Task<string> stderr = proc.StandardError.ReadToEndAsync(token);
        await proc.WaitForExitAsync(token);
        string err = await stderr;
        _ = await stdout;
        if (proc.ExitCode != 0) throw new InvalidOperationException($"Windows Firewall command failed ({proc.ExitCode}): {err.Trim()}");
    }
}

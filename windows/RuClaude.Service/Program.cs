using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using RuClaude.Core;

if (args.Contains("--remove-firewall", StringComparer.OrdinalIgnoreCase))
{
    await FirewallRules.RemoveAsync(CancellationToken.None);
    return;
}

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddWindowsService(o => o.ServiceName = "RuClaudeService");
builder.Services.AddHostedService<ServiceWorker>();
await builder.Build().RunAsync();

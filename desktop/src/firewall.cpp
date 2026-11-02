#include "firewall.h"
#include <QProcess>
#include <QHostInfo>
#include <QCryptographicHash>
#include <QRegularExpression>
#include <algorithm>

static bool run(const QString &exe,const QStringList &args,const QByteArray &stdinData,QString *error){
 QProcess p;
 p.start(exe,args);
 if(!p.waitForStarted(10000)){if(error)*error=p.errorString();return false;}
 if(!stdinData.isEmpty()){p.write(stdinData);p.closeWriteChannel();}
 if(!p.waitForFinished(30000)){p.kill();p.waitForFinished();if(error)*error="Command timed out";return false;}
 if(p.exitStatus()!=QProcess::NormalExit || p.exitCode()!=0){if(error)*error=QString::fromUtf8(p.readAllStandardError()).trimmed()+QString::fromUtf8(p.readAllStandardOutput()).trimmed();return false;}
 return true;
}
#ifdef Q_OS_WIN
static QString psName(int i){return "RuClaude-FQDN-"+QString::number(i);}
static const QStringList domains={"claude.ai","*.claude.ai","anthropic.com","*.anthropic.com","claude.com","*.claude.com"};
static QString psId(const QString &domain){
 const auto digest=QCryptographicHash::hash(("RuClaude::"+domain).toUtf8(),QCryptographicHash::Sha256);
 auto b=digest.left(16);
 // .NET's Guid(byte[]) treats first 3 fields as little-endian.
 std::reverse(b.begin(),b.begin()+4);std::reverse(b.begin()+4,b.begin()+6);std::reverse(b.begin()+6,b.begin()+8);
 auto hex=b.toHex();return QString("{%1-%2-%3-%4-%5}").arg(QString::fromLatin1(hex.mid(0,8)),QString::fromLatin1(hex.mid(8,4)),QString::fromLatin1(hex.mid(12,4)),QString::fromLatin1(hex.mid(16,4)),QString::fromLatin1(hex.mid(20,12)));
}
static bool powershell(const QString &script,QString *error){
 QByteArray utf16(reinterpret_cast<const char*>(script.utf16()),script.size()*2);
 return run("powershell.exe",{"-NoProfile","-NonInteractive","-EncodedCommand",QString::fromLatin1(utf16.toBase64())},{},error);
}
bool Firewall::setBlocked(bool blocked,QString *error){
 QString script="$ErrorActionPreference='Stop'; Import-Module NetSecurity; ";
 for(int i=0;i<domains.size();++i){
   QString id=psId(domains[i]),name=psName(i), desired=blocked?"True":"False";
   script+=QString("if (-not (Get-NetFirewallDynamicKeywordAddress -Id '%1' -ErrorAction SilentlyContinue)) { New-NetFirewallDynamicKeywordAddress -Id '%1' -Keyword '%2' -AutoResolve $true | Out-Null }; ").arg(id,domains[i]);
   script+=QString("$rule = Get-NetFirewallRule -Name '%1' -ErrorAction SilentlyContinue; if (-not $rule) { New-NetFirewallRule -Name '%1' -DisplayName '%1' -Group 'RuClaude' -Action Block -Direction Outbound -RemoteDynamicKeywordAddresses '%2' -Profile Any -Enabled %3 | Out-Null } else { if ($rule.Enabled.ToString() -ne '%3') { $rule | Set-NetFirewallRule -Enabled %3 -ErrorAction Stop } }; ").arg(name,id,desired);
   script+=QString("if ((Get-NetFirewallRule -Name '%1' -ErrorAction Stop).Enabled.ToString() -ne '%2') { throw 'Rule reconciliation failed: %1' }; ").arg(name,desired);
 }
 return powershell(script,error);
}
bool Firewall::remove(QString *error){
 QString script="$ErrorActionPreference='Stop'; Import-Module NetSecurity; Get-NetFirewallRule -Group 'RuClaude' -ErrorAction SilentlyContinue | Remove-NetFirewallRule; ";
 for(const auto &domain:domains)script+=QString("Get-NetFirewallDynamicKeywordAddress -Id '%1' -ErrorAction SilentlyContinue | Remove-NetFirewallDynamicKeywordAddress; ").arg(psId(domain));
 return powershell(script,error);
}
#else
static QStringList resolveHosts(){
 const QStringList hosts={"claude.ai","www.claude.ai","api.claude.ai","console.anthropic.com","anthropic.com","www.anthropic.com","api.anthropic.com","claude.com","www.claude.com","platform.claude.com"};
 QStringList ips;
 for(const auto &host:hosts)for(const auto &addr:QHostInfo::fromName(host).addresses()){
   if(!addr.isNull()&&!addr.isLoopback()&&!addr.isLinkLocal()&&!ips.contains(addr.toString()))ips<<addr.toString();
 }
 return ips;
}
static bool tableExists(){QProcess p;p.start("nft",{"list","table","inet","ruclaude"});return p.waitForFinished(10000)&&p.exitCode()==0;}
static bool applyNft(const QString &script,QString *error){return run("nft",{"-f","-"},script.toUtf8(),error);}
static QStringList lastIPs;
static bool lastBlocked=false;
bool Firewall::setBlocked(bool blocked,QString *error){
 if(!blocked){
   if(!tableExists()){lastBlocked=false;lastIPs.clear();return true;}
   if(!applyNft("delete table inet ruclaude\n",error))return false;
   lastBlocked=false;lastIPs.clear();return true;
 }
 auto ips=resolveHosts();
 ips.sort();
 QStringList v4,v6;
 for(const auto &ip:ips){if(ip.contains(':'))v6<<ip;else v4<<ip;}
 v4.sort();v6.sort();
 if(ips.isEmpty()){if(error)*error="No Claude IP addresses resolved; cannot establish blocking";return false;}
 if(lastBlocked&&ips==lastIPs&&tableExists())return true;
 QString script=(tableExists()?"delete table inet ruclaude\n":"")+QString("table inet ruclaude {\n");
 if(!v4.isEmpty())script+="set targets4 { type ipv4_addr; elements = { "+v4.join(", ")+" } }\n";
 if(!v6.isEmpty())script+="set targets6 { type ipv6_addr; elements = { "+v6.join(", ")+" } }\n";
 script+="chain output { type filter hook output priority -5; policy accept;\n";
 if(!v4.isEmpty())script+="ip daddr @targets4 reject\n";
 if(!v6.isEmpty())script+="ip6 daddr @targets6 reject\n";
 script+="}\n}\n";
 if(!applyNft(script,error))return false;
 lastBlocked=true;lastIPs=ips;return true;
}
bool Firewall::remove(QString *error){return setBlocked(false,error);}
#endif

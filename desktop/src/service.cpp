#include "common.h"
#include "firewall.h"
#include <QCoreApplication>
#include <QDateTime>
#include <QJsonDocument>
#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QNetworkRequest>
#include <QEventLoop>
#include <QTimer>
#include <QDebug>
#include <QHostAddress>
#ifdef Q_OS_WIN
#include <windows.h>
#endif

class Worker : public QObject {
 Q_OBJECT
 QNetworkAccessManager network;
 QTimer timer;
 QString lastRefresh;
 bool busy=false;
 bool previouslyAllowed=false;
public:
 Worker(){
  timer.setInterval(10000);
  connect(&timer,&QTimer::timeout,this,&Worker::tick);
  lastRefresh=QString::fromUtf8(QJsonDocument(RC::loadJson(RC::refreshPath())).toJson(QJsonDocument::Compact));
  QTimer::singleShot(0,this,&Worker::tick);
  timer.start();
 }
private:
 bool lookupAt(const QUrl &url,QString &ip,QString &country){
   QNetworkRequest req(url);
   req.setHeader(QNetworkRequest::UserAgentHeader,"RuClaude/Qt6");
   auto *reply=network.get(req);
   QEventLoop loop;
   QTimer timeout;timeout.setSingleShot(true);
   connect(&timeout,&QTimer::timeout,reply,&QNetworkReply::abort);
   connect(reply,&QNetworkReply::finished,&loop,&QEventLoop::quit);
   timeout.start(8000);loop.exec();
   if(reply->error()!=QNetworkReply::NoError){reply->deleteLater();return false;}
   auto obj=QJsonDocument::fromJson(reply->readAll()).object();reply->deleteLater();
   if(obj.contains("success")&&!obj.value("success").toBool())return false;
   auto maybeIp=obj.value("ip").toString(),maybeCountry=obj.value("country_code").toString().toUpper();
   QHostAddress parsed;
   if(!parsed.setAddress(maybeIp)||maybeCountry.size()!=2)return false;
   for(const auto &ch:maybeCountry)if(ch<'A'||ch>'Z')return false;
   ip=maybeIp;country=maybeCountry;return true;
 }
 void report(const QString &state,const QString &ip={},const QString &country={},const QString &detail={}){
   QString error;
   if(!RC::saveJson(RC::statusPath(),{{"state",state},{"ip",ip},{"country",country},{"detail",detail},{"checked_utc",RC::nowUtc()}},&error)) qWarning()<<"Could not write status:"<<error;
 }
 void tick(){
   if(busy)return;busy=true;
   const auto config=RC::loadSettings();
   bool enabled=config.value("enabled").toBool();
   QString error;
   if(!enabled){
     previouslyAllowed=false;
     if(Firewall::setBlocked(false,&error))report("disabled");
     else report("error",{}, {},"Cannot disable firewall rules: "+error);
   }else{
     // Fail-closed while determining the public IP; do not report allowed before
     // the actual firewall rules are disabled.
     if(!previouslyAllowed && !Firewall::setBlocked(true,&error)){
       report("error",{}, {},"Could not establish blocking: "+error);
     }else{
       QString ip,country;
       if(!lookupAt(QUrl("https://ipwho.is/"),ip,country)&&!lookupAt(QUrl("https://ipapi.co/json/"),ip,country)){
         previouslyAllowed=false;
         QString failErr;
         if(Firewall::setBlocked(true,&failErr)) report("error",{}, {},"Cannot determine public IP country (blocking retained)");
         else report("error",{}, {},"IP lookup failed; blocking could not be confirmed: "+failErr);
       }else if(country!=config.value("allowed_country").toString()){
         previouslyAllowed=false;
         QString denyErr;
         if(Firewall::setBlocked(true,&denyErr))report("blocked",ip,country,"Country not allowed");
         else report("error",ip,country,"Could not block disallowed country: "+denyErr);
       }else if(!Firewall::setBlocked(false,&error)){
         previouslyAllowed=false;
         report("error",ip,country,"Cannot disable blocking: "+error);
       }else{
         previouslyAllowed=true;
         report("allowed",ip,country);
       }
     }
   }
   busy=false;
 }
public slots:
 void refresh(){tick();}
};

#ifdef Q_OS_WIN
static SERVICE_STATUS_HANDLE serviceHandle=nullptr;
static SERVICE_STATUS serviceStatus={};
static QCoreApplication *runningApp=nullptr;
static void WINAPI control(DWORD c){if(c==SERVICE_CONTROL_STOP&&runningApp){serviceStatus.dwCurrentState=SERVICE_STOP_PENDING;SetServiceStatus(serviceHandle,&serviceStatus);QMetaObject::invokeMethod(runningApp,"quit",Qt::QueuedConnection);}}
static void WINAPI startService(DWORD, LPWSTR*){
 serviceHandle=RegisterServiceCtrlHandlerW(L"RuClaudeService",control);
 if(!serviceHandle)return;
 serviceStatus.dwServiceType=SERVICE_WIN32_OWN_PROCESS;
 serviceStatus.dwControlsAccepted=SERVICE_ACCEPT_STOP;
 serviceStatus.dwCurrentState=SERVICE_RUNNING;
 SetServiceStatus(serviceHandle,&serviceStatus);
 int argc=1;char name[]="RuClaudeService";char *argv[]={name,nullptr};
 QCoreApplication app(argc,argv);runningApp=&app;
 Worker worker;QTimer refreshTimer;refreshTimer.setInterval(1000);
 QString last;
 QObject::connect(&refreshTimer,&QTimer::timeout,&app,[&]{auto current=QString::fromUtf8(QJsonDocument(RC::loadJson(RC::refreshPath())).toJson(QJsonDocument::Compact));if(current!=last){last=current;worker.refresh();}});
 last=QString::fromUtf8(QJsonDocument(RC::loadJson(RC::refreshPath())).toJson(QJsonDocument::Compact));refreshTimer.start();
 app.exec();runningApp=nullptr;
 serviceStatus.dwCurrentState=SERVICE_STOPPED;SetServiceStatus(serviceHandle,&serviceStatus);
}
int main(int argc,char **argv){
 // Parse service mode without creating a second QCoreApplication in ServiceMain.
 QStringList raw;for(int i=0;i<argc;i++)raw<<QString::fromLocal8Bit(argv[i]);
 if(raw.contains("--remove-firewall")){QString err;if(!Firewall::remove(&err)){qCritical()<<err;return 1;}return 0;}
 if(raw.contains("--console")){
  QCoreApplication cli(argc,argv);
  Worker worker;
  QTimer refresh;refresh.setInterval(1000);QString last;
  QObject::connect(&refresh,&QTimer::timeout,&cli,[&]{auto current=QString::fromUtf8(QJsonDocument(RC::loadJson(RC::refreshPath())).toJson(QJsonDocument::Compact));if(current!=last){last=current;worker.refresh();}});
  refresh.start();return cli.exec();
 }
 SERVICE_TABLE_ENTRYW table[]={{const_cast<LPWSTR>(L"RuClaudeService"),startService},{nullptr,nullptr}};
 if(!StartServiceCtrlDispatcherW(table)){qCritical()<<"Start from Windows Service Control Manager, or use --console";return 1;}
 return 0;
}
#else
int main(int argc,char **argv){
 QCoreApplication app(argc,argv);
 if(app.arguments().contains("--remove-firewall")){QString err;return Firewall::remove(&err)?0:1;}
 Worker worker;
 auto *watch=new QTimer(&app);watch->setInterval(1000);
 QString last=QString::fromUtf8(QJsonDocument(RC::loadJson(RC::refreshPath())).toJson(QJsonDocument::Compact));
 QObject::connect(watch,&QTimer::timeout,&app,[&]{auto current=QString::fromUtf8(QJsonDocument(RC::loadJson(RC::refreshPath())).toJson(QJsonDocument::Compact));if(current!=last){last=current;worker.refresh();}});
 watch->start();return app.exec();
}
#endif
#include "service.moc"

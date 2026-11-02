#include "common.h"
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QJsonDocument>
#include <QSaveFile>
#include <QStandardPaths>
#include <QCoreApplication>
#include <QRegularExpression>

namespace RC {
QString dataDir() {
#ifdef Q_OS_WIN
  QString d=qEnvironmentVariable("ProgramData");
  if(d.isEmpty()) d=QStandardPaths::writableLocation(QStandardPaths::GenericDataLocation);
  return QDir(d).filePath("RuClaude");
#else
  return "/var/lib/ruclaude";
#endif
}
QString settingsPath(){return dataDir()+"/settings.json";}
QString statusPath(){return dataDir()+"/status.json";}
QString refreshPath(){return dataDir()+"/refresh.request";}
QJsonObject defaultSettings(){return {{"enabled",false},{"allowed_country",""},{"language","ru"}};}
QJsonObject loadJson(const QString &path) {
  QFile f(path);
  if(!f.open(QIODevice::ReadOnly)) return {};
  const auto doc=QJsonDocument::fromJson(f.readAll());
  return doc.isObject()?doc.object():QJsonObject{};
}
QJsonObject loadSettings(){
  auto s=defaultSettings(), stored=loadJson(settingsPath());
  auto lang=stored.value("language").toString();
  if(lang=="ru"||lang=="en") s["language"]=lang;
  auto country=stored.value("allowed_country").toString();
  static const QRegularExpression valid("^[A-Z]{2}$");
  if(valid.match(country).hasMatch()) s["allowed_country"]=country;
  s["enabled"]=stored.value("enabled").toBool(false) && !s["allowed_country"].toString().isEmpty();
  return s;
}
bool saveJson(const QString &path,const QJsonObject &obj,QString *error){
  QDir().mkpath(QFileInfo(path).absolutePath());
  QSaveFile file(path);
  if(!file.open(QIODevice::WriteOnly)) { if(error)*error=file.errorString();return false; }
  file.write(QJsonDocument(obj).toJson(QJsonDocument::Indented));
  if(!file.commit()) {if(error)*error=file.errorString();return false;}
  return true;
}
bool requestRefresh(QString *error){
  return saveJson(refreshPath(),{{"requested_at",nowUtc()}},error);
}
QString nowUtc(){return QDateTime::currentDateTimeUtc().toString(Qt::ISODateWithMs);}
QString formatCountry(const QString &code,bool russian){
  QFile f(":/countries.json");
  if(!f.open(QIODevice::ReadOnly))return code;
  auto doc=QJsonDocument::fromJson(f.readAll()).object();
  return doc.value(code).toObject().value(russian?"ru":"en").toString(code);
}
}

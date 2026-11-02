#pragma once
#include <QDateTime>
#include <QJsonObject>
#include <QString>

namespace RC {
QString dataDir();
QString settingsPath();
QString statusPath();
QString refreshPath();
QJsonObject defaultSettings();
QJsonObject loadSettings();
QJsonObject loadJson(const QString &path);
bool saveJson(const QString &path,const QJsonObject &obj,QString *error=nullptr);
bool requestRefresh(QString *error=nullptr);
QString nowUtc();
QString formatCountry(const QString &code,bool russian);
}

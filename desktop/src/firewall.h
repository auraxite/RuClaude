#pragma once
#include <QString>
#include <QStringList>
class Firewall {
public:
 static bool setBlocked(bool blocked,QString *error);
 static bool remove(QString *error);
};

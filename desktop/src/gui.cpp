#include "common.h"
#include <QApplication>
#include <QComboBox>
#include <QDateTime>
#include <QFile>
#include <QFrame>
#include <QHBoxLayout>
#include <QIcon>
#include <QJsonDocument>
#include <QLabel>
#include <QMessageBox>
#include <QPixmap>
#include <QPushButton>
#include <QScrollBar>
#include <QTimer>
#include <QVBoxLayout>
#include <algorithm>

class MainWindow : public QWidget {
  QJsonObject settings=RC::loadSettings();
  QLabel *subtitle,*protection,*subProtection,*countryLabel,*saved,*filterTitle,*state,*ip,*detail,*footer;
  QComboBox *country;
  QPushButton *language,*toggle,*refresh;
  bool initializing=false;
  bool ru()const{return settings.value("language").toString()=="ru";}
  QString trc(const char *r,const char *e)const {return QString::fromUtf8(ru()?r:e);}
  void store(){
    QString error;
    if(!RC::saveJson(RC::settingsPath(),settings,&error)) {
      QMessageBox::warning(this,"RuClaude",trc("Не удалось сохранить: ","Save failed: ")+error);
      settings=RC::loadSettings();
      return;
    }
    if(!RC::requestRefresh(&error)) detail->setText(trc("Обновление не запрошено: ","Refresh not requested: ")+error);
  }
  void populateCountries(){
    QString current=settings.value("allowed_country").toString();
    country->blockSignals(true);
    country->clear();
    country->addItem(trc("Не выбрано","Not selected"),QString());
    QFile f(":/countries.json");
    if(f.open(QIODevice::ReadOnly)) {
      auto items=QJsonDocument::fromJson(f.readAll()).object();
      QVector<QPair<QString,QString>> options;
      for(auto it=items.begin();it!=items.end();++it)
        options.append({it.value().toObject().value(ru()?"ru":"en").toString(it.key()),it.key()});
      std::sort(options.begin(),options.end(),[](auto a,auto b){return QString::localeAwareCompare(a.first,b.first)<0;});
      for(const auto &item:options) country->addItem(item.first,item.second);
    }
    int idx=country->findData(current);
    country->setCurrentIndex(idx<0?0:idx);
    country->blockSignals(false);
  }
  void translateUi(){
    subtitle->setText(trc("Проверка страны IP для Claude","Country-based IP check for Claude"));
    protection->setText(trc("Защита","Protection"));
    subProtection->setText(trc("Контроль публичного IP","Public IP country check"));
    countryLabel->setText(trc("Разрешённая страна","Allowed country"));
    saved->setText(trc("Настройки сохраняются автоматически","Settings are saved automatically"));
    filterTitle->setText(trc("Состояние фильтра","Firewall status"));
    footer->setText(trc("Служба работает в фоновом режиме","Service runs in the background"));
    language->setText(ru()?"РУ":"EN");
    toggle->setText(settings.value("enabled").toBool()?"ON":"OFF");
    toggle->setStyleSheet(settings.value("enabled").toBool()?"background:#218977;color:white;border-radius:7px;font-weight:bold;":"background:#ba4e58;color:white;border-radius:7px;font-weight:bold;");
    populateCountries();
    showStatus();
  }
  void showStatus(){
    auto s=RC::loadJson(RC::statusPath());
    QDateTime checked=QDateTime::fromString(s.value("checked_utc").toString(),Qt::ISODate);
    if(!checked.isValid() || checked.secsTo(QDateTime::currentDateTimeUtc())>35 || checked.secsTo(QDateTime::currentDateTimeUtc()) < -10) {
      state->setText(trc("Служба не отвечает","Service not responding"));
      state->setStyleSheet("color:#ffb35b;font-size:17px;font-weight:bold");
      ip->clear();
      detail->setText(trc("Проверьте фоновую службу","Check background service"));
      return;
    }
    QString kind=s.value("state").toString();
    if(kind=="allowed")state->setText(trc("Доступ разрешён","Traffic allowed"));
    else if(kind=="blocked")state->setText(trc("Доступ заблокирован","Traffic blocked"));
    else if(kind=="disabled")state->setText(trc("Защита выключена","Protection disabled"));
    else if(kind=="error")state->setText(trc("Ошибка проверки","Check failed"));
    else state->setText(trc("Запуск...","Starting..."));
    state->setStyleSheet(QString("color:%1;font-size:17px;font-weight:bold").arg(kind=="allowed"?"#a0eabb":"#ffb35b"));
    QString address=s.value("ip").toString(), code=s.value("country").toString();
    ip->setText(address.isEmpty()?QString():QString("IP: %1    %2: %3").arg(address,trc("Страна","Country"),RC::formatCountry(code,ru())));
    detail->setText(kind=="error"?s.value("detail").toString():trc("Последняя проверка: ","Last check: ")+checked.toLocalTime().toString("HH:mm:ss"));
  }
public:
  MainWindow(){
    setWindowTitle("RuClaude");setWindowIcon(QIcon(":/logo.png"));
    setObjectName("root");
    setStyleSheet("#root{background:#172033;color:#fff;} QLabel{color:white;} #panel{background:#25334f;border-radius:10px;} #muted{color:#afc6e9;font-size:12px;} QPushButton{border:0;border-radius:7px;color:white;padding:7px 10px;background:#365784;} QComboBox{color:white;background:#25334f;border:1px solid #5b6b8e;border-radius:6px;padding:7px;} QComboBox QAbstractItemView{background:#25334f;color:white;selection-background-color:#365784;}");
    auto *main=new QVBoxLayout(this);main->setContentsMargins(20,15,20,15);main->setSpacing(12);
    auto *head=new QHBoxLayout;head->setSpacing(10);
    auto *logo=new QLabel;logo->setPixmap(QPixmap(":/logo.png").scaled(51,51,Qt::KeepAspectRatio,Qt::SmoothTransformation));head->addWidget(logo);
    auto *titles=new QVBoxLayout;titles->setSpacing(1);
    auto *name=new QLabel("RuClaude");name->setStyleSheet("font-size:25px;font-weight:bold");titles->addWidget(name);
    subtitle=new QLabel;subtitle->setObjectName("muted");titles->addWidget(subtitle);head->addLayout(titles,1);
    language=new QPushButton;language->setFixedSize(45,36);language->setStyleSheet("background:#ea7838;color:white;font-weight:bold;border-radius:7px");head->addWidget(language);main->addLayout(head);
    auto *protectPanel=new QFrame;protectPanel->setObjectName("panel");auto *protectRow=new QHBoxLayout(protectPanel);protectRow->setContentsMargins(14,12,14,12);
    auto *pt=new QVBoxLayout;pt->setSpacing(2);protection=new QLabel;protection->setStyleSheet("font-size:17px;font-weight:bold");pt->addWidget(protection);subProtection=new QLabel;subProtection->setObjectName("muted");pt->addWidget(subProtection);protectRow->addLayout(pt,1);
    toggle=new QPushButton;toggle->setFixedSize(72,39);protectRow->addWidget(toggle);main->addWidget(protectPanel);
    countryLabel=new QLabel;countryLabel->setStyleSheet("font-size:14px;font-weight:bold");main->addWidget(countryLabel);
    country=new QComboBox;country->setMinimumHeight(37);country->setMaxVisibleItems(13);main->addWidget(country);
    saved=new QLabel;saved->setObjectName("muted");main->addWidget(saved);
    auto *statusPanel=new QFrame;statusPanel->setObjectName("panel");auto *statusLayout=new QVBoxLayout(statusPanel);statusLayout->setContentsMargins(14,9,14,10);statusLayout->setSpacing(3);
    auto *statusHead=new QHBoxLayout;filterTitle=new QLabel;filterTitle->setStyleSheet("font-size:14px;font-weight:bold");statusHead->addWidget(filterTitle,1);refresh=new QPushButton("↻");refresh->setFixedSize(38,31);statusHead->addWidget(refresh);statusLayout->addLayout(statusHead);
    state=new QLabel;statusLayout->addWidget(state);
    ip=new QLabel;ip->setObjectName("muted");statusLayout->addWidget(ip);
    detail=new QLabel;detail->setObjectName("muted");detail->setWordWrap(true);statusLayout->addWidget(detail);main->addWidget(statusPanel);
    footer=new QLabel;footer->setObjectName("muted");main->addWidget(footer);
    connect(language,&QPushButton::clicked,this,[this]{settings["language"]=ru()?"en":"ru";store();translateUi();});
    connect(toggle,&QPushButton::clicked,this,[this]{if(!settings.value("enabled").toBool()&&settings.value("allowed_country").toString().isEmpty()){QMessageBox::information(this,"RuClaude",trc("Сначала выберите страну","Select a country first"));return;}settings["enabled"]=!settings.value("enabled").toBool();store();translateUi();});
    connect(country,QOverload<int>::of(&QComboBox::currentIndexChanged),this,[this](int index){if(index<0)return;settings["allowed_country"]=country->itemData(index).toString();if(settings.value("allowed_country").toString().isEmpty())settings["enabled"]=false;store();translateUi();});
    connect(refresh,&QPushButton::clicked,this,[this]{QString err;if(!RC::requestRefresh(&err))QMessageBox::warning(this,"RuClaude",err);else state->setText(trc("Проверка...","Refreshing..."));});
    auto *timer=new QTimer(this);connect(timer,&QTimer::timeout,this,[this]{showStatus();});timer->start(2000);
    translateUi();setFixedWidth(520);adjustSize();setFixedHeight(qMax(440,sizeHint().height()+8));
  }
};
int main(int argc,char **argv){QApplication app(argc,argv);app.setApplicationName("RuClaude");MainWindow w;w.show();return app.exec();}

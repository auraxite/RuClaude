#!/usr/bin/env python3
"""RuClaude desktop interface. Standard-library tkinter UI; no root required."""
import json
import os
from pathlib import Path
from datetime import datetime, timezone
import tkinter as tk
from tkinter import ttk, messagebox
from common import APP_VERSION, STATUS, load_settings, read_json, save_settings, ask_refresh

ROOT = Path(__file__).resolve().parent
COUNTRIES = json.loads((ROOT/'countries.json').read_text(encoding='utf-8'))
BG='#172033'; PANEL='#25334f'; TEXT='#ffffff'; MUTED='#afc6e9'; BLUE='#365784'; ORANGE='#ea7838'; GREEN='#208c76'
LABELS = {
 'ru': {'subtitle':'Проверка страны IP для Claude','protection':'Защита','check':'Контроль публичного IP',
 'country':'Разрешённая страна','saved':'Настройки сохраняются автоматически',
 'filter':'Состояние фильтра','foot':'Служба работает в фоновом режиме',
 'stale':'Служба не отвечает','install':'Установите службу: sudo ./Install.sh',
 'allowed':'Доступ разрешён','blocked':'Доступ заблокирован','disabled':'Защита выключена',
 'error':'Ошибка проверки','starting':'Запуск...','last':'Последняя проверка','countryword':'Страна',
 'refresh':'Проверка...','saveerror':'Не удалось сохранить настройки', 'unselected':'Не выбрано', 'choosefirst':'Сначала выберите страну'},
 'en': {'subtitle':'Country-based network filter','protection':'Protection','check':'Public IP country check',
 'country':'Allowed country','saved':'Settings are saved automatically',
 'filter':'Firewall status','foot':'Service runs in the background',
 'stale':'Service not responding','install':'Install service: sudo ./Install.sh',
 'allowed':'Traffic allowed','blocked':'Traffic blocked','disabled':'Protection disabled',
 'error':'Check failed','starting':'Starting...','last':'Last check','countryword':'Country',
 'refresh':'Checking...','saveerror':'Could not save settings', 'unselected':'Not selected', 'choosefirst':'Select a country first'}
}

class App:
 def __init__(self):
    self.cfg=load_settings(); self.lang=self.cfg['language']; self.internal=False
    self.root=tk.Tk(); self.root.title(f'RuClaude v{APP_VERSION}'); self.root.configure(bg=BG)
    self.root.resizable(False,False)
    try:
        icon=tk.PhotoImage(file=str(ROOT/'assets/logo.png'))
        self.icon=icon; self.root.iconphoto(True,icon)
    except tk.TclError: pass
    self.head=tk.Frame(self.root,bg=BG); self.head.pack(fill='x',padx=22,pady=(16,13))
    self.logo=tk.Label(self.head,bg=BG)
    try:
        self.small_logo=tk.PhotoImage(file=str(ROOT/'assets/logo.png')).subsample(5,5)
        self.logo.config(image=self.small_logo)
    except tk.TclError: pass
    self.logo.pack(side='left',padx=(0,12))
    title=tk.Frame(self.head,bg=BG);title.pack(side='left',fill='both',expand=True)
    tk.Label(title,text='RuClaude',font=('DejaVu Sans',22,'bold'),bg=BG,fg=TEXT,anchor='w').pack(anchor='w')
    self.subtitle=tk.Label(title,font=('DejaVu Sans',9),bg=BG,fg=MUTED,anchor='w');self.subtitle.pack(anchor='w')
    self.lang_btn=tk.Button(self.head,command=self.toggle_language,width=4,bd=0,relief='flat',bg=ORANGE,fg=TEXT,font=('DejaVu Sans',11,'bold'),activebackground='#f58d55');self.lang_btn.pack(side='right')
    switch_box=tk.Frame(self.root,bg=PANEL,padx=14,pady=12);switch_box.pack(fill='x',padx=22,pady=(0,16))
    switch_labels=tk.Frame(switch_box,bg=PANEL);switch_labels.pack(side='left',fill='both',expand=True)
    self.protection=tk.Label(switch_labels,font=('DejaVu Sans',14,'bold'),fg=TEXT,bg=PANEL,anchor='w');self.protection.pack(anchor='w')
    self.check=tk.Label(switch_labels,font=('DejaVu Sans',9),fg=MUTED,bg=PANEL,anchor='w');self.check.pack(anchor='w',pady=(3,0))
    self.toggle=tk.Button(switch_box,command=self.toggle_protection,bd=0,fg='white',width=7,height=2,font=('DejaVu Sans',12,'bold'));self.toggle.pack(side='right')
    choose=tk.Frame(self.root,bg=BG);choose.pack(fill='x',padx=22,pady=(0,14))
    self.country_lbl=tk.Label(choose,bg=BG,fg=TEXT,font=('DejaVu Sans',12,'bold'));self.country_lbl.pack(anchor='w',pady=(0,7))
    self.country_var=tk.StringVar();self.country_combo=ttk.Combobox(choose,textvariable=self.country_var,state='readonly',height=14,font=('DejaVu Sans',11));self.country_combo.pack(fill='x')
    self.country_combo.bind('<<ComboboxSelected>>',self.on_country)
    self.saved=tk.Label(choose,bg=BG,fg=MUTED,font=('DejaVu Sans',9));self.saved.pack(anchor='w',pady=(7,0))
    status_box=tk.Frame(self.root,bg=PANEL,padx=14,pady=9);status_box.pack(fill='x',padx=22)
    status_head=tk.Frame(status_box,bg=PANEL);status_head.pack(fill='x')
    self.filter=tk.Label(status_head,bg=PANEL,fg=TEXT,font=('DejaVu Sans',12,'bold'));self.filter.pack(side='left')
    self.refresh=tk.Button(status_head,command=self.refresh_now,text='↻',width=3,bg=BLUE,fg='white',bd=0,font=('DejaVu Sans',17));self.refresh.pack(side='right')
    self.state=tk.Label(status_box,bg=PANEL,fg=ORANGE,font=('DejaVu Sans',15,'bold'),anchor='w');self.state.pack(fill='x',pady=(3,0))
    self.ip=tk.Label(status_box,bg=PANEL,fg=MUTED,font=('DejaVu Sans',9),anchor='w');self.ip.pack(fill='x')
    self.time=tk.Label(status_box,bg=PANEL,fg=MUTED,font=('DejaVu Sans',9),anchor='w');self.time.pack(fill='x',pady=(3,0))
    self.foot=tk.Label(self.root,bg=BG,fg=MUTED,font=('DejaVu Sans',9),anchor='w');self.foot.pack(fill='x',padx=22,pady=(12,0))
    self.update_language();self.update_status()
    # Calculate real required size after native Tk fonts and desktop DPI scaling.
    self.root.update_idletasks()
    required_w=max(585,self.root.winfo_reqwidth()+18)
    required_h=max(560,self.root.winfo_reqheight()+28)
    self.root.geometry(f'{required_w}x{required_h}')
    self.root.minsize(required_w,required_h)
    self.root.maxsize(required_w,required_h)
    self.root.after(2000,self.poll)

 def save(self):
    try:
        save_settings(self.cfg);ask_refresh()
    except OSError as exc:
        self.state.config(text=LABELS[self.lang]['saveerror'],fg=ORANGE)
        self.time.config(text=str(exc)[:140])
 def update_language(self):
    L=LABELS[self.lang]
    for widget,key in [(self.subtitle,'subtitle'),(self.protection,'protection'),(self.check,'check'),(self.country_lbl,'country'),(self.saved,'saved'),(self.filter,'filter')]:widget.config(text=L[key])
    self.foot.config(text=f'RuClaude v{APP_VERSION} · {L["foot"]}')
    self.lang_btn.config(text='РУ' if self.lang=='ru' else 'EN')
    self.toggle.config(text='ON' if self.cfg['enabled'] else 'OFF',bg=GREEN if self.cfg['enabled'] else '#bb4c56')
    choices=sorted([(v[self.lang],k) for k,v in COUNTRIES.items()],key=lambda a:a[0].casefold())
    self.codes=['']+[x[1] for x in choices]
    self.country_combo['values']=[L['unselected']]+[x[0] for x in choices]
    self.internal=True
    try:
        idx=self.codes.index(self.cfg['allowed_country']);self.country_combo.current(idx)
    except ValueError: self.country_combo.current(0)
    self.internal=False
    self.update_status()
 def toggle_language(self):
    self.lang='en' if self.lang=='ru' else 'ru';self.cfg['language']=self.lang;self.save();self.update_language()
 def toggle_protection(self):
    if not self.cfg['enabled'] and not self.cfg['allowed_country']:
        self.state.config(text=LABELS[self.lang]['choosefirst'],fg=ORANGE)
        return
    self.cfg['enabled']=not self.cfg['enabled'];self.save();self.update_language()
 def on_country(self,_):
    idx=self.country_combo.current()
    if not self.internal and idx>=0:
        self.cfg['allowed_country']=self.codes[idx]
        if not self.cfg['allowed_country']:self.cfg['enabled']=False
        self.save();self.update_language()
 def refresh_now(self):
    try:ask_refresh()
    except OSError as exc:
        self.state.config(text=LABELS[self.lang]['saveerror'],fg=ORANGE)
        self.time.config(text=str(exc)[:140]);return
    self.state.config(text=LABELS[self.lang]['refresh'])
 def update_status(self):
    data=read_json(STATUS,{})
    L=LABELS[self.lang]
    try:
        ts=datetime.fromisoformat(data['checked_utc']).astimezone()
        if (datetime.now(timezone.utc)-ts.astimezone(timezone.utc)).total_seconds()>35: raise ValueError('stale')
    except (ValueError,TypeError,KeyError):
        self.state.config(text=L['stale'],fg=ORANGE)
        self.ip.config(text='');self.time.config(text=L['install']);return
    kind=data.get('state','starting')
    self.state.config(text=L.get(kind,L['starting']),fg=('#a6eeaa' if kind=='allowed' else ORANGE))
    self.ip.config(text=('IP: '+data['ip']+'     '+L['countryword']+': '+data['country']) if data.get('ip') else '')
    self.time.config(text=(data.get('detail','') if kind=='error' else L['last']+': '+ts.strftime('%H:%M:%S')))
 def poll(self):
    self.update_status();self.root.after(2000,self.poll)
 def run(self):self.root.mainloop()

if __name__=='__main__':App().run()

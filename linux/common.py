"""Shared settings and paths for the Linux RuClaude app and service."""
import json
import os
from pathlib import Path

APP_VERSION = '1.0.0'
BASE = Path('/var/lib/ruclaude')
RUN = Path('/run/ruclaude')
SETTINGS = BASE / 'settings.json'
STATUS = RUN / 'status.json'
REFRESH = BASE / 'refresh.request'
DEFAULTS = {'enabled': False, 'allowed_country': '', 'language': 'ru'}

def read_json(path, default):
    try:
        with open(path, encoding='utf-8') as f:
            data = json.load(f)
        return data if isinstance(data, dict) else dict(default)
    except (FileNotFoundError, PermissionError, ValueError, OSError):
        return dict(default)

def load_settings():
    value = read_json(SETTINGS, DEFAULTS)
    settings = {**DEFAULTS, **value}
    if not isinstance(settings['allowed_country'], str) or (settings['allowed_country'] and (len(settings['allowed_country']) != 2 or not settings['allowed_country'].isalpha())):
        settings['allowed_country'] = ''
    if settings['language'] not in ('ru','en'):
        settings['language'] = 'ru'
    settings['enabled'] = settings['enabled'] is True
    return settings

def write_json_atomic(path, data, mode=0o664):
    import tempfile
    from pathlib import Path
    path = Path(path)
    fd, temp = tempfile.mkstemp(prefix='.ruclaude-', dir=path.parent)
    try:
        with os.fdopen(fd,'w',encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.chmod(temp, mode)
        os.replace(temp, path)
    finally:
        try: os.unlink(temp)
        except FileNotFoundError: pass

def save_settings(data):
    write_json_atomic(SETTINGS, data)

def ask_refresh():
    # Atomic write to avoid a partially-written request while service polls.
    write_json_atomic(REFRESH, {'requested_at': __import__('time').time()})

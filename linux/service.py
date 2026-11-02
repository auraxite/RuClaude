#!/usr/bin/env python3
"""RuClaude Linux background service. Requires root and nftables.

Best-effort DNS->IP blocking; NOT complete FQDN interception or VPN kill switch.
"""
import ipaddress
import json
import logging
import os
import signal
import socket
import subprocess
import sys
import time
import urllib.request
from datetime import datetime, timezone

from common import RUN, REFRESH, STATUS, load_settings, write_json_atomic

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
HOSTS = (
    'claude.ai', 'www.claude.ai', 'api.claude.ai', 'console.anthropic.com',
    'anthropic.com', 'www.anthropic.com', 'api.anthropic.com',
    'claude.com', 'www.claude.com', 'platform.claude.com',
)
TABLE = 'ruclaude'
STOP = False

def on_stop(*_):
    global STOP
    STOP = True

signal.signal(signal.SIGTERM, on_stop)
signal.signal(signal.SIGINT, on_stop)

def nft_exists():
    return subprocess.run(['nft','list','table','inet',TABLE], capture_output=True).returncode == 0

def nft_apply(script):
    p = subprocess.run(['nft','-f','-'], input=script, text=True, capture_output=True, timeout=15)
    if p.returncode:
        raise RuntimeError('nft: '+p.stderr.strip()[:400])

def firewall(blocked, ips):
    # Script is applied as one nftables transaction, replacing RuClaude's own table only.
    # A rule may block unrelated traffic sharing a CDN address with a target host.
    existing = nft_exists()
    prefix = 'delete table inet ruclaude\n' if existing else ''
    if not blocked:
        if existing: nft_apply(prefix)
        return
    v4 = sorted(set(str(ipaddress.ip_address(ip)) for ip in ips if ipaddress.ip_address(ip).version == 4))
    v6 = sorted(set(str(ipaddress.ip_address(ip)) for ip in ips if ipaddress.ip_address(ip).version == 6))
    if not v4 and not v6:
        raise RuntimeError('No Claude domain IP addresses resolved; cannot install blocking rules')
    lines=['table inet ruclaude {']
    if v4: lines += [' set targets4 { type ipv4_addr; elements = { '+', '.join(v4)+' } }']
    if v6: lines += [' set targets6 { type ipv6_addr; elements = { '+', '.join(v6)+' } }']
    lines += [' chain output {',' type filter hook output priority -5; policy accept;']
    if v4: lines += [' ip daddr @targets4 reject']
    if v6: lines += [' ip6 daddr @targets6 reject']
    lines += [' }','}']
    nft_apply(prefix+'\n'.join(lines)+'\n')

def resolve_hosts():
    ips = set()
    for host in HOSTS:
        try:
            for addr in socket.getaddrinfo(host,443,type=socket.SOCK_STREAM):
                ips.add(addr[4][0])
        except (socket.gaierror, OSError) as e:
            logging.debug('DNS failure for %s: %s',host,e)
    return ips

def country_lookup():
    for url in ('https://ipwho.is/','https://ipapi.co/json/'):
        try:
            req = urllib.request.Request(url,headers={'User-Agent':'RuClaude/1.0'})
            # Do not honor HTTP(S)_PROXY when checking host route; behavior differs from browsers.
            opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
            with opener.open(req, timeout=7) as response:
                body=json.loads(response.read(50000))
            ip=body.get('ip','')
            code=(body.get('country_code') or '').upper()
            if len(code)==2 and code.isalpha() and ipaddress.ip_address(ip):
                if 'success' not in body or body['success'] is True:
                    return ip,code
        except (OSError,ValueError,KeyError,TimeoutError) as e:
            logging.warning('Location lookup failed via %s: %s',url,e)
    raise RuntimeError('Cannot determine public IP country')

def publish(state, ip='', country='', detail=''):
    write_json_atomic(STATUS, {
        'state':state, 'ip':ip, 'country':country, 'detail':detail,
        'checked_utc':datetime.now(timezone.utc).isoformat()
    }, 0o644)

def main():
    if os.geteuid()!=0:
        sys.exit('RuClaude service must run as root via systemd')
    RUN.mkdir(exist_ok=True,parents=True)
    # Do not remove existing firewall rules on service startup (fail closed during restart).
    # Re-resolve target IP addresses every check; DNS aliases / wildcards are not exhaustive.
    last_refresh=REFRESH.read_text() if REFRESH.exists() else ''
    while not STOP:
        try:
            settings=load_settings()
            ips=resolve_hosts()
            if settings['enabled']:
                # Missing/invalid allowed country fails closed; no implicit country.
                # First ensure blocking, then check IP country.
                firewall(True,ips)
                ip,code=country_lookup()
                if code==settings['allowed_country']:
                    firewall(False,ips)
                    publish('allowed',ip,code)
                else:
                    publish('blocked',ip,code)
            else:
                firewall(False,ips)
                publish('disabled')
        except Exception as e:
            logging.exception('RuClaude check failed')
            try:
                ips=resolve_hosts()
                firewall(True,ips)
            except Exception as ex:
                logging.error('Could not ensure fail-closed blocking: %s',ex)
            publish('error',detail=str(e))
        for _ in range(10):
            if STOP: break
            try:
                req=REFRESH.read_text() if REFRESH.exists() else ''
                if req != last_refresh:
                    last_refresh=req
                    break
                time.sleep(1)
            except OSError:
                time.sleep(1)
    # On stop, if enabled, attempt to block before exiting and leave table in place.
    try:
        if load_settings()['enabled']: firewall(True,resolve_hosts())
    except Exception as e:
        logging.error('Could not retain blocking on exit: %s',e)

if __name__=='__main__': main()

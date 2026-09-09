set -eu
id ishtar-newsletter >/dev/null 2>&1 || useradd --system --home-dir /var/lib/ishtar-newsletter --shell /usr/sbin/nologin ishtar-newsletter
install -d -m 755 /opt/ishtar-newsletter
install -o ishtar-newsletter -g ishtar-newsletter -d -m 700 /var/lib/ishtar-newsletter
install -m 644 /tmp/ishtar-newsletter.py /opt/ishtar-newsletter/newsletter.py
install -m 644 /tmp/ishtar-newsletter.service /etc/systemd/system/ishtar-newsletter.service
systemctl daemon-reload
systemctl enable --now ishtar-newsletter
systemctl restart ishtar-newsletter
cp /etc/nginx/sites-available/ishtarinsights.com /etc/nginx/sites-available/ishtarinsights.com.before-newsletter
cat > /etc/nginx/conf.d/ishtar-newsletter-rate.conf <<'EOF'
limit_req_zone $binary_remote_addr zone=ishtar_newsletter:1m rate=10r/m;
EOF
python3 - <<'PY'
from pathlib import Path
p=Path('/etc/nginx/sites-available/ishtarinsights.com')
s=p.read_text()
block='''    location /api/newsletter/ {
        limit_req zone=ishtar_newsletter burst=10 nodelay;
        limit_req_status 429;
        client_max_body_size 1k;
        client_body_timeout 10s;
        proxy_pass http://127.0.0.1:8137;
        proxy_set_header Host $host;
        proxy_connect_timeout 3s;
        proxy_read_timeout 10s;
        add_header Cache-Control "no-store" always;
        access_log off;
    }
'''
if 'location /api/newsletter/' not in s:
    p.write_text(s.replace('    location / {', block+'    location / {', 1))
PY
nginx -t
systemctl reload nginx
curl --retry 3 --retry-connrefused --retry-delay 1 -fsS http://127.0.0.1:8137/health

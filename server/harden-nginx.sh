#!/bin/sh
# Security headers and cache lifetimes for the ishtarinsights.com server block. Run as root on the VPS:
#   sh /tmp/harden-nginx.sh              content-security policy in Report-Only mode (the default)
#   sh /tmp/harden-nginx.sh enforce      the same policy, enforced
# Idempotent. Touches only this site's server block, one snippet and one conf.d file; the other sites
# on this server are left alone. Backs the site file up beside itself, tests with `nginx -t`, and
# restores the backup if the test fails. docs/deployment.md, 2026-09-19, says why each header is there.
set -eu
MODE=${1:-report-only}
SITE=/etc/nginx/sites-available/ishtarinsights.com
SNIPPET=/etc/nginx/snippets/ishtar-security-headers.conf
CACHE=/etc/nginx/conf.d/ishtar-cache.conf
case "$MODE" in
  report-only) CSP_HEADER=Content-Security-Policy-Report-Only ;;
  enforce) CSP_HEADER=Content-Security-Policy ;;
  *) echo "usage: $0 [report-only|enforce]" >&2; exit 2 ;;
esac
[ -f "$SITE" ] || { echo "FAILED: $SITE not found" >&2; exit 1; }
BACKUP="$SITE.bak-$(date +%Y%m%d%H%M%S)"
cp -p "$SITE" "$BACKUP"
# Keep the previous snippet and map too, so a failed run puts all three files back as they were.
for f in "$SNIPPET" "$CACHE"; do if [ -f "$f" ]; then cp -p "$f" "$f.prev"; else rm -f "$f.prev"; fi; done
restore() {
  cp -p "$BACKUP" "$SITE"
  for f in "$SNIPPET" "$CACHE"; do if [ -f "$f.prev" ]; then mv -f "$f.prev" "$f"; else rm -f "$f"; fi; done
}

# 'unsafe-inline' stays for scripts and styles: every page has a small inline <script> (SiteShell.mount,
# JSON-LD) and the cards set inline custom properties. The policy still confines every load to this site.
# img-src blob: is for the natal wheel's SVG download (natal-chart.js).
mkdir -p /etc/nginx/snippets
cat > "$SNIPPET" <<EOF
add_header Strict-Transport-Security "max-age=15552000" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), camera=(), microphone=(), payment=(), usb=()" always;
add_header $CSP_HEADER "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;
EOF

# HTML and unversioned data revalidate on every visit, as before. A stylesheet or script asked for with a
# ?v= key never changes under that key. Fonts and images are not versioned, so they get a bounded lifetime.
cat > "$CACHE" <<'EOF'
map $uri $ishtar_static_kind {
    default "";
    ~*\.(?:css|js)$ "versionable";
    ~*\.woff2$ "font";
    ~*\.(?:jpg|jpeg|png|webp|gif|ico|svg)$ "image";
}
map "$ishtar_static_kind:$arg_v" $ishtar_cache {
    default "no-cache";
    ~^versionable:.+ "public, max-age=31536000, immutable";
    ~^font: "public, max-age=2592000";
    ~^image: "public, max-age=604800";
}
EOF

python3 - "$SITE" <<'PY' || { restore; echo "FAILED: the site file was not what this script expects; nothing changed" >&2; exit 1; }
import sys
from pathlib import Path
site = Path(sys.argv[1])
text = site.read_text()
if 'ishtar-security-headers.conf' in text:
    print('site file already includes the snippet; leaving it as it is')
    sys.exit(0)
INCLUDE = 'include snippets/ishtar-security-headers.conf;'
def once(old, new, what):
    global text
    if text.count(old) != 1:
        sys.exit(f'FAILED: expected exactly one "{what}" in the site file, found {text.count(old)}')
    text = text.replace(old, new)
# Server level: covers locations that set no header of their own (/static/, the dotfile deny).
once('    gzip_types text/css application/javascript application/json image/svg+xml;\n',
     '    gzip_types text/css application/javascript application/json image/svg+xml;\n'
     '    server_tokens off;\n'
     f'    {INCLUDE}\n', 'gzip_types line')
# A location with its own add_header inherits none from the server, so each of those includes the snippet.
once('        add_header Cache-Control "no-cache";\n        add_header X-Content-Type-Options nosniff;\n',
     '        add_header Cache-Control $ishtar_cache;\n'
     f'        {INCLUDE}\n', 'location / headers')
once('        add_header Cache-Control "max-age=600";\n        add_header X-Content-Type-Options nosniff;\n',
     '        add_header Cache-Control "max-age=600";\n'
     f'        {INCLUDE}\n', '/sky/daily/ headers')
no_store = '        add_header Cache-Control "no-store" always;\n'
if text.count(no_store) != 2:
    sys.exit(f'FAILED: expected two API locations with no-store, found {text.count(no_store)}')
text = text.replace(no_store, no_store + f'        {INCLUDE}\n')
site.write_text(text)
print('site file updated')
PY

if ! nginx -t 2>/tmp/harden-nginx.err; then
  cat /tmp/harden-nginx.err >&2
  restore
  nginx -t && echo "FAILED: nginx rejected the change; the site file is restored and nothing was reloaded" >&2
  exit 1
fi
systemctl reload nginx
echo "reloaded; content-security policy is $MODE; backup at $BACKUP"

#!/usr/bin/env bash
# EC2에서 실행: sudo bash apply-https-nginx.sh
set -euo pipefail

CONF="/etc/nginx/conf.d/fire-front.conf"

tee "$CONF" > /dev/null <<'EOF'
server {
    listen 80 default_server;
    server_name fire-management.rjsgud.com 54.180.139.135;
    return 301 https://$host$request_uri;
}

server {
    listen 80;
    server_name fire.rjsgud.com;
    return 301 https://fire-management.rjsgud.com$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    server_name fire.rjsgud.com;

    ssl_certificate /etc/letsencrypt/live/fire-management.rjsgud.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fire-management.rjsgud.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    return 301 https://fire-management.rjsgud.com$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    server_name fire-management.rjsgud.com;

    ssl_certificate /etc/letsencrypt/live/fire-management.rjsgud.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fire-management.rjsgud.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    root /home/ec2-user/fire-frontend;
    index index.html;

    location /assets/ {
        try_files $uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        try_files $uri =404;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Origin "";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    add_header Permissions-Policy "geolocation=(self)" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
EOF

nginx -t
systemctl reload nginx

echo "OK: nginx HTTPS 설정 적용 완료"
curl -s -o /dev/null -w "HTTP redirect test => %{http_code} %{redirect_url}\n" http://127.0.0.1/api/vehicles || true

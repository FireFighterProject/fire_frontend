#!/usr/bin/env bash
# Amazon Linux 2023 EC2 초기 설정 (Node, Git, Nginx, 배포 디렉터리)
# 사용: bash ec2-setup.sh [백엔드_API_주소]
# 예:   bash ec2-setup.sh http://10.1.0.50:8081

set -euo pipefail

BACKEND_URL="${1:-http://127.0.0.1:8081}"
DEPLOY_DIR="/home/ec2-user/fire-frontend"
NGINX_CONF="/etc/nginx/conf.d/fire-front.conf"
REPO_URL="https://github.com/FireFighterProject/fire_frontend.git"
CLONE_DIR="/home/ec2-user/fire_frontend"

echo "==> 패키지 업데이트 및 기본 도구 설치"
sudo dnf update -y
sudo dnf install -y git nginx tar

echo "==> Node.js 20 설치 (NodeSource)"
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
node -v
npm -v

echo "==> 배포 디렉터리 생성"
sudo mkdir -p "$DEPLOY_DIR"
sudo chown -R ec2-user:ec2-user "$DEPLOY_DIR"

echo "==> 저장소 클론 (수동 빌드·참고용)"
if [ ! -d "$CLONE_DIR/.git" ]; then
  git clone "$REPO_URL" "$CLONE_DIR"
else
  echo "이미 클론됨: $CLONE_DIR"
fi

echo "==> Nginx 설정 적용"
sudo tee "$NGINX_CONF" > /dev/null <<EOF
server {
    listen 80;
    server_name _;

    root ${DEPLOY_DIR};
    index index.html;

    location /assets/ {
        try_files \$uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        try_files \$uri =404;
    }

    # SPA 라우팅
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # /api/ 접두사 유지 (proxy_pass 끝에 /api/ 필수 — /api 제거 시 403·500 발생)
    location /api/ {
        proxy_pass ${BACKEND_URL}/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Origin "";
    }

    # GPS(Geolocation) 사용 허용
    add_header Permissions-Policy "geolocation=(self)" always;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
EOF

echo "==> GitHub Actions 배포 스크립트"
sudo tee /usr/local/bin/deploy-fire-front > /dev/null <<'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail
DEPLOY_DIR="/home/ec2-user/fire-frontend"
mkdir -p "$DEPLOY_DIR"
rm -rf "${DEPLOY_DIR:?}"/*
tar -xzf /tmp/site.tgz -C "$DEPLOY_DIR"
chown -R ec2-user:ec2-user "$DEPLOY_DIR"
rm -f /tmp/site.tgz
nginx -t
systemctl reload nginx
SCRIPT
sudo chmod +x /usr/local/bin/deploy-fire-front
echo 'ec2-user ALL=(ALL) NOPASSWD: /usr/local/bin/deploy-fire-front' | sudo tee /etc/sudoers.d/fire-front-deploy > /dev/null
sudo chmod 440 /etc/sudoers.d/fire-front-deploy

echo "==> Nginx 시작"
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl start nginx

echo ""
echo "완료!"
echo "  - 배포 경로: $DEPLOY_DIR"
echo "  - Nginx 설정: $NGINX_CONF"
echo "  - 백엔드 프록시: $BACKEND_URL"
echo ""
echo "다음 단계:"
echo "  1) EC2 보안 그룹에서 22, 80(필요 시 443) 인바운드 허용"
echo "  2) GitHub Actions용 SSH 키 생성 후 authorized_keys 등록"
echo "  3) GitHub Secrets 설정 (DOCS/deploy/GITHUB_ACTIONS.md 참고)"

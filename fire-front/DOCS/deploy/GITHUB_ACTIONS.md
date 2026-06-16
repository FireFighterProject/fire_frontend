# EC2 + Nginx + GitHub Actions 배포 가이드

`main` 브랜치에 push하면 GitHub Actions가 `fire-front`를 빌드한 뒤 EC2의 Nginx 정적 경로로 배포합니다.

## 1. EC2 초기 설정 (Amazon Linux 2023)

SSH 접속 후 아래를 실행합니다. **백엔드 API 주소**는 실제 Spring Boot 서버 주소로 바꿉니다.

```bash
# 스크립트 다운로드 (또는 git clone 후 실행)
curl -fsSL https://raw.githubusercontent.com/FireFighterProject/fire_frontend/main/fire-front/DOCS/deploy/ec2-setup.sh -o ec2-setup.sh
bash ec2-setup.sh http://<백엔드_IP>:8081
```

수동으로 진행할 경우:

```bash
sudo dnf update -y
sudo dnf install -y git nginx tar
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

sudo mkdir -p /home/ec2-user/fire-frontend
sudo chown ec2-user:ec2-user /home/ec2-user/fire-frontend

git clone https://github.com/FireFighterProject/fire_frontend.git
```

### 보안 그룹

| 포트 | 용도 |
|------|------|
| 22 | SSH |
| 80 | HTTP (Nginx) |
| 443 | HTTPS (인증서 적용 시) |

## 2. GitHub Actions용 SSH 키

**로컬 PC** 또는 EC2에서 배포 전용 키를 만듭니다.

```bash
ssh-keygen -t ed25519 -C "github-actions-fire-front" -f ~/.ssh/github_actions_fire -N ""
```

- **공개키** (`github_actions_fire.pub`) → EC2의 `~/.ssh/authorized_keys`에 추가
- **개인키** (`github_actions_fire`) 전체 내용 → GitHub Secret `EC2_SSH_KEY`

EC2에서 공개키 등록:

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "공개키_한줄_붙여넣기" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

연결 테스트 (로컬 PC):

```bash
ssh -i ~/.ssh/github_actions_fire ec2-user@<EC2_퍼블릭_IP>
```

## 3. GitHub Secrets 설정

저장소: `FireFighterProject/fire_frontend`  
**Settings → Secrets and variables → Actions → New repository secret**

| Secret 이름 | 값 |
|-------------|-----|
| `EC2_HOST` | EC2 퍼블릭 IP 또는 도메인 |
| `EC2_USER` | `ec2-user` |
| `EC2_SSH_KEY` | 배포용 SSH **개인키** 전체 (`-----BEGIN ... END-----`) |
| `VITE_KAKAOMAP_API_KEY` | 카카오 지도 JavaScript 키 |
| `VITE_TMAP_API_KEY` | Tmap Open API 키 |

## 4. 배포 흐름

1. `main`에 push (또는 Actions 탭에서 **Run workflow**)
2. `npm ci` → `npm run build` (Secrets의 VITE_* 사용)
3. `dist`를 tar로 묶어 EC2 `/tmp/site.tgz` 업로드
4. `/home/ec2-user/fire-frontend`에 압축 해제 후 `nginx reload`

워크플로 파일: [`.github/workflows/deploy.yml`](../../../.github/workflows/deploy.yml)

## 5. 수동 빌드·배포 (EC2에서)

GitHub Actions 없이 EC2에서 직접 빌드할 때:

```bash
cd ~/fire_frontend/fire-front
cp .env.example .env   # 키 입력
npm install
npm run build
sudo rm -rf /home/ec2-user/fire-frontend/*
sudo cp -r dist/* /home/ec2-user/fire-frontend/
sudo nginx -t && sudo systemctl reload nginx
```

## 6. 백엔드 주소 변경

Nginx 설정 `/etc/nginx/conf.d/fire-front.conf`의 `proxy_pass`를 수정한 뒤:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 7. HTTPS (권장)

모바일 GPS(Geolocation)는 HTTPS 환경을 권장합니다. Let's Encrypt 예시:

```bash
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.example.com
```

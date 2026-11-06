# Deploy: frontend di Vercel, backend di VPS

- **Frontend:** Vercel terhubung ke repo GitHub, otomatis deploy setiap push ke `master` (preview untuk PR). Tidak lewat GitHub Actions.
- **Backend:** PR → `ci.yml` (lint, build, test). Merge ke `master` (jika backend berubah) → `deploy.yml`: CI → build image ke GHCR → SSH ke VPS → `docker compose up -d` → smoke test `/health`.

## 0. Vercel (sekali saja)

1. Vercel → Add New Project → pilih repo → **Root Directory: `frontend-timuboard`** (Vite terdeteksi otomatis).
2. Environment Variables: `VITE_API_URL` = `https://api.domainmu.com` (dibakar saat build; ubah lalu redeploy kalau berganti).
3. Settings → Domains: pasang `app.domainmu.com`. **Wajib custom domain satu induk dengan API.** Cookie refresh token memakai `SameSite=Strict`; dengan `xxx.vercel.app` + `api.domainmu.com` login hilang setiap refresh halaman.
4. `vercel.json` sudah memuat rewrite SPA, supaya `/verifikasi?token=...` tidak 404.

## 1. Sekali saja di VPS (Ubuntu)

```bash
curl -fsSL https://get.docker.com | sh
adduser deploy && usermod -aG docker deploy
mkdir -p /opt/timuboard /opt/proxy && chown deploy /opt/timuboard /opt/proxy
docker network create web   # jaringan bersama antara Caddy dan semua aplikasi
# firewall: hanya 22, 80, 443
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable
```

Buat kunci SSH khusus deploy (di laptop), pasang publik-nya di VPS:

```bash
ssh-keygen -t ed25519 -f collab_deploy -N ""
ssh-copy-id -i collab_deploy.pub deploy@IP_VPS
```

Buat `/opt/timuboard/.env` di VPS (JANGAN di-commit). Isi dari `.env.example`, dengan perbedaan:

```
POSTGRES_PASSWORD=<acak panjang>
JWT_ACCESS_SECRET=<openssl rand -hex 32>
FRONTEND_URL=https://app.domainmu.com
MAIL_HOST=<smtp sungguhan>  MAIL_PORT=587  MAIL_USER=...  MAIL_PASSWORD=...  MAIL_FROM=...
```

DNS: A record `api` ke IP VPS (Cloudflare: mode "DNS only" dulu sampai HTTPS terbit). Record `app` mengarah ke Vercel (CNAME, ikuti instruksi di dashboard Vercel).

### Reverse proxy bersama (satu untuk semua aplikasi)

Port 80/443 hanya bisa dipakai satu program, jadi Caddy ada di stack sendiri. Salin folder `proxy/` ke `/opt/proxy`, ganti domain di `Caddyfile`, lalu:

```bash
cd /opt/proxy && docker compose up -d
```

Aplikasi baru: tambah satu blok di `Caddyfile` (domain → `nama-container:port`), sambungkan container-nya ke jaringan `web` dengan `container_name` unik, lalu `docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile`.

**Firewall Tencent Cloud:** buka port 22, 80, 443 juga di konsol (Security Group / Firewall), terpisah dari `ufw`.

## 2. Sekali saja di GitHub (Settings)

- Environments → buat `production` (opsional: Required reviewers = approval sebelum deploy).
- Secrets: `VPS_HOST`, `VPS_USER` (`deploy`), `VPS_SSH_KEY` (isi file `collab_deploy` privat).
- Variables: `API_URL` = `https://api.domainmu.com` (dipakai smoke test deploy).
- Package GHCR dibuat saat deploy pertama; repo private tetap bisa ditarik VPS karena login memakai `GITHUB_TOKEN`.

## 3. Rollback

Di VPS: `IMAGE_REPO=ghcr.io/frdmn12/timuboard IMAGE_TAG=<sha-lama> docker compose -f docker-compose.prod.yml up -d`

## Migrasi database

Production `synchronize` mati; skema berubah lewat migrasi yang jalan otomatis saat server start. Setelah mengubah entity:

```bash
cd backend-timuboard
npm run migration:generate -- src/migrations/NamaPerubahan   # jalankan di DB kosong yang sudah di-`npm run migration:run`, bukan DB dev (dev memakai synchronize)
```

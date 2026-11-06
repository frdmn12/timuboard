# Frontend rules: shadcn/ui + Timuboard design system

Berlaku untuk setiap laman atau komponen baru di `frontend-timuboard`. Produk: lihat `../PRODUCT.md`. Design system: https://claude.ai/artifact/84enFwTGD22zyPueSxszAE (token, komponen, light/dark). Jika dua aturan bentrok, aturan Timuboard menang atas default shadcn.

## 1. Stack

- React 19, TypeScript, Vite, react-router, GSAP (`useGSAP`), `lucide-react` untuk semua ikon.
- UI primitif memakai **shadcn/ui** (Radix + Tailwind + `class-variance-authority` + `cn`). Tambahkan dengan `npx shadcn@latest add <nama>`, jangan menulis ulang komponen yang sudah ada di shadcn (Button, Input, Label, Card, Dialog, Sheet, DropdownMenu, Tabs, Avatar, Badge, Progress, Tooltip, Sonner, Form, Select, Checkbox, Switch).
- Status: Tailwind v4 + shadcn sudah terpasang (`components.json`, alias `@/`), dan Landing, Auth, Dashboard sudah dipecah per komponen. Token Timuboard ada di `src/index.css`; primitif shadcn di `components/ui/` sudah di-restyle (Button pill, Card tanpa border/shadow, Input cloud-card, Badge, Progress berbasis lebar).

## 2. Struktur folder

```
src/
  components/
    ui/            # primitif shadcn, milik kita, sudah di-restyle ke token Timuboard
    common/        # komposit lintas fitur (Logo, ThemeToggle, StatusChip, ProgressRing, Avatar bertinta)
    landing/ auth/ dashboard/   # komponen per fitur, satu komponen per file
  pages/           # tipis: hanya merakit komponen fitur dan memanggil hook
  hooks/           # useTheme, useReveal, dll. (logika, bukan JSX)
  lib/utils.ts     # cn()
  data/            # data contoh, dipisah dari komponen
```

- **Satu komponen per file**, nama file = nama komponen (PascalCase), `export default` atau named export konsisten per folder.
- **Laman di `pages/` tidak boleh memuat markup bagian**: hanya rakitan, ≤ ~80 baris. Bagian laman (Hero, FeatureCards, BoardColumn, TaskCard, ActivityList, dst.) adalah komponen di `components/<fitur>/`.
- Komponen > ~150 baris dipecah. Props memakai `type Props` bernama; tidak ada `any`.
- Tidak ada file CSS per laman. Gaya lewat utilitas Tailwind dan token. CSS global hanya `index.css` (token + `@theme`).
- Data contoh di `data/`, tidak ditulis inline di komponen. Tandai sebagai contoh, jangan sajikan sebagai fakta (lihat PRODUCT.md, bagian Evidence).

## 3. Token Timuboard sebagai variabel shadcn

Definisikan di `index.css` (`:root` untuk light, `[data-theme='dark']` untuk dark) dan petakan lewat `@theme inline`. Komponen hanya memakai nama semantik shadcn, tidak pernah hex.

| shadcn | Token Timuboard |
|---|---|
| `--background` | paper-white |
| `--foreground` | ink |
| `--card`, `--secondary`, `--muted`, `--accent`, `--popover` | cloud-card |
| `--card-foreground`, `--secondary-foreground` | ink |
| `--muted-foreground` | body-gray |
| `--primary` / `--primary-foreground` | charcoal / cloud-card |
| `--border`, `--input` | transparent (tanpa border) |
| `--ring` | metric-blue |
| `--destructive` | coral-signal (teks ink) |

Warna status ditambahkan sebagai token ekstra: `--status-todo` (body-gray), `--status-doing` (metric-blue), `--status-review` (sleep-lilac), `--status-done` (recovery-green), `--status-blocked` (coral-signal), `--pinned` (signal-gold), plus `--sky-top`, `--sky-bottom`. Nilai dark mengikuti `tokens.json` di design system.

## 4. Aturan Timuboard yang menimpa default shadcn

Saat menambah atau memodifikasi komponen di `components/ui/`:

- **Button:** selalu pill (`rounded-full`), padding 8px 16px, teks 16px weight 500. Varian: `default` (charcoal), `secondary` (cloud-card). Tidak ada tombol persegi, tidak ada tombol berwarna status. Satu tombol primer per tampilan. Varian `icon` berbentuk lingkaran 40px.
- **Card:** `bg-card`, radius 24px, padding 32px (24px untuk kartu padat), **tanpa border dan tanpa shadow**. Pemisahan lewat kontras permukaan (paper-white → cloud-card).
- **Input/Select/Textarea:** latar cloud-card, tanpa border, radius 16px, fokus = ring 2px metric-blue. Error = ring coral-signal + pesan teks (jangan hanya warna).
- **Badge / StatusChip:** pill cloud-card dengan titik status 10px. Warna hanya di titik; kata status selalu tertulis.
- **Dialog/Sheet/Popover:** permukaan paper-white atau cloud-card, radius 24px, `shadow-lift` saja bila melayang.
- **Tipografi:** satu keluarga (Inter / sistem). Judul weight 600 dengan tracking -0.03em dan line-height 1.0; badan 400 berwarna `muted-foreground`; nav dan tombol 500. **Jangan pernah di atas 600.** Jangan jadikan teks `muted-foreground` hitam atau tebal. `muted-foreground` di atas cloud-card hanya untuk teks ≥ 24px; di bawah itu pakai foreground.
- **Jarak:** skala 8px; jarak antar-section 80px; padding kartu 32px; gap elemen 16px.
- **Bayangan:** hanya `shadow-lift` (gambar/kartu melayang) dan `shadow-float` (prompt persisten). Tidak ada drop shadow berat.
- **Warna status** hanya sebagai titik, ring, progress fill, dan wash lembut di permukaan pucat. Bukan latar halaman, bukan isi tombol.
- **Ikon:** hanya `lucide-react`, impor bernama (`import { Bell } from 'lucide-react'`). `strokeWidth={1.75}`, ukuran 16 (dalam tombol/chip), 20 (nav/toolbar), 24 (fitur/empty state), warna `currentColor`. Tombol hanya-ikon wajib `aria-label`; ikon dekoratif `aria-hidden="true"`. Tidak ada emoji.
- **Light & dark** wajib sejak awal. Selalu pakai token semantik; dilarang hex atau `dark:` dengan warna literal.

## 5. Aksesibilitas dan interaksi

- Gunakan primitif Radix (lewat shadcn) untuk dialog, menu, tab, tooltip; jangan membuat ulang manajemen fokus.
- Setiap kontrol punya label terhubung (`Label htmlFor` atau `aria-label`), status fokus terlihat, target sentuh ≥ 40px.
- Form: validasi di submit, pesan error di bawah field dengan `aria-describedby` dan `role="alert"`, fokus ke field salah pertama. Untuk form kompleks pakai pola shadcn `Form` (react-hook-form + zod).
- Animasi: GSAP lewat `useGSAP({ scope })`, dibungkus `gsap.matchMedia('(prefers-reduced-motion: no-preference)')`. Logika animasi dipisah ke hook di `hooks/` atau ke komponen pembungkus, bukan dicampur di laman. Konten harus terbaca penuh saat animasi dimatikan.
- Salin (copy) dalam bahasa Indonesia, kalimat pendek, kalimat huruf kecil biasa (sentence case); tombol menyebut aksi ("Buat papan", "Undang tim").

## 5a. Dua bahasa (Indonesia dan Inggris)

- URL menentukan bahasa: `/playground` = Indonesia, `/en/playground` = Inggris. Semua rute adalah anak `/:lang?` di `App.tsx` (path relatif, tanpa `/` di depan).
- **Setiap teks yang terlihat atau dibaca pembaca layar** (JSX, `aria-label`, `placeholder`, pesan galat) ditulis dua bahasa: `const { t } = useI18n()` lalu `t('Masuk', 'Sign in')`. Teks di `data/` berupa pasangan `Txt` (`['…', '…']`) dan ditampilkan dengan `tx()`. Kode non-React (`lib/`) memakai `tt()` dari `@/lib/i18n`.
- **Navigasi** (`Link`, `NavLink`, `Navigate`, `useNavigate`) diimpor dari `@/lib/router`, bukan dari `react-router`, agar prefix `/en` ikut otomatis. `useLocation`, `useParams`, `Outlet` tetap dari `react-router`.
- Tanggal/angka memakai `locale` dari `useI18n()` (atau `locale()` dari `@/lib/i18n`), bukan `'id-ID'` tertulis langsung. Waktu relatif lewat `Intl.RelativeTimeFormat` (lihat `lib/date.ts`).
- Laman publik baru: daftarkan di `public/sitemap.xml` (dua URL + `hreflang`) dan panggil `useSeo({ title: t(…), path })`.

## 6. Alur membuat laman baru

1. Cek `components/ui/` dan `components/common/`; pakai ulang. Belum ada? `npx shadcn@latest add <nama>`, lalu sesuaikan ke aturan bagian 4.
2. Pecah laman menjadi bagian → komponen fitur di `components/<fitur>/`, data di `data/`, logika di `hooks/`.
3. `pages/<Laman>.tsx` hanya merakit; daftarkan rute di `App.tsx`.
4. Periksa light dan dark, lebar HP (~400px), navigasi keyboard, dan `npm run build` (termasuk `tsc -b`).
5. Komponen baru yang dipakai lintas laman ditambahkan juga ke design system (README komponen + preview).

import type { Txt } from '@/lib/i18n'
import { siFigma, siGithub, siGmail, siGooglecalendar, siGoogledrive, siNotion } from 'simple-icons'

// Foto dari Unsplash (lisensi Unsplash). Tanpa `photo`, tile tampil sebagai blok warna.
const u = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=440&h=587&q=80`
export type Story = { name: string; note: Txt; tint: string; photo?: string; alt?: Txt }

export const stories: Story[] = [
  { name: 'Studio Nusa', note: ['Rilis 3 proyek per bulan', 'Ships 3 projects a month'], tint: 'var(--sky-top)', photo: u('1742440711413-da7afb0f4930'), alt: ['Dua desainer berdiskusi di ruang kerja kayu', 'Two designers talking in a wooden studio'] },
  { name: 'Tim Kopi', note: ['Jadwal 6 cabang, satu papan', '6 branch schedules, one board'], tint: '#ebf0f8', photo: u('1604881991405-b273c7a4386a'), alt: ['Dua orang berdiskusi di meja kafe', 'Two people talking at a café table'] },
  { name: 'Ruang Kerja', note: ['Rapat mingguan jadi 15 menit', 'Weekly meetings down to 15 minutes'], tint: 'var(--sky-bottom)', photo: u('1603195827187-459ab02554a0'), alt: ['Tiga orang bekerja di satu laptop', 'Three people working on one laptop'] },
  { name: 'Lab Grafis', note: ['Revisi klien tak lagi hilang', 'Client revisions no longer get lost'], tint: 'var(--sleep-lilac)', photo: u('1581090690925-3898802525e2'), alt: ['Tim meninjau dokumen dan sampel warna', 'A team reviewing documents and color swatches'] },
  { name: 'Warung Data', note: ['Laporan tanpa lembur', 'Reports without overtime'], tint: 'var(--coral-signal)', photo: u('1578450671530-5b6a7c9f32a8'), alt: ['Sticky notes warna-warni', 'Colorful sticky notes'] },
  { name: 'Kebun Kota', note: ['Relawan terkoordinasi', 'Volunteers in sync'], tint: '#c8f0b8', photo: u('1702047094974-a3475a6e37f5'), alt: ['Rekan kerja tersenyum melihat laptop', 'Coworkers smiling at a laptop'] },
]

export const features: { title: Txt; text: Txt; c: string; p: number }[] = [
  { title: ['Progres', 'Progress'], text: ['Lihat sejauh mana setiap papan berjalan, dari tugas pertama sampai rilis.', 'See how far every board has come, from the first task to launch.'], c: 'var(--recovery-green)', p: 82 },
  { title: ['Beban kerja', 'Workload'], text: ['Bagi tugas dengan adil sebelum seseorang kewalahan.', 'Share work fairly before anyone gets overwhelmed.'], c: 'var(--metric-blue)', p: 56 },
  { title: ['Review', 'Review'], text: ['Setiap permintaan tinjauan punya pemilik dan batas waktu.', 'Every review request has an owner and a deadline.'], c: 'var(--sleep-lilac)', p: 34 },
]

export const integrations = [siGooglecalendar, siGoogledrive, siGmail, siGithub, siFigma, siNotion].map((i) => ({ name: i.title, path: i.path }))

export const previewColumns = [
  { name: 'Doing', dot: 'bg-status-doing', tasks: [
    { title: ['Redesain alur onboarding', 'Redesign the onboarding flow'] as Txt, meta: ['Dewi · tenggat Jumat', 'Dewi · due Friday'] as Txt, pct: 60, tone: 'doing' as const },
    { title: ['Catatan sprint planning', 'Sprint planning notes'] as Txt, meta: ['Raka · tenggat Senin', 'Raka · due Monday'] as Txt, pct: 25, tone: 'doing' as const }] },
  { name: 'Review', dot: 'bg-status-review', tasks: [
    { title: ['Salinan halaman harga', 'Pricing page copy'] as Txt, meta: ['Sari · menunggu 2 orang', 'Sari · waiting on 2 people'] as Txt, pct: 90, tone: 'review' as const }] },
  { name: 'Done', dot: 'bg-status-done', tasks: [
    { title: ['Setup notifikasi email', 'Set up email notifications'] as Txt, meta: ['Bima · selesai kemarin', 'Bima · done yesterday'] as Txt, pct: 100, tone: 'done' as const },
    { title: ['Audit aksesibilitas', 'Accessibility audit'] as Txt, meta: ['Dewi · selesai Selasa', 'Dewi · done Tuesday'] as Txt, pct: 100, tone: 'done' as const }] },
]

export const cursors = [
  { name: 'Dewi', bg: 'bg-lilac', fill: 'var(--sleep-lilac)' },
  { name: 'Raka', bg: 'bg-coral', fill: 'var(--coral-signal)' },
  { name: 'Sari', bg: 'bg-sky-top', fill: 'var(--sky-top)' },
]

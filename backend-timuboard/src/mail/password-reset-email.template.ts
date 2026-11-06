import { escape } from './verification-email.template';

export function passwordResetEmail(
  name: string,
  link: string,
  ttlMinutes: number,
) {
  const subject = 'Atur ulang kata sandi Timuboard Anda';
  const text = [
    `Halo ${name},`,
    '',
    'Kami menerima permintaan untuk mengatur ulang kata sandi akun Timuboard Anda.',
    'Buka tautan berikut untuk membuat kata sandi baru:',
    link,
    '',
    `Tautan berlaku ${ttlMinutes} menit dan hanya bisa dipakai sekali. Jika Anda tidak memintanya, abaikan email ini; kata sandi Anda tidak berubah.`,
  ].join('\n');
  const html = `<!doctype html><html lang="id"><body style="margin:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,Inter,'Segoe UI',sans-serif;color:#222326">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ebf0f8;border-radius:24px"><tr><td style="padding:32px">
<p style="margin:0 0 24px;font-size:18px;font-weight:500">Timuboard</p>
<h1 style="margin:0 0 16px;font-size:32px;line-height:1.05;font-weight:600;letter-spacing:-0.03em">Atur ulang kata sandi, ${escape(name)}.</h1>
<p style="margin:0 0 24px;font-size:16px;line-height:1.5;color:#747679">Kami menerima permintaan untuk mengatur ulang kata sandi akun Anda. Klik tombol di bawah untuk membuat kata sandi baru.</p>
<p style="margin:0 0 24px"><a href="${escape(link)}" style="display:inline-block;background:#1f2025;color:#ebf0f8;text-decoration:none;font-size:16px;font-weight:500;padding:12px 24px;border-radius:128px">Atur ulang kata sandi</a></p>
<p style="margin:0;font-size:13px;line-height:1.5;color:#747679">Tautan berlaku ${ttlMinutes} menit dan hanya bisa dipakai sekali. Jika tombol tidak berfungsi, salin tautan ini ke browser:<br><span style="word-break:break-all">${escape(link)}</span></p>
<p style="margin:16px 0 0;font-size:13px;color:#747679">Jika Anda tidak memintanya, abaikan email ini. Kata sandi Anda tidak berubah.</p>
</td></tr></table></td></tr></table></body></html>`;
  return { subject, text, html };
}

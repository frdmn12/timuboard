export const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );

export function verificationEmail(
  name: string,
  link: string,
  ttlHours: number,
) {
  const subject = 'Verifikasi email Anda di Timuboard';
  const text = [
    `Halo ${name},`,
    '',
    'Terima kasih telah mendaftar di Timuboard. Akun Anda sudah dibuat, tetapi belum aktif.',
    'Verifikasi email Anda untuk mulai memakai Timuboard:',
    link,
    '',
    `Tautan berlaku ${ttlHours} jam. Jika Anda tidak merasa mendaftar, abaikan email ini.`,
  ].join('\n');
  const html = `<!doctype html><html lang="id"><body style="margin:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,Inter,'Segoe UI',sans-serif;color:#222326">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ebf0f8;border-radius:24px"><tr><td style="padding:32px">
<p style="margin:0 0 24px;font-size:18px;font-weight:500">Timuboard</p>
<h1 style="margin:0 0 16px;font-size:32px;line-height:1.05;font-weight:600;letter-spacing:-0.03em">Satu langkah lagi, ${escape(name)}.</h1>
<p style="margin:0 0 24px;font-size:16px;line-height:1.5;color:#747679">Terima kasih telah mendaftar di Timuboard. Akun Anda sudah dibuat, tetapi belum aktif. Verifikasi email Anda untuk mulai memakainya.</p>
<p style="margin:0 0 24px"><a href="${escape(link)}" style="display:inline-block;background:#1f2025;color:#ebf0f8;text-decoration:none;font-size:16px;font-weight:500;padding:12px 24px;border-radius:128px">Verifikasi email</a></p>
<p style="margin:0;font-size:13px;line-height:1.5;color:#747679">Tautan berlaku ${ttlHours} jam. Jika tombol tidak berfungsi, salin tautan ini ke browser:<br><span style="word-break:break-all">${escape(link)}</span></p>
<p style="margin:16px 0 0;font-size:13px;color:#747679">Jika Anda tidak merasa mendaftar, abaikan email ini.</p>
</td></tr></table></td></tr></table></body></html>`;
  return { subject, text, html };
}

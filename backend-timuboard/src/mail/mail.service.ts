import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import { passwordResetEmail } from './password-reset-email.template';
import { verificationEmail } from './verification-email.template';

type Recipient = { name: string; email: string };

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;

  constructor(private readonly config: ConfigService) {
    const user = config.get<string>('MAIL_USER');
    this.transporter = createTransport({
      host: config.getOrThrow<string>('MAIL_HOST'),
      port: config.getOrThrow<number>('MAIL_PORT'),
      secure: config.getOrThrow<number>('MAIL_PORT') === 465,
      auth: user
        ? { user, pass: config.get<string>('MAIL_PASSWORD') }
        : undefined,
    });
  }

  private frontendLink(path: string, token: string) {
    const base = this.config.getOrThrow<string>('FRONTEND_URL');
    return `${base}${path}?token=${encodeURIComponent(token)}`;
  }

  /** Email selamat datang + permintaan verifikasi. Gagal kirim dicatat, tidak membatalkan pendaftaran. */
  sendVerification(to: Recipient, token: string): Promise<boolean> {
    const mail = verificationEmail(
      to.name,
      this.frontendLink('/verifikasi', token),
      this.config.getOrThrow<number>('EMAIL_VERIFICATION_TTL_HOURS'),
    );
    return this.send(to, mail, 'verifikasi');
  }

  sendPasswordReset(to: Recipient, token: string): Promise<boolean> {
    const mail = passwordResetEmail(
      to.name,
      this.frontendLink('/atur-ulang-kata-sandi', token),
      this.config.getOrThrow<number>('PASSWORD_RESET_TTL_MINUTES'),
    );
    return this.send(to, mail, 'atur ulang kata sandi');
  }

  private async send(
    to: Recipient,
    mail: { subject: string; text: string; html: string },
    kind: string,
  ): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: this.config.getOrThrow<string>('MAIL_FROM'),
        replyTo: this.config.get<string>('MAIL_REPLY_TO'),
        to: to.email,
        ...mail,
      });
      return true;
    } catch (err) {
      this.logger.error(
        `Gagal mengirim email ${kind} ke ${to.email}`,
        err instanceof Error ? err.stack : err,
      );
      return false;
    }
  }
}

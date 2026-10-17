import nodemailer, { type Transporter } from 'nodemailer';
import type { AppConfig } from '../config/env.js';

export class EmailService {
  private readonly transporter?: Transporter;

  constructor(private readonly config: AppConfig) {
    if (config.smtpHost) {
      this.transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpSecure,
        auth: config.smtpUser ? { user: config.smtpUser, pass: config.smtpPassword } : undefined,
      });
    }
  }

  async sendVerificationCode(email: string, code: string, expiresAt: Date): Promise<void> {
    const expiresInMinutes = Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 60_000));
    const text = `Your LinkForge verification code is ${code}. It expires in ${expiresInMinutes} minutes.`;
    const html = `<p>Use this LinkForge verification code:</p><p style="font-size:28px;font-weight:700;letter-spacing:8px">${code}</p><p>This code expires in ${expiresInMinutes} minutes.</p>`;

    if (!this.transporter) {
      console.info(JSON.stringify({ level: 'info', event: 'verification_email', email, code, expires_at: expiresAt.toISOString() }));
      return;
    }

    await this.transporter.sendMail({
      from: this.config.emailFrom,
      to: email,
      subject: 'Your LinkForge verification code',
      text,
      html,
    });
  }

  async sendPasswordReset(email: string, token: string, expiresAt: Date): Promise<void> {
    const resetUrl = new URL('/reset-password', this.config.appUrl);
    resetUrl.searchParams.set('token', token);
    const expiresInMinutes = Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 60_000));
    const text = `Reset your LinkForge password using this link: ${resetUrl.toString()}\nThe link expires in ${expiresInMinutes} minutes.`;
    const html = `<p>Reset your LinkForge password:</p><p><a href="${resetUrl.toString()}">Choose a new password</a></p><p>This link expires in ${expiresInMinutes} minutes.</p>`;

    if (!this.transporter) {
      console.info(
        JSON.stringify({
          level: 'info',
          event: 'password_reset_email',
          email,
          reset_url: resetUrl.toString(),
          expires_at: expiresAt.toISOString(),
        }),
      );
      return;
    }

    await this.transporter.sendMail({
      from: this.config.emailFrom,
      to: email,
      subject: 'Reset your LinkForge password',
      text,
      html,
    });
  }

  async sendWorkspaceInvitation(email: string, workspaceName: string, role: string, token: string, expiresAt: Date): Promise<void> {
    const invitationUrl = new URL('/accept-invitation', this.config.appUrl);
    invitationUrl.searchParams.set('token', token);
    const expiresInDays = Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000));
    const text = `You have been invited to join ${workspaceName} on LinkForge as ${role}. Accept the invitation here: ${invitationUrl.toString()} This invitation expires in ${expiresInDays} days.`;
    const html = `<p>You have been invited to join <strong>${workspaceName}</strong> on LinkForge as <strong>${role}</strong>.</p><p><a href="${invitationUrl.toString()}">Accept workspace invitation</a></p><p>This invitation expires in ${expiresInDays} days.</p>`;

    if (!this.transporter) {
      console.info(
        JSON.stringify({
          level: 'info',
          event: 'workspace_invitation_email',
          email,
          workspace: workspaceName,
          role,
          invitation_url: invitationUrl.toString(),
          expires_at: expiresAt.toISOString(),
        }),
      );
      return;
    }

    await this.transporter.sendMail({
      from: this.config.emailFrom,
      to: email,
      subject: `You have been invited to ${workspaceName} on LinkForge`,
      text,
      html,
    });
  }
}

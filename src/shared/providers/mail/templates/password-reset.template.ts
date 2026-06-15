export const passwordResetTemplate = (resetUrl: string): string => `
  <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 32px;">
    <h2 style="color: #111827;">Password Reset Request</h2>
    <p style="color: #374151;">
      Click the button below to reset your password.
      This link expires in <strong>1 hour</strong>.
    </p>
    <a href="${resetUrl}" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #4F46E5; color: #ffffff; border-radius: 6px; text-decoration: none; font-weight: 600;">Reset Password</a>
    <p style="margin-top: 32px; color: #6b7280; font-size: 13px;">
      If you did not request this, you can safely ignore this email.
    </p>
  </div>
`;
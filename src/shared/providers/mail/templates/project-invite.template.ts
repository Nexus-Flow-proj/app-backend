export function projectInviteTemplate(
  projectName: string,
  inviterName: string,
  inviteLink: string, // 💡 Accept full link instead of token string
  expiresAtIso: string,
): string {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937; line-height: 1.5;">
    <h2 style="margin-bottom: 8px; color: #111827;">You are invited to join a project</h2>
    <p style="margin-top: 0;">${inviterName} invited you to collaborate on <strong>${projectName}</strong>.</p>
    
    <div style="margin: 24px 0;">
      <a href="${inviteLink}" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
        Join Project
      </a>
    </div>

    <p style="font-size: 14px; color: #4b5563;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${inviteLink}" style="color: #2563eb; word-break: break-all;">${inviteLink}</a>
    </p>
    
    <p style="margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 13px; color: #6b7280;">
      This invitation link expires at: <strong>${expiresAtIso}</strong>
    </p>
    <p style="color: #9ca3af; font-size: 12px;">If you were not expecting this email, you can safely ignore it.</p>
  </div>
  `;
}

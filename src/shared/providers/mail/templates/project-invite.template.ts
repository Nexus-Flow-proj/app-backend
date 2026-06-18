export function projectInviteTemplate(
  projectName: string,
  inviterName: string,
  inviteToken: string,
  expiresAtIso: string,
): string {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
    <h2 style="margin-bottom: 8px;">You are invited to join a project</h2>
    <p style="margin-top: 0;">${inviterName} invited you to collaborate on <strong>${projectName}</strong>.</p>
    <p>Use this invite token in the app to accept or decline:</p>
    <div style="background: #f3f4f6; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 14px; word-break: break-all;">
      ${inviteToken}
    </div>
    <p style="margin-top: 16px;">This invite expires at: <strong>${expiresAtIso}</strong></p>
    <p style="color: #6b7280; font-size: 12px;">If you were not expecting this email, you can ignore it.</p>
  </div>
  `;
}

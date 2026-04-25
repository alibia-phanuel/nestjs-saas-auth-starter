export const organizationInvitationTemplate = (
  orgName: string,
  token: string,
  expiresAt: Date,
): string => {
  const baseUrl = process.env.APP_URL ?? 'http://localhost:3000';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>🏢 Invitation à rejoindre ${orgName}</h2>
      <p>Vous avez été invité à rejoindre l'organisation <strong>${orgName}</strong>.</p>
      <p>Cliquez sur le lien ci-dessous pour accepter l'invitation :</p>

      <a href="${baseUrl}/organizations/accept/${token}"
         style="background:#e0234e;color:white;padding:12px 24px;
                border-radius:8px;text-decoration:none;display:inline-block;">
        Accepter l'invitation
      </a>

      <p style="color:#888;font-size:12px;margin-top:20px;">
        Cette invitation expire le ${expiresAt.toLocaleDateString('fr-FR')}.
      </p>
    </div>
  `;
};

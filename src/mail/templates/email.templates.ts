// Templates HTML centralisés
// Même approche que ton projet Express — un seul endroit pour modifier le design

const COLORS = {
  primary: '#e0234e',
  primaryDark: '#b01a3a',
  secondary: '#ff6b9d',
  background: '#ffffff',
  surface: '#f7f7f7',
  textPrimary: '#121212',
  textSecondary: '#555555',
  border: '#e5e5e5',
  accentRed: '#c62828',
  accentGreen: '#2e7d32',
};

// ── Layout de base ────────────────────────────────────
// Même pattern que ton baseLayout Express

const baseLayout = (content: string): string => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>nestjs-saas-starter</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.surface};font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.surface};padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
          style="background:${COLORS.background};border-radius:16px;overflow:hidden;
                 border:1px solid ${COLORS.border};max-width:600px;">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,${COLORS.primary} 0%,${COLORS.secondary} 100%);
                       padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:1px;">
                🚀 nestjs-saas-starter
              </h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">
                Enterprise-grade SaaS Starter Kit
              </p>
            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:${COLORS.surface};padding:24px 40px;
                       text-align:center;border-top:1px solid ${COLORS.border};">
              <p style="margin:0;color:${COLORS.textSecondary};font-size:12px;">
                © ${new Date().getFullYear()} nestjs-saas-starter · MIT License
              </p>
              <p style="margin:6px 0 0;color:${COLORS.textSecondary};font-size:12px;">
                Des questions ?
                <a href="mailto:phanuel.alibia@gmail.com"
                   style="color:${COLORS.primary};text-decoration:none;">
                  phanuel.alibia@gmail.com
                </a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ── Welcome Email ─────────────────────────────────────

export const welcomeEmailTemplate = (name: string): string =>
  baseLayout(`
    <h2 style="margin:0 0 16px;color:${COLORS.textPrimary};font-size:22px;">
      Bienvenue, ${name} 👋
    </h2>
    <p style="margin:0 0 20px;color:${COLORS.textSecondary};font-size:15px;line-height:1.7;">
      Votre compte <strong>nestjs-saas-starter</strong> a été créé avec succès.
      Un code de vérification vous a été envoyé séparément.
    </p>
    <p style="margin:0 0 28px;color:${COLORS.textSecondary};font-size:15px;line-height:1.7;">
      Vérifiez votre email pour activer votre compte. 🔐
    </p>
    <p style="margin:24px 0 0;color:${COLORS.textSecondary};font-size:13px;text-align:center;">
      Vous n'avez pas créé ce compte ?
      <a href="mailto:phanuel.alibia@gmail.com"
         style="color:${COLORS.accentRed};">Contactez-nous</a>
    </p>
  `);

// ── Verify OTP Email ──────────────────────────────────

export const verifyOtpEmailTemplate = (name: string, otp: string): string =>
  baseLayout(`
    <h2 style="margin:0 0 16px;color:${COLORS.textPrimary};font-size:22px;">
      Vérifiez votre adresse email 🔐
    </h2>
    <p style="margin:0 0 20px;color:${COLORS.textSecondary};font-size:15px;line-height:1.7;">
      Bonjour <strong>${name}</strong>, utilisez le code ci-dessous
      pour vérifier votre compte.
    </p>

    <!-- OTP BOX -->
    <div style="background:${COLORS.surface};
                border:2px dashed ${COLORS.primary};
                border-radius:12px;
                padding:28px;
                text-align:center;
                margin:24px 0;">
      <p style="margin:0 0 8px;color:${COLORS.textSecondary};
                font-size:13px;text-transform:uppercase;letter-spacing:2px;">
        Votre code de vérification
      </p>
      <span style="font-size:42px;font-weight:900;
                   color:${COLORS.primaryDark};letter-spacing:10px;">
        ${otp}
      </span>
    </div>

    <p style="margin:0;color:${COLORS.textSecondary};font-size:13px;text-align:center;">
      ⏳ Ce code expire dans <strong>15 minutes</strong>.
      Ne le partagez jamais.
    </p>
  `);

// ── Reset Password OTP Email ──────────────────────────

export const resetOtpEmailTemplate = (name: string, otp: string): string =>
  baseLayout(`
    <h2 style="margin:0 0 16px;color:${COLORS.textPrimary};font-size:22px;">
      Réinitialisation du mot de passe 🔑
    </h2>
    <p style="margin:0 0 20px;color:${COLORS.textSecondary};font-size:15px;line-height:1.7;">
      Bonjour <strong>${name}</strong>, voici votre code de réinitialisation :
    </p>

    <!-- OTP BOX -->
    <div style="background:${COLORS.surface};
                border:2px dashed ${COLORS.accentRed};
                border-radius:12px;
                padding:28px;
                text-align:center;
                margin:24px 0;">
      <p style="margin:0 0 8px;color:${COLORS.textSecondary};
                font-size:13px;text-transform:uppercase;letter-spacing:2px;">
        Code de réinitialisation
      </p>
      <span style="font-size:42px;font-weight:900;
                   color:${COLORS.accentRed};letter-spacing:10px;">
        ${otp}
      </span>
    </div>

    <p style="margin:0 0 12px;color:${COLORS.textSecondary};font-size:13px;text-align:center;">
      ⏳ Ce code expire dans <strong>15 minutes</strong>.
    </p>
    <p style="margin:0;color:${COLORS.textSecondary};font-size:13px;text-align:center;">
      Vous n'avez pas fait cette demande ?
      <a href="mailto:phanuel.alibia@gmail.com"
         style="color:${COLORS.accentRed};">Signalez-le immédiatement</a>
    </p>
  `);

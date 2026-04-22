/**
 * ============================================================
 * TYPES — Mail Events & Options
 * ============================================================
 *
 * Ce fichier centralise tous les types liés au module Mail :
 * les payloads des événements reçus par le MailService et
 * les options d'envoi passées au transporter SMTP.
 *
 * 📋 Interfaces exposées :
 *    - UserCreatedEvent      → payload de « user.created »
 *    - OAuthUserCreatedEvent → payload de « user.oauth.created »
 *    - PasswordResetEvent    → payload de « password.reset »
 *    - SendMailOptions       → options d'un envoi SMTP
 *
 * 💡 Pourquoi des interfaces d'événements séparées ?
 *    Chaque événement a un contrat de données différent.
 *    Les typer séparément force l'émetteur à fournir exactement
 *    ce dont le handler a besoin, sans champs superflus.
 * ============================================================
 */

// ══════════════════════════════════════════════════════════
// 📮 ÉVÉNEMENTS — Payloads reçus par le MailService
// ══════════════════════════════════════════════════════════

/**
 * UserCreatedEvent
 *
 * Payload de l'événement « user.created », émis lors d'une
 * inscription classique (email + mot de passe).
 *
 * 💡 Contient un OTP car l'email n'est pas encore vérifié :
 *    le MailService doit envoyer un code de vérification
 *    en plus de l'email de bienvenue.
 *
 * 💡 firstName est optionnel → le service doit prévoir
 *    une valeur de secours (ex: 'Utilisateur') pour ne pas
 *    crasher si le champ est absent.
 */
export interface UserCreatedEvent {
  email: string;
  firstName?: string;
  otp: string; // code de vérification d'email à envoyer
}

/**
 * OAuthUserCreatedEvent
 *
 * Payload de l'événement « user.oauth.created », émis lors
 * d'une première connexion via un fournisseur OAuth (Google…).
 *
 * 💡 Pas d'OTP ici : l'email OAuth est déjà vérifié par le
 *    fournisseur. On envoie uniquement un email de bienvenue.
 *    C'est la différence structurelle clé avec UserCreatedEvent.
 */
export interface OAuthUserCreatedEvent {
  email: string;
  firstName?: string;
  // pas d'otp → Google garantit la validité de l'email
}

/**
 * PasswordResetEvent
 *
 * Payload de l'événement « password.reset », émis lorsqu'un
 * utilisateur demande la réinitialisation de son mot de passe.
 *
 * 💡 Contient un OTP car la réinitialisation nécessite de
 *    confirmer l'identité de l'utilisateur avant tout changement.
 */
export interface PasswordResetEvent {
  email: string;
  firstName?: string;
  otp: string; // code de réinitialisation à usage unique
}

// ══════════════════════════════════════════════════════════
// 📤 OPTIONS — Configuration d'un envoi SMTP
// ══════════════════════════════════════════════════════════

/**
 * SendMailOptions
 *
 * Options minimales passées à transporter.sendMail()
 * pour chaque envoi d'email.
 *
 * 💡 Seul le format HTML est supporté ici (pas de text brut)
 *    car les templates sont tous en HTML.
 *    L'expéditeur (from) n'est pas inclus : il est défini
 *    une seule fois dans la configuration du transporter.
 */
export interface SendMailOptions {
  to: string; // adresse du destinataire
  subject: string; // objet de l'email (supporte les emojis)
  html: string; // corps du message en HTML
}

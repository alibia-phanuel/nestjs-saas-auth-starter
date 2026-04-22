/**
 * ============================================================
 * TRANSPORTER — mail.transporter (Configuration SMTP Nodemailer)
 * ============================================================
 *
 * Ce fichier expose une factory function qui crée et retourne
 * une instance de transporter SMTP Nodemailer configurée
 * depuis les variables d'environnement.
 *
 * 💡 Pourquoi une factory function plutôt qu'une instance directe ?
 *    Exporter une fonction permet de la mocker facilement dans
 *    les tests (jest.spyOn) sans avoir à instancier un vrai
 *    transporter SMTP. Une instance exportée directement serait
 *    évaluée au chargement du module, avant que le mock ne soit posé.
 *
 * 🔧 Variables d'environnement attendues :
 *    - SMTP_HOST   → serveur SMTP        (défaut: smtp.gmail.com)
 *    - SMTP_PORT   → port SMTP           (défaut: 587)
 *    - SMTP_SECURE → TLS activé (bool)   (défaut: false)
 *    - SMTP_USER   → adresse expéditrice (défaut: '')
 *    - SMTP_PASS   → mot de passe SMTP   (défaut: '')
 *
 * 💡 Port 587 + secure: false → STARTTLS (chiffrement négocié)
 *    Port 465 + secure: true  → TLS direct (chiffrement immédiat)
 *    Les deux sont sécurisés ; 587 est le standard moderne.
 * ============================================================
 */

import { createTransport, Transporter } from 'nodemailer';
import type { SentMessageInfo } from 'nodemailer/lib/smtp-transport';

/**
 * createTransporter()
 *
 * Factory function qui instancie un transporter SMTP Nodemailer
 * prêt à l'emploi, configuré depuis les variables d'environnement.
 *
 * 💡 Toutes les valeurs ont des défauts ?? pour éviter de passer
 *    undefined à Nodemailer, qui pourrait silencieusement ignorer
 *    des champs manquants et échouer à l'envoi sans erreur claire.
 *
 * 💡 parseInt(..., 10) → la base 10 est explicite pour éviter
 *    tout comportement inattendu si SMTP_PORT commence par '0'.
 *
 * 💡 SMTP_SECURE === 'true' → les variables d'environnement sont
 *    toujours des strings. La comparaison stricte convertit
 *    explicitement en booléen sans risque de falsy implicite.
 *
 * @returns → Transporter<SentMessageInfo> prêt à appeler sendMail()
 */
export const createTransporter = (): Transporter<SentMessageInfo> => {
  return createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com', // serveur SMTP cible
    port: parseInt(process.env.SMTP_PORT ?? '587', 10), // port SMTP (base 10 explicite)
    secure: process.env.SMTP_SECURE === 'true', // true = TLS direct, false = STARTTLS
    auth: {
      user: process.env.SMTP_USER ?? '', // adresse d'envoi
      pass: process.env.SMTP_PASS ?? '', // mot de passe ou App Password Google
    },
  }) as Transporter<SentMessageInfo>;
};

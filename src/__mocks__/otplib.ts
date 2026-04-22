/**
 * ============================================================
 * MOCK — otplib (bibliothèque de double authentification)
 * ============================================================
 *
 * Ce fichier remplace la vraie bibliothèque `otplib` dans les tests.
 *
 * 💡 C'est quoi otplib ?
 *    otplib est la bibliothèque qui génère et vérifie les codes
 *    TOTP (Time-based One-Time Password) — les codes à 6 chiffres
 *    qui changent toutes les 30 secondes dans Google Authenticator.
 *
 * ⚠️ Pourquoi ce mock existe-t-il ?
 *    otplib utilise en interne des modules ESM (@noble/hashes,
 *    @scure) qui ne sont pas compatibles avec l'environnement
 *    de test de Jest (qui utilise CommonJS par défaut).
 *    Ce mock contourne ce problème en remplaçant entièrement
 *    otplib par de fausses fonctions contrôlables.
 *
 * 📁 Emplacement attendu :
 *    Ce fichier doit être placé dans un dossier __mocks__
 *    à côté de node_modules, ou configuré dans Jest via
 *    moduleNameMapper pour intercepter l'import d'otplib.
 *
 * 🔧 Les 3 fonctions mockées :
 *    - generateSecret() → génère la clé secrète partagée
 *    - keyuri()         → génère l'URL pour le QR code
 *    - verify()         → vérifie qu'un code TOTP est valide
 * ============================================================
 */

export const authenticator = {
  /**
   * generateSecret()
   *
   * En production : génère une clé secrète aléatoire en Base32
   * (ex: 'JBSWY3DPEHPK3PXP') à partager entre le serveur
   * et l'application Google Authenticator.
   *
   * En test : retourne toujours 'MOCK_SECRET_BASE32' pour
   * avoir une valeur prévisible et stable dans les assertions.
   */
  generateSecret: jest.fn(() => 'MOCK_SECRET_BASE32'),

  /**
   * keyuri()
   *
   * En production : génère l'URL otpauth:// qui sera encodée
   * dans un QR code. L'utilisateur scanne ce QR code avec
   * Google Authenticator pour lier son compte.
   *
   * Format : otpauth://totp/NomService:email?secret=CLE&issuer=NomService
   *
   * En test : retourne une URL factice mais cohérente,
   * construite à partir des paramètres reçus, pour pouvoir
   * vérifier que la fonction est appelée avec les bons arguments.
   *
   * @param email   - L'email de l'utilisateur
   * @param service - Le nom de l'application (ex: 'nestjs-saas-starter')
   * @param secret  - La clé secrète générée par generateSecret()
   */
  keyuri: jest.fn(
    (email: string, service: string, secret: string) =>
      `otpauth://totp/${service}:${email}?secret=${secret}`,
  ),

  /**
   * verify()
   *
   * En production : vérifie que le code à 6 chiffres saisi
   * par l'utilisateur correspond au code attendu pour cette
   * seconde (basé sur le secret + l'heure actuelle).
   *
   * En test : retourne toujours true par défaut.
   * Chaque test peut surcharger ce comportement :
   *
   * Exemple pour simuler un code invalide :
   * (authenticator.verify as jest.Mock).mockReturnValue(false);
   */
  verify: jest.fn(() => true),
};

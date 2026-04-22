/**
 * ============================================================
 * MOCK — qrcode (bibliothèque de génération de QR codes)
 * ============================================================
 *
 * Ce fichier remplace la vraie bibliothèque `qrcode` dans les tests.
 *
 * 💡 C'est quoi qrcode ?
 *    qrcode est la bibliothèque qui génère des images QR code
 *    à partir d'une URL. Dans ce projet, elle est utilisée pour
 *    convertir l'URL otpauth:// en image QR code que l'utilisateur
 *    peut scanner avec Google Authenticator.
 *
 *    Flux complet en production :
 *    ────────────────────────────────────────────────────────
 *    1. otplib.keyuri()  → génère l'URL otpauth://
 *    2. qrcode.toDataURL() → convertit l'URL en image QR code
 *    3. L'image est retournée au frontend en base64
 *    4. L'utilisateur scanne le QR code avec son téléphone
 *    ────────────────────────────────────────────────────────
 *
 * ⚠️ Pourquoi ce mock existe-t-il ?
 *    Dans les tests, on ne veut pas générer de vraies images.
 *    C'est une opération lente et inutile pour vérifier
 *    la logique métier. On retourne donc une fausse image
 *    base64 fixe pour que les tests restent rapides et stables.
 *
 * 🔧 Fonction mockée :
 *    - toDataURL() → convertit une URL en image QR code base64
 * ============================================================
 */

/**
 * toDataURL()
 *
 * En production : génère une vraie image QR code au format
 * base64 (data:image/png;base64,...) à partir de l'URL otpauth://.
 * Cette image est affichée à l'utilisateur pour qu'il la scanne.
 *
 * En test : retourne toujours une fausse image base64 fixe
 * ('MOCK_QR_CODE') pour éviter la génération réelle d'images.
 * Cela permet de vérifier que toDataURL() est bien appelée
 * sans dépendre du résultat réel.
 *
 * Exemple d'assertion possible dans un test :
 * ─────────────────────────────────────────────────────────
 * expect(toDataURL).toHaveBeenCalledWith('otpauth://totp/...');
 * expect(result.qrCode).toBe('data:image/png;base64,MOCK_QR_CODE');
 * ─────────────────────────────────────────────────────────
 */
export const toDataURL = jest.fn(
  (): Promise<string> => Promise.resolve('data:image/png;base64,MOCK_QR_CODE'),
);

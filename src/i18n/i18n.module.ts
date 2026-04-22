/**
 * ============================================================
 * MODULE — I18nModule (Internationalisation)
 * ============================================================
 *
 * Ce module fournit le service d'internationalisation (I18nService)
 * utilisé dans toute l'application pour générer des messages
 * traduits et standardisés.
 *
 * 💡 C'est quoi l'internationalisation (i18n) ?
 *    L'i18n permet de gérer plusieurs langues dans une application.
 *    Au lieu de coder des messages en dur, on utilise des clés
 *    (ex: "auth.login_success") qui sont ensuite traduites
 *    dynamiquement selon la langue de l'utilisateur.
 *
 * 🎯 Rôle du I18nService :
 *    - Centraliser tous les messages de l'application
 *    - Fournir des réponses cohérentes (clé + message)
 *    - Faciliter la traduction multi-langues
 *    - Éviter les chaînes de caractères en dur dans le code
 *
 * 📦 Pourquoi un module dédié ?
 *    - Séparer la logique de traduction du reste de l'application
 *    - Faciliter la maintenance (ajout/modification de langues)
 *    - Permettre une réutilisation propre dans tous les services
 *
 * 🌍 Pourquoi utiliser @Global() ?
 *    - Permet d'injecter I18nService partout dans l'application
 *      sans devoir importer I18nModule dans chaque module
 *
 * 💡 Exemple d'utilisation dans un service :
 *
 *    const response = this.i18n.createResponse('auth.login_success');
 *
 *    return {
 *      key: response.key,
 *      message: response.message
 *    };
 *
 * 🔁 Export :
 *    - I18nService est exporté pour être accessible globalement
 *
 * ⚠️ Bonnes pratiques :
 *    - Utiliser @Global() uniquement pour les services "core"
 *      (i18n, config, logger, etc.)
 *    - Éviter d'en abuser pour conserver une architecture modulaire
 *
 * ============================================================
 */

import { Global, Module } from '@nestjs/common';
import { I18nService } from './i18n.service';

/**
 * @Global()
 *
 * Rend ce module global dans toute l'application NestJS.
 *
 * 🔥 Effet :
 *    - I18nService devient injectable dans tous les modules
 *      sans avoir besoin d'importer I18nModule
 *
 * ⚠️ Attention :
 *    - Les modules globaux doivent rester rares
 *    - Réservé aux services transverses (cross-cutting concerns)
 */
@Global()
@Module({
  /**
   * providers
   *
   * Liste des services instanciés par NestJS dans ce module.
   *
   * Ici :
   *    - I18nService → logique de traduction et génération de messages
   */
  providers: [I18nService],

  /**
   * exports
   *
   * Permet de rendre les providers accessibles aux autres modules.
   *
   * 💡 Sans export :
   *    I18nService ne serait utilisable que dans ce module.
   *
   * 💡 Avec export :
   *    I18nService devient accessible globalement (grâce à @Global)
   */
  exports: [I18nService],
})
export class I18nModule {}

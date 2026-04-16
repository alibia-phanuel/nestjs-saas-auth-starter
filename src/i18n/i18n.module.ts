import { Global, Module } from '@nestjs/common';
import { I18nService } from './i18n.service';

// @Global() → I18nService injectable partout sans réimporter le module
@Global()
@Module({
  providers: [I18nService],
  exports: [I18nService],
})
export class I18nModule {}

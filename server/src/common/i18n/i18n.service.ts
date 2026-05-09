import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class I18nService implements OnModuleInit {
  private translations: Record<string, any> = {};
  private readonly defaultLang = 'en';

  onModuleInit() {
    this.loadTranslations();
  }

  private loadTranslations() {
    // Try both src and dist paths
    const possiblePaths = [
      path.join(process.cwd(), 'src/common/i18n/locales'),
      path.join(__dirname, 'locales'),
    ];

    for (const localesPath of possiblePaths) {
      if (fs.existsSync(localesPath)) {
        const files = fs.readdirSync(localesPath);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const lang = file.replace('.json', '');
            const content = fs.readFileSync(path.join(localesPath, file), 'utf8');
            this.translations[lang] = JSON.parse(content);
          }
        }
        break;
      }
    }
  }

  t(key: string, lang: string = this.defaultLang): string {
    const targetLang = lang?.split(',')[0].split('-')[0].toLowerCase() || this.defaultLang;
    const locale = this.translations[targetLang] || this.translations[this.defaultLang] || {};
    const keys = key.split('.');
    let result = locale;

    for (const k of keys) {
      result = result?.[k];
      if (!result) break;
    }

    return typeof result === 'string' ? result : key;
  }
}

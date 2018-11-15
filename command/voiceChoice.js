/*
 * voiceChoice.js
 *
 * Determine which voice to use in concert with language and provider
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const logger = require('../logger');

const voiceChoice = {
  findVoice: function(lang, locale) {
    logger.debug(`Choosing voice for lang: ${lang} and locale: ${locale}`);
    let main = '';
    let meta = '';
    let localeSynthesis = '';
    switch (lang) {
      case 'en':
        if (locale && locale == 'en-GB') {
          main = 'Emma';
          meta = 'Brian';
          localeSynthesis = 'GB';
        } else {
          main = 'Salli';
          meta = 'Matthew';
          localeSynthesis = 'US';
        }
        break;
      case 'da':
        main = 'Naja';
        meta = 'Mads';
        break;
      case 'nl':
        main = 'Lotte';
        meta = 'Ruben';
        break;
      case 'fr':
        if (locale && locale == 'fr-CA') {
          main = 'Chantal';
          meta = 'Chantal';
          localeSynthesis = 'CA';
        } else {
          main = 'Celine';
          meta = 'Mathieu';
          localeSynthesis = 'FR';
        }
        break;
      case 'de':
        main = 'Hans';
        meta = 'Vicki';
        break;
      case 'is':
        main = 'Dora';
        meta = 'Karl';
        break;
      case 'it':
        main = 'Giorgio';
        meta = 'Carla';
        break;
      case 'ja':
        main = 'Takumi';
        meta = 'Mizuki';
        break;
      case 'ko':
        main = 'Seoyeon';
        meta = 'Seoyeon';
        break;
      case 'nb':
        main = 'Liv';
        meta = 'Liv';
        break;
      case 'pl':
        main = 'Jacek';
        meta = 'Maja';
        break;
      case 'pt':
        if (locale && locale == 'pt-PT') {
          meta = 'Cristiano';
          main = 'Ines';
          localeSynthesis = 'PT';
        } else {
          main = 'Ricardo';
          meta = 'Vitoria';
          localeSynthesis = 'BR';
        }
        break;
      case 'ro':
        main = 'Carmen';
        meta = 'Carmen';
        break;
      case 'ru':
        main = 'Maxim';
        meta = 'Tatyana';
        break;
      case 'es':
        if (locale && locale == 'es-ES') {
          main = 'Lucia';
          meta = 'Enrique';
          localeSynthesis = 'ES';
        } else {
          main = 'Miguel';
          meta = 'Penelope';
          localeSynthesis = 'US';
        }
        break;
      case 'sv':
        main = 'Astrid';
        meta = 'Astrid';
        break;
      case 'tr':
        main = 'Filiz';
        meta = 'Filiz';
        break;
      case 'cy':
        main = 'Gwyneth';
        meta = 'Gwyneth';
        break;
      default:
        logger.error('No matching language code for: ' + lang);
        main = '';
        meta = '';
        break;
    }
    logger.debug('Voice choice:' + meta + main);
    return {
      meta: meta,
      main: main,
      localeSynthesis: localeSynthesis
    };
  }
};

module.exports = voiceChoice;

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
  findVoice: function(lang) {
    logger.debug('Choosing voice for lang: ' + lang);
    let main = '';
    let meta = '';
    switch (lang) {
      case 'en':
        main = 'Salli';
        meta = 'Matthew';
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
        main = 'Celine';
        meta = 'Mathieu';
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
        main = 'Ricardo';
        meta = 'Ricardo';
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
        main = 'Miguel';
        meta = 'Penélope';
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
      main: main
    };
  }
};

module.exports = voiceChoice;

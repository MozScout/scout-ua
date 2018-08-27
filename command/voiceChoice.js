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
    let voice = '';
    switch (lang) {
      case 'en':
        voice = 'Salli';
        break;
      case 'da':
        voice = 'Naja';
        break;
      case 'nl':
        voice = 'Lotte';
        break;
      case 'fr':
        voice = 'Celine';
        break;
      case 'de':
        voice = 'Hans';
        break;
      case 'is':
        voice = 'Dora';
        break;
      case 'it':
        voice = 'Giorgio';
        break;
      case 'ja':
        voice = 'Takumi';
        break;
      case 'ko':
        voice = 'Seoyeon';
        break;
      case 'nb':
        voice = 'Liv';
        break;
      case 'pl':
        voice = 'Jacek';
        break;
      case 'pt':
        voice = 'Ricardo';
        break;
      case 'ro':
        voice = 'Carmen';
        break;
      case 'ru':
        voice = 'Maxim';
        break;
      case 'es':
        voice = 'Miguel';
        break;
      case 'sv':
        voice = 'Astrid';
        break;
      case 'tr':
        voice = 'Filiz';
        break;
      case 'cy':
        voice = 'Gwyneth';
        break;
      default:
        voice = 'Salli';
        break;
    }
    logger.debug('Voice is: ' + voice);
    return voice;
  }
};

module.exports = voiceChoice;

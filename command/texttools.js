/* eslint no-useless-escape: 0 */ // --> OFF
/* eslint quotes: 0 */ // --> OFF
const chunk = require('chunk-text');
const logger = require('../logger');

const Entities = require('html-entities').AllHtmlEntities;
const entities = new Entities();

const texttools = {
  truncateArticle: function(str, length, ending) {
    logger.debug('Truncating article');
    if (length == null) {
      length = 600;
    }
    if (ending == null) {
      ending = '...';
    }
    if (str.length > length) {
      logger.debug('truncating');
      return str.substring(0, length - ending.length) + ending;
    } else {
      logger.debug('did not need to truncate');
      return str;
    }
  },

  cleanText: function(htmlStr) {
    // Remove the HTML marks.
    let strippedHtml = htmlStr.replace(/<[^>]+>/g, ' ');

    // Now replace the quotes and other markups.
    strippedHtml = strippedHtml
      .replace(/&amp;/g, ' and ')
      .replace(/&rdquo;/g, '"')
      .replace(/&ldquo;/g, '"')
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&mdash;/g, '-')
      .replace(/&ndash;/g, '-')
      .replace(/&nbsp;/g, ' ')
      .replace(/&thinsp;/g, '');

    strippedHtml = entities.decode(strippedHtml);
    //Clean up any last html codes and diacriticals that
    //contain & so it doesn't choke ssml.
    strippedHtml = strippedHtml.replace(/&[^\s]*/g, '');

    return strippedHtml;
  },

  chunkText: function(text, maxLength = 1000) {
    return chunk(text, maxLength);
  },

  buildSummaryText: function(title, content) {
    return content.replace('\\', '');
  }
};

module.exports = texttools;

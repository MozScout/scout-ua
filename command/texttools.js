/* eslint no-useless-escape: 0 */ // --> OFF
/* eslint quotes: 0 */ // --> OFF
var chunk = require('chunk-text');

var texttools = {
  truncateArticle: function(str, length, ending) {
    console.log('Truncating article');
    if (length == null) {
      length = 600;
    }
    if (ending == null) {
      ending = '...';
    }
    if (str.length > length) {
      console.log('truncating');
      return str.substring(0, length - ending.length) + ending;
    } else {
      console.log('did not need to truncate');
      return str;
    }
  },

  cleanText: function(htmlStr) {
    // Remove the HTML marks.
    var strippedHtml = htmlStr.replace(/<[^>]+>/g, '');
    // Now replace the quotes and other markups.
    strippedHtml = strippedHtml
      .replace(/&rdquo;/g, '"')
      .replace(/&ldquo;/g, '"')
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&mdash;/g, '-')
      .replace(/&ndash;/g, '-')
      .replace(/&thinsp;/g, '');
    return strippedHtml;
  },

  chunkText: function(text, maxLength = 1000) {
    return chunk(text, maxLength);
  }
};

module.exports = texttools;

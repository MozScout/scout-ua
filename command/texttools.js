var texttools = {

  truncateArticle: function(str, length, ending) {
    if (length == null) {
      length = 7999;
    }
    if (ending == null) {
      ending = '...';
    }
    if (str.length > length) {
      return str.substring(0, length - ending.length) + ending;
    } else {
      return str;
    }
  },

  cleanText: function(str) {
    
  }
};


module.exports = texttools;
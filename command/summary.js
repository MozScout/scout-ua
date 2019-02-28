const natural = require('natural');
const countWords = require('count-words');
const rp = require('request-promise');
const Entities = require('html-entities').AllHtmlEntities;
const entities = new Entities();
const texttools = require('./texttools');

const ignore = ['she', 'he', 'not', 'don'];
const fib = [144, 89, 55, 34, 21, 13, 8, 5, 3, 2];
var curMap = new Map();
var summary = {
  getSummary: function(text) {
    return summarize(text);
  },

  stem: function(text) {
    natural.PorterStemmer.attach();
    return text.tokenizeAndStem();
  },

  countOcurrence: function(stemmedText) {
    for (var i = 0; i < stemmedText.length; i++) {
      let element = stemmedText[i];
      if (!ignore.includes(element)) {
        if (curMap.has(element)) {
          let elem = curMap.get(element);
          curMap.set(element, elem + 1);
        } else {
          curMap.set(element, 1);
        }
      } else {
        console.log('Excluding ' + element);
      }
    }
  },

  sortWithIndices: function(inp, count) {
    var outp = new Array();
    for (var i = 0; i < inp.length; i++) {
      outp.push(i);
      if (outp.length > count) {
        outp.sort(function(a, b) {
          return inp[b] - inp[a];
        });
        outp.pop();
      }
    }
    return outp;
  },

  getScoreMap: function() {
    var newMap = new Map(curMap);
    console.log(newMap);
    return newMap;
  },

  summarize: function(text) {
    //Stem the words
    let stemmedText = stem(text);
    countOcurrence(stemmedText);
    // Sort them by most frequent.
    curMap[Symbol.iterator] = function*() {
      yield* [...this.entries()].sort((a, b) => b[1] - a[1]);
    };

    let scoreMap = getScoreMap();

    tokenizer = new natural.SentenceTokenizer();
    let sentTok = tokenizer.tokenize(text);
    let stemSent = new Array();
    for (var i = 0; i < sentTok.length; i++) {
      stemSent.push(stem(sentTok[i]));
    }

    let scoreArr = new Array();

    //Now we score each sentence and put it into the array.
    for (var k = 0; k < stemSent.length; k++) {
      let sentTotal = 0;
      for (var m = 0; m < stemSent[k].length; m++) {
        let pts = stemSent[k][m];
        let ptsTemp = scoreMap.get(pts);
        if (ptsTemp > 2) {
          sentTotal += scoreMap.get(pts);
        }
      }
      scoreArr[k] = sentTotal;
    }

    //Now sort by the indices so the most popular sentences are first
    //but we don't lose the index of it into original array.
    let sortedIndexes = sortWithIndices(scoreArr, 8);
    sortedIndexes.sort(function(a, b) {
      return a - b;
    });

    let summary = '';
    for (var i = 0; i < sortedIndexes.length; i++) {
      summary = summary.concat(sentTok[sortedIndexes[i]] + '  ');
    }
    console.log('Final summary: ' + summary);
  }
};

module.exports = summary;

'use strict';
const texttools = require('../../command/texttools');
const chai = require('chai');

const MOCK_DATA_PATH = __dirname + '/data';

const expect = chai.expect;
const fs = require('fs');

describe('Text Tools - International languages', function() {
  it('Text Cleaning - French, no html codes', function(done) {
    fs.readFile(MOCK_DATA_PATH + '/french_article.json', 'utf8', function(
      err,
      data
    ) {
      if (err) {
        return console.log(err);
      }
      let originalText = JSON.parse(data).article;
      expect(originalText).to.match(/&(?:[a-z]+|#x?\d+);/g);
      let cleanText = texttools.cleanText(originalText);
      expect(cleanText).to.not.match(/&(?:[a-z]+|#x?\d+);/g); // no html & codes
      done();
    });
  });

  it('Text Cleaning - French, match response', function(done) {
    fs.readFile(MOCK_DATA_PATH + '/french_article.json', 'utf8', function(
      err,
      data
    ) {
      if (err) {
        return console.log(err);
      }
      let articleData = JSON.parse(data);
      let cleanText = texttools.cleanText(articleData.article);
      expect(cleanText).to.equal(articleData.expected_clean_article);
      done();
    });
  });

  it('Text Cleaning - German, no html codes', function(done) {
    fs.readFile(MOCK_DATA_PATH + '/german_article.json', 'utf8', function(
      err,
      data
    ) {
      if (err) {
        return console.log(err);
      }
      let originalText = JSON.parse(data).article;
      expect(originalText).to.match(/&(?:[a-z]+|#x?\d+);/g);
      let cleanText = texttools.cleanText(originalText);
      expect(cleanText).to.not.match(/&(?:[a-z]+|#x?\d+);/g); // no html & codes
      done();
    });
  });

  it('Text Cleaning - German, match response', function(done) {
    fs.readFile(MOCK_DATA_PATH + '/german_article.json', 'utf8', function(
      err,
      data
    ) {
      if (err) {
        return console.log(err);
      }
      let articleData = JSON.parse(data);
      let cleanText = texttools.cleanText(articleData.article);
      expect(cleanText).to.equal(articleData.expected_clean_article);
      done();
    });
  });

  it('Should clean french text with lt and gt code tags', function(done) {
    fs.readFile(
      MOCK_DATA_PATH + '/french_article_with_code.json',
      'utf8',
      function(err, data) {
        if (err) {
          return console.log(err);
        }
        let articleData = JSON.parse(data);
        let cleanText = texttools.cleanText(articleData.article);
        expect(cleanText).to.equal(articleData.expected_clean_article);
        done();
      }
    );
  });
});

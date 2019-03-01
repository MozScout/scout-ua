'use strict';
const summary = require('../../command/summary');
const chai = require('chai');

const MOCK_DATA_PATH = __dirname + '/data';

const expect = chai.expect;
const fs = require('fs');

describe('Summarization', function() {
  it('should summarize text', function(done) {
    fs.readFile(MOCK_DATA_PATH + '/summary_plain.json', 'utf8', function(
      err,
      data
    ) {
      if (err) {
        return console.log(err);
      }
      let parsed = JSON.parse(data);
      let sumText = summary.getSummary(parsed.text);
      expect(sumText).to.equal(parsed.sumText);

      done();
    });
  });
});

const rewire = require('rewire');
const CommandController = rewire('../../command/CommandController.js');

const chai = require('chai');
const expect = chai.expect; //
const sinon = require('sinon');
const fs = require('fs');
const nock = require('nock');
const db = require('../../data/database');

const MOCK_DATA_PATH = __dirname + '/data';

describe('getTitlesFromPocket', function() {
  let userid = 'existing-user@test.com';
  beforeEach(function() {
    nock('https://getpocket.com/v3')
      .post('/get')
      .reply(200, function() {
        console.log('Fake Pocket API called');
        return fs.createReadStream(MOCK_DATA_PATH + '/pocketApi.json');
      });
    sinon.replace(db.prototype, 'getAccessToken', sinon.fake());
  });

  it('Existing user', done => {
    let getTitlesFromPocket = CommandController.__get__('getTitlesFromPocket');
    getTitlesFromPocket(userid, false).then(function(res) {
      fs.readFile(MOCK_DATA_PATH + '/getTitles.json', 'utf8', function(
        err,
        data
      ) {
        if (err) {
          return console.log(err);
        }
        expect(res).to.deep.equal(JSON.parse(data));
        done();
      });
    });
  });
});

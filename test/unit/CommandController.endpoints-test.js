'use strict';
var jwt = require('jsonwebtoken');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const AudioFileHelper = require('../../command/AudioFileHelper');
const polly_tts = require('../../command/polly_tts');
const statusHelper = require('../../articlestatus/ArticleStatusHelper.js');

const expect = chai.expect;
const fs = require('fs');
const nock = require('nock');
const db = require('../../data/database');

const MOCK_DATA_PATH = __dirname + '/data';
const FIREFOX_ARTICLE_URL =
  'https://www.nytimes.com/2018/06/20/technology/' +
  'personaltech/firefox-chrome-browser-privacy.html';

let app = require('../../app');

describe('CommandController - Endpoints', function() {
  let userData = {
    userid: 'existing-user@test.com',
    cmd: ''
  };
  let accessToken = 'token';
  beforeEach(function() {
    nock('https://getpocket.com/v3')
      .post('/get')
      .reply(function(uri, body) {
        console.log('Fake Pocket API called on /get');
        let values = JSON.parse(body);
        if (values.search == FIREFOX_ARTICLE_URL) {
          console.log('Search request on Pocket API');
          return [
            200,
            fs.createReadStream(
              MOCK_DATA_PATH + '/pocketApiSearch_firefox.json'
            )
          ];
        } else if (values.search) {
          return [404];
        }
        return [200, fs.createReadStream(MOCK_DATA_PATH + '/pocketApi.json')];
      });
    nock('https://getpocket.com/v3')
      .post('/send')
      .reply(200, function() {
        console.log('Fake Pocket API called on /send');
        return { action_results: [true], status: 1 };
      });
    nock('https://text.getpocket.com/v3')
      .post('/text')
      .reply(function() {
        console.log('Fake Pocket API called on /text');
        return [
          200,
          fs.createReadStream(MOCK_DATA_PATH + '/pocketApiText_firefox.json')
        ];
      });
    nock('https://api.smmry.com')
      .get('/')
      .query(true)
      .reply(200, function(uri) {
        console.log('Fake SMMRY API called');
        if (uri.includes('SM_URL=http'))
          return fs.createReadStream(MOCK_DATA_PATH + '/smmryApi_firefox.json');
        return {
          sm_api_error: 3,
          sm_api_message: 'NO SUMMARY AVAILABLE'
        };
      });

    sinon.replace(
      db.prototype,
      'getAccessToken',
      sinon.fake(function() {
        console.log('Calling fake getAccessToken');
      })
    );
    sinon.replace(
      jwt,
      'verify',
      sinon.fake(function(token, secret, func) {
        console.log('Calling fake jwt.verify');
        let decoded = {
          id: userData.userid
        };
        func(undefined, decoded);
      })
    );
    sinon.replace(
      AudioFileHelper.prototype,
      'getAudioFileLocation',
      sinon.fake(function() {
        console.log('Calling fake getAudioFileLocation');
      })
    );
    sinon.replace(
      AudioFileHelper.prototype,
      'storeAudioFileLocation',
      sinon.fake(function() {
        console.log('Calling fake storeAudioFileLocation');
      })
    );
    sinon.replace(
      statusHelper.prototype,
      'getArticleStatus',
      sinon.fake(function() {
        console.log('Calling fake getArticleStatus');
      })
    );
    sinon.replace(
      polly_tts,
      'getSpeechSynthUrl',
      sinon.fake(function() {
        console.log('Calling fake getSpeechSynthUrl');
        return 'audio_file_url';
      })
    );
  });

  afterEach(function() {
    sinon.restore();
    nock.cleanAll();
  });

  describe('/intent', function() {
    describe('ScoutTitles', function() {
      before(function() {
        userData.cmd = 'ScoutTitles';
      });
      after(function() {
        userData.cmd = '';
      });
      it('Returns titles', done => {
        chai
          .request(app)
          .post('/command/intent')
          .set('x-access-token', accessToken)
          .send(userData)
          .end((err, res) => {
            expect(res).have.status(200);
            expect(res.body).be.a('object');
            fs.readFile(MOCK_DATA_PATH + '/ScoutTitles.json', 'utf8', function(
              err,
              data
            ) {
              if (err) {
                return console.log(err);
              }
              expect(res.body).to.deep.equal(JSON.parse(data));
              done();
            });
          });
      });
    });

    describe('SearchAndPlayArticle', function() {
      before(function() {
        userData.cmd = 'SearchAndPlayArticle';
        userData.search_terms = 'firefox';
      });
      after(function() {
        userData.cmd = '';
        delete userData.search_terms;
      });
      it('Return data when search term: firefox', done => {
        chai
          .request(app)
          .post('/command/intent')
          .set('x-access-token', 'token')
          .send(userData)
          .end((err, res) => {
            expect(res).have.status(200);
            expect(res.body).be.a('object');
            fs.readFile(
              MOCK_DATA_PATH + '/SearchAndPlayArticle_firefox.json',
              'utf8',
              function(err, data) {
                if (err) {
                  return console.log(err);
                }
                expect(res.body).to.deep.equal(JSON.parse(data));
                done();
              }
            );
          });
      });

      it('Returns error when search term not found', done => {
        userData.search_terms = 'undefined';
        chai
          .request(app)
          .post('/command/intent')
          .set('x-access-token', 'token')
          .send(userData)
          .end((err, res) => {
            expect(res).have.status(404);
            expect(res.body).be.a('object');
            expect(res.body).to.deep.equal({
              speech: 'There was an error finding the article.'
            });
            done();
          });
      });
    });

    describe('SearchAndSummarizeArticle', function() {
      before(function() {
        userData.cmd = 'SearchAndSummarizeArticle';
        userData.search_terms = 'firefox';
      });
      after(function() {
        userData.cmd = '';
        delete userData.search_terms;
      });
      it('Return data when search term: firefox', done => {
        chai
          .request(app)
          .post('/command/intent')
          .set('x-access-token', 'token')
          .send(userData)
          .end((err, res) => {
            expect(res).have.status(200);
            expect(res.body).be.a('object');
            fs.readFile(
              MOCK_DATA_PATH + '/SearchAndPlayArticle_firefox.json',
              'utf8',
              function(err, data) {
                if (err) {
                  return console.log(err);
                }
                expect(res.body).to.deep.equal(JSON.parse(data));
                done();
              }
            );
          });
      });

      it('Returns error when search term not found', done => {
        userData.search_terms = 'undefined';
        chai
          .request(app)
          .post('/command/intent')
          .set('x-access-token', 'token')
          .send(userData)
          .end((err, res) => {
            expect(res).have.status(404);
            expect(res.body).be.a('object');
            expect(res.body).to.deep.equal({
              speech: 'There was an error finding the article.'
            });
            done();
          });
      });
    });

    describe('Archive', function() {
      before(function() {
        userData.cmd = 'Archive';
        userData.itemid = '1';
      });
      after(function() {
        userData.cmd = '';
        delete userData.itemid;
      });
      it('Returns success archive itemid 1', done => {
        chai
          .request(app)
          .post('/command/intent')
          .set('x-access-token', 'token')
          .send(userData)
          .end((err, res) => {
            expect(res).have.status(200);
            expect(res.body).be.a('object');
            expect(res.body).to.deep.equal({ success: true });
            done();
          });
      });
    });

    describe('ScoutMyPocket', function() {
      before(function() {
        userData.cmd = 'ScoutMyPocket';
      });
      after(function() {
        userData.cmd = '';
      });
      it('Returns an audio file', done => {
        chai
          .request(app)
          .post('/command/intent')
          .set('x-access-token', accessToken)
          .send(userData)
          .end((err, res) => {
            expect(res).have.status(200);
            expect(res.body).be.a('object');
            expect(res.body.url).be.equal('audio_file_url');
            done();
          });
      });
    });
  });

  describe('/article', function() {
    before(function() {
      userData.url = FIREFOX_ARTICLE_URL;
    });
    after(function() {
      delete userData.url;
    });
    it('Returns data for article: firefox', done => {
      chai
        .request(app)
        .post('/command/article')
        .set('x-access-token', 'token')
        .send(userData)
        .end((err, res) => {
          expect(res).have.status(200);
          expect(res.body).be.a('object');
          fs.readFile(
            MOCK_DATA_PATH + '/SearchAndPlayArticle_firefox.json',
            'utf8',
            function(err, data) {
              if (err) {
                return console.log(err);
              }
              expect(res.body).to.deep.equal(JSON.parse(data));
              done();
            }
          );
        });
    });
  });

  describe('/articleservice', function() {
    beforeEach(function() {
      userData.url = FIREFOX_ARTICLE_URL;
      userData.article_id = 1234;
    });
    afterEach(function() {
      delete userData.url;
      delete userData.article_id;
    });
    it('should return a url of the audio file', done => {
      chai
        .request(app)
        .post('/command/articleservice')
        .set('x-access-token', 'token')
        .send(userData)
        .end((err, res) => {
          expect(res).have.status(200);
          expect(res.body).be.a('object');
          fs.readFile(MOCK_DATA_PATH + '/articleservice.json', 'utf8', function(
            err,
            data
          ) {
            if (err) {
              return console.log(err);
            }

            expect(res.body).to.deep.equal(JSON.parse(data));
            done();
          });
        });
    });
  });

  describe('/summary', function() {
    before(function() {
      userData.url = FIREFOX_ARTICLE_URL;
    });
    after(function() {
      delete userData.url;
    });
    it('Returns data for article: firefox', done => {
      chai
        .request(app)
        .post('/command/summary')
        .set('x-access-token', 'token')
        .send(userData)
        .end((err, res) => {
          expect(res).have.status(200);
          expect(res.body).be.a('object');
          fs.readFile(
            MOCK_DATA_PATH + '/SearchAndPlayArticle_firefox.json',
            'utf8',
            function(err, data) {
              if (err) {
                return console.log(err);
              }
              expect(res.body).to.deep.equal(JSON.parse(data));
              done();
            }
          );
        });
    });
  });

  describe('/search', function() {
    it('Returns data for search: firefox', done => {
      chai
        .request(app)
        .get('/command/search')
        .set('x-access-token', 'token')
        .query({ q: 'firefox', userid: userData.userid })
        .end((err, res) => {
          expect(res).have.status(200);
          expect(res.body).be.a('object');
          fs.readFile(MOCK_DATA_PATH + '/search_firefox.json', 'utf8', function(
            err,
            data
          ) {
            if (err) {
              return console.log(err);
            }
            expect(res.body).to.deep.equal(JSON.parse(data));
            done();
          });
        });
    });

    it('Returns 404 for empty search', done => {
      chai
        .request(app)
        .get('/command/search')
        .set('x-access-token', 'token')
        .query({ q: '', userid: userData.userid })
        .end((err, res) => {
          expect(res).have.status(404);
          done();
        });
    });

    it('Returns 404 when no query', done => {
      chai
        .request(app)
        .get('/command/search')
        .set('x-access-token', 'token')
        .query({ userid: userData.userid })
        .end((err, res) => {
          expect(res).have.status(404);
          done();
        });
    });

    it('Returns 404 for search: no match', done => {
      chai
        .request(app)
        .get('/command/search')
        .set('x-access-token', 'token')
        .query({ q: 'nomatch', userid: userData.userid })
        .end((err, res) => {
          expect(res).have.status(404);
          done();
        });
    });
  });
});

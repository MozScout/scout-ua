'use strict';
var jwt = require('jsonwebtoken');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const AudioFileHelper = require('../../command/AudioFileHelper');
const polly_tts = require('../../command/polly_tts');
const statusHelper = require('../../articlestatus/ArticleStatusHelper.js');
const HostnameHelper = require('../../command/HostnameHelper.js');

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
      .persist()
      .post('/text')
      .reply(function() {
        console.log('Fake Pocket API called on /text');
        return [
          200,
          fs.createReadStream(MOCK_DATA_PATH + '/pocketApiText_firefox.json')
        ];
      });
    nock('https://api.smmry.com')
      .persist()
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
      HostnameHelper.prototype,
      'getHostnameData',
      sinon.fake(function() {
        console.log('Calling fake getHostnameData');
        return {
          publisher_name: 'publisher',
          favicon_url: 'http://favicon.url'
        };
      })
    );
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
      AudioFileHelper.prototype,
      'checkFileExistence',
      sinon.fake(function(url) {
        console.log('Calling fake checkFileExistence');
        return url == 'http://audio_file.mp3';
      })
    );
    sinon.replace(
      AudioFileHelper.prototype,
      'getMobileFileMetadata',
      sinon.fake(function() {
        console.log('Calling fake getMobileFileMetadata');
        return [
          {
            url: 'http://audio_file.mp3',
            duration: 300
          }
        ];
      })
    );
    sinon.replace(
      AudioFileHelper.prototype,
      'getMetaAudioLocation',
      sinon.fake(function() {
        console.log('Calling fake getMetaAudioLocation');
        return {
          intro: 'http://audio_file.mp3',
          outro: 'http://audio_file.mp3'
        };
      })
    );
    sinon.replace(
      AudioFileHelper.prototype,
      'storeMobileLocation',
      sinon.fake(function() {
        console.log('Calling fake AudioFileHelper.storeMobileLocation');
        return;
      })
    );

    sinon.replace(
      AudioFileHelper.prototype,
      'storeOutroLocation',
      sinon.fake(function() {
        console.log('Calling fake storeOutroLocation');
      })
    );
    sinon.replace(
      AudioFileHelper.prototype,
      'storeIntroLocation',
      sinon.fake(function() {
        console.log('Calling fake storeIntroLocation');
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
        return 'http://audio_file.mp3';
      })
    );
    sinon.replace(
      polly_tts,
      'synthesizeSpeechFile',
      sinon.fake(function() {
        console.log('Calling fake synthesizeSpeechFile');
        return 'http://audio_file.mp3';
      })
    );
    sinon.replace(
      polly_tts,
      'getFileSizeFromUrl',
      sinon.fake(function() {
        console.log('Calling fake getFileSizeFromUrl');
        return 999;
      })
    );
    sinon.replace(
      polly_tts,
      'processPocketAudio',
      sinon.fake(function() {
        console.log('Calling fake processPocketAudio');
        return {
          format: 'mp3',
          url: 'http://audio_file.mp3',
          status: 'available',
          voice: 'Joanna',
          sample_rate: '48000',
          duration: 50,
          size: 10000
        };
      })
    );
    sinon.replace(
      polly_tts,
      'uploadFile',
      sinon.fake(function() {
        console.log('Calling fake uploadFile');
        return 'http://audio_file.mp3';
      })
    );
    sinon.replace(
      polly_tts,
      'postProcessPart',
      sinon.fake(function() {
        console.log('Calling fake uploadFile');
        return 'http://audio_file.mp3';
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
    /*
    describe('SearchAndPlayArticle', function() {
      before(function() {
        userData.cmd = 'SearchAndPlayArticle';
        userData.searchTerms = 'firefox';
      });
      after(function() {
        userData.cmd = '';
        delete userData.searchTerms;
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
        userData.searchTerms = 'undefined';
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
        userData.searchTerms = 'firefox';
      });
      after(function() {
        userData.cmd = '';
        delete userData.searchTerms;
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
        userData.searchTerms = 'undefined';
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
            expect(res.body.url).be.equal('http://audio_file.mp3');
            done();
          });
      });
    });*/
  });
  /*
  describe('/article', function() {
    before(function() {
      userData.url = FIREFOX_ARTICLE_URL;
    });
    after(function() {
      delete userData.url;
      delete userData.meta_audio;
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

    it('With meta_audio flag', done => {
      userData.meta_audio = 1;
      chai
        .request(app)
        .post('/command/article')
        .set('x-access-token', 'token')
        .send(userData)
        .end((err, res) => {
          console.log(res.body);
          expect(res).have.status(200);
          expect(res.body).be.a('object');
          fs.readFile(
            MOCK_DATA_PATH + '/ArticleMetaAudio_firefox.json',
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

  describe('/summary', function() {
    before(function() {
      userData.url = FIREFOX_ARTICLE_URL;
    });
    after(function() {
      delete userData.url;
      delete userData.meta_audio;
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

    it('With meta_audio flag', done => {
      userData.meta_audio = 1;
      chai
        .request(app)
        .post('/command/article')
        .set('x-access-token', 'token')
        .send(userData)
        .end((err, res) => {
          expect(res).have.status(200);
          expect(res.body).be.a('object');
          fs.readFile(
            MOCK_DATA_PATH + '/ArticleMetaAudio_firefox.json',
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

  describe('/articleservice', function() {
    beforeEach(function() {
      userData.url = FIREFOX_ARTICLE_URL;
      userData.article_id = '1234';
    });
    afterEach(function() {
      delete userData.url;
      delete userData.article_id;
    });

    it('should return metadata for the article', done => {
      chai
        .request(app)
        .post('/command/articleservice')
        .set('x-access-token', 'token')
        .send(userData)
        .end((err, res) => {
          expect(res).have.status(200);
          expect(res.body).be.a('object');
          done();
        });
    });

    it('should return 404 when no article_id is sent', done => {
      delete userData.article_id;
      chai
        .request(app)
        .post('/command/articleservice')
        .set('x-access-token', 'token')
        .send(userData)
        .end((err, res) => {
          expect(res).have.status(404);
          expect(res.body).be.a('object');
          done();
        });
    });
  });*/
});

const fs = require('fs');
const chai = require('chai');
const chaiHttp = require('chai-http');
const logger = require('../../logger');
const expect = chai.expect;

if (!process.env.TEST_API_URL || !process.env.TEST_API_ACCESS_TOKEN) {
  logger.error('No TEST env vars found.');
  throw new Error(
    'No TEST env vars found. ' +
      'Please add TEST_API_URL and TEST_API_ACCESS_TOKEN'
  );
}

const API_URL = process.env.TEST_API_URL;
const accessToken = process.env.TEST_API_ACCESS_TOKEN;
const userid = 'scoutapitest@mailinator.com';

chai.use(chaiHttp);

const constants = {
  NORMAL_LENGTH: 11,
  EXTENDED_LENGTH: 14,
  PIZZA_URL:
    'https://ny.eater.com/2015/8/7/9050099/new-york-pizza-styles-best-slice',
  MOZILLA_URL:
    'https://www.cnet.com/news' +
    '/mozilla-working-on-scout-a-voice-controlled-web-browser-project/',
  ROBOT_URL:
    'https://www.technologyreview.com/s/611424' +
    '/this-is-how-the-robot-uprising-finally-begins/',
  ALEXA_URL:
    'https://www.wired.com/story/how-amazon-taught-alexa-to-speak-french/',
  ARTICLEID: 1234
};

describe('POST /command/intent', function() {
  this.timeout(120 * 1000);
  let data = {
    userid: userid,
    cmd: ''
  };

  function intentError(done) {
    data.search_terms = 'error';
    chai
      .request(API_URL)
      .post('/command/intent')
      .set('x-access-token', accessToken)
      .send(data)
      .end((err, res) => {
        expect(res).have.status(404);
        expect(res.body).be.a('object');
        expect(res.body).have.property('speech');
        expect(Object.keys(res.body)).to.have.lengthOf(1);
        expect(res.body.speech).be.equal(
          'There was an error finding the article.'
        );
        done();
      });
  }

  after(function() {
    delete data.cmd;
  });

  describe('ScoutTitles', function() {
    before(function() {
      data.cmd = 'ScoutTitles';
    });
    it('Should return titles', done => {
      chai
        .request(API_URL)
        .post('/command/intent')
        .set('x-access-token', accessToken)
        .send(data)
        .end((err, res) => {
          //console.log(res.body);
          expect(res).have.status(200);
          expect(res.body).be.a('object');
          expect(res.body).have.property('articles');
          fs.readFile(__dirname + '/ScoutTitles.json', 'utf8', function(
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
      data.cmd = 'SearchAndPlayArticle';
    });

    after(function() {
      delete data.search_terms;
    });

    it('Search: robot', done => {
      data.search_terms = 'robot';
      chai
        .request(API_URL)
        .post('/command/intent')
        .set('x-access-token', accessToken)
        .send(data)
        .end((err, res) => {
          expect(res).have.status(200);
          expect(res.body).be.a('object');
          expect(res.body).have.property('url');
          expect(Object.keys(res.body)).to.have.lengthOf(
            constants.NORMAL_LENGTH
          );
          fs.readFile(__dirname + '/SearchAndPlayRobot.json', 'utf8', function(
            err,
            data
          ) {
            if (err) {
              return console.log(err);
            }
            expect(res.body).to.deep.contain(JSON.parse(data));
            done();
          });
        });
    });

    it('Search: pizza', done => {
      data.search_terms = 'pizza';
      chai
        .request(API_URL)
        .post('/command/intent')
        .set('x-access-token', accessToken)
        .send(data)
        .end((err, res) => {
          expect(res).have.status(200);
          expect(res.body).be.a('object');
          expect(res.body).have.property('url');
          expect(Object.keys(res.body)).to.have.lengthOf(
            constants.NORMAL_LENGTH
          );
          fs.readFile(__dirname + '/SearchAndPlayPizza.json', 'utf8', function(
            err,
            data
          ) {
            if (err) {
              return console.log(err);
            }
            expect(res.body).to.deep.contain(JSON.parse(data));
            done();
          });
        });
    });

    it('Search: error', intentError);
  });

  describe('SearchAndPlayArticle extended_data', function() {
    before(function() {
      data.cmd = 'SearchAndPlayArticle';
      data.extended_data = '1';
    });

    after(function() {
      delete data.extended_data;
      delete data.search_terms;
    });

    it('Search: robot extended_data', done => {
      data.search_terms = 'robot';
      chai
        .request(API_URL)
        .post('/command/intent')
        .set('x-access-token', accessToken)
        .send(data)
        .end((err, res) => {
          expect(res).have.status(200);
          expect(res.body).be.a('object');
          expect(res.body).have.property('url');
          expect(res.body).have.property('publisher');
          expect(res.body).have.property('icon_url');
          expect(Object.keys(res.body)).to.have.lengthOf(
            constants.EXTENDED_LENGTH
          );
          fs.readFile(__dirname + '/SearchAndPlayRobot.json', 'utf8', function(
            err,
            data
          ) {
            if (err) {
              return console.log(err);
            }
            expect(res.body).to.deep.contain(JSON.parse(data));
            done();
          });
        });
    });

    it('Search: pizza extended_data', done => {
      data.search_terms = 'pizza';
      chai
        .request(API_URL)
        .post('/command/intent')
        .set('x-access-token', accessToken)
        .send(data)
        .end((err, res) => {
          expect(res).have.status(200);
          expect(res.body).be.a('object');
          expect(res.body).have.property('url');
          expect(res.body).have.property('publisher');
          expect(res.body).have.property('icon_url');
          expect(Object.keys(res.body)).to.have.lengthOf(
            constants.EXTENDED_LENGTH
          );
          fs.readFile(__dirname + '/SearchAndPlayPizza.json', 'utf8', function(
            err,
            data
          ) {
            if (err) {
              return console.log(err);
            }
            expect(res.body).to.deep.contain(JSON.parse(data));
            done();
          });
        });
    });

    it('Search: error', intentError);
  });

  describe('SearchAndSummarizeArticle', function() {
    before(function() {
      data.cmd = 'SearchAndSummarizeArticle';
    });

    after(function() {
      delete data.search_terms;
    });

    it('Search: minecraft', done => {
      data.search_terms = 'minecraft';
      chai
        .request(API_URL)
        .post('/command/intent')
        .set('x-access-token', accessToken)
        .send(data)
        .end((err, res) => {
          expect(res).have.status(200);
          expect(res.body).be.a('object');
          expect(res.body).have.property('url');
          expect(Object.keys(res.body)).to.have.lengthOf(
            constants.NORMAL_LENGTH
          );
          fs.readFile(
            __dirname + '/SearchAndSummarizeMinecraft.json',
            'utf8',
            function(err, data) {
              if (err) {
                return console.log(err);
              }
              expect(res.body).to.deep.contain(JSON.parse(data));
              done();
            }
          );
        });
    });

    it('Search: error', intentError);
  });

  describe('SearchAndSummarizeArticle extended_data', function() {
    before(function() {
      data.cmd = 'SearchAndSummarizeArticle';
      data.extended_data = '1';
    });

    after(function() {
      delete data.extended_data;
      delete data.search_terms;
    });

    it('Search: minecraft extended_data', done => {
      data.search_terms = 'minecraft';
      chai
        .request(API_URL)
        .post('/command/intent')
        .set('x-access-token', accessToken)
        .send(data)
        .end((err, res) => {
          expect(res).have.status(200);
          expect(res.body).have.property('url');
          expect(res.body).have.property('publisher');
          expect(res.body).have.property('icon_url');
          expect(Object.keys(res.body)).to.have.lengthOf(
            constants.EXTENDED_LENGTH
          );
          expect(res.body).be.a('object');
          fs.readFile(
            __dirname + '/SearchAndSummarizeMinecraft.json',
            'utf8',
            function(err, data) {
              if (err) {
                return console.log(err);
              }
              expect(res.body).to.deep.contain(JSON.parse(data));
              done();
            }
          );
        });
    });

    it('Search: error', intentError);
  });

  describe('Archive', function() {
    before(function() {
      data.cmd = 'Archive';
    });

    after(function() {
      delete data.itemid;
    });

    it('Archive', done => {
      data.itemid = 123456;
      chai
        .request(API_URL)
        .post('/command/intent')
        .set('x-access-token', accessToken)
        .send(data)
        .end((err, res) => {
          expect(res).have.status(200);
          expect(res.body).be.a('object');
          expect(res.body).have.property('success');
          expect(Object.keys(res.body)).to.have.lengthOf(1);
          expect(res.body.success).be.equal(true);
          done();
        });
    });
  });
});

describe('POST /command/article', function() {
  this.timeout(120 * 1000);
  let data = {
    userid: userid
  };

  after(function() {
    delete data.url;
  });

  describe('Articles', function() {
    it('Article: pizza (in Pocket)', done => {
      data.url = constants.PIZZA_URL;
      chai
        .request(API_URL)
        .post('/command/article')
        .set('x-access-token', accessToken)
        .send(data)
        .end((err, res) => {
          expect(res).have.status(200);
          expect(res.body).be.a('object');
          expect(res.body).have.property('url');
          expect(Object.keys(res.body)).to.have.lengthOf(
            constants.NORMAL_LENGTH
          );
          fs.readFile(__dirname + '/ArticlePizza.json', 'utf8', function(
            err,
            data
          ) {
            if (err) {
              return console.log(err);
            }
            expect(res.body).to.deep.contain(JSON.parse(data));
            done();
          });
        });
    });

    it('Article: firefox (not in Pocket). Should return 404.', done => {
      data.url = constants.MOZILLA_URL;
      chai
        .request(API_URL)
        .post('/command/article')
        .set('x-access-token', accessToken)
        .send(data)
        .end((err, res) => {
          expect(res).have.status(404);
          done();
        });
    });
  });
  describe('Articles extended_data', function() {
    before(function() {
      data.extended_data = 1;
    });

    after(function() {
      delete data.extended_data;
    });

    it('Article: robot (in Pocket)', done => {
      data.url = constants.ROBOT_URL;
      chai
        .request(API_URL)
        .post('/command/article')
        .set('x-access-token', accessToken)
        .send(data)
        .end((err, res) => {
          expect(res).have.status(200);
          expect(res.body).be.a('object');
          expect(res.body).have.property('url');
          expect(res.body).have.property('publisher');
          expect(res.body).have.property('icon_url');
          expect(Object.keys(res.body)).to.have.lengthOf(
            constants.EXTENDED_LENGTH
          );
          fs.readFile(__dirname + '/ArticleRobot.json', 'utf8', function(
            err,
            data
          ) {
            if (err) {
              return console.log(err);
            }
            expect(res.body).to.deep.contain(JSON.parse(data));
            done();
          });
        });
    });

    it('Article: alexa (not in Pocket). Should return 404.', done => {
      data.url = constants.ALEXA_URL;
      chai
        .request(API_URL)
        .post('/command/article')
        .set('x-access-token', accessToken)
        .send(data)
        .end((err, res) => {
          expect(res).have.status(404);
          done();
        });
    });
  });
  describe('Errors', function() {
    it('Empty url string', done => {
      data.url = '';
      chai
        .request(API_URL)
        .post('/command/article')
        .set('x-access-token', accessToken)
        .send(data)
        .end((err, res) => {
          expect(res).have.status(404);
          expect(res.body).be.a('object');
          expect(res.body).have.property('speech');
          expect(Object.keys(res.body)).to.have.lengthOf(1);
          expect(res.body.speech).contain(
            'There was an error processing the article.'
          );
          done();
        });
    });

    it('No url parameter', done => {
      delete data.url;
      chai
        .request(API_URL)
        .post('/command/article')
        .set('x-access-token', accessToken)
        .send(data)
        .end((err, res) => {
          expect(res).have.status(404);
          expect(res.body).be.a('object');
          expect(res.body).have.property('speech');
          expect(Object.keys(res.body)).to.have.lengthOf(1);
          expect(res.body.speech).contain(
            'There was an error processing the article.'
          );
          done();
        });
    });
  });
});

describe('POST /command/articleservice', function() {
  this.timeout(120 * 1000);

  let data = {};
  afterEach(function() {
    delete data.article_id;
    delete data.url;
  });

  describe('articleservice', function() {
    it('should return a url of a synthesized file', done => {
      data.url = constants.PIZZA_URL;
      data.article_id = constants.ARTICLEID;
      chai
        .request(API_URL)
        .post('/command/articleservice')
        .set('x-access-token', accessToken)
        .send(data)
        .end((err, res) => {
          expect(res).have.status(200);
          expect(res.body).be.a('object');
          expect(res.body).have.property('url');
        });
      done();
    });
  });
  describe('Errors', function() {
    it('should return 404 if no article_id', done => {
      data.url = constants.PIZZA_URL;
      chai
        .request(API_URL)
        .post('/command/articleservice')
        .set('x-access-token', accessToken)
        .send(data)
        .end((err, res) => {
          expect(res).have.status(404);
          expect(res.body).be.a('object');
          expect(res.body).have.property('speech');
          expect(res.body.speech).contain(
            'There was an error processing the article.'
          );
          done();
        });
    });
  });
});

describe('POST /command/summary', function() {
  this.timeout(120 * 1000);
  let data = {
    userid: userid
  };

  after(function() {
    delete data.url;
  });

  describe('Articles', function() {
    it('Article: pizza (in Pocket)', done => {
      data.url = constants.PIZZA_URL;
      chai
        .request(API_URL)
        .post('/command/summary')
        .set('x-access-token', accessToken)
        .send(data)
        .end((err, res) => {
          expect(res).have.status(200);
          expect(res.body).be.a('object');
          expect(res.body).have.property('url');
          expect(Object.keys(res.body)).to.have.lengthOf(
            constants.NORMAL_LENGTH
          );
          fs.readFile(__dirname + '/ArticlePizza.json', 'utf8', function(
            err,
            data
          ) {
            if (err) {
              return console.log(err);
            }
            expect(res.body).to.deep.contain(JSON.parse(data));
            done();
          });
        });
    });

    it('Article: firefox (not in Pocket). Should return 404.', done => {
      data.url = constants.MOZILLA_URL;
      chai
        .request(API_URL)
        .post('/command/summary')
        .set('x-access-token', accessToken)
        .send(data)
        .end((err, res) => {
          expect(res).have.status(404);
          done();
        });
    });
  });
  describe('Articles extended_data', function() {
    before(function() {
      data.extended_data = 1;
    });

    after(function() {
      delete data.extended_data;
    });

    it('Article: robot (in Pocket)', done => {
      data.url = constants.ROBOT_URL;
      chai
        .request(API_URL)
        .post('/command/summary')
        .set('x-access-token', accessToken)
        .send(data)
        .end((err, res) => {
          expect(res).have.status(200);
          expect(res.body).be.a('object');
          expect(res.body).have.property('url');
          expect(res.body).have.property('publisher');
          expect(res.body).have.property('icon_url');
          expect(Object.keys(res.body)).to.have.lengthOf(
            constants.EXTENDED_LENGTH
          );
          fs.readFile(__dirname + '/ArticleRobot.json', 'utf8', function(
            err,
            data
          ) {
            if (err) {
              return console.log(err);
            }
            expect(res.body).to.deep.contain(JSON.parse(data));
            done();
          });
        });
    });

    it('Article: alexa (not in Pocket). Should return 404.', done => {
      data.url = constants.ALEXA_URL;
      chai
        .request(API_URL)
        .post('/command/summary')
        .set('x-access-token', accessToken)
        .send(data)
        .end((err, res) => {
          expect(res).have.status(404);
          done();
        });
    });
  });
  describe('Errors', function() {
    it('Empty url string', done => {
      data.url = '';
      chai
        .request(API_URL)
        .post('/command/summary')
        .set('x-access-token', accessToken)
        .send(data)
        .end((err, res) => {
          expect(res).have.status(404);
          expect(res.body).be.a('object');
          expect(res.body).have.property('speech');
          expect(Object.keys(res.body)).to.have.lengthOf(1);
          expect(res.body.speech).contain(
            'There was an error processing the article.'
          );
          done();
        });
    });

    it('No url parameter', done => {
      delete data.url;
      chai
        .request(API_URL)
        .post('/command/summary')
        .set('x-access-token', accessToken)
        .send(data)
        .end((err, res) => {
          expect(res).have.status(404);
          expect(res.body).be.a('object');
          expect(res.body).have.property('speech');
          expect(Object.keys(res.body)).to.have.lengthOf(1);
          expect(res.body.speech).contain(
            'There was an error processing the article.'
          );
          done();
        });
    });
  });
});

describe('Article Status', function() {
  let data = {
    pocket_user_id: userid,
    article_id: '1'
  };

  afterEach(function() {
    delete data.offset_ms;
  });

  describe('Update an article status', function() {
    it('Set article status to 0', done => {
      data.offset_ms = 0;
      chai
        .request(API_URL)
        .post('/article-status/')
        .set('x-access-token', accessToken)
        .send(data)
        .end((err, res) => {
          expect(res).have.status(201);
          done();
        });
    });
    it('Get article status', done => {
      chai
        .request(API_URL)
        .get('/article-status/' + userid + '/' + data.article_id)
        .set('x-access-token', accessToken)
        .send()
        .end((err, res) => {
          expect(res).have.status(200);
          expect(res.body).be.a('object');
          expect(Object.keys(res.body)).to.have.lengthOf(3);
          expect(res.body).have.property('offset_ms');
          expect(res.body.offset_ms).be.equal(0);
          done();
        });
    });
    it('Update article status to 100', done => {
      data.offset_ms = 100;
      chai
        .request(API_URL)
        .post('/article-status/')
        .set('x-access-token', accessToken)
        .send(data)
        .end((err, res) => {
          expect(res).have.status(201);
          done();
        });
    });
    it('Get article status', done => {
      chai
        .request(API_URL)
        .get('/article-status/' + userid + '/' + data.article_id)
        .set('x-access-token', accessToken)
        .send()
        .end((err, res) => {
          expect(res).have.status(200);
          expect(res.body).be.a('object');
          expect(Object.keys(res.body)).to.have.lengthOf(3);
          expect(res.body).have.property('offset_ms');
          expect(res.body.offset_ms).be.equal(100);
          done();
        });
    });
  });
  describe('GET /article-status', function() {
    it('Get article status for one article /:userid/:itemid', done => {
      chai
        .request(API_URL)
        .get('/article-status/' + userid + '/' + data.article_id)
        .set('x-access-token', accessToken)
        .send()
        .end((err, res) => {
          expect(res).have.status(200);
          expect(res.body).be.a('object');
          expect(res.body).have.property('pocket_user_id');
          expect(res.body.pocket_user_id).be.equal(data.pocket_user_id);
          expect(res.body).have.property('article_id');
          expect(res.body.article_id).be.equal(data.article_id);
          expect(res.body).have.property('offset_ms');
          expect(res.body.offset_ms).be.at.least(0);
          expect(Object.keys(res.body)).to.have.lengthOf(3);
          done();
        });
    });

    it('Get article status - Not Found', done => {
      chai
        .request(API_URL)
        .get('/article-status/' + userid + '/' + 0)
        .set('x-access-token', accessToken)
        .send()
        .end((err, res) => {
          expect(res).have.status(404);
          done();
        });
    });

    it('Get all article statuses /:userid', done => {
      chai
        .request(API_URL)
        .get('/article-status/' + userid)
        .set('x-access-token', accessToken)
        .send()
        .end((err, res) => {
          expect(res).have.status(200);
          expect(res.body).be.an('array');
          res.body.forEach(function(e) {
            expect(e).have.property('pocket_user_id', data.pocket_user_id);
            expect(e).have.property('article_id');
            expect(e).have.property('offset_ms');
            expect(e.offset_ms).be.at.least(0);
            expect(Object.keys(e)).have.lengthOf(3);
          });
          done();
        });
    });
  });
});

describe('Authentication', function() {});

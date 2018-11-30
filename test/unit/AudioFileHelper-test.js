'use strict';
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);
const AudioFileHelper = require('../../command/AudioFileHelper');

const expect = chai.expect;
const nock = require('nock');
const db = require('../../data/database');

describe('AudioFileHelper', function() {
  beforeEach(function() {
    sinon.replace(
      db.prototype,
      'getMobileLang',
      sinon.fake(function() {
        console.log('Calling fake getMobileLang');
        return 'en';
      })
    );
    sinon.replace(
      db.prototype,
      'getMobileMetadataForLocale',
      sinon.fake(function() {
        console.log('Calling fake getMobileMetadataForLocale');
        let mmd = {
          lang: 'en',
          locale: 'US'
        };
        return mmd;
      })
    );
  });

  afterEach(function() {
    sinon.restore();
    nock.cleanAll();
  });

  describe('AudioFileHelper', function() {
    describe('GetMobileMetaData', function() {
      before(function() {});
      after(function() {});
      it('Should return an object', async () => {
        let ah = new AudioFileHelper();
        let resp = ah.getMobileFileMetadata('1234', 'en-US');
        console.log(resp);
        expect(resp).be.a('promise');
      });
    });
  });
});

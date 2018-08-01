'use strict';
const sinon = require('sinon');
const ScoutUser = require('../../data/models/ScoutUser');
const assert = require('chai').assert;
const db = require('../../data/database');
const Database = new db();

describe('database', function() {
  afterEach(function() {
    sinon.restore();
  });

  describe('processScoutUser', function() {
    describe('existing user', function() {
      let userid = 'existing-user@test.com';
      let token = 'token';
      const user = new ScoutUser({
        pocket_user_id: userid,
        pocket_access_token: token
      });
      beforeEach(function() {
        sinon.replace(ScoutUser.prototype, 'save', sinon.fake());
        sinon.replace(ScoutUser, 'get', sinon.fake.returns(user));
      });
      it('Call once to ScoutUser.get', async () => {
        await Database.processScoutUser(userid, token);
        assert(
          ScoutUser.get.calledWithMatch({
            pocket_user_id: userid
          })
        );
        assert.equal(ScoutUser.get.callCount, 1);
      });

      it('Call once to save', async () => {
        await Database.processScoutUser(userid, token);
        assert.equal(ScoutUser.prototype.save.callCount, 1);
      });
    });
    describe('new user', function() {
      let userid = 'new-user@test.com';
      let token = 'newtoken';
      beforeEach(function() {
        sinon.replace(ScoutUser.prototype, 'save', sinon.fake());
        sinon.replace(ScoutUser, 'get', sinon.fake());
      });
      it('Call once to getAccessToken', async () => {
        await Database.processScoutUser(userid, token);
        assert(
          ScoutUser.get.calledWithMatch({
            pocket_user_id: userid
          })
        );
        assert.equal(ScoutUser.get.callCount, 1);
      });

      it('Call once to save', async () => {
        await Database.processScoutUser(userid, token);
        assert.equal(ScoutUser.prototype.save.callCount, 1);
      });
    });
    describe('db throws error', function() {
      let userid = 'user@test.com';
      let token = 'token';
      beforeEach(function() {
        sinon.replace(ScoutUser.prototype, 'save', sinon.fake.throws('error'));
        sinon.replace(ScoutUser, 'get', sinon.fake.throws('error'));
      });
      it('Call once to ScoutUser.get', async () => {
        await Database.processScoutUser(userid, token);
        assert(
          ScoutUser.get.calledWithMatch({
            pocket_user_id: userid
          })
        );
        assert.equal(ScoutUser.get.callCount, 1);
      });

      it('No call to save', async () => {
        await Database.processScoutUser(userid, token);
        assert.equal(ScoutUser.prototype.save.callCount, 0);
      });
    });
  });

  describe('getAccessToken', function() {
    describe('existing user', function() {
      let userid = 'existing-user@test.com';
      beforeEach(function() {
        sinon.replace(
          ScoutUser,
          'get',
          sinon.fake.returns(
            new ScoutUser({
              pocket_user_id: userid,
              pocket_access_token: 'token'
            })
          )
        );
      });

      it('Call once to ScoutUser.get', async () => {
        await Database.getAccessToken(userid);
        assert(
          ScoutUser.get.calledWithMatch({
            pocket_user_id: userid
          })
        );
        assert.equal(ScoutUser.get.callCount, 1);
      });

      it('Should return token', async () => {
        let result = await Database.getAccessToken(userid);
        assert.equal(result, 'token');
      });
    });
    describe('unregistered user', function() {
      let userid = 'unregistered-user@test.com';
      beforeEach(function() {
        sinon.replace(ScoutUser, 'get', sinon.fake());
      });
      it('Should throw error', async function() {
        try {
          await Database.getAccessToken(userid);
        } catch (error) {
          assert.equal(error, 'No user token');
        }
      });
    });
  });
});

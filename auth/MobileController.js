'use strict';

const express = require('express');
const router = express.Router();
const rp = require('request-promise');
const scoutuser = require('../scout_user');
const DynamoScout = require('../models/ScoutUser');
const url = require('url');

var pocketConsumerKey, userAuthKey;

const oathRequestOptions = {
  uri: 'https://getpocket.com/v3/oauth/request',
  method: 'POST',
  body: '',
  headers: {
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Accept': 'application/json'
  }
};

const finalAuthorizeOptions = {
  uri: 'https://getpocket.com/v3/oauth/authorize',
  method: 'POST',
  body: '',
  headers: {
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Accept': 'application/json'
  }
};

// Read the configuration file for pocket info.
pocketConsumerKey = process.env.POCKET_KEY;

//
// Pocket Auth Flows
//
router.get('/login', function(req, res) {
  const requrl = url.format({
    protocol: req.protocol,
    host: req.get('host')
  });
  const redirUri = `${requrl}/api/auth/mobile/redirecturi`;
  console.log(`redirUri = ${redirUri}`);

  var oauthBody = {
    consumer_key: pocketConsumerKey,
    redirect_uri: redirUri
  };
  oathRequestOptions.body = JSON.stringify(oauthBody);
  rp(oathRequestOptions).then(function(body) {
    let jsonBody = JSON.parse(body);
    userAuthKey = jsonBody.code;

    var redir =
      `https://getpocket.com/auth/authorize` +
      `?request_token=${userAuthKey}&redirect_uri=${redirUri}`;
    return res.redirect(redir);
  });
});

router.get('/redirecturi', function(req, res) {
  var authBody = {
    consumer_key: pocketConsumerKey,
    code: userAuthKey
  };
  finalAuthorizeOptions.body = JSON.stringify(authBody);
  console.log('calling redirect');

  rp(finalAuthorizeOptions)
    .then(function(body) {
      let jsonBody = JSON.parse(body);
      const pocketUserAccessToken = jsonBody.access_token;
      const pocketUserId = jsonBody.username;

      // Save to the config to scoutuser data
      console.log(`Authorized: ${pocketUserId}/${pocketUserAccessToken}`);
      processScoutUser(pocketUserId, pocketUserAccessToken);
      processScoutUserDynamo(pocketUserId, pocketUserAccessToken);
    })
    .catch(function(err) {
      console.log('Call failed' + err);
    });
  res.status(200).send('OK');
});

async function processScoutUser(userid, access_token) {
  try {
    let existingScoutuser = await scoutuser.findOne({ userid });
    if (existingScoutuser) {
      console.log('Updating existing Scoutuser');
      existingScoutuser.access_token = access_token;
      await existingScoutuser.save();
    } else {
      console.log(`Creating new Scoutuser`);
      let newScoutuser = await scoutuser.create({
        userid,
        access_token
      });
      console.log(`Created ScoutUser in DB: ${newScoutuser}`);
    }
  } catch (err) {
    console.log(`Scoutuser operation failed: ${err}`);
  }
}

async function processScoutUserDynamo(userid, access_token) {
  try {
    console.error(userid);

    const suser = await DynamoScout.get({ pocket_user_id: userid });
    if (suser) {
      console.log('Found existing Dynamo user');
      suser.pocket_access_token = access_token;
      // suser.updated_at = Date.now;
      await suser.save();
    } else {
      console.log(`Creating new Dynamo user`);
      const newuser = new DynamoScout({
        pocket_user_id: userid,
        pocket_access_token: access_token
      });
      await newuser.save();
    }
  } catch (err) {
    console.log(`Scoutuser DYNAMO operation failed: ${err}`);
  }
}

module.exports = router;

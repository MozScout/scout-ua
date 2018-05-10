const express = require('express');
const router = express.Router();
const rp = require('request-promise');
const url = require('url');
const Database = require('../data/database');
const database = new Database();

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
    .then(async function(body) {
      let jsonBody = JSON.parse(body);
      const pocketUserAccessToken = jsonBody.access_token;
      const pocketUserId = jsonBody.username;

      // Save to the config to scoutuser data
      console.log(`Authorized: ${pocketUserId}/${pocketUserAccessToken}`);
      await database.processScoutUser(pocketUserId, pocketUserAccessToken);
    })
    .catch(function(err) {
      console.log('Call failed' + err);
    });
  res.status(200).send('OK');
});

module.exports = router;

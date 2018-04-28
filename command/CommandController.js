var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
var VerifyToken = require('../VerifyToken');
var rp = require('request-promise');
const texttools = require('./texttools');
var mongoose = require('mongoose');
var scoutuser = require('../scout_user');
mongoose.connect(process.env.MONGO_STRING, {});
var polly_tts = require('./polly_tts');
var jwt = require('jsonwebtoken');
const url = require('url');

const pocketRecOptions = {
  uri:
    'https://getpocket.cdn.mozilla.net/v3/firefox/global-recs?' +
    'count=3&version=3&consumer_key=' +
    process.env.POCKET_KEY,
  method: 'GET'
};

const getOptions = {
  uri: 'https://getpocket.com/v3/get',
  method: 'POST',
  body: '',
  headers: {
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Accept': 'application/json'
  }
};

const articleOptions = {
  uri: 'https://text.getpocket.com/v3/text',
  method: 'POST',
  body: '',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'X-Accept': 'application/json'
  }
};

const summaryLink =
  'https://api.smmry.com?SM_API_KEY=' + process.env.SM_API_KEY + '&SM_URL=';
console.log('SummaryLink Creation is: ' + summaryLink);
const summaryOptions = {
  uri: '',
  method: 'GET',
  body: '',
  headers: {
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Accept': 'application/json'
  }
};

function getAccessToken(userid) {
  console.log(`getAccessToken for ${userid}`);
  return new Promise((resolve, reject) => {
    scoutuser.findOne({ userid: userid }, function(err, user) {
      if (err) {
        reject('query failed:' + err);
      } else {
        if (user) {
          console.log('Got token from db: ' + user.access_token);
          resolve(user.access_token);
        } else {
          console.log('No user token found');
          reject('No user token');
        }
      }
    });
  });
}

router.post('/intent', VerifyToken, function(req, res) {
  console.log(`Command = ${req.body.cmd}`);

  var token = req.headers['x-access-token'];
  if (!token)
    return res.status(401).send({
      auth: false,
      message: 'No token provided.'
    });

  jwt.verify(token, process.env.JWT_SECRET, function(err) {
    if (err)
      return res.status(500).send({
        auth: false,
        message: 'Failed to authenticate token.'
      });

    // Get the Access Token from the DB.
    getAccessToken(req.body.userid)
      .then(theToken => {
        res.setHeader('Content-Type', 'application/json');
        var getBody = {
          consumer_key: process.env.POCKET_KEY,
          access_token: theToken,
          detailType: 'complete'
        };

        switch (req.body.cmd) {
          case 'ScoutTitles':
            scoutTitles(getBody, res);
            break;
          case 'SearchAndPlayArticle':
            // Searches for an article with the search term in the request
            // and returns the text of that article after converting it to
            // a readable format.
            getBody.search = req.body.searchTerms;
            getOptions.body = JSON.stringify(getBody);
            searchAndPlayArticle(getOptions, req, res);
            break;
          case 'ScoutMyPocketSummary':
            getBody.count = '3';
            getOptions.body = JSON.stringify(getBody);
            scoutSummaries(getOptions, 'list', 'given_url', res);
            break;
          // Gets the global pocket recommendation and summarizes first three.
          case 'ScoutHeadlines':
            console.log('Processing ScoutHeadlines: ' + process.env.POCKET_KEY);
            scoutSummaries(pocketRecOptions, 'recommendations', 'url', res);
            break;
          default:
            break;
        }
      })
      .catch(reason => {
        console.log('database err: ', reason);
        let errSpeech =
          'Unable to connect to Pocket.' + '  Please relink your account.';
        res.status(404).send(JSON.stringify({ speech: errSpeech }));
      });
  });
});

function scoutSummaries(getOptions, jsonBodyAttr, urlAttr, res) {
  // Gets the user's Pocket titles and summarizes first three.
  rp(getOptions)
    .then(function(body) {
      var jsonBody = JSON.parse(body);
      if (jsonBody.status == '1') {
        let summLoop = function() {
          let promiseArray = [];
          let arrJson = jsonBody[jsonBodyAttr];
          Object.keys(arrJson).forEach(key => {
            summaryOptions.uri = summaryLink + arrJson[key][urlAttr];
            console.log('Summary link is: ' + summaryLink);
            console.log('Summary uri is: ' + summaryOptions.uri);
            promiseArray.push(
              rp(summaryOptions)
                .then(function(sumResults) {
                  console.log(sumResults);
                  return sumResults;
                })
                .catch(function(err) {
                  console.log('Caught an error: ' + err);
                })
            );
          });
          return Promise.all(promiseArray);
        };

        let sumRes = summLoop();
        sumRes
          .then(function(sumVal) {
            let textResponse = '';
            sumVal.forEach(function(element) {
              var sumBody = JSON.parse(element);
              // Link up the response text for all summaries
              if (sumBody.sm_api_character_count) {
                // TODO: Right now, some of the pages are not
                // parseable. Want to change this later to allow
                // it to get 3 that are parseable.
                let title_modified = sumBody.sm_api_title.replace('\\', '');
                let content_modified = sumBody.sm_api_content.replace('\\', '');
                console.log('title modified: ' + title_modified);
                textResponse +=
                  'Here is a summary of: ' +
                  title_modified +
                  '.  ' +
                  content_modified;
              }
            });
            console.log('Text response is: ' + textResponse);
            var cleanText = texttools.cleanText(textResponse);
            var chunkText = texttools.chunkText(cleanText);
            return polly_tts.getSpeechSynthUrl(chunkText);
          })
          .then(function(url) {
            res.status(200).send(JSON.stringify({ url: url }));
          })
          .catch(function(err) {
            res
              .status(500)
              .send(JSON.stringify({ speech: 'Summary Engine error' }));
            console.log('Error parsing: ' + err);
          });
      } else {
        console.log('Searching for the article failed to find a match');
        throw 'NoSearchMatch';
      }
    })
    .catch(reason => {
      console.log('caught an error: ', reason);
      let errSpeech = '';
      switch (reason) {
        case 'NoSearchMatch':
          errSpeech =
            'Unable to find a matching article.  ' + 'Try another phrase.';
          break;
        default:
          errSpeech = 'There was an error finding the article.';
          break;
      }
      res.status(404).send(JSON.stringify({ speech: errSpeech }));
    });
}

// Get the user's titles from Pocket and lists out all the titles.
function scoutTitles(getBody, res) {
  const wordsPerMinute = 100;
  getOptions.body = JSON.stringify(getBody);
  rp(getOptions)
    .then(function(body) {
      var jsonBody = JSON.parse(body);
      if (jsonBody.status == '1') {
        console.log(jsonBody);
        let speech = '';
        let articles = [];

        // process list of articles
        Object.keys(jsonBody.list).forEach(key => {
          if (jsonBody.list[key].resolved_title) {
            const title = jsonBody.list[key].resolved_title;
            const imageURL = jsonBody.list[key].top_image_url;
            const host = url.parse(jsonBody.list[key].resolved_url).hostname;

            let lengthMinutes;
            const wordCount = jsonBody.list[key].word_count;
            if (wordCount) {
              lengthMinutes = Math.floor(
                parseInt(wordCount, 10) / wordsPerMinute
              );
            }

            let author;
            const authors = jsonBody.list[key].authors;
            for (const auth in authors) {
              author = author
                ? `${author}, ${authors[auth].name}`
                : authors[auth].name;
            }

            articles.push({
              item_id: jsonBody.list[key].item_id,
              title,
              source: host,
              author,
              lengthMinutes,
              imageURL
            });
            speech = `${speech} ${articles.length}. ${title}. `;
          }
        });

        const result = { speech, articles };
        res.status(200).send(JSON.stringify(result));
      }
    })
    .catch(function(err) {
      res.status(404).send(JSON.stringify({ speech: 'Wow.  Amazing.' }));
      console.log('Failed to get to pocket');
      console.log(err);
    });
}

async function searchAndPlayArticle(getOptions, req, res) {
  try {
    console.log('Search term is: ' + req.body.searchTerms);
    let body = await rp(getOptions);
    var jsonBody = JSON.parse(body);
    if (jsonBody.status == '1') {
      let keysArr = Object.keys(jsonBody.list);
      console.log('keysarr = ', keysArr);
      if (keysArr.length > 0) {
        const audioUrl = await createAudio(jsonBody.list[keysArr[0]].given_url);
        res.status(200).send(JSON.stringify({ url: audioUrl }));
      } else {
        throw 'NoKeys';
      }
    } else {
      console.log(
        `Searching for '${
          req.body.searchTerms
        }' failed to find a matching article.`
      );
      throw 'NoSearchMatch';
    }
  } catch (reason) {
    console.log('searchAndPlayArticle error: ', reason);
    let errSpeech = '';
    switch (reason) {
      case 'NoSearchMatch':
        errSpeech = 'Unable to find a matching article. Try another phrase.';
        break;
      default:
        errSpeech = 'There was an error finding the article.';
        break;
    }
    res.status(404).send(JSON.stringify({ speech: errSpeech }));
  }
}

router.post('/article/audio', VerifyToken, async function(req, res) {
  try {
    const audioUrl = await createAudio(req.body.url);
    res.status(200).send(JSON.stringify({ url: audioUrl }));
  } catch (reason) {
    console.log('caught an error: ', reason);
    let errSpeech = `There was an error finding the article. ${reason}`;
    res.status(404).send(JSON.stringify({ speech: errSpeech }));
  }
});

async function createAudio(url) {
  articleOptions.formData = {
    consumer_key: process.env.POCKET_KEY,
    url,
    images: '0',
    videos: '0',
    refresh: '0',
    output: 'json'
  };
  const articleBody = await rp(articleOptions);
  console.log('received body', articleBody);
  var artBody = JSON.parse(articleBody);
  var cleanText = texttools.cleanText(artBody.article);
  var chunkText = texttools.chunkText(cleanText);
  console.log('chunkText is: ', chunkText.length, chunkText);
  return polly_tts.getSpeechSynthUrl(chunkText);
}

module.exports = router;

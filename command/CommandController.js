const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const VerifyToken = require('../VerifyToken');
const rp = require('request-promise');
const texttools = require('./texttools');
const polly_tts = require('./polly_tts');
const Database = require('../data/database');
const database = new Database();

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

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
  timeout: 3000,
  headers: {
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Accept': 'application/json'
  }
};

router.post('/intent', VerifyToken, function(req, res) {
  console.log(`Command = ${req.body.cmd}`);

  // Get the Access Token from the DB.
  database
    .getAccessToken(req.body.userid)
    .then(theToken => {
      res.setHeader('Content-Type', 'application/json');
      var getBody = {
        consumer_key: process.env.POCKET_KEY,
        access_token: theToken,
        detailType: 'complete',
        sort: 'newest'
      };

      switch (req.body.cmd) {
        case 'ScoutTitles':
          scoutTitles(getBody, res);
          break;
        case 'SearchAndPlayArticle':
        case 'SearchAndSummarizeArticle':
          getBody.search = req.body.searchTerms;
          getOptions.body = JSON.stringify(getBody);
          searchAndPlayArticle(
            getOptions,
            req,
            res,
            req.body.cmd === 'SearchAndSummarizeArticle'
          );
          break;
        case 'ScoutMyPocket':
          getBody.count = '3';
          getOptions.body = JSON.stringify(getBody);
          scoutSummaries(getOptions, 'list', 'given_url', 'given_title', res);
          break;
        // Gets the global pocket recommendation and summarizes first three.
        case 'ScoutHeadlines':
          console.log('Processing ScoutHeadlines: ' + process.env.POCKET_KEY);
          scoutSummaries(
            pocketRecOptions,
            'recommendations',
            'url',
            'title',
            res
          );
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

router.post('/article', VerifyToken, async function(req, res) {
  try {
    const audioUrl = await buildAudioFromUrl(req.body.url);
    res.status(200).send(JSON.stringify({ url: audioUrl }));
  } catch (reason) {
    console.log('caught an error: ', reason);
    const errSpeech = `There was an error finding the article. ${reason}`;
    res.status(404).send(JSON.stringify({ speech: errSpeech }));
  }
});

router.post('/summary', VerifyToken, async function(req, res) {
  try {
    const summaryUrl = await buildSummaryAudioFromUrl(req.body.url);
    res.status(200).send(JSON.stringify({ url: summaryUrl }));
  } catch (reason) {
    console.log('Error in /summary ', reason);
    const errSpeech = `There was an error processing the article. ${reason}`;
    res.status(404).send(JSON.stringify({ speech: errSpeech }));
  }
});

function scoutSummaries(getOptions, jsonBodyAttr, urlAttr, titleAttr, res) {
  // Gets the user's Pocket titles and summarizes first three.
  console.log('jsonboddyattr=', jsonBodyAttr);
  console.log('urlattr=', urlAttr);
  rp(getOptions)
    .then(function(body) {
      const jsonBody = JSON.parse(body);
      if (jsonBody.status == '1') {
        let summLoop = function() {
          let promiseArray = [];
          let arrJson = jsonBody[jsonBodyAttr];
          Object.keys(arrJson).forEach(key => {
            summaryOptions.uri = summaryLink + arrJson[key][urlAttr];
            console.log('Summary uri is: ' + summaryOptions.uri);
            promiseArray.push(
              rp(summaryOptions)
                .then(sumResults => {
                  let sumResultsJson = JSON.parse(sumResults);
                  sumResultsJson['title'] = arrJson[key][titleAttr];
                  return sumResultsJson;
                })
                .catch(function(err) {
                  console.log('Caught an error: ' + err);
                  return JSON.stringify({});
                })
            );
          });
          console.log('RETURNING PROMISE.ALL ' + Date.now());
          return Promise.all(promiseArray);
        };

        summLoop()
          .then(function(sumVal) {
            let textResponse = '';
            sumVal.forEach(function(element) {
              // Link up the response text for all summaries
              if (element.sm_api_character_count) {
                // TODO: Right now, some of the pages are not
                // parseable. Want to change this later to allow
                // it to get 3 that are parseable.
                textResponse += texttools.buildSummaryText(
                  element.title,
                  element.sm_api_content
                );
              } else {
                console.log('no data.  Summary must have failed.');
              }
            });
            console.log('Text response is: ' + textResponse);
            console.log('Time to get summaries: ' + Date.now());
            return buildAudioFromText(textResponse);
          })
          .then(function(url) {
            console.log('Time to buildAudioFromText ' + Date.now());
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
  const wordsPerMinute = 155;
  getOptions.body = JSON.stringify(getBody);
  rp(getOptions)
    .then(function(body) {
      const jsonBody = JSON.parse(body);
      if (jsonBody.status === 1 || jsonBody.status === 2) {
        console.log(jsonBody);
        let articles = [];

        // process list of articles
        Object.keys(jsonBody.list).forEach(key => {
          if (jsonBody.list[key].resolved_title) {
            const title = jsonBody.list[key].resolved_title;
            const imageURL = jsonBody.list[key].top_image_url;
            const resolved_url = jsonBody.list[key].resolved_url;

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
              sort_id: jsonBody.list[key].sort_id,
              resolved_url,
              title,
              author,
              lengthMinutes,
              imageURL
            });
          }
        });

        articles.sort((a, b) => {
          return a.sort_id - b.sort_id;
        });

        res.status(200).send(JSON.stringify({ articles }));
      } else {
        res.status(500).send(
          JSON.stringify({
            error: `Unknown status from Pocket: ${jsonBody.status}`
          })
        );
      }
    })
    .catch(function(err) {
      res.status(404).send(JSON.stringify({ speech: 'Wow.  Amazing.' }));
      console.log('Failed to get to pocket');
      console.log(err);
    });
}

async function searchAndPlayArticle(getOptions, req, res, summaryOnly) {
  try {
    console.log('Search term is: ' + req.body.searchTerms);
    const body = await rp(getOptions);
    const jsonBody = JSON.parse(body);
    if (jsonBody.status == '1') {
      const keysArr = Object.keys(jsonBody.list);
      console.log('keysarr = ', keysArr);
      if (keysArr.length > 0) {
        const articleUrl = jsonBody.list[keysArr[0]].given_url;
        let audioUrl;
        if (summaryOnly) {
          audioUrl = await buildSummaryAudioFromUrl(articleUrl);
        } else {
          audioUrl = await buildAudioFromUrl(articleUrl);
        }
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

async function buildAudioFromUrl(url) {
  articleOptions.formData = {
    consumer_key: process.env.POCKET_KEY,
    url,
    images: '0',
    videos: '0',
    refresh: '0',
    output: 'json'
  };
  const article = JSON.parse(await rp(articleOptions));
  return buildAudioFromText(`${article.title}. ${article.article}`);
}

async function buildSummaryAudioFromUrl(url) {
  summaryOptions.uri = summaryLink + url;
  const sumResults = JSON.parse(await rp(summaryOptions));
  if (sumResults.sm_api_character_count) {
    const summaryURL = await buildAudioFromText(
      texttools.buildSummaryText(
        sumResults.sm_api_title,
        sumResults.sm_api_content
      )
    );
    return summaryURL;
  } else {
    throw 'No summary available';
  }
}

async function buildAudioFromText(textString) {
  const cleanText = texttools.cleanText(textString);
  const chunkText = texttools.chunkText(cleanText);
  console.log('chunkText is: ', chunkText.length, chunkText);
  return polly_tts.getSpeechSynthUrl(chunkText);
}

module.exports = router;

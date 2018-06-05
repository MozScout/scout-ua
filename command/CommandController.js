const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const VerifyToken = require('../VerifyToken');
const rp = require('request-promise');
const texttools = require('./texttools');
const polly_tts = require('./polly_tts');
const AudioFileHelper = require('./AudioFileHelper');
const audioHelper = new AudioFileHelper();
const Database = require('../data/database');
const database = new Database();
const HostnameHelper = require('./HostnameHelper.js');
const hostnameHelper = new HostnameHelper();

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

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

async function buildPocketRequestBody(pocketUserId) {
  const pocketToken = await database.getAccessToken(pocketUserId);
  return {
    consumer_key: process.env.POCKET_KEY,
    access_token: pocketToken,
    detailType: 'complete',
    sort: 'newest',
    count: 50
  };
}

router.post('/intent', VerifyToken, async function(req, res) {
  try {
    console.log(`Command = ${req.body.cmd}`);
    res.setHeader('Content-Type', 'application/json');
    const getBody = await buildPocketRequestBody(req.body.userid);
    switch (req.body.cmd) {
      case 'ScoutTitles':
        scoutTitles(getBody, res, req.body.extendedData == true);
        break;
      case 'SearchAndPlayArticle':
      case 'SearchAndSummarizeArticle':
        searchAndPlayArticle(
          res,
          getBody,
          req.body.searchTerms,
          req.body.cmd === 'SearchAndSummarizeArticle',
          req.body.extendedData == true
        );
        break;
      case 'ScoutMyPocket':
        getBody.count = '3';
        getOptions.body = JSON.stringify(getBody);
        scoutSummaries(getOptions, 'list', 'given_url', 'given_title', res);
        break;
      default:
        break;
    }
  } catch (reason) {
    console.log('database err: ', reason);
    let errSpeech = 'Unable to connect to Pocket. Please relink your account.';
    res.status(404).send(JSON.stringify({ speech: errSpeech }));
  }
});

router.post('/article', VerifyToken, async function(req, res) {
  console.log(`GET /article: ${req.body.url}`);
  try {
    res.setHeader('Content-Type', 'application/json');
    const result = await processArticleRequest(
      req,
      false,
      req.body.extendedData == true
    );
    res.status(200).send(JSON.stringify(result));
  } catch (reason) {
    console.log('Error in /article ', reason);
    const errSpeech = `There was an error processing the article. ${reason}`;
    res.status(404).send(JSON.stringify({ speech: errSpeech }));
  }
});

router.post('/summary', VerifyToken, async function(req, res) {
  console.log(`GET /summary: ${req.body.url}`);
  try {
    res.setHeader('Content-Type', 'application/json');
    const result = await processArticleRequest(
      req,
      true,
      req.body.extendedData == true
    );
    res.status(200).send(JSON.stringify(result));
  } catch (reason) {
    console.log('Error in /summary ', reason);
    const errSpeech = `There was an error processing the article. ${reason}`;
    res.status(404).send(JSON.stringify({ speech: errSpeech }));
  }
});

async function processArticleRequest(req, summaryOnly, extendedData) {
  const getBody = await buildPocketRequestBody(req.body.userid);
  let result = await searchForPocketArticle(
    getBody,
    req.body.url,
    extendedData
  );

  let audioUrl;
  if (result && result.item_id) {
    // we have a matching pocket item. do we already have the audio file?
    audioUrl = await audioHelper.getAudioFileLocation(
      result.item_id,
      summaryOnly
    );
  }

  // if we didn't find it in the DB, create the audio file
  if (!audioUrl) {
    if (summaryOnly) {
      audioUrl = await buildSummaryAudioFromUrl(req.body.url);
    } else {
      audioUrl = await buildAudioFromUrl(req.body.url);
    }

    if (result) {
      await audioHelper.storeAudioFileLocation(
        result.item_id,
        summaryOnly,
        audioUrl
      );
    }
  }

  if (result) {
    result.url = audioUrl;
  } else {
    result = { url: audioUrl };
  }
  return result;
}

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

function scoutTitles(getBody, res, extendedData) {
  getOptions.body = JSON.stringify(getBody);
  rp(getOptions)
    .then(function(body) {
      const jsonBody = JSON.parse(body);
      if (jsonBody.status === 1 || jsonBody.status === 2) {
        //console.log(jsonBody);
        let articlesPromises = [];

        // process list of articles
        Object.keys(jsonBody.list).forEach(key => {
          if (jsonBody.list[key].resolved_title) {
            articlesPromises.push(
              getArticleMetadata(jsonBody.list[key], extendedData)
            );
          }
        });

        Promise.all(articlesPromises).then(function(values) {
          hostnameHelper.clearCurrentRequests();
          let articles = [];

          values.forEach(function(value) {
            articles.push(value);
          });

          articles.sort((a, b) => {
            return a.sort_id - b.sort_id;
          });

          res.status(200).send(JSON.stringify({ articles }));
        });
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

/**
 * Takes a full article object retrieved from Pocket's /get API and
 * extracts the fields we use.
 */
async function getArticleMetadata(pocketArticle, extendedData) {
  const wordsPerMinute = 155;
  let lengthMinutes;
  const wordCount = pocketArticle.word_count;
  if (wordCount) {
    lengthMinutes = Math.floor(parseInt(wordCount, 10) / wordsPerMinute);
  }

  let author;
  const authors = pocketArticle.authors;
  for (const auth in authors) {
    author = author ? `${author}, ${authors[auth].name}` : authors[auth].name;
  }

  const result = {
    item_id: pocketArticle.item_id,
    sort_id: pocketArticle.sort_id,
    resolved_url: pocketArticle.resolved_url,
    title: pocketArticle.resolved_title,
    author,
    lengthMinutes,
    imageURL: pocketArticle.top_image_url
  };

  if (extendedData) {
    try {
      const faviconData = await hostnameHelper.getHostnameData(
        pocketArticle.resolved_url
      );
      result.publisher = faviconData.publisher_name;
      result.icon_url = faviconData.favicon_url;
    } catch (err) {
      result.publisher = hostnameHelper.getHostname(pocketArticle.resolved_url);
      result.icon_url = '';
    }
  }
  return result;
}

/**
 * Looks for an article in user's account that matches the searchTerm,
 * and if found, returns metadata for it. Otherwise undefined.
 */
async function searchForPocketArticle(getBody, searchTerm, extendedData) {
  console.log('Search term is: ', searchTerm);
  getBody.search = searchTerm;
  getOptions.body = JSON.stringify(getBody);
  const body = await rp(getOptions);
  const jsonBody = JSON.parse(body);
  let result;
  if (jsonBody.status == '1') {
    const keysArr = Object.keys(jsonBody.list);
    console.log('keysarr = ', keysArr);
    if (keysArr.length > 0) {
      result = await getArticleMetadata(
        jsonBody.list[keysArr[0]],
        extendedData
      );
    }
  } else {
    console.log(
      `Searching for '${searchTerm}' failed to find a matching article.`
    );
  }
  return result;
}

async function searchAndPlayArticle(
  res,
  getBody,
  searchTerm,
  summaryOnly,
  extendedData
) {
  try {
    const articleInfo = await searchForPocketArticle(
      getBody,
      searchTerm,
      extendedData
    );
    if (articleInfo) {
      console.log(articleInfo);

      // do we already have the audio file?
      let audioUrl = await audioHelper.getAudioFileLocation(
        articleInfo.item_id,
        summaryOnly
      );

      // if we didn't find it in the DB, create the audio file
      if (!audioUrl) {
        if (summaryOnly) {
          audioUrl = await buildSummaryAudioFromUrl(articleInfo.resolved_url);
        } else {
          audioUrl = await buildAudioFromUrl(articleInfo.resolved_url);
        }

        await audioHelper.storeAudioFileLocation(
          articleInfo.item_id,
          summaryOnly,
          audioUrl
        );
      }
      articleInfo.url = audioUrl;
      res.status(200).send(JSON.stringify(articleInfo));
    } else {
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

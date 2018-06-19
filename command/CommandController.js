const express = require('express');
const bodyParser = require('body-parser');
const natural = require('natural');
const rp = require('request-promise');
const VerifyToken = require('../VerifyToken');
const texttools = require('./texttools');
const polly_tts = require('./polly_tts');
const AudioFileHelper = require('./AudioFileHelper');
const audioHelper = new AudioFileHelper();
const Database = require('../data/database');

const router = express.Router();
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

const modifyPocketUser = {
  uri: 'https://getpocket.com/v3/send',
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
    switch (req.body.cmd) {
      case 'ScoutTitles':
        scoutTitles(
          req.body.userid,
          res,
          req.body.extendedData == true || req.body.extended_data == true
        );
        break;
      case 'SearchAndPlayArticle':
      case 'SearchAndSummarizeArticle':
        searchAndPlayArticle(
          res,
          req.body.userid,
          req.body.searchTerms ? req.body.searchTerms : req.body.search_terms,
          req.body.cmd === 'SearchAndSummarizeArticle',
          req.body.extendedData == true || req.body.extended_data == true
        );
        break;
      case 'ScoutMyPocket':
        scoutSummaries(
          req.body.userid,
          'list',
          'given_url',
          'given_title',
          res
        );
        break;
      case 'Archive':
        archiveTitle(req.body.userid, req.body.itemid, res);
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
      req.body.extendedData == true || req.body.extended_data == true
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
      req.body.extendedData == true || req.body.extended_data == true
    );
    res.status(200).send(JSON.stringify(result));
  } catch (reason) {
    console.log('Error in /summary ', reason);
    const errSpeech = `There was an error processing the article. ${reason}`;
    res.status(404).send(JSON.stringify({ speech: errSpeech }));
  }
});

router.get('/search', VerifyToken, async function(req, res) {
  try {
    const titles = await getTitlesFromPocket(
      req.query.userid,
      req.body.extendedData == true || req.body.extended_data == true
    );
    const article = await findBestScoringTitle(req.query.q, titles.articles);
    const result = `Search for: ${req.query.q}, identified article: ${
      article.title
    }`;
    res.send(result);
  } catch (err) {
    res.sendStatus(404);
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

async function scoutSummaries(userid, jsonBodyAttr, urlAttr, titleAttr, res) {
  // Gets the user's Pocket titles and summarizes first three.
  const getBody = await buildPocketRequestBody(userid);
  getBody.count = '3';
  getOptions.body = JSON.stringify(getBody);

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

async function getTitlesFromPocket(userid, extendedData) {
  try {
    const getBody = await buildPocketRequestBody(userid);

    getOptions.body = JSON.stringify(getBody);
    const body = await rp(getOptions);
    const jsonBody = JSON.parse(body);
    const result = { status: jsonBody.status };
    if (jsonBody.status === 1 || jsonBody.status === 2) {
      let articlesPromises = [];

      // process list of articles
      Object.keys(jsonBody.list).forEach(key => {
        if (jsonBody.list[key].resolved_title) {
          articlesPromises.push(
            getArticleMetadata(jsonBody.list[key], extendedData)
          );
        }
      });
      return Promise.all(articlesPromises).then(function(values) {
        let articles = [];

        values.forEach(function(value) {
          articles.push(value);
        });

        articles.sort((a, b) => {
          return a.sort_id - b.sort_id;
        });

        result.articles = articles;
        return result;
      });
    } else {
      return result;
    }
  } catch (err) {
    if (err.statusCode === 401) throw 'Unauthorized -- re-link Pocket account';
    else throw err;
  }
}

async function scoutTitles(userid, res, extendedData) {
  try {
    const titleObj = await getTitlesFromPocket(userid, extendedData);
    if (titleObj && titleObj.articles) {
      res.status(200).send(JSON.stringify({ articles: titleObj.articles }));
    } else {
      res.status(500).send(
        JSON.stringify({
          error: `Unknown status from Pocket: ${titleObj.status}`
        })
      );
    }
  } catch (err) {
    res
      .status(404)
      .send(JSON.stringify({ speech: `Error getting titles: ${err}` }));
    console.log(`Error getting titles: ${err}`);
  }
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
    length_minutes: lengthMinutes,
    imageURL: pocketArticle.top_image_url,
    image_url: pocketArticle.top_image_url
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
 * Archive a title for the Pocket User
 */
async function archiveTitle(userId, itemId, res) {
  try {
    const getBody = await buildPocketRequestBody(userId);
    getBody.actions = [
      {
        action: 'archive',
        item_id: itemId
      }
    ];
    modifyPocketUser.body = JSON.stringify(getBody);
    const body = await rp(modifyPocketUser);
    const jsonBody = JSON.parse(body);
    if (jsonBody.action_results[0]) {
      res.status(200).send(JSON.stringify({ success: true }));
    } else {
      res.status(500).send(
        JSON.stringify({
          success: false,
          error: `Unknown status from Pocket during Archiving.`
        })
      );
    }
  } catch (err) {
    if (err.statusCode === 401) throw 'Unauthorized -- re-link Pocket account';
    else throw err;
  }
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
  pocketuserid,
  searchTerm,
  summaryOnly,
  extendedData
) {
  try {
    console.log('Search term is: ', searchTerm);
    const titles = await getTitlesFromPocket(pocketuserid, extendedData);
    const articleInfo = await findBestScoringTitle(searchTerm, titles.articles);

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

function findBestScoringTitle(searchPhrase, articleMetadataArray) {
  return new Promise((resolve, reject) => {
    natural.PorterStemmer.attach();
    //tokenize and stem the search utterance that user said
    let wordsStem = searchPhrase.tokenizeAndStem();

    let tfidf = new natural.TfIdf();
    //tokenize and Stem each title and then add to our dataset
    for (var i = 0; i < articleMetadataArray.length; i++) {
      console.log(articleMetadataArray[i].title);
      let stemmed = articleMetadataArray[i].title.tokenizeAndStem();
      tfidf.addDocument(stemmed);
    }

    let maxValue = 0;
    let curMaxIndex = 0;
    let iCount = 0;
    tfidf.tfidfs(wordsStem, function(i, measure) {
      console.log('document #' + i + ' is ' + measure);
      if (measure > maxValue) {
        maxValue = measure;
        curMaxIndex = i;
      }
      iCount++;
      if (iCount >= articleMetadataArray.length) {
        console.log('Done getting results.');
        console.log('Max Score is: ' + maxValue);
        console.log('Article is: ' + articleMetadataArray[curMaxIndex].title);
        if (maxValue === 0) {
          reject('NoMatchFound');
        }
        resolve(articleMetadataArray[curMaxIndex]);
      }
    });
  });
}

module.exports = router;

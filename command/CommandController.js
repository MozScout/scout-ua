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
const ArticleStatusHelper = require('../articlestatus/ArticleStatusHelper.js');
const astatHelper = new ArticleStatusHelper();
const ua = require('universal-analytics');
const logger = require('../logger');
const vc = require('./voiceChoice');

const router = express.Router();
const database = new Database();
const HostnameHelper = require('./HostnameHelper.js');
const hostnameHelper = new HostnameHelper();

var endInstructionsData = {
  text:
    'Your article is finished. ' +
    'To listen to more articles say "Alexa, tell Scout to get titles"',
  url: '',
  date: 0
};

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
logger.info('SummaryLink Creation is: ' + summaryLink);
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
    count: 30
  };
}

router.post('/intent', VerifyToken, async function(req, res) {
  logMetric(req.body.cmd, req.body.userid, req.get('User-Agent'));

  try {
    logger.info(`Command = ${req.body.cmd}`);
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
    logger.error('database err: ' + reason);
    let errSpeech = 'Unable to connect to Pocket. Please relink your account.';
    res.status(404).send(JSON.stringify({ speech: errSpeech }));
  }
});

// Request body parameters:
// url: article url
// userid
// extended_data: 1 (optional) to have publisher name and favicon
// meta_audio: 1 (optional) to have intro/outro/instructions audiofiles
router.post('/article', VerifyToken, async function(req, res) {
  logger.info(`POST /article: ${req.body.url}`);
  logMetric('article', req.body.userid, req.get('User-Agent'));

  try {
    res.setHeader('Content-Type', 'application/json');
    const result = await processArticleRequest(
      req,
      false,
      req.body.extendedData == true || req.body.extended_data == true,
      req.body.meta_audio == true // returns false is meta_audio is not defined
    );
    if (result.item_id) {
      const astat = await astatHelper.getArticleStatus(
        req.body.userid,
        result.item_id
      );
      if (astat) {
        result.offset_ms = astat.offset_ms;
      }
    }
    logger.info('POST article resp: ' + JSON.stringify(result));
    res.status(200).send(JSON.stringify(result));
  } catch (reason) {
    logger.error('Error in /article ' + reason);
    const errSpeech = `There was an error processing the article. ${reason}`;
    res.status(404).send(JSON.stringify({ speech: errSpeech }));
  }
});

router.post('/articleservice', VerifyToken, async function(req, res) {
  logger.info(`POST /articleservice: ${req.body.url} ${req.body.article_id}`);
  logMetric('articleservice', req.body.url, req.get('User-Agent'));
  res.setHeader('Content-Type', 'application/json');

  try {
    let version = req.body.v ? req.body.v : 1;
    logger.debug('/articleservice version is: ' + version);

    if (!req.body.article_id) {
      logger.error('/articleservice error:  missing article_id');
      throw 'No article ID or metadata';
    }

    let mobileMetadata = await audioHelper.getMobileFileMetadata(
      req.body.article_id
    );

    if (mobileMetadata.count) {
      // We have already processed this article
      logger.debug(`Found file(s) in the database for ${req.body.article_id}`);
      let response = await buildPocketResponseFromMetadata(
        mobileMetadata,
        version
      );
      res.status(200).send(JSON.stringify(response));
    } else {
      // Need to build the file(s)
      logger.debug(`No file(s) in the database for ${req.body.article_id}`);
      let article = await getPocketArticleTextFromUrl(req.body.url);
      if (article && article.isArticle && article.isArticle == 1) {
        // Build the stitched file first
        let voice = vc.findVoice(article.lang);

        // Check that we actually got a valid language
        if (voice && voice.meta && voice.main) {
          let articleFile = await createAudioFileFromText(
            `${article.article}`,
            voice.main
          );

          let introFile = await createAudioFileFromText(
            await buildIntro(article),
            voice.meta
          );
          let audioMetadata = await buildPocketAudio(introFile, articleFile);
          // Add the correct voice:
          audioMetadata['voice'] = voice.main;

          logger.debug('Calling StoreMobileLocation: ' + audioMetadata.url);
          await audioHelper.storeMobileLocation(
            req.body.article_id,
            article.lang,
            voice.main,
            audioMetadata
          );

          // Re-query the metadata for new file info
          mobileMetadata = await audioHelper.getMobileFileMetadata(
            req.body.article_id
          );
          let response = await buildPocketResponseFromMetadata(
            mobileMetadata,
            version
          );

          // Send it back to the mobile as quick as possible.
          res.status(200).send(JSON.stringify(response));

          // Upload the individual parts for use by Alexa later & cleanup.
          let introUrl = await polly_tts.postProcessPart(introFile);
          let articleUrl = await polly_tts.postProcessPart(articleFile);
          await audioHelper.storeIntroLocation(
            req.body.article_id,
            introUrl,
            voice.meta,
            false
          );
          await audioHelper.storeAudioFileLocation(
            req.body.article_id,
            false,
            voice.main,
            articleUrl
          );
        } else {
          logger.error('No language found for article:' + req.body.article_id);
          res.status(404).send(
            JSON.stringify({
              speech: `There was an error processing the article. No language`
            })
          );
        }
      } else {
        logger.error('Not an article: ' + req.body.article_id);
        res.status(404).send(
          JSON.stringify({
            speech: `There was an error processing the article. Not an article`
          })
        );
      }
    }
  } catch (reason) {
    logger.error('Error in /articleservice ' + reason);
    const errSpeech = `There was an error processing the article. ${reason}`;
    res.status(404).send(JSON.stringify({ speech: errSpeech }));
  }
});

// Request body parameters:
// url: article url
// userid
// extended_data: 1 (optional) to have publisher name and favicon
// meta_audio: 1 (optional) to have intro/outro/instructions audiofiles
router.post('/summary', VerifyToken, async function(req, res) {
  logger.info(`POST /summary: ${req.body.url}`);
  logMetric('summary', req.body.userid, req.get('User-Agent'));

  try {
    res.setHeader('Content-Type', 'application/json');
    const result = await processArticleRequest(
      req,
      true,
      req.body.extendedData == true || req.body.extended_data == true,
      req.body.meta_audio == true
    );
    res.status(200).send(JSON.stringify(result));
  } catch (reason) {
    logger.error('Error in /summary ' + reason);
    const errSpeech = `There was an error processing the article. ${reason}`;
    res.status(404).send(JSON.stringify({ speech: errSpeech }));
  }
});

router.get('/search', VerifyToken, async function(req, res) {
  logMetric('search', req.query.userid, req.get('User-Agent'));

  try {
    const titles = await getTitlesFromPocket(
      req.query.userid,
      req.query.extendedData == true || req.query.extended_data == true
    );
    const article = await findBestScoringTitle(req.query.q, titles.articles);
    logger.info(
      `Search for: ${req.query.q}, identified article: ${article.title}`
    );
    res.send(article);
  } catch (err) {
    logger.error('Error on /search: ' + err);
    res.sendStatus(404);
  }
});

function logMetric(cmd, userid, agent) {
  if (process.env.GA_PROPERTY_ID) {
    logger.info('User-Agent is: ' + agent);
    var visitor = ua(process.env.GA_PROPERTY_ID, userid);
    var ga_params = {
      ec: cmd,
      ea: userid,
      cd1: userid,
      el: agent
    };
    visitor.event(ga_params).send();
  }
}

async function processArticleRequest(
  req,
  summaryOnly,
  extendedData,
  metaAudioRequested
) {
  const getBody = await buildPocketRequestBody(req.body.userid);
  let result = await searchForPocketArticleByUrl(
    getBody,
    req.body.url,
    extendedData || metaAudioRequested,
    req.body.item_id
    // metaAudio requires to have the publisher name
  );

  let audioUrl;
  if (result && result.item_id) {
    logger.info('Found result: ' + result.item_id);
    // we have a matching pocket item. do we already have the audio file?
    audioUrl = await audioHelper.getAudioFileLocation(
      result.item_id,
      summaryOnly,
      process.env.POLLY_VOICE
    );
  } else {
    logger.info('error:  no result returned from searchForPocketArticleByUrl');
  }

  // if we didn't find it in the DB, create the audio file
  if (!audioUrl) {
    logger.info('Did not find the audio URL in DB: ' + result.item_id);
    if (summaryOnly) {
      audioUrl = await buildSummaryAudioFromUrl(req.body.url);
    } else {
      audioUrl = await buildAudioFromUrl(req.body.url);
    }

    if (result) {
      await audioHelper.storeAudioFileLocation(
        result.item_id,
        summaryOnly,
        process.env.POLLY_VOICE,
        audioUrl
      );
    }
  }

  if (result) {
    result.url = audioUrl;
  } else {
    result = { url: audioUrl };
  }
  logger.debug('result.url is: ' + result.url);

  if (metaAudioRequested) {
    let metaAudio = await generateMetaAudio(result, summaryOnly);

    result.instructions_url = metaAudio.instructions_url;
    result.intro_url = metaAudio.intro_url;
    result.outro_url = metaAudio.outro_url;
  }
  // Initially set offset to 0 (overwrite later if necessary)
  result.offset_ms = 0;

  return result;
}

// generateMetaAudio returns urls to intro/outro/instructions audio files.
// It tries to fetch them from the database
// It regenerates them if they are in db but they were deleted from S3
// or generates them if they are not in db
// Summary Intros, Full article intros, and outros are stored in Dynamo
async function generateMetaAudio(data, summaryOnly) {
  // MetaAudio is an audiofile related to metadata
  // (summary intro, full article intro or outro)
  let intro;
  let outro;
  let voice = process.env.META_VOICE || process.env.POLLY_VOICE || 'Salli';

  // 4 cases depending on what we want:
  // - we want a summary intro:
  //   (1) and the file is in db and exists: return it
  //   (2) and the file is not in db or doesn't exist anymore: generate/store it
  // - we want a full article intro:
  //   (3) and the file is in db and exists: return it
  //   (4) and the file is not in db or doesn't exist anymore: generate/store it
  let md = await audioHelper.getMetaAudioLocation(
    data.item_id,
    voice,
    summaryOnly
  );
  if (md.intro) {
    // Intro is already in the database & s3.
    intro = md.intro;
  } else {
    // It's a summary
    if (summaryOnly) {
      logger.info('Generating summary intro for item:' + data.item_id);
      let introSummaryText = data.publisher
        ? `A summary of ${data.publisher}, ${data.title}`
        : `A summary of ${data.title}`;

      intro = await buildAudioFromText(`${introSummaryText}`, voice);
      await audioHelper.storeIntroLocation(
        data.item_id,
        intro,
        voice,
        summaryOnly
      );
    } else {
      // It's a full article
      let introFullText = data.publisher
        ? `From ${data.publisher}, ${data.title}`
        : `${data.title}`;
      logger.info('Generating full intro for item:' + data.item_id);
      intro = await buildAudioFromText(`${introFullText}`, voice);
      await audioHelper.storeIntroLocation(
        data.item_id,
        intro,
        voice,
        summaryOnly
      );
    }
  }

  // We do the same thing for the outro
  if (md.outro) {
    // Intro is already in the database & s3.
    outro = md.outro;
  } else {
    logger.info('Generating outro for item:' + data.item_id);
    let article = await getPocketArticleTextFromUrl(data.resolved_url);
    var dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    let publishedDate = new Date(article.timePublished * 1000);
    let dateString =
      'Published on ' + publishedDate.toLocaleDateString('en-US', dateOptions);
    let authorString = data.author ? `Written by ${data.author}. ` : '';
    outro = await buildAudioFromText(`${authorString}${dateString}`, voice);

    await audioHelper.storeOutroLocation(data.item_id, outro, voice);
  }
  // regenerate end_instructions if file doesn't exist anymore
  if (!(await audioHelper.checkFileExistence(endInstructionsData.url))) {
    endInstructionsData.url = await buildAudioFromText(
      endInstructionsData.text,
      voice
    );
    endInstructionsData.date = Date.now();
  }

  return {
    intro_url: intro,
    outro_url: outro,
    instructions_url: endInstructionsData.url
  };
}

async function scoutSummaries(userid, jsonBodyAttr, urlAttr, titleAttr, res) {
  // Gets the user's Pocket titles and summarizes first three.
  const getBody = await buildPocketRequestBody(userid);
  getBody.count = '3';
  getOptions.body = JSON.stringify(getBody);

  logger.debug('jsonboddyattr=' + jsonBodyAttr);
  logger.debug('urlattr=' + urlAttr);
  rp(getOptions)
    .then(function(body) {
      const jsonBody = JSON.parse(body);
      if (jsonBody.status == '1') {
        let summLoop = function() {
          let promiseArray = [];
          let arrJson = jsonBody[jsonBodyAttr];
          Object.keys(arrJson).forEach(key => {
            if (arrJson[key].is_article == '1') {
              summaryOptions.uri = summaryLink + arrJson[key][urlAttr];
              logger.debug('Summary uri is: ' + summaryOptions.uri);
              promiseArray.push(
                rp(summaryOptions)
                  .then(sumResults => {
                    let sumResultsJson = JSON.parse(sumResults);
                    sumResultsJson['title'] = arrJson[key][titleAttr];
                    return sumResultsJson;
                  })
                  .catch(function(err) {
                    logger.error('Caught an error: ' + err);
                    return JSON.stringify({});
                  })
              );
            }
          });
          logger.debug('RETURNING PROMISE.ALL ' + Date.now());
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
                logger.warn('no data.  Summary must have failed.');
              }
            });
            logger.debug('Text response is: ' + textResponse);
            logger.debug('Time to get summaries: ' + Date.now());
            return buildAudioFromText(textResponse);
          })
          .then(function(url) {
            logger.debug('Time to buildAudioFromText ' + Date.now());
            res.status(200).send(JSON.stringify({ url: url }));
          })
          .catch(function(err) {
            res
              .status(500)
              .send(JSON.stringify({ speech: 'Summary Engine error' }));
            logger.error('Error parsing: ' + err);
          });
      } else {
        logger.warn('Searching for the article failed to find a match');
        throw 'NoSearchMatch';
      }
    })
    .catch(reason => {
      logger.error('caught an error: ' + reason);
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
        if (
          jsonBody.list[key].resolved_title &&
          jsonBody.list[key].is_article == '1'
        ) {
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
    logger.error(`Error getting titles: ${err}`);
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
 * Looks for an article in user's account that matches the url,
 * and if found, returns metadata for it. Otherwise undefined.
 */
async function searchForPocketArticleByUrl(
  getBody,
  url,
  extendedData,
  theItemId
) {
  let result;
  if (url) {
    logger.info('Search for article matching url: ' + url);
    getBody.search = url;
    getOptions.body = JSON.stringify(getBody);
    const body = await rp(getOptions);
    const jsonBody = JSON.parse(body);
    if (jsonBody.status == '1') {
      const keysArr = Object.keys(jsonBody.list);
      logger.debug('keysarr = ' + keysArr);
      logger.info('article count: ' + keysArr.length);
      if (keysArr.length > 0) {
        let isArticleId = 0;

        if (theItemId) {
          // We have the item ID, so try and match to resolved id
          while (
            isArticleId < keysArr.length &&
            jsonBody.list[keysArr[isArticleId]].resolved_id != theItemId
          ) {
            logger.debug(
              'ResolvedId is: ' +
                jsonBody.list[keysArr[isArticleId]].resolved_id
            );
            isArticleId++;
          }
          logger.debug(
            'Final ResolvedId is: ' +
              jsonBody.list[keysArr[isArticleId]].resolved_id
          );
        } else {
          while (
            isArticleId < keysArr.length &&
            jsonBody.list[keysArr[isArticleId]].is_article != '1'
          ) {
            isArticleId++;
          }
        }

        if (isArticleId < keysArr.length) {
          // if we have a result
          result = await getArticleMetadata(
            jsonBody.list[keysArr[isArticleId]],
            extendedData
          );
        } else {
          logger.warn(
            `Searching for '${url}' failed to find a matching article.`
          );
        }
      }
    } else {
      logger.warn(`Searching for '${url}' failed to find a matching article.`);
    }
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
    logger.info('Search term is: ' + searchTerm);
    const titles = await getTitlesFromPocket(pocketuserid, extendedData);
    const articleInfo = await findBestScoringTitle(searchTerm, titles.articles);

    if (articleInfo) {
      logger.debug(articleInfo);

      // do we already have the audio file?
      let audioUrl = await audioHelper.getAudioFileLocation(
        articleInfo.item_id,
        summaryOnly,
        process.env.POLLY_VOICE
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
          process.env.POLLY_VOICE,
          audioUrl
        );
      }
      articleInfo.url = audioUrl;

      articleInfo.offset_ms = 0;
      if (!summaryOnly) {
        const astat = await astatHelper.getArticleStatus(
          pocketuserid,
          articleInfo.item_id
        );
        if (astat) {
          articleInfo.offset_ms = astat.offset_ms;
        }
      }
      res.status(200).send(JSON.stringify(articleInfo));
    } else {
      throw 'NoSearchMatch';
    }
  } catch (reason) {
    logger.error('searchAndPlayArticle error: ' + reason);
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
  let article = await getPocketArticleTextFromUrl(url);
  return buildAudioFromText(`${article.article}`);
}

async function buildIntro(article) {
  //Intro: “article title, published by host, on publish date"
  let introFullText;
  let dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  let publisher = await hostnameHelper.getHostnameData(
    article.resolvedUrl,
    'publisher'
  );
  if (!article.lang || article.lang === 'en') {
    if (article.timePublished) {
      let publishedDate = new Date(article.timePublished * 1000);
      let dateString = publishedDate.toLocaleDateString('en-US', dateOptions);

      introFullText = publisher
        ? `${article.title}, published by ${publisher}, on ${dateString}`
        : `${article.title}, published on ${dateString}`;
    } else {
      // The case where date is not available.
      introFullText = publisher
        ? `${article.title}, published by ${publisher}.`
        : `${article.title}.`;
    }
  } else {
    if (article.timePublished) {
      let publishedDate = new Date(article.timePublished * 1000);
      let dateString = publishedDate.toLocaleDateString(
        article.lang,
        dateOptions
      );

      introFullText = publisher
        ? `${article.title}, ${publisher}, ${dateString}`
        : `${article.title}, ${dateString}`;
    } else {
      // The case where date is not available.
      introFullText = publisher
        ? `${article.title}, ${publisher}.`
        : `${article.title}.`;
    }
  }
  return introFullText;
}

async function getPocketArticleTextFromUrl(url) {
  articleOptions.formData = {
    consumer_key: process.env.POCKET_KEY || '',
    url,
    images: '0',
    videos: '0',
    refresh: '0',
    output: 'json',
    showCopyright: '0',
    msg: '0'
  };
  logger.info('Getting article from pocket API: ' + url);
  const article = JSON.parse(await rp(articleOptions));
  logger.info('Returned article from pocket API: ' + article.title);
  return article;
}

async function createAudioFileFromText(
  textString,
  voiceType = process.env.POLLY_VOICE || 'Salli'
) {
  const cleanText = texttools.cleanText(textString);
  const chunkText = texttools.chunkText(cleanText);
  logger.debug('chunkText is: ', chunkText.length, chunkText);
  return polly_tts.synthesizeSpeechFile(chunkText, voiceType);
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

async function buildAudioFromText(
  textString,
  voiceType = process.env.POLLY_VOICE || 'Salli'
) {
  const cleanText = texttools.cleanText(textString);
  const chunkText = texttools.chunkText(cleanText);
  logger.debug('chunkText is: ', chunkText.length, chunkText);
  return polly_tts.getSpeechSynthUrl(chunkText, voiceType);
}

async function buildPocketAudio(introFile, articleFile) {
  return polly_tts.processPocketAudio(introFile, articleFile);
}

async function buildPocketResponseFromMetadata(mmd, version) {
  logger.debug('Calling buildPocketResponseFromMetatdata');
  let v1Url;
  let resp = [];
  let mobileMetadata = JSON.parse(JSON.stringify(mmd));
  logger.debug(mobileMetadata.length);
  for (var i in mobileMetadata) {
    //TODO: We should check if file exists once we have the policy around this.
    logger.debug(JSON.stringify(mobileMetadata[i]));
    let status = 'available';
    let size = 0;
    if (!mobileMetadata[i].hasOwnProperty('size')) {
      size = await polly_tts.getFileSizeFromUrl(mobileMetadata[i].url);
      logger.debug('size is: ' + size);
    } else {
      size = mobileMetadata[i].size;
    }

    if (!size) {
      status = 'processing';
    }

    let item = {
      format: mobileMetadata[i].codec,
      url: mobileMetadata[i].url,
      status: status,
      voice: mobileMetadata[i].voice,
      sample_rate: mobileMetadata[i].sample_rate,
      duration: mobileMetadata[i].duration,
      size: size
    };
    if (version == 1 && mobileMetadata[i].url.indexOf('.mp3') != -1) {
      v1Url = mobileMetadata[i].url;
    }
    resp.push(item);
  }

  if (version == 1) {
    return { url: v1Url };
  } else {
    console.log(resp);
    return resp;
  }
}

function findBestScoringTitle(searchPhrase, articleMetadataArray) {
  return new Promise((resolve, reject) => {
    natural.PorterStemmer.attach();
    //tokenize and stem the search utterance that user said
    let wordsStem = searchPhrase.tokenizeAndStem();

    let tfidf = new natural.TfIdf();
    //tokenize and Stem each title and then add to our dataset
    for (var i = 0; i < articleMetadataArray.length; i++) {
      logger.debug(articleMetadataArray[i].title);
      let stemmed = articleMetadataArray[i].title.tokenizeAndStem();
      tfidf.addDocument(stemmed);
    }

    let maxValue = 0;
    let curMaxIndex = 0;
    let iCount = 0;
    tfidf.tfidfs(wordsStem, function(i, measure) {
      logger.debug('document #' + i + ' is ' + measure);
      if (measure > maxValue) {
        maxValue = measure;
        curMaxIndex = i;
      }
      iCount++;
      if (iCount >= articleMetadataArray.length) {
        logger.debug('Done getting results.');
        logger.debug('Max Score is: ' + maxValue);
        if (maxValue === 0) {
          reject('NoMatchFound');
        }
        logger.info('Article is: ' + articleMetadataArray[curMaxIndex].title);
        resolve(articleMetadataArray[curMaxIndex]);
      }
    });
  });
}

module.exports = router;

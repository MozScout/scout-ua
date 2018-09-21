const ScoutUser = require('./models/ScoutUser');
const AudioFiles = require('./models/AudioFiles');
const Hostname = require('./models/Hostname');
const logger = require('../logger');
const uuidgen = require('node-uuid-generator');
const constants = require('../constants');
const xcodeQueue = require('../command/xcodeQueue');

class Database {
  async processScoutUser(userid, access_token) {
    try {
      logger.debug(userid);

      const suser = await ScoutUser.get({ pocket_user_id: userid });
      if (suser) {
        logger.debug('Found existing user');
        suser.pocket_access_token = access_token;
        await suser.save();
      } else {
        logger.info(`Creating new user`);
        const newuser = new ScoutUser({
          pocket_user_id: userid,
          pocket_access_token: access_token
        });
        await newuser.save();
      }
    } catch (err) {
      logger.error(`processScoutUser operation failed: ${err}`);
    }
  }

  async getAccessToken(userid) {
    logger.info(`getAccessToken for ${userid}`);
    const user = await ScoutUser.get({ pocket_user_id: userid });
    if (user) {
      logger.debug('Got token: ' + user.pocket_access_token);
      return user.pocket_access_token;
    } else {
      throw 'No user token';
    }
  }

  async getAudioFileLocation(articleId, type, voice) {
    logger.info(`getAudioFileLocation for ${articleId}/${type}`);
    return new Promise(resolve => {
      AudioFiles.query('item_id')
        .eq(articleId)
        .filter(constants.strings.TYPE_FIELD)
        .eq(type)
        .filter(constants.strings.VOICE_FIELD)
        .eq(voice)
        .filter(constants.strings.CODEC_FIELD)
        .eq(constants.strings.CODEC_MP3)
        .exec()
        .then(function(data) {
          if (data.count) {
            resolve(data[0].url);
            if (data.count > 1) {
              logger.warn('duplicate entries!!!');
            }
          } else {
            resolve('');
          }
        });
    });
  }

  async getMobileMetadata(articleId) {
    logger.info(`getMobileMetadata for ${articleId}`);
    return new Promise(resolve => {
      AudioFiles.query('item_id')
        .eq(articleId)
        .filter(constants.strings.TYPE_FIELD)
        .eq(constants.strings.TYPE_MOBILE)
        .exec()
        .then(function(data) {
          resolve(data);
        });
    });
  }

  async getHostnameData(hostname) {
    logger.info(`getHostnameData for ${hostname}`);
    const data = await Hostname.get({ hostname: hostname });
    return data;
  }

  async storeHostnameData(hostname, faviconUrl, name) {
    logger.info(`storeHostnameData for ${hostname}: ${faviconUrl}, ${name}`);
    let data = await Hostname.get({ hostname: hostname });
    if (!data) {
      data = new Hostname({
        hostname: hostname,
        favicon_url: '',
        favicon_updated_on: 0,
        publisher_name: hostname,
        publisher_updated_on: 0
      });
    }
    if (faviconUrl != '' && faviconUrl != 'error') {
      data.favicon_url = faviconUrl;
      data.favicon_updated_on = Date.now();
    } else if (faviconUrl == 'error') {
      data.favicon_updated_on = Date.now();
    }
    if (name != '' && name != 'error') {
      data.publisher_name = name;
      data.publisher_updated_on = Date.now();
    } else if (name == 'error') {
      data.publisher_updated_on = Date.now();
    }

    await data.save();
    return data;
  }

  async getIntroAudioLocation(articleId, voice, summaryOnly) {
    logger.info(`getIntroAudioLocation for ${articleId}`);
    let type = summaryOnly
      ? constants.strings.TYPE_INTRO_SUMMARY
      : constants.strings.TYPE_INTRO_FULL;
    return new Promise(resolve => {
      AudioFiles.query('item_id')
        .eq(articleId)
        .filter(constants.strings.TYPE_FIELD)
        .eq(type)
        .filter(constants.strings.VOICE_FIELD)
        .eq(voice)
        .filter(constants.strings.CODEC_FIELD)
        .eq(constants.strings.CODEC_MP3) //Limit this to mp3 for Alexa
        .exec()
        .then(function(data) {
          if (data.count) {
            resolve(data[0].url);
          } else {
            logger.warn('data.count is NULL');
            resolve('');
          }
        });
    });
  }

  async getOutroAudioLocation(articleId, voice) {
    logger.info(`getOutroAudioLocation for ${articleId}`);
    return new Promise(resolve => {
      AudioFiles.query('item_id')
        .eq(articleId)
        .filter(constants.strings.TYPE_FIELD)
        .eq(constants.strings.TYPE_OUTRO)
        .filter(constants.strings.VOICE_FIELD)
        .eq(voice)
        .filter(constants.strings.CODEC_FIELD)
        .eq(constants.strings.CODEC_MP3) //Limit to mp3 for Alexa
        .exec()
        .then(function(data) {
          if (data.count) {
            resolve(data[0].url);
          } else {
            logger.warn('Data count is null');
            resolve('');
          }
        });
    });
  }

  async storeAudioFileLocation(
    articleId,
    mp3FileUrl,
    type,
    voice,
    lang = 'en',
    additionalMp3Info = {},
    additionalOpusInfo = {}
  ) {
    logger.info(
      `Store audio file location for ${articleId}/${type} @ ${mp3FileUrl}`
    );

    const commonFileInfo = {
      item_id: articleId,
      voice,
      lang,
      type,
      date: Date.now()
    };

    const mp3FileAttributes = {
      codec: constants.strings.CODEC_MP3,
      bitrate: constants.bitrate.BITRATE_MP3,
      samplerate: constants.samplerate.SAMPLERATE_MP3
    };

    const opusFileAttributes = {
      codec: constants.strings.CODEC_OPUS,
      bitrate: constants.bitrate.BITRATE_OPUS,
      samplerate: constants.samplerate.SAMPLERATE_OPUS
    };
    try {
      // save mp3 file data
      let mp3FileInfo = {};
      Object.assign(
        mp3FileInfo,
        commonFileInfo,
        mp3FileAttributes,
        additionalMp3Info,
        {
          uuid: uuidgen.generate(),
          url: mp3FileUrl
        }
      );
      const mp3AudioFile = new AudioFiles(mp3FileInfo);
      const promiseArr = [mp3AudioFile.save()];

      if (xcodeQueue.useXcode()) {
        // save opus file data
        let opusFileInfo = {};
        Object.assign(
          opusFileInfo,
          commonFileInfo,
          opusFileAttributes,
          additionalOpusInfo,
          {
            uuid: uuidgen.generate(),
            url: mp3FileUrl.replace('.mp3', '.opus')
          }
        );
        const opusAudioFile = new AudioFiles(opusFileInfo);
        promiseArr.push(opusAudioFile.save());
      }
      await Promise.all([promiseArr]);
    } catch (err) {
      logger.error(`storeAudioFileLocation error: ${err}`);
    }
  }
}

module.exports = Database;

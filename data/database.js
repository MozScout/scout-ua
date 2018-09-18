const ScoutUser = require('./models/ScoutUser');
const AudioFiles = require('./models/AudioFiles');
const Hostname = require('./models/Hostname');
const logger = require('../logger');
const uuidgen = require('node-uuid-generator');

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
        .filter('type')
        .eq(type)
        .filter('voice')
        .eq(voice)
        .filter('codec')
        .eq('mp3')
        .exec()
        .then(function(data) {
          console.log(data);
          console.log(JSON.stringify(data));
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
        .filter('type')
        .eq('mobile')
        .exec()
        .then(function(data) {
          console.log(data);
          console.log(JSON.stringify(data));
          resolve(data);
        });
    });
  }

  async storeAudioFileLocation(articleId, type, voice, location, lang = 'en') {
    logger.info(`storeAudioFileLocation for ${articleId}/${type}: ${location}`);
    let mp3 = new AudioFiles({
      item_id: articleId,
      uuid: uuidgen.generate(),
      lang,
      voice,
      codec: 'mp3',
      bitrate: 40000,
      samplerate: 16000,
      type: type,
      url: location,
      date: Date.now()
    });
    await mp3.save();

    logger.debug('Before opus save');
    let opus = new AudioFiles({
      item_id: articleId,
      uuid: uuidgen.generate(),
      lang,
      voice,
      codec: 'opus',
      bitrate: 24000,
      samplerate: 48000,
      type: type,
      url: location.replace('.mp3', '.opus'),
      date: Date.now()
    });
    await opus.save();
    logger.debug('after opus save');
  }

  async storeMobileLocation(articleId, lang = 'en', voice, audioMetadata) {
    logger.info(`storeMobileLocation for ${articleId}: ${audioMetadata.url}`);
    let mp3 = new AudioFiles({
      item_id: articleId,
      uuid: uuidgen.generate(),
      lang,
      voice,
      codec: 'mp3',
      bitrate: 40000,
      duration: audioMetadata.duration,
      samplerate: 16000,
      size: audioMetadata.size,
      type: 'mobile',
      url: audioMetadata.url,
      date: Date.now()
    });
    await mp3.save();

    logger.debug('Before opus save');
    let opus = new AudioFiles({
      item_id: articleId,
      uuid: uuidgen.generate(),
      lang,
      voice,
      codec: 'opus',
      bitrate: 24000,
      duration: audioMetadata.duration,
      samplerate: 48000,
      type: 'mobile',
      url: audioMetadata.url.replace('.mp3', '.opus'),
      date: Date.now()
    });
    await opus.save();
    logger.debug('after opus save');
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
    let type = summaryOnly ? 'summaryIntro' : 'fullIntro';
    logger.info('TAMARAH:GETINTROAUDIOLOCATION:' + articleId + type + voice);
    return new Promise(resolve => {
      AudioFiles.query('item_id')
        .eq(articleId)
        .filter('type')
        .eq(type)
        .filter('voice')
        .eq(voice)
        .exec()
        .then(function(data) {
          console.log(data);
          console.log(JSON.stringify(data));
          if (data.count) {
            logger.info('TAMARAH:RESOLVE:' + data.url);
            resolve(data.url);
          } else {
            logger.info('TAMARAH:RESOLVE: DIDNT FIND IT');
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
        .filter('type')
        .eq('outro')
        .filter('voice')
        .eq(voice)
        .exec()
        .then(function(data) {
          console.log(data);
          console.log(JSON.stringify(data));
          if (data.count) {
            resolve(data.url);
          } else {
            resolve('');
          }
        });
    });
  }

  async storeIntroLocation(articleId, introLocation, voice, summaryOnly) {
    logger.info(`storeIntroLocation for ${articleId}`);
    let type = summaryOnly ? 'introSummary' : 'introFull';
    logger.info(
      'TAMARAH:STOREINTROLOCATION:' +
        articleId +
        introLocation +
        voice +
        summaryOnly
    );
    logger.info(
      'TAMARAH:STOREINTROLOCATION:' +
        articleId +
        introLocation +
        voice +
        summaryOnly
    );
    let mp3 = new AudioFiles({
      item_id: articleId,
      uuid: uuidgen.generate(),
      voice: voice,
      codec: 'mp3',
      bitrate: 40000,
      samplerate: 16000,
      type: type,
      url: introLocation,
      date: Date.now()
    });
    await mp3.save();
    logger.info('TAMARAH:SAVED SUCCESSFULLY');

    logger.debug('Before opus save');
    let opus = new AudioFiles({
      item_id: articleId,
      uuid: uuidgen.generate(),
      voice: voice,
      codec: 'opus',
      bitrate: 24000,
      samplerate: 48000,
      type: type,
      url: introLocation.replace('.mp3', '.opus'),
      date: Date.now()
    });
    await opus.save();
    logger.debug('after opus save');
  }

  async storeOutroLocation(articleId, outroLocation, voice) {
    logger.info(`storeOutroLocation for ${articleId}`);
    let mp3 = new AudioFiles({
      item_id: articleId,
      uuid: uuidgen.generate(),
      voice: voice,
      codec: 'mp3',
      bitrate: 40000,
      samplerate: 16000,
      type: 'outro',
      url: outroLocation,
      date: Date.now()
    });
    await mp3.save();

    logger.debug('Before opus save');
    let opus = new AudioFiles({
      item_id: articleId,
      uuid: uuidgen.generate(),
      voice: voice,
      codec: 'opus',
      bitrate: 24000,
      samplerate: 48000,
      type: 'outro',
      url: outroLocation.replace('.mp3', '.opus'),
      date: Date.now()
    });
    await opus.save();
    logger.debug('after opus save');
  }
}

module.exports = Database;

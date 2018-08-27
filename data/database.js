const ScoutUser = require('./models/ScoutUser');
const AudioFileLocation = require('./models/AudioFileLocation');
const MetaAudioLocation = require('./models/MetaAudioLocation');
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

  async getAudioFileLocation(articleId, audioType) {
    logger.info(`getAudioFileLocation for ${articleId}/${audioType}`);
    const fileLocation = await AudioFileLocation.get({ item_id: articleId });
    if (fileLocation) {
      if (audioType === 'full' && fileLocation.full_audio_location) {
        return fileLocation.full_audio_location;
      } else if (
        audioType === 'summary' &&
        fileLocation.summary_audio_location
      ) {
        return fileLocation.summary_audio_location;
      }
    }
    return '';
  }

  async getMobileFileLocation(articleId) {
    logger.info(`getMobileFileLocation for ${articleId}`);
    const fileLocation = await AudioFileLocation.get({ item_id: articleId });
    if (fileLocation && fileLocation.mobile_audio_location) {
      return fileLocation.mobile_audio_location;
    }
    return '';
  }

  async getMobileMetadata(articleId) {
    logger.info(`getMobileMetadata for ${articleId}`);
    const fileMetadata = await AudioFiles.query(
      {
        item_id: articleId,
        type: 'mobile'
      },
      function(err, data) {
        logger.debug(JSON.stringify(data));
      }
    );
    /*    logger.debug('After AudioFiles.query');
    if (fileMetadata) {
      logger.debug(JSON.stringify(fileMetadata));
      return fileMetadata;
    } else {
      logger.debug('getMobileMetadata file not found');
    }*/
    return '';
  }

  async getMobileFileDuration(articleId) {
    logger.info(`getMobileFileLocation for ${articleId}`);
    const fileLocation = await AudioFileLocation.get({
      item_id: articleId
    });
    if (fileLocation && fileLocation.mobile_audio_duration) {
      return fileLocation.mobile_audio_duration;
    }
    return '';
  }

  async storeAudioFileLocation(articleId, audioType, location) {
    logger.info(
      `storeAudioFileLocation for ${articleId}/${audioType}: ${location}`
    );
    let fileLocation = await AudioFileLocation.get({ item_id: articleId });
    if (!fileLocation) {
      fileLocation = new AudioFileLocation({
        item_id: articleId
      });
    }
    if (audioType === 'full') {
      fileLocation.full_audio_location = location;
      fileLocation.full_audio_date = Date.now();
    } else if (audioType === 'summary') {
      fileLocation.summary_audio_location = location;
      fileLocation.summary_audio_date = Date.now();
    }
    await fileLocation.save();
  }

  async storeMobileLocation(articleId, lang, voice, audioMetadata) {
    logger.info(`storeMobileLocation for ${articleId}: ${location}`);
    let fileLocation = await AudioFiles.get({
      item_id: articleId
    });
    if (!fileLocation) {
      let mp3 = new AudioFiles({
        item_id: articleId,
        uuid: uuidgen.generate(),
        lang: audioMetadata.lang,
        voice: voice,
        codec: audioMetadata.codec,
        bitrate: audioMetadata.bitrate,
        duration: audioMetadata.duration,
        samplerate: audioMetadata.samplerate,
        size: audioMetadata.size,
        type: 'mobile',
        url: audioMetadata.url,
        date: Date.now()
      });
      await mp3.save();

      let opus = new AudioFiles({
        item_id: articleId,
        uuid: uuidgen.generate(),
        lang: audioMetadata.lang,
        voice: voice,
        codec: 'opus',
        bitrate: audioMetadata.bitrate,
        duration: audioMetadata.duration,
        samplerate: 48000,
        type: 'mobile',
        url: audioMetadata.url.replace('.mp3', '.opus'),
        date: Date.now()
      });
      await opus.save();
    }
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

  async getMetaAudioLocation(articleId) {
    logger.info(`getMetaAudioLocation for ${articleId}`);
    return await MetaAudioLocation.get({ item_id: articleId });
  }

  async storeIntroLocation(articleId, introLocation, summaryOnly) {
    logger.info(`storeIntroLocation for ${articleId}`);
    let metaLocation = await MetaAudioLocation.get({ item_id: articleId });
    if (!metaLocation) {
      metaLocation = new MetaAudioLocation({
        item_id: articleId
      });
    }
    if (summaryOnly) {
      metaLocation.intro_summary_location = introLocation;
    } else {
      metaLocation.intro_full_location = introLocation;
    }

    metaLocation.date = Date.now();
    await metaLocation.save();
  }

  async storeOutroLocation(articleId, outroLocation) {
    logger.info(`storeOutroLocation for ${articleId}`);
    let metaLocation = await MetaAudioLocation.get({ item_id: articleId });
    if (!metaLocation) {
      metaLocation = new MetaAudioLocation({
        item_id: articleId
      });
    }
    metaLocation.outro_location = outroLocation;
    metaLocation.date = Date.now();
    await metaLocation.save();
  }
}

module.exports = Database;

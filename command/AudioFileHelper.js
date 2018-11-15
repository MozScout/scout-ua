const Database = require('../data/database');
const database = new Database();
const AWS = require('aws-sdk');
const url = require('url');
const logger = require('../logger');
const constants = require('../constants');
const vc = require('./voiceChoice');

const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

class CommandHelper {
  async getAudioFileLocation(articleId, summaryOnly, voice) {
    // first check if we have this file in the DB
    let fileUrl = await database.getAudioFileLocation(
      articleId,
      summaryOnly
        ? constants.strings.TYPE_SUMMARY
        : constants.strings.TYPE_FULL,
      voice
    );

    if (!(await this.checkFileExistence(fileUrl))) {
      fileUrl = '';
    }

    return fileUrl;
  }

  async getMobileMetadataForLocale(articleId, locale) {
    let mmd = await database.getMobileMetadataForLocale(articleId, locale);
    return mmd;
  }
  async getMobileFileMetadata(articleId, locale) {
    // first get the language of this article
    let result = {};
    let lang = await database.getMobileLang(articleId);
    if (lang) {
      logger.debug('lang is ' + lang);
      // We might have it in their locale
      let voice = vc.findVoice(lang, locale);
      //Check if there is a locale specifc that we support (en, fr, pt, es)
      if (voice.localeSynthesis) {
        logger.debug('We support local specific:  ' + voice.localeSynthesis);
        result = await database.getMobileMetadataForLocale(
          articleId,
          voice.localeSynthesis
        );
      } else {
        logger.debug('Not local specific:  ' + voice.localeSynthesis);
        result = await database.getMobileMetadata(articleId);
      }
    } else {
      logger.debug('no lang in database for this article');
    }
    return result;
  }

  async checkFileExistence(fileUrl) {
    // checks if that file still exists at s3
    if (fileUrl) {
      logger.info(`Checking location for: ${fileUrl}`);
      const path = url.parse(fileUrl).path;
      const params = {
        Bucket: process.env.POLLY_S3_BUCKET,
        Key: path.replace(/\//, '')
      };

      try {
        const s3request = s3.headObject(params);
        await s3request.promise();
        logger.debug('Verified existing file');
        return true;
      } catch (err) {
        logger.warn('File no longer exists');
        return false;
      }
    }
    return false;
  }

  async getMetaAudioLocation(articleId, voice, summaryOnly) {
    let metaAudio = {};
    let introLocation = await database.getIntroAudioLocation(
      articleId,
      voice,
      summaryOnly
    );
    if (introLocation && this.checkFileExistence(introLocation)) {
      metaAudio.intro = introLocation;
    }

    let outroLocation = await database.getOutroAudioLocation(articleId, voice);
    if (outroLocation && this.checkFileExistence(outroLocation)) {
      metaAudio.outro = outroLocation;
    }

    return metaAudio;
  }

  async storeAudioFileLocation(
    articleId,
    summaryOnly,
    voice,
    location,
    lang,
    locale
  ) {
    const fileType = summaryOnly
      ? constants.strings.TYPE_SUMMARY
      : constants.strings.TYPE_FULL;
    await database.storeAudioFileLocation(
      articleId,
      location,
      fileType,
      voice,
      lang,
      locale
    );
  }

  async storeIntroLocation(
    articleId,
    introLocation,
    voice,
    summaryOnly,
    lang,
    locale
  ) {
    const fileType = summaryOnly
      ? constants.strings.TYPE_INTRO_SUMMARY
      : constants.strings.TYPE_INTRO_FULL;
    await database.storeAudioFileLocation(
      articleId,
      introLocation,
      fileType,
      voice,
      lang,
      locale
    );
  }

  async storeOutroLocation(articleId, outroLocation, voice) {
    await database.storeAudioFileLocation(
      articleId,
      outroLocation,
      constants.strings.TYPE_OUTRO,
      voice
    );
  }

  /*
   * Mobile file has the stitched intro and the body of the
   * file.
   */
  async storeMobileLocation(articleId, lang, voice, audioMetadata, locale) {
    const { url, size, duration } = audioMetadata;
    await database.storeAudioFileLocation(
      articleId,
      url,
      constants.strings.TYPE_MOBILE,
      voice,
      lang,
      locale,
      {
        size,
        duration
      },
      { duration }
    );
  }
}

module.exports = CommandHelper;

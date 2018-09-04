const Database = require('../data/database');
const database = new Database();
const AWS = require('aws-sdk');
const url = require('url');
const logger = require('../logger');

const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

class CommandHelper {
  async getAudioFileLocation(articleId, summaryOnly, voice) {
    // first check if we have this file in the DB
    let fileUrl = await database.getAudioFileLocation(
      articleId,
      summaryOnly ? 'summary' : 'full',
      voice
    );

    if (!(await this.checkFileExistence(fileUrl))) {
      fileUrl = '';
    }

    return fileUrl;
  }

  async getMobileFileMetadata(articleId) {
    // first check if we have this file in the DB
    let result = {};
    result = await database.getMobileMetadata(articleId);
    //TODO: check if files exist.
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

  async storeAudioFileLocation(articleId, summaryOnly, voice, location) {
    await database.storeAudioFileLocation(
      articleId,
      summaryOnly ? 'summary' : 'full',
      voice,
      location
    );
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

  async storeIntroLocation(articleId, introLocation, voice, summaryOnly) {
    return await database.storeIntroLocation(
      articleId,
      introLocation,
      voice,
      summaryOnly
    );
  }

  async storeOutroLocation(articleId, outroLocation, voice) {
    return await database.storeOutroLocation(articleId, outroLocation, voice);
  }

  /*
  * Mobile file has the stitched intro and the body of the
  * file.  
  */
  async storeMobileLocation(articleId, lang, voice, audioMetadata) {
    return await database.storeMobileLocation(
      articleId,
      lang,
      voice,
      audioMetadata
    );
  }
}

module.exports = CommandHelper;

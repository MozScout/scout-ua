const Database = require('../data/database');
const database = new Database();
const AWS = require('aws-sdk');
const url = require('url');
const logger = require('../logger');

const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

class CommandHelper {
  async getAudioFileLocation(articleId, summaryOnly) {
    // first check if we have this file in the DB
    let fileUrl = await database.getAudioFileLocation(
      articleId,
      summaryOnly ? 'summary' : 'full'
    );

    if (!(await this.checkFileExistence(fileUrl))) {
      fileUrl = '';
    }

    return fileUrl;
  }

  async getMobileFileLocation(articleId, summaryOnly) {
    // first check if we have this file in the DB
    let fileUrl = await database.getAudioFileLocation(
      articleId,
      summaryOnly ? 'summary' : 'full'
    );

    if (!(await this.checkFileExistence(fileUrl))) {
      fileUrl = '';
    }

    return fileUrl;
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

  async storeAudioFileLocation(articleId, summaryOnly, location) {
    await database.storeAudioFileLocation(
      articleId,
      summaryOnly ? 'summary' : 'full',
      location
    );
  }

  async getMetaAudioLocation(articleId) {
    return await database.getMetaAudioLocation(articleId);
  }

  async storeIntroLocation(articleId, introLocation, summaryOnly) {
    return await database.storeIntroLocation(
      articleId,
      introLocation,
      summaryOnly
    );
  }

  async storeOutroLocation(articleId, outroLocation) {
    return await database.storeOutroLocation(articleId, outroLocation);
  }

  /*
  * Mobile file has the stitched intro and the body of the
  * file.  
  */
  async storeMobileLocation(articleId, FileLocation) {
    return await database.storeMobileLocation;
  }
}

module.exports = CommandHelper;

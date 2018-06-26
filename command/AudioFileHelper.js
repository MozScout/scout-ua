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

    // then see if that file still exists at s3
    if (fileUrl) {
      logger.info(`Checking location for item=${articleId}: ${fileUrl}`);
      const path = url.parse(fileUrl).path;
      const params = {
        Bucket: process.env.POLLY_S3_BUCKET,
        Key: path.replace(/\//, '')
      };

      try {
        const s3request = s3.headObject(params);
        await s3request.promise();
        logger.debug('Verified existing file');
      } catch (err) {
        logger.warn('File no longer exists');
        fileUrl = '';
      }
    }

    return fileUrl;
  }

  async storeAudioFileLocation(articleId, summaryOnly, location) {
    await database.storeAudioFileLocation(
      articleId,
      summaryOnly ? 'summary' : 'full',
      location
    );
  }
}

module.exports = CommandHelper;

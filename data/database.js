const ScoutUser = require('./models/ScoutUser');
const AudioFileLocation = require('./models/AudioFileLocation');
const WebsiteFavicon = require('./models/WebsiteFavicon');

class Database {
  async processScoutUser(userid, access_token) {
    try {
      console.error(userid);

      const suser = await ScoutUser.get({ pocket_user_id: userid });
      if (suser) {
        console.log('Found existing user');
        suser.pocket_access_token = access_token;
        await suser.save();
      } else {
        console.log(`Creating new user`);
        const newuser = new ScoutUser({
          pocket_user_id: userid,
          pocket_access_token: access_token
        });
        await newuser.save();
      }
    } catch (err) {
      console.log(`processScoutUser operation failed: ${err}`);
    }
  }

  async getAccessToken(userid) {
    console.log(`getAccessToken for ${userid}`);
    const user = await ScoutUser.get({ pocket_user_id: userid });
    if (user) {
      console.log('Got token: ' + user.pocket_access_token);
      return user.pocket_access_token;
    } else {
      throw 'No user token';
    }
  }

  async getAudioFileLocation(articleId, audioType) {
    console.log(`getAudioFileLocation for ${articleId}/${audioType}`);
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

  async storeAudioFileLocation(articleId, audioType, location) {
    console.log(
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

  async getWebsiteFavicon(hostname) {
    console.log(`getWebsiteFavicon for ${hostname}`);
    const data = await WebsiteFavicon.get({ hostname: hostname });
    return data;
  }

  async storeWebsiteFavicon(hostname, favicon_url, name) {
    console.log(`storeWebsiteFavicon for ${hostname}: ${favicon_url}, ${name}`);
    let data = await WebsiteFavicon.get({ hostname: hostname });
    if (!data) {
      data = new WebsiteFavicon({ hostname: hostname });
    }
    data.favicon_url = favicon_url;
    data.website_name = name;
    data.updated_on = Date.now();

    await data.save();
    return data;
  }
}

module.exports = Database;

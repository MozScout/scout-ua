const ScoutUser = require('./models/ScoutUser');
const AudioFileLocation = require('./models/AudioFileLocation');
const Hostname = require('./models/Hostname');
const UseCount = require('./models/UseCount');

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

  async getHostnameData(hostname) {
    console.log(`getHostnameData for ${hostname}`);
    const data = await Hostname.get({ hostname: hostname });
    return data;
  }

  async storeHostnameData(hostname, faviconUrl, name) {
    console.log(`storeHostnameData for ${hostname}: ${faviconUrl}, ${name}`);
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

  async getUseCount(userId) {
    console.log(`getUseCount for ${userId}`);
    const data = await UseCount.get({ user_id: userId });
    return data;
  }

  async incrementUseCount(userId, useDate) {
    useDate = new Date(useDate);
    console.log(`incrementUseCount for ${userId}: ${useDate}`);
    let data = await UseCount.get({ user_id: userId });
    if (!data) {
      data = new UseCount({
        user_id: userId,
        count: 0,
        last_use: 0
      });
    }
    if (new Date(data.last_use).getTime() != useDate.getTime()) {
      data.count += 1;
      data.last_use = useDate;
      await data.save();
    }
    return data;
  }
}

module.exports = Database;

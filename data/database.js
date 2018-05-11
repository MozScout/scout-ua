const ScoutUser = require('./models/ScoutUser');

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
}

module.exports = Database;

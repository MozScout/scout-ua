const ArticleStatus = require('../data/models/ArticleStatus');
const logger = require('../logger');

class ArticleStatusHelper {
  async storeArticleStatus(userid, articleid, offset) {
    const astat = new ArticleStatus({
      pocket_user_id: userid,
      article_id: articleid,
      offset_ms: offset
    });
    return await astat.save();
  }

  async getArticleStatus(userid, articleid) {
    if (articleid) {
      logger.debug('getArticleStatus for ' + userid + ' ' + articleid);
      return await ArticleStatus.get({
        pocket_user_id: userid,
        article_id: articleid
      });
    } else {
      logger.debug('getArticleStatus for ' + userid);
      return await ArticleStatus.query({
        pocket_user_id: userid
      }).exec();
    }
  }
}

module.exports = ArticleStatusHelper;

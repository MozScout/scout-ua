const ArticleStatus = require('../data/models/ArticleStatus');

class ArticleStatusHelper {
  async storeArticleStatus(userid, articleid, offset) {
    const astat = new ArticleStatus({
      pocket_user_id: userid,
      article_id: articleid,
      offset_ms: offset
    });
    return await astat.save();
  }

  async getArticleStatus(userid, articleid = -1) {
    if (articleid == -1) {
      return await ArticleStatus.query({
        pocket_user_id: userid
      }).exec();
    } else {
      return await ArticleStatus.get({
        pocket_user_id: userid,
        article_id: articleid
      });
    }
  }
}

module.exports = ArticleStatusHelper;

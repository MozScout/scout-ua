const dynamoose = require('dynamoose');

const ArticleStatus = dynamoose.model('ArticleStatus', {
  article_id: String,
  pocket_user_id: String,
  offset_ms: Number
});

module.exports = ArticleStatus;

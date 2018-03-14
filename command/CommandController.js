var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
var User = require('../user/User');
var VerifyToken = require('../VerifyToken');
var read = require('readability-js');
var rp = require('request-promise');

var jwt = require('jsonwebtoken');
var bcrypt = require('bcryptjs');
var config = require('../config');

const getOptions = {
  uri: 'https://getpocket.com/v3/get',
  method: 'POST',
  body: '',
  headers: {'Content-Type': 'application/json; charset=UTF-8',
            'X-Accept': 'application/json'}
};

const summaryLink = 'https://api.smmry.com?SM_API_KEY=D9D01DE170&SM_URL='
const summaryOptions = {
  uri: '',
  method: 'GET',
  body: '',
  headers: {'Content-Type': 'application/json; charset=UTF-8',
            'X-Accept': 'application/json'}
};

router.post('/intent', VerifyToken, function(req, res, next) {
    console.log(req.body.cmd);
    var token = req.headers['x-access-token'];
    if (!token) return res.status(401).send({ auth: false, message: 'No token provided.' });
    
    jwt.verify(token, config.secret, function(err, decoded) {
      if (err) return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });

      console.log('Got a command:' + JSON.stringify(req.body));
      var command = req.body.cmd;
      console.log('Command is: ' + command);
    
      res.setHeader('Content-Type', 'application/json');
      switch(command) {
      case 'GetPocketList':
        var getBody = {
          'consumer_key': '75081-21a26943be96172d3714c290',
          'access_token': 'bc13dc5c-4dc3-0ca8-d826-41a852'
        };
        getOptions.body = JSON.stringify(getBody);
        rp(getOptions)
          .then(function(body) {
            var titles = '';
            var jsonBody = JSON.parse(body);
            if(jsonBody.status == '1') {
              console.log('Status is successful');    
              console.log('Length is: ' + jsonBody.list.length);
              Object.keys(jsonBody.list).forEach(key => {
                console.log(jsonBody.list[key].resolved_title);
                titles += jsonBody.list[key].resolved_title + '.  ';
              });

              res.status(200).send(JSON.stringify({ text: titles }));
            }
          })
          .catch(function(err) {
            res.status(404).send(JSON.stringify({ text: 'Wow.  Amazing.  I recognized the intent but got no response' }));
            console.log('Failed to get to pocket');
            console.log(err);
          });
        break;
      case 'ReadPocketArticle':
        var getBody = {
          'consumer_key': '75081-21a26943be96172d3714c290',
          'access_token': 'bc13dc5c-4dc3-0ca8-d826-41a852',
          'search': req.body.searchTerms
        };
        getOptions.body = JSON.stringify(getBody);
        rp(getOptions)
          .then(function(body) {
            var titles = '';
            var url = '';
            var jsonBody = JSON.parse(body);
            if(jsonBody.status == '1') {
              Object.keys(jsonBody.list).forEach(key => {
                console.log(jsonBody.list[key].resolved_title);
                titles = jsonBody.list[key].resolved_title + '.  ';
                url = jsonBody.list[key].given_url;
              });
              console.log('URL is:  ' + url);
    
              read(url, function(err, article, meta) {
                var speechText = titles + article.content.text();
                console.log(speechText);
                res.status(200).send(JSON.stringify({ text: speechText }));
              });
            } else {
              console.log('Searching for the article failed to find a match');
              throw 'NoSearchMatch';
            }
          })
          .catch(reason => {
            console.log('caught an error: ', reason );
            let errorSpeech = ''
            switch(reason) {
              case 'NoSearchMatch':
                errorSpeech = 'Unable to find a matching article.  Try another phrase.'
                break;
              default:
                errorSpeech = 'There was an error finding the article.'
                break;
            }
            res.status(404).send(JSON.stringify({ text: errorSpeech }));
          });
        break;
      case 'SummarizePocketArticle':
        var getBody = {
          'consumer_key': '75081-21a26943be96172d3714c290',
          'access_token': 'bc13dc5c-4dc3-0ca8-d826-41a852',
          'search': req.body.searchTerms
        };
        getOptions.body = JSON.stringify(getBody);
        rp(getOptions)
          .then(function(body) {
            var titles = '';
            var url = '';
            var jsonBody = JSON.parse(body);
            if(jsonBody.status == '1') {
              console.log('Length is: ' + jsonBody.list.length);
              Object.keys(jsonBody.list).forEach(key => {
                console.log(jsonBody.list[key].resolved_title);
                titles += jsonBody.list[key].resolved_title + '.  ';
                url = jsonBody.list[key].given_url;
              });
              // Format for the summarization engine and send
              summaryOptions.uri = summaryLink + url;
              return rp(summaryOptions);
            } else {
              console.log('Searching for the article failed to find a match');
              throw 'NoSearchMatch';
            }
        })
        .then(function(summaryBody) {
          console.log('Got the summary back from summary engine');
          let jsonBody = JSON.parse(summaryBody);
          let textToSpeak = 'Here is a summary of: ' + jsonBody.sm_api_title + '.  ' +
            jsonBody.sm_api_content;
          console.log('Summary is:  ' + textToSpeak);
          res.status(200).send(JSON.stringify({ text: textToSpeak }));
        })
        .catch(reason => {
          console.log('caught an error: ', reason );
          let errorSpeech = ''
          switch(reason) {
            case 'NoSearchMatch':
              errorSpeech = 'Unable to find a matching article.  Try another phrase.'
              break;
            default:
              errorSpeech = 'There was an error finding the article.'
              break;
          }
          res.status(404).send(JSON.stringify({ text: errorSpeech }));
        });
    
        break;
      default:
        break;
      }
    });
  });

/*

        switch(event.request.intent.name) {
          case "GetPocketList":
            var getBody = {
              'consumer_key': '75081-21a26943be96172d3714c290',
              'access_token': 'bc13dc5c-4dc3-0ca8-d826-41a852'
            };
            getOptions.body = JSON.stringify(getBody);
            rp(getOptions)
              .then(function(body) {
                var titles = '';
                var jsonBody = JSON.parse(body);
                if(jsonBody.status == '1') {
                  console.log('Status is successful');    
                  console.log('Length is: ' + jsonBody.list.length);
                   Object.keys(jsonBody.list).forEach(key => {
                    console.log(jsonBody.list[key].resolved_title);
                    titles += jsonBody.list[key].resolved_title + '.  ';
                  });
                  
                }
      
                context.succeed(
                  generateResponse(
                    buildSpeechletResponse(titles, true),
                    {}
                  )
                )
              })
              .catch(function(err) {
                context.succeed(
                  generateResponse(
                    buildSpeechletResponse(`Wow.  Amazing.  I recognized the intent but got no response`, true),
                    {}
                  )
                )
                console.log('Failed to get to pocket');
                console.log(err);
              });
            break;
          case "SummarizePocketArticle":
            console.log('SummarizePocketARticle: ' + event.request.intent.slots);
            let slots = event.request.intent.slots;
            let search = '';
            for (var p in slots) {
              if( slots.hasOwnProperty(p) ) {
                console.log(p + ': ' + slots[p].value);
                search = slots[p].value;
              } 
            }   
            
            var getBody = {
              'consumer_key': '75081-21a26943be96172d3714c290',
              'access_token': 'bc13dc5c-4dc3-0ca8-d826-41a852',
              'search': search
            };
            getOptions.body = JSON.stringify(getBody);
            rp(getOptions)
              .then(function(body) {
                var titles = '';
                var url = '';
                var jsonBody = JSON.parse(body);
                if(jsonBody.status == '1') {
                  console.log('Status is successful');    
                  console.log('Length is: ' + jsonBody.list.length);
                   Object.keys(jsonBody.list).forEach(key => {
                    console.log(jsonBody.list[key].resolved_title);
                    titles += jsonBody.list[key].resolved_title + '.  ';
                    url = jsonBody.list[key].given_url;
                  });
                  // Format for the summarization engine and send
                  summaryOptions.uri = summaryLink + url;
                  return rp(summaryOptions);
                } else {
                  console.log('Searching for the article failed to find a match');
                  throw 'NoSearchMatch';
                }
            })
            .then(function(summaryBody) {
              console.log('Got the summary back from summary engine');
              let jsonBody = JSON.parse(summaryBody);
              let textToSpeak = 'Here is a summary of: ' + jsonBody.sm_api_title + '.  ' +
                jsonBody.sm_api_content;

              context.succeed(
                generateResponse(
                  buildSpeechletResponse(textToSpeak, true),
                  {}
                )
              )
            })
            .catch(reason => {
              console.log('caught an error: ', reason );
              let errorSpeech = ''
              switch(reason) {
                case 'NoSearchMatch':
                  errorSpeech = 'Unable to find a matching article.  Try another phrase.'
                  break;
                default:
                  errorSpeech = 'There was an error finding the article.'
                  break;
              }
              context.succeed(
                generateResponse(
                  buildSpeechletResponse(errorSpeech, true),
                  {}
                )
              )
            });
            break;
          case "ReadPocketArticle":
            console.log('ReadPocketArticle: ' + event.request.intent.slots);
            let slots2 = event.request.intent.slots;
            let search2 = '';
            for (var p in slots2) {
              if( slots2.hasOwnProperty(p) ) {
                console.log(p + ': ' + slots2[p].value);
                search2 = slots2[p].value;
              } 
            }   
            
            var getBody = {
              'consumer_key': '75081-21a26943be96172d3714c290',
              'access_token': 'bc13dc5c-4dc3-0ca8-d826-41a852',
              'search': search2
            };
            getOptions.body = JSON.stringify(getBody);
            rp(getOptions)
              .then(function(body) {
                var titles = '';
                var url = '';
                var jsonBody = JSON.parse(body);
                if(jsonBody.status == '1') {
                  console.log('Status is successful');    
                  console.log('Length is: ' + jsonBody.list.length);
                    Object.keys(jsonBody.list).forEach(key => {
                    console.log(jsonBody.list[key].resolved_title);
                    titles += jsonBody.list[key].resolved_title + '.  ';
                    url = jsonBody.list[key].given_url;
                  });

                  read(url, function(err, article, meta) {
                    var speechText = 'OK.  Now reading' + titles + article.content.text();
                    console.log(speechText);
                    context.succeed(
                      generateResponse(
                        buildSpeechletResponse(textToSpeak, true),
                        {}
                      )
                    )
                  });
    
                } else {
                  console.log('Searching for the article failed to find a match');
                  throw 'NoSearchMatch';
                }
            })
            .catch(reason => {
              console.log('caught an error: ', reason );
              let errorSpeech = ''
              switch(reason) {
                case 'NoSearchMatch':
                  errorSpeech = 'Unable to find a matching article.  Try another phrase.'
                  break;
                default:
                  errorSpeech = 'There was an error finding the article.'
                  break;
              }
              context.succeed(
                generateResponse(
                  buildSpeechletResponse(errorSpeech, true),
                  {}
                )
              )
            });
            break;
            default:
              throw "Invalid intent";
              break;
          }
*/


  
  /*
  app.post('/intent', bodyParser, function(req, res) {
    console.log('Got a command:' + JSON.stringify(req.body));
    var command = req.body.cmd;
    console.log('Command is: ' + command);
  
    res.setHeader('Content-Type', 'application/json');
    switch(command) {
    case 'GetPocketList':
      var getBody = {
        'consumer_key': '75081-21a26943be96172d3714c290',
        'access_token': 'bc13dc5c-4dc3-0ca8-d826-41a852'
      };
      getOptions.body = JSON.stringify(getBody);
      rp(getOptions)
        .then(function(body) {
          var titles = [];
          var jsonBody = JSON.parse(body);
          if(jsonBody.status == '1') {
            console.log('Status is successful');    
            console.log('Length is: ' + jsonBody.list.length);
            Object.keys(jsonBody.list).forEach(key => {
              titles.push(jsonBody.list[key].resolved_title + '.  ')
            });
            res.send(JSON.stringify({ text: titles }));
          }
        })
        .catch(function(err) {
          res.send(JSON.stringify({ text: 'Wow.  Amazing.  I recognized the intent but got no response' }));
          console.log('Failed to get to pocket');
          console.log(err);
        });
      break;
    case 'ReadPocketArticle':
      var getBody = {
        'consumer_key': '75081-21a26943be96172d3714c290',
        'access_token': 'bc13dc5c-4dc3-0ca8-d826-41a852',
        'search': req.body.searchTerms
      };
      getOptions.body = JSON.stringify(getBody);
      rp(getOptions)
        .then(function(body) {
          var titles = '';
          var url = '';
          var jsonBody = JSON.parse(body);
          if(jsonBody.status == '1') {
            Object.keys(jsonBody.list).forEach(key => {
              console.log(jsonBody.list[key].resolved_title);
              titles = jsonBody.list[key].resolved_title + '.  ';
              url = jsonBody.list[key].given_url;
            });
            console.log('URL is:  ' + url);
  
            read(url, function(err, article, meta) {
              var speechText = titles + article.content.text();
              console.log(speechText);
              res.send(JSON.stringify({ text: speechText }));
            });
          } else {
            console.log('Searching for the article failed to find a match');
            throw 'NoSearchMatch';
          }
        })
        .catch(reason => {
          console.log('caught an error: ', reason );
          let errorSpeech = ''
          switch(reason) {
            case 'NoSearchMatch':
              errorSpeech = 'Unable to find a matching article.  Try another phrase.'
              break;
            default:
              errorSpeech = 'There was an error finding the article.'
              break;
          }
          res.send(JSON.stringify({ text: errorSpeech }));
        });
      break;
    case 'SummarizePocketArticle':
      var getBody = {
        'consumer_key': '75081-21a26943be96172d3714c290',
        'access_token': 'bc13dc5c-4dc3-0ca8-d826-41a852',
        'search': req.body.searchTerms
      };
      getOptions.body = JSON.stringify(getBody);
      rp(getOptions)
        .then(function(body) {
          var titles = '';
          var url = '';
          var jsonBody = JSON.parse(body);
          if(jsonBody.status == '1') {
            console.log('Length is: ' + jsonBody.list.length);
            Object.keys(jsonBody.list).forEach(key => {
              console.log(jsonBody.list[key].resolved_title);
              titles += jsonBody.list[key].resolved_title + '.  ';
              url = jsonBody.list[key].given_url;
            });
            // Format for the summarization engine and send
            summaryOptions.uri = summaryLink + url;
            return rp(summaryOptions);
          } else {
            console.log('Searching for the article failed to find a match');
            throw 'NoSearchMatch';
          }
      })
      .then(function(summaryBody) {
        console.log('Got the summary back from summary engine');
        let jsonBody = JSON.parse(summaryBody);
        let textToSpeak = 'Here is a summary of: ' + jsonBody.sm_api_title + '.  ' +
          jsonBody.sm_api_content;
        console.log('Summary is:  ' + textToSpeak);
        res.send(JSON.stringify({ text: textToSpeak }));
      })
      .catch(reason => {
        console.log('caught an error: ', reason );
        let errorSpeech = ''
        switch(reason) {
          case 'NoSearchMatch':
            errorSpeech = 'Unable to find a matching article.  Try another phrase.'
            break;
          default:
            errorSpeech = 'There was an error finding the article.'
            break;
        }
        res.send(JSON.stringify({ text: errorSpeech }));
      });
  
      break;
    default:
      break;
    }
  });
  */
  module.exports = router;
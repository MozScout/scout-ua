const winston = require('winston');

const level = process.env.LOG_LEVEL || 'debug';

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
      level: level,
      timestamp: function() {
        return new Date().toISOString();
      }
    })
  ]
});

module.exports = logger;

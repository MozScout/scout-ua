const winston = require('winston');

const level = process.env.LOG_LEVEL || 'debug';

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.align(),
        winston.format.simple()
      ),
      level: level
    })
  ]
});

module.exports = logger;

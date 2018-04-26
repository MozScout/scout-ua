# scout-ua

[![Build Status](https://travis-ci.org/MozScout/scout-ua.svg?branch=master)](https://travis-ci.org/MozScout/scout-ua)


* |npm install| -- installs the dependencies.
* |npm test| -- runs the tests.  (Right now just the linter)
* |npm start| -- starts the server locally.

This can also be run on Heroku.  Here are the instructions for running with Heroku:

* |heroku create|
* |heroku buildpacks:add heroku/nodejs|
* |heroku buildpacks:add --index 1 https://github.com/shunjikonishi/heroku-buildpack-ffmpeg.git|
* |git push heroku master| or |git push heroku <your branch>:master|
* |heroku logs --tail|


# Scout UA

[![Build Status](https://travis-ci.org/MozScout/scout-ua.svg?branch=master)](https://travis-ci.org/MozScout/scout-ua)
[![Coverage Status](https://coveralls.io/repos/github/MozScout/scout-ua/badge.svg?branch=master)](https://coveralls.io/github/MozScout/scout-ua?branch=master)

# Setting up

## AWS IAM

Create a new [AWS IAM](https://console.aws.amazon.com/iam/) user.

It needs the following permissions:

* `AmazonS3FullAccess`
* `AmazonDynamoDBFullAccess`
* `AmazonPollyFullAccess`

Remember the Access Key Id and the Secret.

## AWS S3 Bucket

Create an [AWS S3 Bucket](https://console.aws.amazon.com/s3/home?region=us-east-1). It will be used to store the audio files.

In Permissions/Bucket Policy you can paste the following code (replace the resource name):

```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::s3-bucket-name/*"
        }
    ]
}
```

## Environment Variables

You need the following environment variables:

* `AWS_ACCESS_KEY_ID`: AWS Credentials (see [AWS IAM](https://console.aws.amazon.com/iam/home?region=us-east-1#/home))
* `AWS_SECRET_ACCESS_KEY`: AWS Credentials
* `AWS_REGION`: AWS Region (us-east-1)
* `DYNAMODB_USE_LOCAL`: false
* `JWT_SECRET`: secret used for JWT
* `POCKET_KEY`: Pocket Consumer Key. See [Pocket Developer Apps](https://getpocket.com/developer/apps/)
* `POLLY_S3_BUCKET`: S3 Bucket for streaming files
* `POLLY_VOICE`: Optional. Reading voice. See [available voices](https://console.aws.amazon.com/polly/home/SynthesizeSpeech?region=us-east-1). Defaults to Salli.
* `META_VOICE`: Optional. Voice for intro/outro. Defaults to Joey.
* `PROSODY_RATE`: Optional. Voice speed (x-slow, slow, medium, fast, x-fast). See [documentation](https://docs.aws.amazon.com/polly/latest/dg/supported-ssml.html#prosody-tag). Defaults to medium.
* `PROSODY_VOLUME`: Optional. Voice volume (silent, x-soft, soft, medium, loud, x-loud). See [documentation](https://docs.aws.amazon.com/polly/latest/dg/supported-ssml.html#prosody-tag). Defaults to medium.
* `SM_API_KEY`: Partner API key for [SMMRY](https://smmry.com/partner) service.
* `LOG_LEVEL`: Optional. [Winston](https://github.com/winstonjs/winston) logging level. Defaults to info.
* `GA_PROPERTY_ID`: Google Analytics ID. Can be an empty string.

# Deploy locally

* |npm install| -- installs the dependencies.
* |npm test| -- runs the tests.
* |npm start| -- starts the server locally.

Node version 9.11.1 is helpful for running locally due to natural libraries dependencies.

# Deploy on Heroku

This can also be run on Heroku. Here are the instructions for running with Heroku:

* |heroku create|
* |heroku buildpacks:add heroku/nodejs|
* |heroku buildpacks:add --index 1 https://github.com/shunjikonishi/heroku-buildpack-ffmpeg.git|
* |git push heroku master| or |git push heroku <your branch>:master|
* |heroku logs --tail|

# Tests

`npm test` runs the tests (lint, unit tests, integration tests).

To run lint individually: `npm run lint`.

To run unit tests individually: `npm run unit-test`.  You must have the variable AWS_REGION defined in order to run the unit tests.  You can run `export AWS_REGION=us-east-1`.

For the integration tests, you need to add the `TEST_API_URL` and the `TEST_API_ACCESS_TOKEN` (JWT token) environment variables. To run them: `npm run integ-test`.

Travis runs automatically lint and unit-test. Integration tests need to be run manually.

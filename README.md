# Scout UA

[![Build Status](https://travis-ci.org/MozScout/scout-ua.svg?branch=master)](https://travis-ci.org/MozScout/scout-ua)

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
* `POLLY_S3_BUCKET`: S3 Bucket
* `POLLY_VOICE`: Optional. See [available voices](https://console.aws.amazon.com/polly/home/SynthesizeSpeech?region=us-east-1).
* `META_VOICE`: Optional. Voice for intro/outro.
* `PROSODY_RATE`: Optional. Voice speed (x-slow, slow, medium, fast, x-fast). See [documentation](https://docs.aws.amazon.com/polly/latest/dg/supported-ssml.html#prosody-tag).
* `SM_API_KEY`: Partner API key for [SMMRY](https://smmry.com/partner) service.
* `LOG_LEVEL`: Optional. [Winston](https://github.com/winstonjs/winston) logging level.
* `GA_PROPERTY_ID`: Google Analytics ID. Can be an empty string.

# Deploy locally

* |npm install| -- installs the dependencies.
* |npm test| -- runs the tests. (Right now just the linter)
* |npm start| -- starts the server locally.

# Deploy on Heroku

This can also be run on Heroku. Here are the instructions for running with Heroku:

* |heroku create|
* |heroku buildpacks:add heroku/nodejs|
* |heroku buildpacks:add --index 1 https://github.com/shunjikonishi/heroku-buildpack-ffmpeg.git|
* |git push heroku master| or |git push heroku <your branch>:master|
* |heroku logs --tail|

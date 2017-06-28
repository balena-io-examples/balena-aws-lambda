# resin-lambda-service

This is a lambda function which creates the relevant certificates and policies needed for AWS IoT and sets them as per device environment variables on the resin.io device which invoked the Lambda function. The device can then use the set environment variables to authenticate requests to the AWS IoT API.  

## Use Case

[AWS IoT](https://aws.amazon.com/iot/how-it-works/) is amazingly powerful and secure way to process data produced by physical devices. But owning to this security there are some complexities when setting up a new AWS IoT client or device. This is because the [AWS IoT Device SDK](http://docs.aws.amazon.com/iot/latest/developerguide/iot-sdks.html) uses per device certificates to authenticate request between the device and AWS. This is great and fairly simple to set up once off, but using more than one device with AWS IoT you'll want to do this certificate provisioning a more automated way.

## Running and Testing:

Clone this repo
```
$ git clone https://github.com/craig-mulligan/resin-aws-lambda
```

I use [node-lambda](https://github.com/motdotla/node-lambda) to handle testing and deployment.

Install it first install `node-lambda`:
```
npm install -g node-lambda
```

Fill in your details in `env.json` you'll need the following vars:

| Key                   |
|-----------------------|
| AWS_ACCESS_KEY_ID     |
| AWS_SECRET_ACCESS_KEY |
| AWS_ROLE_ARN          |
| RESIN_EMAIL           |
| RESIN_PASSWORD        |

Variables from `.env` are injected when running locally allowing you to easy test the function with out deploying.

You'll also need to simulate event data for test. There is some dummy data in `event.json`, if you like you can replace the `uuid` with a real resin.io devices UUID.

Once those two files are ready, run:

```
node-lambda run
```

You should get a lovely success message. And you should have a AWS thing with an attached policy and certificate in the AWS IoT console. You'll also have [resin.io environment variables](http://docs.resin.io/management/env-vars/#per-device) set on each the device you specified in `event.json`.

Now we are ready to deploy to AWS. Ensure you have Added you're resin credentials to `deploy.env` first then run:

```
node-lambda deploy -f deploy.env 
```

![lambdaTrigger](/docs/lambdaTrigger.png)

Then login to AWS console and visit the lambda console, you should see a fresh new lambda function. Next add a `API Gateway` trigger. Make sure it is a `POST` `Method` and `Security` is `open` (though you could add this later).

![lambdaTrigger](/docs/awsIoT.png)

![resinEnvars](/docs/resinEnvars.png)

Now we have an public endpoint for the devices to request to be provisioned.

All that's left to do deploy the [device portion](https://github.com/resin-io-projects/resin-aws-device) to the devices. And your resin.io app has the right [environment variables configured](https://github.com/craig-mulligan/resin-aws-device#add-a-few-resin-app-environment-variables)

NOTE: During testing you may want to flush, both resin.io environment variables and AWS IoT things, policies and certificates so I've created a [couple scripts](https://github.com/craig-mulligan/aws-reset-scripts) to do that.

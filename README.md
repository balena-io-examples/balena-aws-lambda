**For balena's current cloud integration tools, see the [Provision with cloud IoT](https://www.balena.io/docs/learn/develop/cloud-iot-provisioning/aws/) docs, [aws-iot-provision](https://github.com/balena-io-examples/aws-iot-provision) repo, and [cloud-relay](https://github.com/balena-io-examples/cloud-relay) repo.**

# balena-aws-lambda

This is an AWS Lambda function that provisions a balena device to publish data to AWS IoT Core. First, it creates an X.509 certificate and publish policy on AWS. Then it sets the relevant environment variables for the balena device so it can initialize a connection to AWS and publish data.

The Lambda function is intended to be called by the device itself as seen in the [balena-aws-device](https://github.com/balena-io-examples/balena-aws-device) example.

## Use Case

[AWS IoT](https://aws.amazon.com/iot/how-it-works/) is amazingly powerful and secure way to process data produced by physical devices. But owing to this security there are some complexities when setting up a new AWS IoT client or device. This is because the [AWS IoT Device SDK](http://docs.aws.amazon.com/iot/latest/developerguide/iot-sdks.html) uses per device certificates to authenticate requests between the device and AWS. This is great and fairly simple to set up once off, but using more than one device with AWS IoT you'll want to do this certificate provisioning in a more automated way.

## Setup and Testing

Clone this repo
```
$ git clone https://github.com/balena-io-examples/balena-aws-lambda
```

I use [node-lambda](https://github.com/motdotla/node-lambda) to handle testing and deployment. First install it:

```
npm install -g node-lambda
```

Create a `.env` from the provided `env.example`. You'll need the following vars:

| Key                   | Value |
|-----------------------| ----- |
| AWS_ACCESS_KEY_ID     | to test with node-lambda `run` |
| AWS_SECRET_ACCESS_KEY | key for ID above |
| AWS_REGION            | for AWS resource (Thing, etc.) provisioning |
| AWS_ROLE_ARN          | for Lambda execution |
| RESIN_EMAIL           | authorized to set device variables |
| RESIN_PASSWORD        | password for email above |

Variables from `.env` are injected when running locally, which makes it easy to test the function without deploying.

You'll also need to simulate event data for test. There is some dummy data in `event.json`. If you like you can replace the `uuid` with a real balena device UUID.

Once those two files are ready, run:

```
node-lambda run --apiGateway
```

You should get a lovely success message. And you should have an AWS thing with an attached policy and certificate in the AWS IoT console. You'll also have [balena environment variables](http://balena.io/docs/learn/manage/serv-vars/#device-environment-and-service-variables) set on each device you specified in `event.json`.

## Deployment

Now we are ready to deploy to AWS. Ensure you have added your balena credentials to `deploy.env` first, then run:

```
node-lambda deploy -f deploy.env
```

Note: if the access/secret keys in your `.env` have insufficient privileges to deploy to Lambda, specify the appropriate keys with the `-a` and `-s` switches for the command above.

![lambdaTrigger](/docs/lambdaTrigger.png)

Then login to AWS console and visit the Lambda console. You should see a fresh new Lambda function. Next add an `API Gateway` trigger. Make sure the `Method` for the route is `POST` and `Security` is `open` (though you could add this later).

![lambdaTrigger](/docs/awsIoT.png)

![balenaEnvars](/docs/balenaEnvars.png)

Now we have a public endpoint for a device to request provisioning to IoT Core.
All that's left is to deploy the [device portion](https://github.com/balena-io-examples/balena-aws-device) to the devices.

Note: During testing you may want to flush balena environment variables as well as AWS IoT things, policies and certificates. I've created a [couple of scripts](https://github.com/craig-mulligan/aws-reset-scripts) to do that.

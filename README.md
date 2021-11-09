# AWS Lambda for IoT Device Provisioning

[AWS IoT](https://aws.amazon.com/iot/how-it-works/) is an amazingly powerful and secure way to process data produced by physical devices. But owing to this security there are some complexities when setting up a new AWS IoT client or device. This is because the [AWS IoT Device SDK](http://docs.aws.amazon.com/iot/latest/developerguide/iot-sdks.html) uses per device certificates to authenticate requests between the device and AWS. This authentication is great and fairly simple to set up once off. However when using more than one device with AWS IoT you'll want to automate this certificate provisioning .

This project is an AWS Lambda function that provisions a balena device to publish data to AWS IoT Core. First it validates the device UUID as a member of your fleet, and then it creates an AWS IoT Thing, an X.509 certificate, and a permissions policy on AWS. Finally it sets the relevant environment variables for the balena device so it can initialize a connection to AWS and publish data.

![deviceProvision](/docs/iot-device-provisioning.png)

The Lambda function may be called by the device to be provisioned, as in the [balena-aws-device](https://github.com/balena-io-examples/balena-aws-device) example.

## Setup and Testing

Clone this repo
```
$ git clone https://github.com/balena-io-examples/balena-aws-lambda
```

Provisioning generates an AWS permissions policy required for the Thing to operate. The policy contents are generated from the `policy.json` file, which contains simple defaults you may wish to refine.

You also must create an AWS [IAM role](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html) with the necessary permissions to run the Lambda function. See the table below for suggested permissions.

I use [node-lambda](https://github.com/motdotla/node-lambda) to handle testing and deployment. First install it:

```
npm install -g node-lambda
```

Create a `.env` file from the provided `env.example`. You'll need the following vars:

| Key                   | Value |
|-----------------------| ----- |
| AWS_ACCESS_KEY_ID     | to test with node-lambda `run` |
| AWS_SECRET_ACCESS_KEY | secret key for ID above |
| AWS_REGION            | for AWS resource (Thing, etc.) provisioning |
| AWS_ROLE_ARN          | IAM role for Lambda execution; include AWSIoTConfigAccess and AWSIoTLogging permissions in the role configuration as a simple starting point |
| RESIN_EMAIL           | to test with node-lambda `run`; balena account authorized to set device variables |
| RESIN_PASSWORD        | password for balena account |

Variables from `.env` are injected when running locally, which makes it easy to test the function without deploying.

You'll also need to simulate event data for test. There is some dummy data in `event.json`. Replace the `uuid` value with a real balena device UUID.

Once those two files are ready, test your setup by running the function:

```
node-lambda run --apiGateway
```

You should get a lovely success message. And you should have an AWS thing with an attached policy and certificate in the AWS IoT console. You'll also have [balena environment variables](http://balena.io/docs/learn/manage/serv-vars/#device-environment-and-service-variables) set on each device you specified in `event.json`.

## Deploy to AWS

Create a `deploy.env` from the provided `deploy.env.example`, and set your balena credentials. The values in this file are used as environment variables by the Lambda function. Now we are ready to deploy to AWS:

```
node-lambda deploy -f deploy.env
```

**Note:** If the access/secret keys in your `.env` have insufficient privileges to deploy to Lambda, update them or specify the appropriate keys with the `-a` and `-s` switches for the deploy command above.

Then login to AWS console and visit the Lambda console. You should see a fresh new Lambda function. Next add an [API Gateway](https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html) trigger to provide HTTP access to the function. Make sure the `Method` for the route is `POST` and `Security` is `open` (though you could add this later). The result should look like below.

![lambdaTrigger](/docs/lambdaTrigger.png)

Now we have a public endpoint for a device to request provisioning to IoT Core. All that's left is to deploy the [device portion](https://github.com/balena-io-examples/balena-aws-device) to the devices so they can call the function as needed. When a device is provisioned, you'll see the Thing, certificate and policy in the AWS IoT Console, like below.

![lambdaTrigger](/docs/awsIoT.png)

**Note:** During testing you may want to flush balena environment variables as well as AWS IoT things, policies and certificates. I've created a [couple of scripts](https://github.com/craig-mulligan/aws-reset-scripts) to do that.

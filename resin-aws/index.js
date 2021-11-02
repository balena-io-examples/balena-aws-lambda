'use strict'
/*
 This module chains requests to create and associate an AWS IoT thing and its certificates and policy.
 It is meant to run on Lambda where the aws-sdk is installed by defualt.
 NOTE: If you are running this code anywhere else but Lambda you will need to manually authenticate with the aws-sdk.
*/

// APIs
var Promise = require('bluebird');
var AWS = require('aws-sdk');
var rp = require('request-promise');

var iot = Promise.promisifyAll(new AWS.Iot(), {suffix: "AsyncLambda"});

module.exports = {
  // Pass  and attributes object
  // @param {string} deviceUUID resin device UUID.
  // @param {obj} deviceAttr Device attributes to store with aws IoT.
  // @param {json} policy aws Iot policy Doc.
  // Registers a thing with AWS
  // Returns aws certificates
  provision: function(deviceUUID, deviceAttr, policy) {
    return new Promise(function(resolve, reject) {
      var awsThing = {}
      // Create AWS IoT thing
      var params = {
        thingName: deviceUUID, /* required */
        attributePayload: {
          attributes: deviceAttr
        }
      }
      iot.createThingAsyncLambda(params).then(function (res) {
        awsThing.thing = res
        // Create AWS IoT Policy
        var params = {
          policyDocument: JSON.stringify(policy), /* required */
          policyName: 'PubSubToAnyTopic-' + awsThing.thing.thingName /* required */
        };
        return iot.createPolicyAsyncLambda(params)
      }).then(function(res){
        awsThing.policy = res
        // Create AWS IoT Certificates
        return iot.createKeysAndCertificateAsyncLambda({ setAsActive: true })
      }).then(function(res){
        awsThing.cert = res
        // Set AWS IoT rootCA
        return rp(process.env.ROOTCA_URL || 'https://www.amazontrust.com/repository/AmazonRootCA1.pem')
      }).then(function(res) {
        awsThing.cert.rootCA = res
        // Attach AWS IoT Policy + Certificate
        var params = {
          policyName: awsThing.policy.policyName, /* required */
          principal: awsThing.cert.certificateArn /* required */
        };
        iot.attachPrincipalPolicyAsyncLambda(params)
      }).then(function(){
        // Attach AWS IoT Policy + Thing
        var params = {
          thingName: awsThing.thing.thingName, /* required */
          principal: awsThing.cert.certificateArn /* required */
        };
        iot.attachThingPrincipalAsyncLambda(params)
      }).catch(function(err){
        //Handle any error
        reject(err)
      }).then(function(){
        // encode it so that line breaks so that line-breaks can be stored as resin envars
        resolve({
          AWS_CERT_ARN: awsThing.cert.certificateArn,
          AWS_CERT: Buffer.from(awsThing.cert.certificatePem).toString('base64'),
          AWS_PRIVATE_KEY: Buffer.from(awsThing.cert.keyPair.PrivateKey).toString('base64'),
          AWS_ROOT_CA: Buffer.from(awsThing.cert.rootCA).toString('base64')
        });
      });
    });
  }
};

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

var iot = Promise.promisifyAll(new AWS.Iot());

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
      iot.createThingAsync(params).then(function (res) {
        // Create AWS IoT Certificates
        awsThing.thing = res
        return iot.createKeysAndCertificateAsync({ setAsActive: true })
      }).then(function(res){
        awsThing.cert = res
        // Create AWS IoT rootCA
        return rp(process.env.ROOTCA_URL || 'https://www.symantec.com/content/en/us/enterprise/verisign/roots/VeriSign-Class%203-Public-Primary-Certification-Authority-G5.pem')
      }).then(function(res) {
        // Create AWS IoT Policy
        awsThing.cert.rootCA = res
        var params = {
          policyDocument: JSON.stringify(policy), /* required */
          policyName: 'PubSubToAnyTopic-' + awsThing.thing.thingName /* required */
        };
        return iot.createPolicyAsync(params)
      }).then(function(res){
        awsThing.policy = res
        // Attach AWS IoT Policy + Certificate
        var params = {
          policyName: awsThing.policy.policyName, /* required */
          principal: awsThing.cert.certificateArn /* required */
        };
        iot.attachPrincipalPolicyAsync(params)
      }).then(function(){
        // Attach AWS IoT Policy + Thing
        var params = {
          thingName: awsThing.thing.thingName, /* required */
          principal: awsThing.cert.certificateArn /* required */
        };
        iot.attachThingPrincipalAsync(params)
      }).catch(function(err){
        //Handle any error
        reject(err)
      }).then(function(){
        // regex to replace the line breaks so they can be stored as resin envars
        var lineBreak = /\r\n|\n/ig;
        var pattern = '#####'
        resolve({
          AWS_CERT_ARN: awsThing.cert.certificateArn,
          AWS_CERT: awsThing.cert.certificatePem.replace(lineBreak, pattern),
          AWS_PRIVATE_KEY: awsThing.cert.keyPair.PrivateKey.replace(lineBreak, pattern),
          AWS_ROOT_CA: awsThing.cert.rootCA.replace(lineBreak, pattern)
        });
      });
    });
  }
};

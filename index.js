'use strict'
/*
 This is simple Lambda service to associate resin.io devices with AWS and pass the
 certificates required to publish data to AWS IoT back to the device.
*/

// libs
var resinIntegrator = require('./resin-integrator')
var resinAWS = require('./resin-aws');

var decryptEnvVars = require('aws-kms-decrypt-env');
var decrypted = {};

// aws policy document
var policy = require('./policy.json');

var encrypted = process.env['RESIN_PASSWORD'];
var decrypted;

function processEvent(event, context, callback) {
  if (event) {
    // console.log(event)
    // resin.io credentials
    var resinCreds =  { email: process.env.RESIN_EMAIL, password: decrypted.RESIN_PASSWORD }

    // get data posted from device
    var data = JSON.parse(event.body)
    var deviceUUID = data.uuid
    var deviceAttributes = data.attributes

    // new lambda API setting
    context.callbackWaitsForEmptyEventLoop = false;

    console.log('Checking device', deviceUUID);

    resinIntegrator.init(resinCreds).then(function(){
      return resinIntegrator.isDeviceValid(deviceUUID)
    }).then(function(){
      // pass deviceUUID
      // return a object that to create enviroment variables
      return resinAWS.provision(deviceUUID, deviceAttributes, policy);
    }).then(function(certs){
      // creates resin.io environmentVariables
      return resinIntegrator.createEnv(deviceUUID, certs);
    }).catch(function(err){
      // Handle any error
      callback(err, 'Failed Result');
    }).then(function(){
      // Process complete
      // AWS Certificates are now saved on the device as enviroment variables
      callback(null, 'Device successfully configured');
    });
  }
}

// exports handler for Lambda func
exports.handler = function(event, context, callback) {
  if (decrypted.ok) return processEvent(event, context, callback);

  // handle request
  decryptEnvVars([
    'RESIN_PASSWORD'
  ], decrypted, function(err) {
    if (err) return callback(err);
    processEvent(event, context, callback);
  })
};

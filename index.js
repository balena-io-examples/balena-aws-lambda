'use strict'
/*
 This is simple Lambda service to associate resin.io devices with AWS and pass the
 certificates required to publish data to AWS IoT back to the device.
*/

// libs
var resinIntegrator = require('./resin-integrator')
var resinAWS = require('./resin-aws');

// aws policy document
var policy = require('./policy.json');

// exports handler for Lambda func
exports.handler = function(event, context, callback) {
    // handle request
    if (event && event.body) {
        // resin.io credentials
        var resinCreds =  { email: process.env.RESIN_EMAIL, password: process.env.RESIN_PASSWORD }

        //console.log('event ' + JSON.stringify(event));
        var body = JSON.parse(event.body);
        // get data posted from device
        var deviceUUID = body.uuid
        var deviceAttributes = body.attributes

        // new lambda API setting
        context.callbackWaitsForEmptyEventLoop = false;

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
};

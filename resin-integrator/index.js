'use strict'
/*
 This module accepts an object and creates resin.io environment variables with the key value pairs.
*/

var resin = require('resin-sdk');
var Promise = require('bluebird');
var async = require('async');
resin = Promise.promisifyAll(resin);
module.exports = {
  /**
  Authenticates with resin.io API
  @param object resinCreds resin.io email and password
  */
  init: function(resinCreds) {
    return resin.auth.login(resinCreds)
  },
  /**
  Checks if device belongs to authenticated resin account
  @param string deviceUUID resin.io device unique ID
  */
  isDeviceValid: function(deviceUUID) {
    return resin.models.device.get(deviceUUID)
  },
  /**
  Creates resin.io environment variables for specified device
  @param string deviceUUID resin.io device unique ID
  @param string obj key, value pairs to send to resin as environmentVariables
  */
  createEnv: function(deviceUUID, obj) {
    return new Promise(function(resolve, reject){
      async.forEach(Object.keys(obj), function (key, callback){
      var val = obj[key];
        resin.models.environmentVariables.device.create(deviceUUID, key, val).then(function() {
          callback();
        }).catch(function(err) {
          reject(err)
        })
      }, function(err) {
          resolve();
      });
    });
  }
};

var sys = require('sys'),
  events = require('events'),
  fs = require('fs'),
  querystring = require('querystring');

var staticLogin = fs.readFileSync(__dirname + '/../static/login.html');

var SecurityProvider = function(config) {

  events.EventEmitter.call(this);

  /*
   * Configuration options;
   * loginUrl: req.url path to use to implicitly emit the 'loginRequest' event
   * logoutUrl: req.url path to use to implicitly emit the 'logout' event
   * defaultKey: Key that will be automatically assigned to newly
   *  logged in users.
   * hasKeyFn: function to be assigned to req.session.security.hasKey
   */
  var config = (config) ? config : {};
  var definitions = {};
  var defaultAuthenticator;
  var loginURL;
  var logoutURL;
  var ignoredElements = [];
  var testCredentials = [];
  var self = this;

  this.getDefinitions = function() {
    return definitions;
  };

  this.setLoginURL = function(url) {
    loginURL = url;
  };

  this.getLoginURL = function() {
    return loginURL;
  };

  this.setLogoutURL = function(url) {
    logoutURL = url;
  };

  this.getLogoutURL = function() {
    return logoutURL;
  };

  this.setDefaultAuthenticator = function(authenticator) {
    defaultAuthenticator = authenticator;
  };

  this.getDefaultAuthenticator = function() {
    return defaultAuthenticator;
  };

  this.define = function(eventName, matchFunction) {
    definitions[eventName] = matchFunction;
    sys.log('Komainu: implicitEventDefined (' + eventName + ')');
    self.emit('implicitEventDefined', eventName, matchFunction);
  };

  this.secure = function(authenticator) {

    var authenticator = (authenticator) ? authenticator : self.getDefaultAuthenticator();

    var secureFn = function(req, res, next) {
      self.finalize = next;
      if (self.ignore(req, res)) {
        sys.log('Komainu: Ignoring ' + req.url);
        return next();
      } else {
        sys.log('Komainu: match (' + req.method + ' ' + req.url+ ')'); 
        self.emit('match', req, res, authenticator);
      }
    };

    return secureFn;
  };

  this.ignore = function(req, res) {
    for (var i = 0; i < ignoredElements.length; i++) {
      var fn = ignoredElements[i];
      if (fn(req, res))
        return true;
    }
    return false;
  };

  this.addIgnore = function(fn) {
    ignoredElements.push(fn);
  };

  // TODO: change to a hash {username: {...}} to O(1) access from 0(n)
  this.addCredentials = function(username, password, keys) {
    testCredentials.push({
      username: username,
      password: password,
      keys: keys
    });
  };

  this.hasCredentials = function(username, password) {
    for (var i = 0; i < testCredentials.length; i++) {
      if (testCredentials[i].username == username && testCredentials[i].password == password)
        return true;
    }
    return false;
  };

};

sys.inherits(SecurityProvider, events.EventEmitter);

exports.SecurityProvider = SecurityProvider;

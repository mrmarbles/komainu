var sys = require('sys'),
  events = require('events'),
  fs = require('fs'),
  querystring = require('querystring');

var staticLogin = fs.readFileSync(__dirname + '/../static/login.html');

var SecurityProvider = function(config) {

  events.EventEmitter.call(this);

  var definitions = {}, defaultAuthenticator, loginURL, logoutURL, ignoredElements = [], 
    testCredentials = [], self = this;

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

  this.addCredentials = function(username, password, keys) {
    testCredentials[username] = {
      password: password,
      keys: keys
    }
  };

  this.hasCredentials = function(username, password) {
    return (testCredentials[username] && testCredentials[username].password == password)
  };

};

sys.inherits(SecurityProvider, events.EventEmitter);

exports.SecurityProvider = SecurityProvider;

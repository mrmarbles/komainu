var sys = require('sys'),
  events = require('events'),
  fs = require('fs'),
  querystring = require('querystring');

var staticLogin = fs.readFileSync(__dirname + '/../static/login.html');

var SecurityProvider = function() {

  events.EventEmitter.call(this);

  var definitions = {}, defaultAuthenticator, loginURL, logoutURL, ignoredElements = [], 
    testCredentials = [], self = this;

  /**
   * Will return any functions that have
   * been previously registered with define().
   * These functions represent logic to determine
   * which events will be implicitly emitted by
   * the SecurityProvider given req (request) and res
   * (response) information.
   */
  this.getDefinitions = function() {
    return definitions;
  };

  /**
   * @param url represents the URL path information
   * that the provider will recognize as a valid login URL.
   */
  this.setLoginURL = function(url) {
    loginURL = url;
  };

  /**
   * Will return the value previously established
   * with setLoginURL();
   */
  this.getLoginURL = function() {
    return loginURL;
  };

  /**
   * @param url Represents the URL path information
   * that will be used to determine a valid logout URL.
   */
  this.setLogoutURL = function(url) {
    logoutURL = url;
  };

  /**
   * Will return the value previously established
   * with setLogoutURL();
   */
  this.getLogoutURL = function() {
    return logoutURL;
  };

  /**
   * Establishes a default authentication function that
   * will be implemented with the closure returned by
   * a call to secure() when no other valid authenticator
   * is provided that method.
   *
   * @param authenticator A valid function whose method
   * signature is authenticator(req, res).  Request (req) and 
   * response (res) information can then be evaluated to determine
   * if a specific request can be permitted to be fulfilled by
   * the framework.  Function must return a boolean value indicating
   * access denied or permitted.
   */
  this.setDefaultAuthenticator = function(authenticator) {
    defaultAuthenticator = authenticator;
  };

  /**
   * Returns the function previously set via
   * setDefaultAuthenticator();
   */
  this.getDefaultAuthenticator = function() {
    return defaultAuthenticator;
  };

  /**
   * Creates a definition that will be used to determine
   * which if any registered events should be emitted
   * implicitly by the SecurityProvider given request and 
   * response data.
   * 
   * @param eventName A string representing the name of the event
   *  that should be emitted when the associated matchFunction returns
   *  true;
   *
   * @param matchFunction A function whose signature is matchFunction(req, res)
   *  that will return a boolean value indicating whether or not an event
   *  matching the eventName parameter will be emitted.  Request (req) and 
   *  response (res) data should be used to determine the result.
   */
  this.define = function(eventName, matchFunction) {
    definitions[eventName] = matchFunction;
    sys.log('Komainu: implicitEventDefined (' + eventName + ')');
    self.emit('implicitEventDefined', eventName, matchFunction);
  };

  /**
   * Returns a Connect-friendly closure (function whose method signature accounts
   * for (req, res, next) which implements either an optionally provided authenticator 
   * function or if none is given, the default one (via setDefaultAuthenticator()).
   *
   * @param authenticator A function whose method signature is authenticator(req, res) that
   *  must return a boolean result indicating whether or not access should be granted based
   *  off of request/response information.
   */
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

  /**
   * Will return a boolean result indicating whether or
   * the SecurityProvider will forego event emission based
   * off of the provided request (req) and response (res) data.
   *
   * Previously registered ignore rules (via addIgnore()) 
   *  are considered in this function.
   */
  this.ignore = function(req, res) {
    for (var i = 0; i < ignoredElements.length; i++) {
      var fn = ignoredElements[i];
      if (fn(req, res))
        return true;
    }
    return false;
  };

  /**
   * Registers an ignore rule.  Ignore rules dictate
   * which requests should effectively be ignored by security.
   * The SecurityProvider will not emit any implicit events
   * for requests / responses that match a given ignore rule.
   *
   * @param fn A function whose method signature must be fn(req, res), returning
   *  a boolean result indicating whether or not the SecurityProvider should ignore
   *  a current request.
   */
  this.addIgnore = function(fn) {
    ignoredElements.push(fn);
  };

  /**
   * Simply registers test credentials with the SecurityProvider.  The provided
   * username and password information can then be used for authentication.  It is
   * NOT recommended that this method be implemented to store actual production authentication
   * information.
   *
   * @param username A string representing a unique user
   * @param password A corresponding password to complete the credentials
   * @param keys A data element of any type that will be assigned to req.session.security.keys
   *  upon successful login
   */
  this.addCredentials = function(username, password, keys) {
    testCredentials[username] = {
      password: password,
      keys: keys
    }
  };

  /**
   * Will returna boolean value indicating, given the provided
   * username and password, if a previously registered user (via addCredentials())
   * with the same credentials exists.
   *
   * @param username
   * @param password
   */
  this.hasCredentials = function(username, password) {
    return (testCredentials[username] && testCredentials[username].password == password)
  };

};

sys.inherits(SecurityProvider, events.EventEmitter);

exports.SecurityProvider = SecurityProvider;

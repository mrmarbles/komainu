exports.version = '0.0.1';

var sys = require('sys'),
  events = require('events'),
  fs = require('fs'),
  querystring = require('querystring');

var staticLogin = fs.readFileSync(__dirname + '/../static/login.html');

var SecurityProvider = function() {

  events.EventEmitter.call(this);

  var logPrefix = 'KOMAINU';
  var matchers = {};
  var self = this;

  this.define = function(eventName, matchFunction) {
    matchers[eventName] = matchFunction;
    sys.log(logPrefix + ': implicitEventDefined (' + eventName + ')');
    self.emit('implicitEventDefined', eventName, matchFunction);
  };

  this.secure = function(req, res, next) {
    sys.log(logPrefix + ': match');
    self.emit('match', req, res, next);
  };

  // Default implicit event definitions

  this.define('loginShow', function(req, res) {
    return (req.method == 'GET' && req.url == '/login');
  });

  this.define('loginRequest', function(req, res) {
    return (req.method == 'POST' && req.url == '/login');
  });

  // TODO: need to ensure the ignore() function is considered here
  this.define('authenticate', function(req, res) {
    return !/^\/login$|^\/logout$/.test(req.url);
  });

  // Preconfigured event listeners

  var match = function(req, res) {
    for (var key in matchers) {
      var fn = matchers[key];
      if (fn(req, res)) {
        sys.log(logPrefix + ': ' + key);
        self.emit(key, req, res);
      }
    }
  };
  match.komainu = true;
  this.on('match', match);

  var loginShow = function(req, res, err) {
    res.writeHead(200, {'Content-Type':'text/html'});
    res.end(staticLogin);
  };
  loginShow.komainu = true;
  this.on('loginShow', loginShow);

  var loginRequest = function(req, res) {
    req.on('data', function(data) {
      var credentials = querystring.parse(data.toString());
      sys.log(logPrefix + ': login (' + credentials.username + ')');
      self.emit('login', req, res, credentials.username, credentials.password, ['LOGGED_IN_USER']);
    });
  };
  loginRequest.komainu = true;
  this.on('loginRequest', loginRequest);

  var login = function(req, res, username, password, keys) {
    if (!username || !password)
      return;

    // TODO: Replace with correct keychain logic
    if (username == 'bcarr' && password == 'bcarr') {
      sys.log(logPrefix + ': loginSuccess (' + username + ')');
      self.emit('loginSuccess', req, res, username, keys);
    } else {
      sys.log(logPrefix + ': loginFailure (' + username + ')');
      self.emit('loginFailure', req, res, username);
    }
  };
  login.komainu = true;
  this.on('login', login);

  var loginSuccess = function(req, res, username, keys) {
    sys.log(logPrefix + ': initSession (' + username + ')');
    self.emit('initSession', req, res, username, keys);
  };
  loginSuccess.komainu = true;
  this.on('loginSuccess', loginSuccess);

  var loginFailure = function(req, res, username) {
    sys.log(logPrefix + ': loginShow');
    self.emit('loginShow', req, res, ['Invalid Credentials']);
  };
  loginFailure.komainu = true;
  this.on('loginFailure', loginFailure);

  var initSession = function(req, res, username, keys) {
    // check to make sure the session variable exists within the request
    if (!req.session) {
      throw Error('Session does not exist.  Make sure connect.session() has been ' +
        'provided as valid Connect middleware.');
    }

    // now properly initialize the session with the provided keys
    req.session.komainu = {
      keys: keys
    }

    sys.log(logPrefix + ': sessionStarted (' + username + ', ' + keys + ')');
    self.emit('sessionStarted', req, res, username);
  };
  initSession.komainu = true;
  this.on('initSession', initSession);

  this.on('newListener', function(event, listener) {
    var listeners = self.listeners(event);
    for (var i = 0; i < listeners.length; i++) {
      if (listeners[i].komainu) {
        sys.log(logPrefix + ': Overriding ' + event);
        self.removeListener(event, listeners[i]);
      }
    }
  });

};

sys.inherits(SecurityProvider, events.EventEmitter);

exports.SecurityProvider = SecurityProvider;

exports.version = '0.0.1';

var sys = require('sys'),
  events = require('events'),
  fs = require('fs'),
  querystring = require('querystring');

var staticLogin = fs.readFileSync(__dirname + '/../static/login.html');

var SecurityProvider = function(config) {

  var config = (config) ? config : {};

  this.loginUrl = (config.loginUrl) ? config.loginUrl : '/login';
  this.logoutUrl = (config.logoutUrl) ? config.logoutUrl : '/logout';

  var loginMatcher = new RegExp(this.loginUrl);
  var logoutMatcher = new RegExp(this.logoutUrl);

  events.EventEmitter.call(this);

  var logPrefix = 'Komainu';
  var matchers = {};
  var ignoredElements = [];
  var testCredentials = [];
  var self = this;

  this.define = function(eventName, matchFunction) {
    matchers[eventName] = matchFunction;
    sys.log(logPrefix + ': implicitEventDefined (' + eventName + ')');
    self.emit('implicitEventDefined', eventName, matchFunction);
  };

  this.secure = function() {
    return function(req, res, next) {
      if (self.ignore(req, res)) {
        sys.log(logPrefix + ': Ignoring ' + req.url);
        return next();
      } else {
        sys.log(logPrefix + ': match (' + req.method + ' ' + req.url+ ')'); 
        self.emit('match', req, res, function() { 
          next();
        });
      }
    };
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
    testCredentials.push({
      username: username,
      password: password,
      keys: keys
    });
  };

  var hasCredentials = function(username, password) {
    for (var i = 0; i < testCredentials.length; i++) {
      if (testCredentials[i].username == username && testCredentials[i].password == password)
        return true;
    }
    return false;
  };

  this.addIgnore(function(req, res) {
    if (req.method == 'GET' && /favicon.ico|.css/.test(req.url))
      return true;
    return false;
  });

  this.define('loginShow', function(req, res) {
    return (req.method == 'GET' && loginMatcher.test(req.url));
  });

  this.define('loginRequest', function(req, res) {
    return (req.method == 'POST' && loginMatcher.test(req.url));
  });

  this.define('authenticate', function(req, res) {
    return !loginMatcher.test(req.url) && !logoutMatcher.test(req.url);
  });

  this.define('logout', function(req, res) {
    return (req.method == 'GET' && logoutMatcher.test(req.url));
  });

  var match = function(req, res, fin) {
    for (var key in matchers) {
      var fn = matchers[key];
      if (fn(req, res)) {
        sys.log(logPrefix + ': ' + key);
        self.emit(key, req, res, fin);
      }
    }
  };
  match.komainu = true;
  this.on('match', match);

  var loginShow = function(req, res, fin, err) {
    res.writeHead(200, {'Content-Type':'text/html'});
    res.end(staticLogin);
  };
  loginShow.komainu = true;
  this.on('loginShow', loginShow);

  var loginRequest = function(req, res, fin) {
    req.on('data', function(data) {
      var credentials = querystring.parse(data.toString());
      sys.log(logPrefix + ': login (' + credentials.username + ')');
      self.emit('login', req, res, fin, credentials.username, credentials.password, ['LOGGED_IN_USER']);
    });
  };
  loginRequest.komainu = true;
  this.on('loginRequest', loginRequest);

  var login = function(req, res, fin, username, password, keys) {
    if (hasCredentials(username, password)) {
      sys.log(logPrefix + ': initSession (' + username + ')');
      self.emit('initSession', req, res, fin, username, keys);
      sys.log(logPrefix + ': loginSuccess (' + username + ')');
      self.emit('loginSuccess', req, res, fin, username);
    } else {
      sys.log(logPrefix + ': loginFailure (' + username + ')');
      self.emit('loginFailure', req, res, fin, username);
    }
  };
  login.komainu = true;
  this.on('login', login);

  var loginSuccess = function(req, res, fin, username) {
    res.writeHead(302, {'Location':'/'});
    res.end();
  };
  loginSuccess.komainu = true;
  this.on('loginSuccess', loginSuccess);

  var loginFailure = function(req, res, fin, username) {
    sys.log(logPrefix + ': loginShow');
    self.emit('loginShow', req, res, ['Invalid Credentials']);
  };
  loginFailure.komainu = true;
  this.on('loginFailure', loginFailure);

  var logout = function(req, res, fin, username) {

    delete req.session.komainu;

    sys.log(logPrefix + ': sessionEnded');
    self.emit('sessionEnded', req, res, fin);

    sys.log(logPrefix + ': logoutSuccess');
    self.emit('logoutSuccess', req, res, fin);
  };
  logout.komainu = true;
  this.on('logout', logout);

  var initSession = function(req, res, fin, username, keys) {
    req.session.komainu = {
      keys: keys
    }
    sys.log(logPrefix + ': sessionStarted (' + username + ' ' + keys + ')');
    self.emit('sessionStarted', req, res, fin, username, keys);
  };
  initSession.komainu = true;
  this.on('initSession', initSession);

  var logoutSuccess = function(req, res, fin) {
    res.writeHead(302, {'Location':self.loginUrl});
    res.end();
  };
  logoutSuccess.komainu = true;
  this.on('logoutSuccess', logoutSuccess);

  var authenticate = function(req, res, fin) {
    if (!req.session || !req.session.komainu || !req.session.komainu.keys ||
        !req.session.komainu.keys[0] === 'LOGGED_IN_USER') {

      sys.log(logPrefix + ': accessDenied');
      self.emit('accessDenied', req, res, fin);
    } else {
      sys.log(logPrefix + ': accessGranted');
      self.emit('accessGranted', req, res, fin);
    }
  };
  authenticate.komainu = true;
  this.on('authenticate', authenticate);

  var accessDenied = function(req, res, fin) {
    sys.log(logPrefix + ': loginShow');
    self.emit('loginShow', req, res, ['Access Denied']);
  };
  accessDenied.komainu = true;
  this.on('accessDenied', accessDenied);

  var accessGranted = function(req, res, fin) {
    fin();
  };
  accessGranted.komainu = true;
  this.on('accessGranted', accessGranted);

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

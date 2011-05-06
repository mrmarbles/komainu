exports.version = '0.0.1';

var sys = require('sys'),
  events = require('events'),
  fs = require('fs'),
  querystring = require('querystring');

var staticLogin = fs.readFileSync(__dirname + '/../static/login.html');

var SecurityProvider = function() {

  events.EventEmitter.call(this);

  var self = this;
  var defaultEvents = ['show-login','login','login-success','login-failure',
    'authenticate','access-denied','access-granted'];
  var matchers = {};

  this.define = function(eventName, matchFunction) {
    matchers[eventName] = matchFunction;
  }

  this.match = function(req, res) {

    for (var key in matchers) {
      var fn = matchers[key];
      if (fn(req, res))
        self.emit(key, req, res);
    }
    
  }

  this.login = function(req, res, username, password, keys) {
    sys.log("SENTINEL: Logging in " + username + " with keys " + keys);
  };

  this.filter = function(req, res, next) {
    self.match(req, res);
  }

  // define default events
  this.define('show-login', function(req, res) {
    if (req.method == 'GET' && req.url == '/login')
      return true;
    return false;
  });

  this.define('login', function(req, res) {
    if (req.method == 'POST' && req.url == '/login')
      return true;
    return false;
  });

  this.define('authenticate', function(req, res) {
    return !/^\/login$|^\/logout$/.test(req.url);
  });

  // define default listeners
  this.on('show-login', function(req, res, err) {
    res.writeHead(200, {'Content-Type':'text/html'});
    res.end(staticLogin);
  });

  this.on('login', function(req, res) {
    req.on('data', function(data) {
      var credentials = querystring.parse(data.toString());
      sys.log("SENTINEL: Login attempt detected.");
      // TODO: replace with auth mechanism for dummy users
      if (credentials.username == 'bcarr' && credentials.password == 'bcarr') {
        sys.log("SENTINEL: Login successful, emitting 'login-success'");
        self.emit('login-success', req, res, credentials.username, credentials.password);
      } else {
        sys.log("SENTINEL: Login unsuccessful, emitting 'login-failure'");
        self.emit('login-failure', req, res);
      }
    });
  });

  this.on('login-success', function(req, res, username, password) {
    self.login(req, res, username, password, ['default']);
  });

  this.on('login-failure', function(req, res) {
    self.emit('show-login', req, res, ['Invalid credentials']);
  });

  this.on('authenticate', function(req, res) {
    sys.log('SENTINEL: Authenticating ' + req.url);

    // check for the existence of at least one key
    if (!req.session || !req.session.sentinel || !req.session.sentinel.keys)
      return self.emit('access-denied', req, res);

    self.emit('access-granted', req, res);
   });

  this.on('access-denied', function(req, res) {
    sys.log("SENTINEL: ACCESS DENIED " + req.url);
  });

  /** 
   * This method ensures that if any default
   * event listeners are effectively 'overridden'
   * by a consumer that the associated behavior
   * is removed, giving the user-defined one precedence.
   */
  this.on('newListener', function(event, listener) {

    // make sure we properly override the default behaviors
    for (var i = 0; i < defaultEvents.length; i++) {
      if (event == defaultEvents[i]) {
        delete matchers[event];
        return;
      }
    }
     
  });

}

sys.inherits(SecurityProvider, events.EventEmitter);

exports.SecurityProvider = SecurityProvider;

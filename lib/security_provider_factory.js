var lib = require('./security_provider'),
  sys = require('sys'),
  fs = require('fs'),
  querystring = require('querystring');

// read in the default login template
var staticLogin = fs.readFileSync(__dirname + '/../static/login.html');

/**
 * This is a factory method responsible for
 * instantiating and initializing an instance
 * of SecurityProvider according to an optional
 * configuration object.
 */
var createSecurityProvider = function(config) {

  var provider = new lib.SecurityProvider();

  provider.setLoginURL('/login');
  provider.setLogoutURL('/logout');

  // declare the default authenticator that will be used by secure()
  provider.setDefaultAuthenticator(function(req, res) {

    if (!req.session || !req.session.security || !req.session.security.keys)
      return false;

    sys.log('Komainu: Keys found: ' + req.session.security.keys);

    // by default, we're simply going to look for a single default key
    return (req.session.security.keys == 'LOGGED_IN_USER');
  });

  // now initialize the empty SecurityProvider providing default behaviors

  /**
   * The following ignore rule will omit any GET requests to /favicon.ico,
   * stylesheets located anywhere *.css and any file located in 
   * the root /public/ directory.
   */
  provider.addIgnore(function(req, res) {
    return (req.method == 'GET' && /^\/favicon.ico|\/public\/|.css/.test(req.url));
  });

  provider.define('loginShow', function(req, res) {
    return (req.method == 'GET' && req.url == provider.getLoginURL());
  });

  provider.define('loginRequest', function(req, res) {
    return (req.method == 'POST' && provider.getLoginURL());
  });

  provider.define('authenticate', function(req, res) {
    return (req.url != provider.getLoginURL() && req.url != provider.getLogoutURL());
  });

  provider.define('logout', function(req, res) {
    return (req.method == 'GET' && req.url == provider.getLogoutURL());
  });

  var match = function(req, res) {
    var defs = provider.getDefinitions();
    for (var key in defs) {
      var fn = defs[key];
      if (fn(req, res)) {
        sys.log('Komainu: matched ' + key);
        provider.emit(key, req, res, provider.getDefaultAuthenticator());
      }
    }
  };
  match.komainu = true;
  provider.on('match', match);

  var loginShow = function(req, res, err) {

    var err = (err) ? err : '';
    var loginErrorsTpl = '<ul class="errors"><li>{error}</li></ul>';
    var errTpl = loginErrorsTpl.replace('{error}', err);
    var loginPage = staticLogin.toString().replace('{loginUrl}', provider.getLoginURL());
    var loginPage = loginPage.replace('{errors}', errTpl);

    res.writeHead(200, {'Content-Type':'text/html'});
    res.end(loginPage);
  };
  loginShow.komainu = true;
  provider.on('loginShow', loginShow);

  var loginRequest = function(req, res) {
    req.on('data', function(data) {
      var credentials = querystring.parse(data.toString());
      sys.log('Komainu: login');
      provider.emit('login', req, res, credentials.username, credentials.password);
    });
  };
  loginRequest.komainu = true;
  provider.on('loginRequest', loginRequest);

  var login = function(req, res, username, password) {
    if (provider.hasCredentials(username, password)) {
      sys.log('Komainu: initSession');
      provider.emit('initSession', req, res, username, password, 'LOGGED_IN_USER');
      sys.log('Komainu: loginSuccess');
      provider.emit('loginSuccess', req, res, username);
    } else {
      sys.log('Komainu: loginFailure');
      provider.emit('loginFailure', req, res, username);
    }
  };
  login.komainu = true;
  provider.on('login', login);

  var initSession = function(req, res, username, password, keys) {
    req.session.security = {
      keys: keys
    }
    sys.log('Komainu: sessionStarted');
    provider.emit('sessionStarted', req, res, username, keys);
  };
  initSession.komainu = true;
  provider.on('initSession', initSession);

  var loginSuccess = function(req, res, username) {
    res.writeHead(302, {'Location':'/'});
    res.end();
  };
  loginSuccess.komainu = true;
  provider.on('loginSuccess', loginSuccess);

  var loginFailure = function(req, res, username) {
    sys.log('Komainu: loginShow');
    provider.emit('loginShow', req, res, ['Invalid Credentials']);
  };
  loginFailure.komainu = true;
  provider.on('loginFailure', loginFailure);

  var logout = function(req, res, username) {

    delete req.session.security.keys;

    sys.log('Komainu: sessionEnded');
    provider.emit('sessionEnded', req, res, username);

    sys.log('Komainu: logoutSuccess');
    provider.emit('logoutSuccess', req, res, username);

  };
  logout.komainu = true;
  provider.on('logout', logout);

  var logoutSuccess = function(req, res) {
    sys.log('Komainu: loginShow');
    provider.emit('loginShow', req, res, ['Logged out successfully']);
  };
  logoutSuccess.komainu = true;
  provider.on('logoutSuccess', logoutSuccess);

  var authenticate = function(req, res, authenticator) {
    if (!authenticator(req, res)) {
      sys.log('Komainu: accessDenied');
      provider.emit('accessDenied', req, res);
    } else {
      sys.log('Komainu: accessGranted');
      provider.emit('accessGranted', req, res);
    }
  };
  authenticate.komainu = true;
  provider.on('authenticate', authenticate);

  var accessDenied = function(req, res) {
    sys.log('Komainu: loginShow');
    provider.emit('loginShow', req, res, ['Access Denied']);
  };
  accessDenied.komainu = true;
  provider.on('accessDenied', accessDenied);

  var accessGranted = function(req, res) {
    provider.finalize();
  };
  accessGranted.komainu = true;
  provider.on('accessGranted', accessGranted);

  provider.on('newListener', function(event, listener) {
    var listeners = provider.listeners(event);
    for (var i = 0; i < listeners.length; i++) {
      if (listeners[i].komainu) {
        sys.log('Komainu: overriding ' + event);
        provider.removeListener(event, listeners[i]);
      }
    }
  });

  return provider;
};

module.exports.createSecurityProvider = createSecurityProvider;

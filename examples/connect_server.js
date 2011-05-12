var connect = require('connect'),
  komainu = require('komainu');

var sp = komainu.createSecurityProvider();
sp.addCredentials('test', 'test', 'LOGGED_IN_USER') // test purposes only

connect.createServer(
  connect.cookieParser(),
  connect.session({secret:'mySecretKey'}),
  sp.secure()
).listen(3000);

console.log('Secure connect server listening on port 3000');

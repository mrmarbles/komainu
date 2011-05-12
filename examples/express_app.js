var express = require('express'),
  komainu = require('komainu');
   
var app = module.exports = express.createServer();
var sp = komainu.createSecurityProvider();
sp.addCredentials('test', 'test', 'LOGGED_IN_USER'); // test purposes only
   
app.configure(function() {
  app.use(express.cookieParser());
  app.use(express.session({secret:'mySecretKey'}));
  app.use(sp.secure());
});
         
app.listen(3000);

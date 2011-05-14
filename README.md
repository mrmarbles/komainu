Komainu
=======
Komainu is a lightweight, evented security middleware designed for use with [Connect](https://github.com/senchalabs/connect) based web applications.  Integrates seamlessly with [ExpressJS](http://expressjs.com/).

Installation
---------------
     npm install komainu

Security in 30 Seconds
---------------------
[Connect](https://github.com/senchalabs/connect)

     var connect = require('connect'),
          komainu = require('komainu');

     var sp = komainu.createSecurityProvider();
     sp.addCredentials('test', 'test', 'LOGGED_IN_USER') // test purposes only

     connect.createServer(
          connect.cookieParser(),
          connect.session({secret:'mySecretKey'}),
          sp.secure()
     ).listen(3000);

[ExpressJS](http://expressjs.com)

     var express = require('express'),
          komainu = require('komainu');

     var app = module.exports = express.createServer();
     var sp = komainu.createSecurityProvider();
     sp.addCredentials('test', 'test', 'LOGGED_IN_USER'); // test purposes only

     app.configure(function() {
          app.use(express.cookieParser());
          app.use(express.session({secret:'mySecretKey'});
          app.use(sp.secure());
     });

     app.listen(3000);

Documentation
-------------
* [Source](https://github.com/mrmarbles/komainu)
* [API Docs and Tutorials](https://github.com/mrmarbles/komainu/wiki)
* [Change Log](https://github.com/mrmarbles/komainu/wiki/Change-Log)

License
-------
The MIT License

Copyright (c) 2011 Brian Carr

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

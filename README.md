Komainu
=======
Komainu is a lightweight, evented security middleware designed for use with [Connect](https://github.com/senchalabs/connect) based web applications.  Integrates seamlessly with [ExpressJS](http://expressjs.com/).

Installation
---------------
     npm install komainu

Intro
------
Komainu's core API is exposed via a single class called `SecurityProvider`.  This class extends the NodeJS core `events.EventEmitter` class.  The primary responsibility of the `SecurityProvider` is to understand when to implicitly emit certain events using a `request` and `response` object as context.  Instances of this class are preconfigured with event listeners specific to web application security.  Any and All of these predefined event listeners can be easily replaced by your own custom implementations.

Security in 30 Seconds
----------------------
[Connect](https://github.com/senchalabs/connect)

     var connect = require('connect'),
          komainu = require('komainu');

     var sp = new komainu.SecurityProvider();
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
     var sp = new komainu.SecurityProvider();
     sp.addCredentials('test', 'test', 'LOGGED_IN_USER'); // test purposes only

     app.configure(function() {
          app.use(express.cookieParser());
          app.use(express.session({secret:'mySecretKey'});
          app.use(sp.secure());
     });

     app.listen(3000);



SecurityProvider API Summary
-----------

###Public Methods
* `define(eventName, matchFunction) : boolean`
Calls to this method must accept a unique event name as well as a function whose implementation will tell the `SecurityProvider` whether or not to emit an event of the same name.  The signature of the method must be `matchFunction(req, res)` and it must return a boolean value dictating whether or not the event should be emitted.  Calls to this method will emit the `implicitEventDefined` broadcasting the `eventName` and `matchFunction` arguments.    
* `secure(authenticator) : fn`
Establishes the security algorithm to be implemented when the `authenticate` event is emitted.  The `authenticator` argument is optional.  If it is provided it's method signature must account for the request and response in that order `authenticate(req, res)` and must return a boolean value.
* `ignore(req, res) : boolean`
Given the provided `request` and `response` objects, will return a boolean value indicating whether or not security events will be emitted.
* `addIgnore(fn) : void`
Accepts a function whose signature must consider a `request` and `response` object in that order and must return a boolean value indicating whether or not security events should be emitted within the context of that information.  Should be used to tell Komainu to pause event emission for specific resources (e.g., JavaScript files, images, etc.)
* `addCredentials(username, password, keys) : void`
Registers test credentials with the `SecurityProvder` to be used when testing security.  This method SHOULD NOT be used to store production authentication credentials.
* `hasCredentials(username, password) : boolean`
Provided a username and password combination, will return a boolean value indicating whether or not a similar user has been previously registered via the `addCredentials` method.

###Predefined Events
* `match(req, res, authenticator)`
Emits any matched event defined via the `define()` method
* `loginShow(req, res, err)`
Responsible for rendering a login screen. Emits no events.  Accepts an option `err` argument which should contain an array of strings representing login errors.
* `loginRequest(req, res)`
Will parse username and password elements from a request when request data is available (`req.on('data')`) and will then emit `login`.
* `login(req, res, username, password, keys)`
Checks to see if the provided username/password have been previously registered as test credentials, if so then `initSession` will be emitted passing in the `defaultKey` and then `loginSuccess`.  If no test credentials match the provided username/password then `loginFailure` will be emitted.
* `loginSuccess(req, res, username)`
Redirects to application root "/" with a 302 status code.  Emits no events.
* `loginFailure(req, res, username)`
Emits 'loginShow'.
* `logout(req, res, username)`
Removes username and key information from the session.  Emits `sessionEnded` and `logoutSuccess`.
* `initSession(req, res, username, keys)`
Establishes username and keys values within the session.  Emits `sessionStarted`.
* `logoutSuccess(req, res)`
Redirects to the preconfigured login URL with a 302 response.
* `authenticate(req, res, authenticator)`
Implements the supplied authenticator if one is provided, or one that was supplied with the secure() method.  If the authenticator returns true then 'accessGranted' will be emitted, otherwise `accessDenied` will be emitted.
* `accessDenied(req, res)`
Emits 'loginShow' with an err array indicating access denied.
* `accessGranted(req, res)`
Invokes connects next() method ensuring control is handed to the next handler in the middleware stack.

Basic Usage
-----------
You'll first need to create an instance of a `SecurityProvider`.  Once your instance has been created you can perform basic configuration operations (explained later) but most importantly you'll need to use the `secure()` method to return a propery initialized middleware handler.  Komain utilizes Connects `session` middleware (which in turn requires the `cookieParser` middleware) so to implement default security within your connect app you'll need declare them in the correct order;

     var connect = require('connect');
     var komainu = require('komainu');

     var app = connect.createServer();
     var sp = new komainu.SecurityProvider();

     app.configure(function() {
          app.use(connect.cookieParser());
          app.use(connect.session({secret:'secretkey'}));
          app.use(sp.secure());
     });

By default, Komainu will prevent unauthorized access to any resources with the exception of the following;

* Login and Logout URL's (default /login and /logout)
* /favicon.ico
* Any resource containing a .css extension.

`secure()`
----------
The `secure` method of the `SecurityProvider` returns a connect middleware-compliant closure that will eventually delegate an authentication algorithm to the `authenticate` event listener.  The resulting function will return a boolean value dictating whether or not access should be allowed or denied to the requested resource.  The default implementation of the authentication function simply determines whether or not a request represents a propery logged in user with a single `defaultKey`.  The session is properly established as a part of the default event chain.  You can easily provide your own authentication algorithm by passing in a function to the `secure()` method whose signature will is `function(req, res, next);`  Your implementation must return a boolean value, true to allow access and false to deny it.

Implicit Events
---------------
There are four events that Komainu is capable of firing without explicitly invoking its `emit()` method, they are;

* `loginShow`
* `loginRequest`
* `authenticate`
* `logout`

Access Keys
-----------
Komainu's authentication mechanism is centered around the abstract concept of access keys.  Generally speaking, these access keys must be assigned to a user session on login, evaluated within the `authenticate` listener and subsequently removed on logout.  Komainu makes no assumptions as to the structure or format of the keys you require to propery represent the security domain of your application.  They can be simple strings or complex objects.  Komainu utilizes a single default key named 'LOGGED_IN_USER (type String of course) to assign to a session upon successful login (within the `initSession` event listener).  This single key is evaluated in the default authentication algorithm and is removed on logout.  To replace the default implementation with your own you simply need to declare an 'initSession' event listener on a corresponding `SecurityProvider` instance as well as provide a corresponding authentication function when `secure();` is invoked;

     var sp = new komainu.SecurityProvider();

     sp.on('initSession', function(req, res) {
          // evaluate your custom keys
          if (all_is_good)
               return true;
          else
               return false;
    });

Dummy Users / Access Credentials
--------------------------------

Ignoring Specific Resources
---------------------------

Default Event Chain
-------------------

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

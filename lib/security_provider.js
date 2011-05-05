exports.version = '0.0.1';

var sys = require('sys'),
  events = require('events');

var SecurityProvider = function() {

  events.EventEmitter.call(this);

  var self = this;
  var implicitMatchers = [];

  this.define = function(eventName, matchFunction) {
    matchFunction.eventName = eventName;
    implicitMatchers.push(matchFunction);
  }

  this.match = function(req, res) {

    for (var i = 0; i < implicitMatchers.length; i++) {
      var fn = implicitMatchers[i];
      if (fn(req, res))
        self.emit(fn.eventName, req, res);
    }

  }

  this.interceptor = function(req, res, next) {
    console.log('Security intercepting...');
    self.match(req, res);
    next();
  }

}

sys.inherits(SecurityProvider, events.EventEmitter);

exports.SecurityProvider = SecurityProvider;

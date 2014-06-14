/*globals Proxy*/
'use strict'

module.exports = function blackhole(obj, history) {
  history = history || {}
  function handlerMaker(obj) {
    return {
     getOwnPropertyDescriptor: function(name) {
       var desc = Object.getOwnPropertyDescriptor(obj, name)
       // a trapping proxy's properties must always be configurable
       if (desc !== undefined) { desc.configurable = true }
       return desc
     },
     getPropertyDescriptor:  function(name) {
       var desc = Object.getPropertyDescriptor(obj, name) // not in ES5
       // a trapping proxy's properties must always be configurable
       if (desc !== undefined) { desc.configurable = true }
       return desc
     },
     getOwnPropertyNames: function() {
       return Object.getOwnPropertyNames(obj)
     },
     getPropertyNames: function() {
       return Object.getPropertyNames(obj)                // not in ES5
     },
     defineProperty: function(name, desc) {
       Object.defineProperty(obj, name, desc)
     },
     delete: function(name) {
       return delete obj[name]
     },
     fix: function() {
       if (Object.isFrozen(obj)) {
         var result = {}
         Object.getOwnPropertyNames(obj).forEach(function(name) {
           result[name] = Object.getOwnPropertyDescriptor(obj, name)
         })
         return result
       }
       // As long as obj is not frozen, the proxy won't allow itself to be fixed
       return undefined // will cause a TypeError to be thrown
     },

     has: function(name) {
       return name in obj
     },
     hasOwn: function(name) {
       return ({}).hasOwnProperty.call(obj, name)
     },
     get: function(receiver, name) {
       if (name === '_blackHole') {
         return history
       }

       var start = Date.now()
       var log = history[name] || {
         average: 0,
         calls: 0
       }

       function nextAvg(numCalls, average, val) {
         return (numCalls * average + val) / (numCalls + 1)
       }

       history[name] = log

       if (typeof obj[name] === 'function') {
         return function () {

          var args = Array.prototype.slice.call(arguments)
          var lastArg = args[args.length - 1]

          // function is node style w/callback
          if (typeof lastArg === 'function' && lastArg.length === 2) {
            args[args.length - 1] = function () {
              log.average = nextAvg(log.calls, log.average, Date.now() - start)
              log.calls++
              return lastArg.apply(this, arguments)
            }
            return obj[name].apply(this, args)
          }

          // regular function call
          var result = obj[name].apply(this, args)

          // result is a promise
          if (typeof result === 'object' && typeof result.then === 'function') {
           result.then(function (res) {
             log.average = nextAvg(log.calls, log.average, Date.now() - start)
            log.calls++
             return res
           })
           return result
          }

          log.average = nextAvg(log.calls, log.average, Date.now() - start)
          log.calls++
          return result
         }
       }

       if (typeof obj[name] === 'object') {
         log.next = {}
         return blackhole(obj[name], log.next)
       }

       return obj[name]
     },
     set: function(receiver, name, val) {
       obj[name] = val
       return true
     }, // bad behavior when set fails in non-strict mode
     enumerate: function() {
       var result = []
       for (var name in obj) {
         result.push(name)
       }
       return result
     },
     keys: function() {
       return Object.keys(obj)
     }
    }
  }

  return Proxy.create(handlerMaker(obj))
}

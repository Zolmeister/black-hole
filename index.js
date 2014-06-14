/*globals Proxy*/
'use strict'

module.exports = blackhole
function blackhole(obj, history) {
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

       return wrap(obj[name], name, history)
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

// wrap objects
function wrap(obj, name, history) {

  // timers
  var start = Date.now()
  var log = history[name] = history[name] || {
   average: 0,
   calls: 0
  }

  if (typeof obj === 'object') {
   log.next = {}
   return blackhole(obj, log.next)

  // only handle functions after this
  } else if (typeof obj !== 'function') {
   return obj
  }

  // rename for clarity
  var fn = obj

  return function () {
    var args = Array.prototype.slice.call(arguments)
    var lastArg = args[args.length - 1]

    // function is node style w/callback, override callback fn
    if (typeof lastArg === 'function' && lastArg.length === 2) {
      args[args.length - 1] = function () {
        updateLog(log, start)

        return wrapResult(lastArg.apply(this, arguments), log)
      }
      return fn.apply(this, args)
    }

    // regular function call
    var result = fn.apply(this, args)

    // result is a promise
    if (typeof result === 'object' && typeof result.then === 'function') {
     result.then(function (res) {
       updateLog(log, start)

       return wrapResult(res, log)
     })
     return result
    }

    updateLog(log, start)

    return wrapResult(result, log)
  }
}

function wrapResult(result, log) {
  if (typeof result === 'object') {
    log.next = log.next || {}
    return blackhole(result, log.next)
  }

  return result
}

function updateLog(log, start) {
  log.average = nextAvg(log.calls, log.average, Date.now() - start)
  log.calls++
}

// continuous average
function nextAvg(numCalls, average, val) {
  return (numCalls * average + val) / (numCalls + 1)
}

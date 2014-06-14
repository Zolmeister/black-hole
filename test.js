/*globals describe, it*/
'use strict'
var chai = require('chai')
var expect = chai.expect
var blackhole = require('./')
var Promise = require('bluebird')

describe('blackhole', function () {
  it('wraps deep objects, with an instance at each endpoint', function () {
    var obj = {
      a: 'aa',
      b: {
        c: 'cc',
        d: {
          e: 'ee',
          f: function () {
            return 'ff'
          }
        }
      }
    }

    var hole = blackhole(obj)
    expect(hole.a).to.equal('aa')
    expect(hole.b.c).to.equal('cc')
    expect(hole.b.d.e).to.equal('ee')
    expect(hole.b.d.f()).to.equal('ff')
  })

  it('logs function call times', function () {
    var obj = {
      long: function () {

        // ~100ms
        var i = 190000
        var cnt = ''
        while(i--) {
          cnt += Math.random()
        }

        return cnt
      }
    }

    var hole = blackhole(obj)
    hole.long()
    var hist = hole._blackHole
    expect(hist.long.average).to.be.above(40)
    expect(hist.long.average).to.be.below(200)
  })

  it('logs promise-style function call times', function () {
    var obj = {
      promised: function () {
        return Promise.resolve(10).delay(100)
      }
    }

    var hole = blackhole(obj)
    var hist = hole._blackHole

    return hole.promised().then(function (ten) {
      expect(ten).to.equal(10)
      expect(hist.promised.average).to.be.above(40)
      expect(hist.promised.average).to.be.below(200)
    })
  })

  it('logs callback-style function call times', function (done) {
    var obj = {
      nodefn: function (a, b, c, cb) {
        setTimeout(function () {
          cb(null, {
            a: a,
            b: b,
            c: c
          })
        }, 100)
      }
    }

    var hole = blackhole(obj)
    var hist = hole._blackHole

    hole.nodefn('a', 'b', 'c', function (err, res) {
      expect(res.a).to.equal('a')
      expect(res.b).to.equal('b')
      expect(res.c).to.equal('c')
      expect(hist.nodefn.average).to.be.above(40)
      expect(hist.nodefn.average).to.be.below(200)
      done(err)
    })
  })

  it('supports nested objects', function () {
    var obj = {
      a: {
        b: {
          promised: function () {
            return Promise.resolve(10).delay(100)
          }
        }
      }
    }

    var hole = blackhole(obj)
    var hist = hole._blackHole

    return hole.a.b.promised().then(function () {
      var promised = hist.a.next.b.next.promised
      expect(promised.average).to.be.above(40)
      expect(promised.average).to.be.below(200)
    })
  })

  it('properly averages over multiple calls', function () {
    var on = true
    var obj = {
      promised: function () {
        if (on) {
          on = !on
          return Promise.resolve(10).delay(200)
        } else {
          on = !on
          return Promise.resolve(10).delay(0)
        }
      }
    }

    var hole = blackhole(obj)
    var hist = hole._blackHole

    return hole.promised().then(function () {
      return hole.promised()
    }).then(function () {
      expect(hist.promised.average).to.be.above(40)
      expect(hist.promised.average).to.be.below(200)
    })
  })
})

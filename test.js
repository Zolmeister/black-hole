'use strict'
var chai = require('chai')
var expect = chai.expect
var blackhole = require('./')

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

  it('logs access history recursively', function () {
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

    var get
    var hole = blackhole(obj)
    get = hole.a
    get = hole.b.c
    get = hole.b.d.e
    get = hole.b.d.f()
    expect(get).to.equal('ff')

    var hist = hole._blackHoleHistory
    expect(hist[0].timestamp).to.not.equal(undefined)
    expect(hist[0].name).to.equal('a')
    expect(hist[1].name).to.equal('b')
    expect(hist[1].next[0].timestamp).to.not.equal(undefined)
    expect(hist[1].next[0].name).to.equal('c')
    expect(hist[2].next[0].next[0].name).to.equal('e')
    expect(hist[3].next[0].next[0].name).to.equal('f')
  })
})

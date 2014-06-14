# Black-Hole.js
#### Node.js function performance monitoring

#### Install
`npm install black-hole`

##### Note: requires the `--harmony` flag
`node --harmony app.js`

#### Example
```js
var BlackHole = require('black-hole')

var obj = {
  fn1: function (cb) {
    setTimeout(function () {
      cb(null, 'result')
    }, 100)
  },
  abc: {
    fn2: function () {
      return Promise.resolve(10).delay(100)
    }
  }
}

var quasar = BlackHole(obj)

/*
 * fn1 0.5ms
 * abc.fn2 101.5ms
 */
quasar.fn1(function () {
  quasar.fn2().then(function () {
    console.log(printBlackHole(quasar))
  })
})

function printBlackHole(quasar) {
  return BlackHole.pretty(quasar).map(function (result) {
    return result.name + ' ' + result.ms + 'ms'
  }).join('\n')
}

```

#### Docs
##### BlackHole(Object) -> Watched object
##### BlackHole.pretty(Watched) -> [ {name: 'fn', ms: 10.5 } ]

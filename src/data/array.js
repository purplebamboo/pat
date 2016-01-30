
var _ = require('../util/index.js')
var Data = require('./index.js')

var arrayMethods = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]


var arrayPrototype = Array.prototype

_.each(arrayMethods,function(key) {

  var originMethod = arrayPrototype[key]

  arrayPrototype[key] = function(){
    var i = arguments.length
    var args = new Array(i)
    while (i--) {
      args[i] = arguments[i]
    }

    var result

    //对于有观察的数组，需要特殊处理
    if (this.__ob__) {

      if (key == 'push' || key == 'unshift') {
        args = Data.inject(args)
      }

      if (key == 'splice') {
        args = args.slice(0,2).concat(Data.inject(args.slice(2)))
      }

      result = originMethod.apply(this, args)

      this.__ob__.notify()

    }else{

      result = originMethod.apply(this, args)

    }

    return result
  }

})


//增加两个方法
arrayPrototype.$set = function(index, val) {
  if (index >= this.length) {
    this.length = index + 1
  }
  return this.splice(index, 1, val)[0]
}

arrayPrototype.$remove = function(item) {
  if (!this.length) return
  var index = _.indexOf(this, item)
  if (index > -1) {
    return this.splice(index, 1)
  }
}







var Watcher = require('../watcher/index.js')
var _ = require('../util')


var removeDeleted = function(watchers){

  var newWatchers = []

  _.each(watchers,function(watcher){
    if (!watcher.isDestroyed) {
      newWatchers.push(watcher)
    }
  })

  return newWatchers

}


var defineProperty = function(obj,key){

  var watchers = [] //保存 针对当前这个key依赖的watchers
  var val = obj[key]

  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function() {
      //找到正在交互的watch
      var kkk = key
      var currentTarget = Watcher.currentTarget
      if (currentTarget) {
        watchers.push(currentTarget)
      }
      return val
    },
    set: function(newVal) {
      if (newVal === val) {
        return
      }

      val = newVal
      //有些已经失效的watcher先去掉
      watchers = removeDeleted(watchers)
      _.each(watchers,function(watcher){
        watcher.check()
      })
    }
  })
}

exports.inject = function(data) {

  if (_.isArray(data)) {
    _.each(data,function(value){
      exports.inject(value)
    })
  }

  if (_.isPlainObject(data)) {
    _.each(data,function(value,key){

      defineProperty(data,key)

      exports.inject(value)
    })
  }
}
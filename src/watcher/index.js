var _ = require('../util')
var Queue = require('./queue.js')

var watcherId = 1

function getWatcherId(){
  return watcherId ++
}

//观察者
function Watcher(view, expression, callback) {
  this.__directives = []
  this.__view = view
  this.expression = expression
  this.callbacks = callback ? [callback] : []
  this.scope = view.$data
  this.last = null
  this.current = null
  //是否已经取过第一次值了，意味着不再需要检测针对defineproperty依赖了
  this.hasFirstGetValued = false
  this.id = getWatcherId()
}

Watcher.currentTarget = null

Watcher.prototype.removeDirective = function(dir) {
  var dirs = this.__directives
  var index = _.indexOf(dirs,dir)

  if (index != -1) {
    dirs.splice(index,1)
  }

}


Watcher.prototype.applyFilter = function(value, filterName) {

  if (!filterName) return value

  //从rootview拿filter
  var filter = this.__view.$rootView.__filters[filterName]
  if (filter) {
    return filter.call(this.__view.$rootView, value, this.scope)
  }
  return value
}

Watcher.prototype.getValue = function() {
  if (!this.expression) return ''
    //取值很容易出错，需要给出错误提示
  var value

  try {

    if (!this.hasFirstGetValued) Watcher.currentTarget = this
    value = new Function('_scope', '_that', 'return ' + this.expression)(this.scope, this)
    if (!this.hasFirstGetValued) Watcher.currentTarget = null
  } catch (e) {

    if (!this.hasFirstGetValued) Watcher.currentTarget = null
    if (process.env.NODE_ENV != 'production') _.log('error when watcher get the value,please check your expression: "' + this.expression + '"', e)
  }

  this.hasFirstGetValued = true
  return value
}

//使用队列更新
// Watcher.prototype.batchCheck = function() {
//   //每个rootview有自己的执行队列
//   var batchQueue = this.__view.$rootView.batchQueue
//   if (!batchQueue) batchQueue = this.__view.$rootView.batchQueue = new watchersQueue()

//   batchQueue.push(this)

// }


Watcher.prototype.check = function() {
  var self = this

  if (this.isUserWatcher) {
    this.current = this.getValue()
    if (this.last != this.current) {
      _.each(this.callbacks, function(callback) {
        callback(self.last, self.current)
      })
    }

    this.last = this.current

  }else{

    Queue.update(this)
    //this.batchCheck()
  }

}

//队列会调用这个方法
Watcher.prototype.batchCheck = function() {
  var self = this
  var last = this.last
  var current = this.getValue()

  _.each(this.__directives, function(dir) {
    //directive自己判断要不要更新
    if (dir.shoudUpdate(last, current)) {
      //调用父级view的hook
      //self.__view.$rootView.fire('beforeDirectiveUpdate', dir, last, current)
      dir.update && dir.update(current)
      //使用queue去批量更新
      //watchersQueue.batchUpdate(dir)
      //self.__view.$rootView.fire('afterDirectiveUpdate', dir, last, current)
    }
  })

  this.last = this.current

}

Watcher.prototype.destroy = function() {
  //通知所有的directive销毁
  this.isDestroyed = true
  _.each(this.__directives, function(dir) {
    dir.destroy && dir.destroy()
  })

}



module.exports = Watcher
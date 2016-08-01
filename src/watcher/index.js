var _ = require('../util')
var Queue = require('./queue.js')

var watcherId = 1

function wid(){
  return watcherId ++
}

//观察者
function Watcher(view, expObj, callback) {
  this.__directives = []
  this.__view = view
  this.expObj = expObj
  this.callbacks = callback ? [callback] : []
  this.scope = view.$data
  this.last = null
  this.current = null
  this.__depend = false //是否已经做过属性依赖的检测了
  this.id = wid()
}

//当前正在解析的watcher,全局只有唯一的一个
Watcher.currentTarget = null


Watcher.prototype._applyFilter = function(value, filterName) {

  var filter = this.__view.$rootView.__filters[filterName]
  if (filter) {
    return filter.call(this.__view.$rootView, value, this.scope)
  }
  return value
}

Watcher.prototype.applyFilter = function(value, filterName) {

  if (!filterName) return value

  var filters = filterName.split(',')
  var result = value

  for (var i = 0; i < filters.length; i++) {
    result = this._applyFilter(result,filters[i])
  }

  return result
}

Watcher.prototype.getValue = function() {
  if (!this.expObj) return ''
  var value

  //取值很容易出错，需要给出错误提示
  try {
    if (!this.__depend) Watcher.currentTarget = this
    value = this.expObj.getter(this.scope, this)
    // value = new Function('_scope', '_that', 'return ' + this.expression)(this.scope, this)
    if (!this.__depend) Watcher.currentTarget = null
  } catch (e) {
    if (!this.__depend) Watcher.currentTarget = null
    if (process.env.NODE_ENV != 'production') _.log('error when watcher get the value,please check your expression: "' + this.expObj.exp + '"', e)
  }

  this.__depend = true
  return value
}


Watcher.prototype.check = function() {
  var self = this

  //自定义的watcher直接执行
  if (this.isUserWatcher) {
    this.current = this.getValue()
    if (this.last != this.current) {
      _.each(this.callbacks, function(callback) {
        callback(self.last, self.current)
      })
    }
    this.last = this.current

  }else{

    //对于脏检测就直接调用check
    //对于defineProperties需要放入队列
    if (this.__view.$rootView.__dataCheckType == 'defineProperties') {
      //系统watcher加入异步批量队列
      Queue.update(this)
    }else{
      this.batchCheck()
    }

  }

}

//最终会调用这个方法
Watcher.prototype.batchCheck = function() {
  var self = this
  var last = this.last
  var current = this.current = this.getValue()

  _.each(this.__directives, function(dir) {
    //directive自己判断要不要更新
    if (dir.shoudUpdate(last, current)) {
      //调用父级view的hook
      self.__view.$rootView.fire('beforeDirectiveUpdate', dir, last, current)
      dir.update && dir.update(current)
      self.__view.$rootView.fire('afterDirectiveUpdate', dir, last, current)
    }
  })

  this.last = current

}

Watcher.prototype.destroy = function() {
  //通知所有的directive销毁
  this.isDestroyed = true
  _.each(this.__directives, function(dir) {
    dir.destroy && dir.destroy()
  })

}



module.exports = Watcher


var _ = require('./util')


//观察者
function Watcher (scope,expression,callback) {
  this.last = null
  this.current = null
  this.__directives = []
  this.__view = null
  this.expression = expression
  this.callback = callback
  this.scope = scope
}

Watcher.prototype.applyFilter = function(value,filterName){

  if (!filterName) return value

  //应该从root view拿
  var filter = this.__view.$rootView.__filters[filterName]
  if (filter) {
    return filter.call(this.__view.$rootView,value,this.scope)
  }
  return value
}

Watcher.prototype.getValue = function(){
  //todo 取值很容易出错，需要给出错误提示
  return new Function('_scope','_that', 'return ' + this.expression)(this.scope,this)
}

Watcher.prototype.check = function() {
  this.current = this.getValue()

  if (this._check(this.last,this.current)) {
    this.callback && this.callback()
  }
  this.last = this.current
}


Watcher.prototype._check = function(last,current) {
  var hasUpdated = false //只要有一个更新了，就认为更新了
  _.each(this.__directives,function(dir){
    //使用directive自己的判断要不要更新
    if (dir.shoudUpdate(last,current)) {
      dir.update(current)
      hasUpdated = true
    }
  })

  return hasUpdated
}

Watcher.prototype.destroy = function() {
  //通知所有的directive销毁
  _.each(this.__directives,function(dir){
    dir.destroy()
  })

}


module.exports = Watcher
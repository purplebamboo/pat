
var _ = require('./util')


//观察者
function Watcher (view,expression,callback) {
  this.__directives = []
  this.__view = view
  this.expression = expression
  this.callbacks = callback ? [callback] : []
  this.scope = view.$data
  this.last = null
  this.current = null

}

Watcher.prototype.applyFilter = function(value,filterName){

  if (!filterName) return value

  //从rootview拿filter
  var filter = this.__view.$rootView.__filters[filterName]
  if (filter) {
    return filter.call(this.__view.$rootView,value,this.scope)
  }
  return value
}

Watcher.prototype.getValue = function(){
  if (!this.expression) return ''
  //取值很容易出错，需要给出错误提示
  try{
    return new Function('_scope','_that', 'return ' + this.expression)(this.scope,this)
  }catch(e){
    if (process.env.NODE_ENV != 'production') _.log('error when watcher get the value,please check your expression: "' + this.expression + '"' ,e)
  }

}

Watcher.prototype.check = function() {
  var self = this

  this.current = this.getValue()

  this._check(this.last,this.current)

  if (this.last != this.current) {
    _.each(this.callbacks,function(callback){
      callback(self.last,self.current)
    })
  }

  this.last = this.current
}


Watcher.prototype._check = function(last,current) {
  var self = this

  _.each(this.__directives,function(dir){
    //directive自己判断要不要更新
    if (dir.shoudUpdate(last,current)) {
      //调用父级view的hook
      self.__view.$rootView.fire('beforeDirectiveUpdate',dir,last,current)
      dir.update && dir.update(current)
      self.__view.$rootView.fire('afterDirectiveUpdate',dir,last,current)
    }
  })

}

Watcher.prototype.destroy = function() {
  //通知所有的directive销毁
  _.each(this.__directives,function(dir){
    dir.destroy && dir.destroy()
  })

}




module.exports = Watcher
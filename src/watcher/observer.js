var _ = require('../util/index.js')
var Watcher = require('./index.js')
var Data = require('../data/index.js')
var Class = _.Class



var Observer = Class.extend({
  init:function() {

    this.watchers = []
  },
  addWatcher:function(){
    var currentTarget = Watcher.currentTarget
    var watchers = this.watchers

    if (currentTarget && _.indexOf(watchers,currentTarget) == -1) {
      watchers.unshift(currentTarget)
      //进行属性检查，如果发现会调用不存在的key,就重新改造自己
      //this.checkUnregisterKey(currentTarget)
    }
  },
  // getKeyReg:function(){

  //   if (!this.keyReg){
  //     return new RegExp(this.key + '\\.([\\w]+)')
  //   }
  //   return this.keyReg
  // },
  // checkUnregisterKey:function(watcher){

  //   if (!_.isPlainObject(this.val) || !this.val.__parentVal__) return
  //     //'a.b'.match(/\.([\w]+)/)
  //    // 'a["b"]'.match(/\[("[^"]*"|'[^']*')\]/g)

  //   var expression = watcher.expression
  //   //todo  多个key需要处理
  //   var childKeyMatch = expression.match(this.getKeyReg())
  //   if (!childKeyMatch || !childKeyMatch[1]) return
  //   var childKey = childKeyMatch[1]
  //   var oriValue = this.val.__ori__
  //   var injectOriValue = null
  //   var self = this
  //   //如果不存在这个key,就需要做出特殊的处理
  //   if (_.hasKey(this.val,childKey)) return

  //   oriValue[childKey] = ''

  //   injectOriValue = Data.inject(oriValue)

  //   _.each(self.val.__parentVal__,function(pValue){

  //     if (_.isPlainObject(pValue)) {
  //       pValue[self.key] = injectOriValue
  //     }

  //     if (_.isArray(pValue)) {
  //       _.findAndReplace(pValue,self.val,injectOriValue)
  //     }
  //   })
  //   //this.parentVal[this.key] = oriValue

  // },
  unique:function(){
    var watchers = this.watchers
    var newWatchers = []

    _.each(watchers,function(watcher){
      if (!watcher.isDestroyed) {
        newWatchers.push(watcher)
      }
    })
    this.watchers = newWatchers
  },
  depend:function(){
    var watchers = this.watchers
    _.each(watchers,function(watcher){
      watcher.__depend = false
      watcher.getValue()
    })
  },
  notify:function(){

    _.each(this.watchers,function(watcher){
      watcher.check()
    })

  }

})

module.exports = Observer
var _ = require('../util/index.js')
var Watcher = require('./index.js')

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
    }

  },
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
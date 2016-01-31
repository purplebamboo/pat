//处理批量的问题
//存在一个队列，当第一个变动时，会在0后启动update
//会去重
//可以手动forceUpdate

var _ = require('../util/index.js')

//全局唯一的队列
var queue = []
//正在等待更新的watcher
var waiting = {}

var isWating = false
var isUpdating = false


function flushUpdate(){

  isUpdating = true

  _.each(queue,function(watcher){
    //如果watcher本身已经被销毁了（比如if,for的view destroy），就不需要再check了
    if(!watcher.isDestroyed) watcher.batchCheck()
    waiting[watcher.id] = null
  })

  queue = []
  waiting = {}
  isWating = isUpdating = false

}


exports.update = function(watcher) {
  var id = watcher.id

  if (!waiting[id]) {

    if (isUpdating) {
      watcher.batchCheck()
      return
    }

    queue.push(watcher)
    waiting[id] = queue.length

    if (!isWating) {
      isWating = true
      _.nextTick(flushUpdate)
    }
  }

}










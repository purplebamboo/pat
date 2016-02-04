var _ = require('../util/index.js')

//全局唯一的队列
var queue = []
  //正在等待更新的watcher
var waiting = {}

var isWating = false
var isUpdating = false


function flushUpdate() {

  if (!isWating && !isUpdating) return

  isUpdating = true

  _.each(queue, function(watcher) {
    //如果watcher本身已经被销毁了（比如if,for的view destroy），就不需要再check了
    if (!watcher.isDestroyed) watcher.batchCheck()
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

exports.flushUpdate = flushUpdate
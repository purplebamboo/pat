

var _ = require('../util')
var parser = require('../parser')
var parseExpression = parser.parseExpression

//差异更新的几种类型
var UPDATE_TYPES = {
  MOVE_EXISTING: 1,
  REMOVE_NODE: 2,
  INSERT_MARKUP: 3
}



module.exports = {
  block: true,
  priority: 3000,
  shoudUpdate: function(last, current) {
    //for 任何时候都是需要更新的，哪怕两次的值一样，也是需要更新的，因为你要考虑子view的更新
    return true
  },
  bind: function(options) {
    // support "item in items" syntax
    // for 语句比较特殊，不使用系统生成的expression
    var inMatch = this.describe.value.match(/(.*) in (.*)/)
    if (inMatch) {
      var itMatch = inMatch[1].match(/\((.*),(.*)\)/)
      if (itMatch) {
        this.iterator = itMatch[1].trim()
        this.alias = itMatch[2].trim()
      } else {
        this.alias = inMatch[1].trim()
      }
      //修改观察者对应的expression
      this.__watcher.expression = parseExpression(inMatch[2])
    }

    if (!this.alias) {
      _.error('required a alias in for directive')
    }

    this.start = _.createAnchor('v-for-start')
    this.end = _.createAnchor('v-for-end')
    _.replace(this.el, this.end)
    _.before(this.start, this.end)

    this.oldViewMap = {}

  },
  _generateNewChildren: function(lists) {

    var newViewMap = {}
    var oldViewMap = this.oldViewMap
    var self = this
    var data

    _.each(lists, function(item, index) {

      if (oldViewMap[index] && oldViewMap[index].$data[self.alias] === item) {
        newViewMap[index] = oldViewMap[index]
        //发现可以复用，就直接更新view就行
        //当然要注意重新赋值,因为如果上一级数据变化了，这里才能知道改变
        _.assign(oldViewMap[index].$data,self.view.$data)
        oldViewMap[index].$digest()

      } else {
        //否则需要新建新的view
        data = {}
        data[self.alias] = item
        _.assign(data,self.view.$data)

        if(self.iterator) data[self.iterator] = index

        newViewMap[index] = new self.view.constructor({
          el: _.clone(self.el),
          data: data,
          rootCompile:false,
          rootView:self.view.$rootView
        })
      }

    })

    return newViewMap

  },
  _diff: function() {

    var nextIndex = 0 //代表到达的新的节点的index
    var lastIndex = 0;//代表访问的最后一次的老的集合的位置
    var prevChild, nextChild
    var oldViewMap = this.oldViewMap
    var newViewMap = this.newViewMap

    var diffQueue = this.diffQueue = []

    for (name in newViewMap) {

      if (!newViewMap.hasOwnProperty(name)) {
        continue
      }

      prevChild = oldViewMap && oldViewMap[name];
      nextChild = newViewMap[name];

      //相同的话，说明是使用的同一个view,所以我们需要做移动的操作
      if (prevChild === nextChild) {
        //添加差异对象，类型：MOVE_EXISTING
        prevChild._mountIndex < lastIndex && diffQueue.push({
          name:name,
          type: UPDATE_TYPES.MOVE_EXISTING,
          fromIndex: prevChild._mountIndex,
          toIndex: nextIndex
        })
      } else {//如果不相同，说明是新增加的节点
        //但是如果老的还存在，我们需要把它删除。
        //这种情况好像没有
        if (prevChild) {

          lastIndex = Math.max(prevChild._mountIndex, lastIndex)
          //添加差异对象，类型：REMOVE_NODE
          diffQueue.push({
            name:name,
            type: UPDATE_TYPES.REMOVE_NODE,
            fromIndex: prevChild._mountIndex,
            toIndex: null
          })
          //prevChild.$destroy()
        }

        //新增加的节点，也组装差异对象放到队列里
        //添加差异对象，类型：INSERT_MARKUP
        diffQueue.push({
          name:name,
          type: UPDATE_TYPES.INSERT_MARKUP,
          fromIndex: null,
          toIndex: nextIndex,
          markup: nextChild.$el //新增的节点，多一个此属性，表示新节点的dom内容
        })
      }

      //更新mount的index
      nextChild._mountIndex = nextIndex
      nextIndex++
    }

    //对于老的节点里有，新的节点里没有的那些，也全都删除掉
    for (name in oldViewMap) {
      if (oldViewMap.hasOwnProperty(name) && !(newViewMap && newViewMap.hasOwnProperty(name))) {
        prevChild = oldViewMap && oldViewMap[name]
        //添加差异对象，类型：REMOVE_NODE
        diffQueue.push({
          name:name,
          type: UPDATE_TYPES.REMOVE_NODE,
          fromIndex: prevChild._mountIndex,
          toIndex: null
        })
      }
    }

  },
  _patch:function(){
    var update, updatedIndex, updatedChild
    var initialChildren = {}
    var deleteChildren = []
    var updates = this.diffQueue
    for (var i = 0; i < updates.length; i++) {
      update = updates[i];
      if (update.type === UPDATE_TYPES.MOVE_EXISTING || update.type === UPDATE_TYPES.REMOVE_NODE) {

        updatedChild = this.oldViewMap[update.name]
        initialChildren[update.name] = updatedChild.$el
        //所有需要修改的节点先删除,对于move的，后面再重新插入到正确的位置即可
        deleteChildren.push(updatedChild)
      }
    }
    //删除所有需要先删除的
    _.each(deleteChildren, function(child) {
      child.$destroy(true)
      //_.remove(child.$el)
    })

    //再遍历一次，这次处理新增的节点，还有修改的节点这里也要重新插入
    for (var k = 0; k < updates.length; k++) {
      update = updates[k];
      switch (update.type) {
        case UPDATE_TYPES.INSERT_MARKUP:
          this._insertChildAt(update.markup, update.toIndex);
          break;
        case UPDATE_TYPES.MOVE_EXISTING:
          this._insertChildAt(initialChildren[update.name], update.toIndex);
          break;
        case UPDATE_TYPES.REMOVE_NODE:
          // 什么都不需要做，因为上面已经帮忙删除掉了
          break;
      }
    }

  },
  //用于把一个node插入到指定位置，通过之前的占位节点去找
  _insertChildAt:function(element,toIndex){
    var start = this.start
    var end = this.end

    var index = -1
    var node = start

    while(node && node !== end){

      node = node.nextSibling
      //不是element就跳过
      if (!(_.isElement(node) && node.nodeType==1)) continue

      index ++
      if (toIndex == index) {
        _.after(element,node)
        return
      }

    }

    //证明没找到，不够？那就直接放到最后了
    if (toIndex > index) {
      _.before(element,end)
    }
  },
  update: function(lists) {
    //策略，先删除以前的，再使用最新的，找出最小差异更新
    //参考reactjs的差异算法
    this.newViewMap = this._generateNewChildren(lists)

    this._diff()
    this._patch()

    this.oldViewMap = this.newViewMap

  },
  unbind: function() {
    _.each(this.newViewMap,function(view){
      view.$destroy(true)
    })
    //恢复现场，好像觉得没必要？
    //_.before(this.el,this.end)
    //循环的el会由子view销毁掉
    //_.remove(this.start)
    //_.remove(this.end)
  }
}
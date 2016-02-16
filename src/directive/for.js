var _ = require('../util')
var parser = require('../parser')
var parseExpression = parser.parseExpression
var Data = require('../data/index.js')
var Config = require('../config.js')


//差异更新的几种类型
var UPDATE_TYPES = {
  MOVE_EXISTING: 1,
  REMOVE_NODE: 2,
  INSERT_MARKUP: 3
}

var KEY_ID = 0

module.exports = {
  block: true,
  priority: 3000,
  shoudUpdate: function(last, current) {

    var lazy = this.describe.args[0] == 'lazy' ? true : false
    //如果设置了lazy属性，for指令只有在整个引用变化了才会重新渲染，
    if (lazy){
      return  last !== current
    }
    //否则 任何时候都是需要更新的，哪怕两次的值一样，也是需要更新的，因为你要考虑子view的更新
    return true
  },
  initialize:function(){
    // for 语句比较特殊，不使用系统生成的expression
    var inMatch = this.describe.value.match(/(.*) in (.*)/)
    if (inMatch) {
      var itMatch = inMatch[1].match(/\((.*),(.*)\)/)
      if (itMatch) {
        this.iterator = _.trim(itMatch[1])
        this.alias = _.trim(itMatch[2])
      } else {
        this.iterator = Config.defaultIterator //默认的key
        this.alias = _.trim(inMatch[1])
      }
      //修改观察者对应的expression
      this.__watcher.expression = parseExpression(inMatch[2])
    }

    if (process.env.NODE_ENV != 'production' && !this.alias) {
      _.error('required a alias in for directive')
    }

    this.oldViewMap = {}
    this.oldViewLists = []
    this.__node = this.el.clone()

    this.orikeys = []

    var ori = this.view.$data.__ori__
    //需要把当前的数据复制过来
    for (var oriKey in ori) {
      if (ori.hasOwnProperty(oriKey)) {
        this.orikeys.push(oriKey)
      }
    }

  },
  bind: function(value) {

    var self = this

    this.startNode = this.el
    //第一次直接软删除，作为定位
    this.startNode.remove(true)
    this.isUpdated = false

    this.update(value)

    //父view触发后，通知子view也fire
    if (self.view.__rendered) {
      self._fireChilds()
    }else{
      self.view.on('afterMount',function(){
        self._fireChilds()
      })
    }
  },
  _fireChilds:function(){
    //触发子view的事件
    _.each(this.oldViewLists,function(view){
      view.fire('afterMount')
    })

  },
  _generateKey: function() {
    return 'key' + KEY_ID++
  },
  _generateNewChildren: function(newLists) {

    var newViewMap = this.newViewMap = {}
    var newViewLists = this.newViewLists = []
    var oldViewMap = this.oldViewMap
    var self = this
    var data,newNode,name,ori
    var curKey = '__pat_key__'


    _.each(newLists, function(item, key) {

      name = item[curKey]

      if (name && oldViewMap[name] && oldViewMap[name].$data[self.alias] === item) {
        newViewMap[name] = oldViewMap[name]
        //发现可以复用，就直接更新view就行
        //key需要重新赋值,会自动做出defineproperty的监听改变
        if(self.iterator) oldViewMap[name].$data[self.iterator] = key

      } else {
        //否则需要新建新的view
        data = {}

        _.each(self.orikeys,function(oriKey){
          data[oriKey] = self.view.$data[oriKey]
        })

        if(self.iterator) data[self.iterator] = key

        data[self.alias] = item

        data = Data.define(data)


        newNode = self.__node.clone()
        //对于数组我们需要生成私有标识，方便diff。对象直接用key就可以了
        //有点hacky,但是没办法，为了达到最小的更新，需要注入一个唯一的健值。
        name = self._generateKey()
        item[curKey] = name

        newViewMap[name] = new self.view.constructor({
          el: newNode,
          data: data,
          vid:name,
          rootView:self.view.$rootView
        })
        newViewMap[name].orikeys = self.orikeys
        //增加依赖，这样父级值改变了也会自动改变子view的属性
        self.view.__dependViews.push(newViewMap[name])
      }
      newViewLists.push(newViewMap[name])

    })

  },
  _diff: function() {

    var nextIndex = 0 //代表到达的新的节点的index
    var lastIndex = 0;//代表访问的最后一次的老的集合的位置
    var prevChild, nextChild
    var oldViewMap = this.oldViewMap
    var newViewMap = this.newViewMap
    var newViewLists = this.newViewLists

    var diffQueue = this.diffQueue = []
    var name

    for (var i = 0,l=newViewLists.length;i<l;i++) {

      name = newViewLists[i].__vid

      prevChild = oldViewMap && oldViewMap[name];
      nextChild = newViewLists[i];

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
    var self = this
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
      //删除
      //第一个节点不能硬删除，还要留着定位呢,先软删除
      if (child.$el == self.startNode) {
        child.$el.remove(true)
      }else{
        child.$el.remove()
      }
      _.findAndRemove(self.view.__dependViews,child)
      child.$destroy()
    })

    //保存一个复用的老的view队列
    var oldNodeLists = this._generateOldLists()

    //再遍历一次，这次处理新增的节点，还有修改的节点这里也要重新插入
    for (var k = 0; k < updates.length; k++) {
      update = updates[k];
      switch (update.type) {
        case UPDATE_TYPES.INSERT_MARKUP:
          this.handleInsertMarkup(update,oldNodeLists)
          //insertFn.call(this,update.markup, update.toIndex,oldNodeLists);
          break;
        case UPDATE_TYPES.MOVE_EXISTING:
          this._insertChildAt.call(this,initialChildren[update.name], update.toIndex,oldNodeLists);
          //update.fire('afterMount')
          break;
        case UPDATE_TYPES.REMOVE_NODE:
          // 什么都不需要做，因为上面已经帮忙删除掉了
          break;
      }
    }

  },
  handleInsertMarkup:function(update,oldNodeLists){
    var insertFn = this._insertChildAt
    insertFn.call(this,update.markup, update.toIndex,oldNodeLists)
    //对于更新，需要fire事件
    if (this.isUpdated) {
      this.newViewMap[update.name] && this.newViewMap[update.name].fire('afterMount') //触发事件
    }

  },
  _generateOldLists:function(){


    var oldViewLists = this.oldViewLists
    var lists = []

    if (this.startNode.deleted) {
      lists.push(this.startNode)
    }

    _.each(oldViewLists,function(oldView){
      if (oldView && oldView.isDestroyed !== true) {
        lists.push(oldView.$el)
      }
    })

    return lists

  },
  //用于把一个node插入到指定位置，通过之前的占位节点去找
  _insertChildAt:function(newNode,toIndex,oldNodeLists){
    var self = this

    var start = this.startNode
    var end = oldNodeLists[oldNodeLists.length - 1]
    //如果第一个是删除的节点，证明是定位，需要改变toIndex
    if (start.deleted) {
      toIndex = toIndex + 1
    }

    nextNode = oldNodeLists[toIndex]
    if (nextNode) {
      newNode.before(nextNode)
      oldNodeLists.splice(toIndex,0,newNode)
    }else{
      newNode.after(end)
      oldNodeLists.push(newNode)
    }
  },
  update: function(newLists) {
    //策略，先删除以前的，再使用最新的，找出最小差异更新
    //参考reactjs的差异算法
    this._generateNewChildren(newLists)

    this._diff()
    this._patch()

    this.oldViewMap = this.newViewMap
    this.oldViewLists = this.newViewLists

    //如果后面有数据，那就硬删除掉startNode节点,把最新的第一个元素作为start节点
    if (this.oldViewLists.length > 0 && this.startNode.deleted) {
      this.startNode.remove()
      this.startNode = this.oldViewLists[0].$el
    }

    this.isUpdated = true
  },
  unbind: function() {
    _.each(this.oldViewMap,function(view){
      view.$destroy()
    })
    this.oldViewMap = null
    this.oldViewLists = null
  }
}

var _ = require('../util/index.js')
var Class = _.Class
var config = require('../config.js')

var noop = function(){}

PAT_ID = 1

TAG_ID = config.tagId

function getPatId(){
  return PAT_ID ++
}

var Node = Class.extend({
  init:function(){

  },
  mountView:function(view){
    var html,self

    self = this
    self.view = view
    self.mountId()

    html = self.mountHtml(view)

    // view.$rootView.on('afterMount',function(){
    // })
    self.mounted = true
    return html
  },
  mountHtml:function(){
    return ''
  },
  mountId:function(){
    //if (this.patId) return this.patId
    this.patId = getPatId()
  },
  _findAndSplice:function(dstEl,replace){
    var childNodes = this.childNodes
    if (!childNodes) return
    _.each(childNodes,function(child,index){
      if (child == dstEl) {
        replace ? childNodes.splice(index,1,replace) : childNodes.splice(index,1)
      }
    })
  },
  getElement:function(){
    if (!this.patId || !this.view) return

    if (this.element) return this.element
    //todo 优化查找算法
    //todo 多个节点的处理
    var self = this
    var nodes = self.view.$rootView.$el.getElementsByTagName('*')
    _.each(nodes,function(node){
      if (node.getAttribute && node.getAttribute(TAG_ID) == self.patId) {
        self.element = node
      }
    })
    return this.element
  },
  clone:function(){
    var options = null
    var childNodes

    //克隆初始化属性
    options = _.deepClone(this.options,function(key){
      return key == 'childNodes' ? true : false
    })

    //对于子节点需要特殊处理
    if (this.options.childNodes) {
      childNodes = []
      _.each(this.options.childNodes,function(child) {
        childNodes.push(child.clone())
      })
      options.childNodes = childNodes
    }

    var newNode = new this.constructor(options)
    //parentNode也需要特殊处理
    newNode.parentNode = this.parentNode

    return newNode

  },
  pre:function(skipDeleted){
    var childNodes = this.childNodes
    var preNode,child
    if (!childNodes || childNodes.length == 0) return

    for (var i = 0; i < childNodes.length - 1; i++) {
      child = childNodes[i]
      if (skipDeleted && !child.deleted) {
        preNode = child
      }
      if (!skipDeleted) {
        preNode = child
      }
      if (childNodes[i+1] && childNodes[i+1] == dstEl) break
    }
    return preNode
  },
  next:function(skipDeleted){
    var childNodes = this.childNodes
    var nextNode,child
    if (!childNodes || childNodes.length == 0) return

    for (var i = 0, l = childNodes.length; i > l; i--) {
      child = childNodes[i]
      if (skipDeleted && !child.deleted) {
        nextNode = child
      }
      if (!skipDeleted) {
        nextNode = child
      }
      if (childNodes[i-1] && childNodes[i-1] == dstEl) break
    }
  },
  replace:function(dstEl){
    var mountHtml = dstEl.mountView(this.view)
    var node = _.string2node(mountHtml)
    var preNode = null
    //这里比较特殊，会先改真实dom
    if (this.mounted){
      if (this.element) {
        _.replace(this.element,node)
      }else{//如果页面上已经没有了，那就只能找前面的节点定位
        preNode = this.pre(true)
        //preNode.
        preNode ? _.after(node,preNode.getElement()) : _.prepend(node,this.parentNode.getElement())
      }
    }

    this.parentNode._findAndSplice(this,dstEl)
    //this.destroy()

  },
  remove:function(deletedVirtual){

    if (deletedVirtual && this.parentNode) {
      this.parentNode._findAndSplice(this)
    }else{
      this.deleted = true
    }

    if (!this.mounted || !this.getElement()) return
    this.element.remove()
    this.element = null
    //this.mounted = false
  },
  destroy:function() {

  }
})

//一个集合，主要用于处理包裹的问题，根节点还有 if for的block都是这种节点
//这个节点本身没有什么属性之类的，有的是多个子节点，操作时也是多个子节点
//由virtual dom来解决这个差异问题
var Collection = Node.extend({
  init:function(options){
    this.nodeType = -1
    this.tagName = options.tagName
    this.childNodes = options.childNodes
  },
  hasChildNodes:function(){
    return this.childNodes && this.childNodes.length && this.childNodes.length > 0
  }
})


var Element = Node.extend({
  init:function(options){
    this.options = options
    this.attributes = options.attributes
    this.tagName = options.tagName
    this.childNodes = options.childNodes
    this.nodeType = 1
  },
  hasChildNodes:function(){
    return this.childNodes && this.childNodes.length && this.childNodes.length > 0
  },
  setAttribute:function(key,value){
    var index = _.indexOfKey(this.attributes,'name',key)
    var attr = {
      name:key,
      value:value
    }

    if (index !== -1) {
      this.attributes[index] = attr
    }else{
      this.attributes.push(attr)
    }
    //修改真实dom
    if (!this.mounted || !this.getElement()) return
    var element = this.getElement()

    this.view.$rootView.fire('beforeUpdateAttribute',[element],this)

    //不允许存在破坏节点的特殊字符
    //todo 一些防止xss的处理
    if (_.isString(value)) {
      value = value.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }

    if (_.indexOf(['value','checked','selected'],key) !== -1 && key in element){
      element[key] = key === 'value'
        ? (value || '') // IE9 will set input.value to "null" for null...
        : value
    }else{
      element.setAttribute(key,value)
    }

    this.view.$rootView.fire('afterUpdateAttribute',[element],key,value,this)

  },
  removeAttribute:function(key){
    var index = _.indexOfKey(this.attributes,'name',key)
    if (index !== -1) {
      this.attributes.splice(index,1)
    }
    //修改真实dom
    if (!this.mounted || !this.getElement()) return

    var element = this.getElement()
    this.view.$rootView.fire('beforeRemoveAttribute',[element],key,this)
    node.removeAttribute(key)
    this.view.$rootView.fire('afterRemoveAttribute',[element],key,this)

  },
  mountHtml:function(view){
    //todo 不闭合标签
    var tagName = this.tagName
    var attrsString = ''

    _.each(this.attributes,function(attr){
      //需要判断整数的情况
      attrsString += [' ',attr.name,'="',attr.value,'" '].join('')
    })

    attrsString += ' ' + TAG_ID + '="' + this.patId + '"'

    var childHtml = ''
    _.each(this.childNodes,function(child){
      childHtml += child.mountView(view)
    })

    return '<' + tagName + attrsString + '>' + childHtml + '</' + tagName + '>'
  },
  append:function(){

  },
  preapend:function(){

  }
})

var TextNode = Node.extend({
  init:function(options){
    this.options = options
    this.data = options.data
    this.nodeType = 3
    this.oneTime = false
  },
  html:function(text){
    if (this.oneTime) return

    this.data = text
    //修改真实dom
    if (!this.mounted || !this.getElement()) return
    this.getElement().innerHTML = text
  },
  mountHtml:function(view){
    if (this.oneTime) return this.data

    return '<span '+ TAG_ID +'="' + this.patId + '">' + this.data + '</span>'
  },
  append:function(){
  },
  preapend:function(){

  }
})


module.exports = {
  createCollection:function(childNodes){
    return new Collection(childNodes)
  },
  createElement:function(tag,attrs,childNodes){
    var attributes = []
    _.each(attrs,function(value,key){
      attributes.push({
        name:key,
        value:value
      })
    })

    var element = new Element({
      tagName:tag,
      attributes:attributes,
      childNodes:childNodes
    })

    _.each(childNodes,function(child){
      child.parentNode = element
    })

    return element
  },
  createTextNode:function(data){
    return new TextNode({
      data:data
    })
  }

}
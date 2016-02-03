var _ = require('../util/index.js')
var Class = _.Class
var config = require('../config.js')


var noop = function() {}

PAT_ID = 1

TAG_ID = config.tagId

function getPatId() {
  return PAT_ID++
}

var Node = Class.extend({
  __VD__:true,
  init: function() {

  },
  mountView: function(view) {
    var html, self

    self = this
    self.view = view
    self.mountId()

    html = this.deleted ? self.mountDeleted(view) : self.mountHtml(view)

    // view.$rootView.on('afterMount',function(){
    // })
    self.mounted = true
    return html
  },
  //软删除的节点，会在页面上存在一个注释，方便确认位置
  mountDeleted:function(){
    return '<!--deleted-' + this.patId + '-->'
  },
  mountHtml: function() {
    return ''
  },
  mountId: function() {
    if (!this.patId){
      this.patId = getPatId()
    }
  },
  _findAndSplice: function(dstEl, replace) {
    var childNodes = this.childNodes
    if (!childNodes) return
    _.each(childNodes, function(child, index) {
      if (child == dstEl) {
        dstEl.parentNode = this
        replace ? childNodes.splice(index, 1, replace) : childNodes.splice(index, 1)
      }
    })
  },
  getElement: function() {
    if (!this.patId || !this.view) return

    if (this.element) return this.element
    var self = this

    self.element = _.queryPatId(self.view.$rootView.$el,self.patId)
    return self.element
  },
  clone: function(parentNode) {
    var options = null
    var childNodes

    //克隆初始化属性
    options = _.deepClone(this.options, function(key) {
      return key == 'childNodes' ? true : false
    })

    var newNode = new this.constructor(options)
    //parentNode也需要特殊处理
    newNode.parentNode = parentNode || this.parentNode

    //对于子节点需要特殊处理
    if (this.options.childNodes) {
      childNodes = []
      _.each(this.options.childNodes, function(child) {
        childNodes.push(child.clone(newNode))
      })
      options.childNodes = childNodes
      newNode.childNodes = childNodes
    }

    return newNode

  },
  pre: function(withDeleted) {
    var childNodes = this.parentNode.childNodes
    var preNode, child, index


    if (!childNodes || childNodes.length == 0) return

    index = _.indexOf(childNodes, this)

    if (index == -1) return

    for (var i = index - 1; i > 0; i--) {
      child = childNodes[i]
      if (withDeleted || (!withDeleted && !child.deleted)) {
        preNode = child
        break
      }
    }
    return preNode
  },
  next: function(withDeleted) {
    var childNodes = this.parentNode.childNodes
    var nextNode, child, index
    if (!childNodes || childNodes.length == 0) return

    index = _.indexOf(childNodes, this)
    if (index == -1) return

    for (var i = index + 1; i < childNodes.length; i++) {
      child = childNodes[i]
      if (withDeleted || (!withDeleted && !child.deleted)) {
        nextNode = child
        break
      }
    }
    return nextNode
  },
  replace: function(dstEl) {

    //如果没有删除，那就先软删除自己
    if (!this.deleted) {
      this.remove(true)
    }

    //这里比较特殊，会先改真实dom
    if (this.getElement()) {
      //挨个的拿人家的子节点，替换
      var mountHtml = dstEl.mountView(this.view)
      var nodes = _.string2nodes(mountHtml)
      for (var i = 0,l = nodes.length; i < l; i++) {
        _.before(nodes[0],this.element)
      }
      _.remove(this.element)
    }

    this.parentNode._findAndSplice(this, dstEl)

    return dstEl
  },
  before:function(dstEl){

    var dstChilds = dstEl.parentNode.childNodes
    var index = _.indexOf(dstChilds,dstEl)
    dstEl.parentNode.childNodes.splice(index,0,this)
    this.parentNode = dstEl.parentNode

    //没有在dom上不需要操作
    if (!dstEl.mounted) return

    //如果自己在dom上
    if (this.mounted && this.getElement()){
      _.before(this.element,dstEl.getElement())
    }else{
      var mountHtml = this.mountView(dstEl.view)
      var nodes = _.string2nodes(mountHtml)
      for (var i = 0,l = nodes.length; i < l; i++) {
        _.before(nodes[0],dstEl.getElement())
      }
    }
  },
  after:function(dstEl){

    var dstChilds = dstEl.parentNode.childNodes
    var index = _.indexOf(dstChilds,dstEl) + 1

    dstEl.parentNode.childNodes.splice(index,0,this)
    this.parentNode = dstEl.parentNode

    //没有在dom上不需要操作
    if (!dstEl.mounted) return

    //如果自己在dom上
    if (this.mounted && this.getElement()){
      _.after(this.element,dstEl.getElement())
    }else{
      var mountHtml = this.mountView(dstEl.view)
      var nodes = _.string2nodes(mountHtml)
      for (var i = 0,l = nodes.length; i < l; i++) {
        _.after(nodes[0],dstEl.getElement())
      }
    }

  },
  remove: function(softDeleted) {

    if (softDeleted) {
      this.deleted = true
    } else {
      this.parentNode._findAndSplice(this)
    }

    if (!this.mounted || !this.getElement()) return
    //软删除的话不是真的删除，而是加一个占位符
    if (softDeleted) {
      var deletedNode = _.string2node(this.mountDeleted())
      _.replace(this.element,deletedNode)
      this.element = deletedNode
    }else{
      _.remove(this.element)
    }


  },
  destroy: function() {

  }
})




var Element = Node.extend({
  init: function(options) {
    this.options = options
    this.attributes = options.attributes
    this.tagName = options.tagName
    this.childNodes = options.childNodes
    this.nodeType = 1
  },
  hasChildNodes: function() {
    return this.childNodes && this.childNodes.length && this.childNodes.length > 0
  },
  first:function(){
    return this.childNodes[0]
  },
  last:function(){
    return this.childNodes[this.childNodes.length-1]
  },
  setAttribute: function(key, value) {
    var index = _.indexOfKey(this.attributes, 'name', key)
    var attr = {
      name: key,
      value: value
    }

    if (index !== -1) {
      this.attributes[index] = attr
    } else {
      this.attributes.push(attr)
    }
    //修改真实dom
    if (!this.mounted || !this.getElement()) return
    var element = this.getElement()

    this.view.$rootView.fire('beforeUpdateAttribute', [element], this)

    //不允许存在破坏节点的特殊字符
    //todo 一些防止xss的处理
    if (_.isString(value)) {
      value = value.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }

    if (_.indexOf(['value', 'checked', 'selected'], key) !== -1 && key in element) {
      element[key] = key === 'value' ? (value || '') // IE9 will set input.value to "null" for null...
        : value
    } else {
      element.setAttribute(key, value)
    }

    this.view.$rootView.fire('afterUpdateAttribute', [element], key, value, this)

  },
  removeAttribute: function(key) {
    var index = _.indexOfKey(this.attributes, 'name', key)
    if (index !== -1) {
      this.attributes.splice(index, 1)
    }
    //修改真实dom
    if (!this.mounted || !this.getElement()) return

    var element = this.getElement()
    this.view.$rootView.fire('beforeRemoveAttribute', [element], key, this)
    node.removeAttribute(key)
    this.view.$rootView.fire('afterRemoveAttribute', [element], key, this)

  },
  mountHtml: function(view) {
    //todo 不闭合标签
    var tagName = this.tagName
    var attrsString = ''

    _.each(this.attributes, function(attr) {
      //需要判断整数的情况
      attrsString += [' ', attr.name, '="', attr.value, '" '].join('')
    })

    attrsString += ' ' + TAG_ID + '="' + this.patId + '"'

    if (tagName == 'input') {
      return '<' + tagName + attrsString + ' />'
    }

    var childHtml = ''
    _.each(this.childNodes, function(child) {
      childHtml += child.mountView(view)
    })

    return '<' + tagName + attrsString + '>' + childHtml + '</' + tagName + '>'
  },
  append: function() {

  },
  preapend: function() {

  }
})


//一个集合，主要用于处理包裹的问题，根节点还有 if for的block都是这种节点
//这个节点本身没有什么属性之类的，有的是多个子节点，操作时也是多个子节点
//由virtual dom来解决这个差异问题
var Collection = Element.extend({
  init: function(options) {
    this.options = options
    this.nodeType = -1
    this.tagName = options.tagName
    this.attributes = options.attributes
    this.childNodes = options.childNodes
    //this.startNode = this.childNodes[0]
    //this.endNode = this.childNodes[this.childNodes.length-1]
  },
  mountHtml:function(view){
    var childHtml = ''
    _.each(this.childNodes, function(child) {
      childHtml += child.mountView(view)
    })

    return childHtml
  },
  getElement: function() {
    if (!this.patId || !this.view) return

    if (this.element) return this.element

    //删除的情况下直接返回占位的节点
    if (this.deleted) {
      this.element = _.queryPatId(this.view.$rootView.$el,this.patId)
      return this.element
    }

    //否则返回第一个子节点
    var startElement = this.first().getElement()
    var endElement = this.last().getElement()

    if (startElement) {
      this.element = startElement
    }

    if (endElement) {
      this.endElement = endElement
    }
    return startElement
  },
  // replace: function(dstEl) {
  //   //如果没有删除，那就先软删除自己
  //   if (!this.deleted) {
  //     this.remove(true)
  //   }

  //   if (this.getElement()) {
  //     //挨个的拿人家的子节点，替换
  //     var mountHtml = dstEl.mountView(this.view)
  //     var nodes = _.string2nodes(mountHtml)
  //     //var firstNode = nodes[0]
  //     for (var i = 0,l = nodes.length; i < l; i++) {
  //       _.before(nodes[0],this.element)
  //     }
  //     _.remove(this.element)
  //   }

  //   this.parentNode._findAndSplice(this, dstEl)
  // },
  remove: function(softDeleted) {

    var element = this.getElement()

    if (softDeleted) {
      this.deleted = true
    } else {
      this.parentNode._findAndSplice(this)
    }

    if (!this.mounted) return
    //软删除的话不是真的删除，而是加一个占位符
    var deletedNode = _.string2node(this.mountDeleted())
    _.replace(element,deletedNode)
    this.element = deletedNode
    this.childNodes.shift()
    //挨个删除子节点，这个是硬删除，没必要留着了。有个位置留着就行
    while(this.childNodes.length){
      this.childNodes[0].remove()
    }
  },
  hasChildNodes: function() {
    return this.childNodes && this.childNodes.length && this.childNodes.length > 0
  }
})


var TextNode = Node.extend({
  init: function(options) {
    this.options = options
    this.data = options.data
    this.nodeType = 3
    this.oneTime = true
  },
  html: function(text) {
    //if (this.oneTime) return
    this.data = text
      //修改真实dom
    if (!this.mounted || !this.getElement()) return
    this.getElement().innerHTML = text
  },
  mountHtml: function(view) {
    //如果一些文本不需要改变，那就直接渲染成文本，不需要二次修改,就不需要包裹标签
    //这里注意有个例外，如果这个文本节点是collection节点的第一个或者最后一个子元素
    //因为collection需要定位，所以需要包裹
    var parentNode = this.parentNode
    var isFirstNode = (parentNode.nodeType == -1 && parentNode.first() === this)
    var isLastNode = (parentNode.nodeType == -1 && parentNode.last() === this)

    if (this.oneTime && !isFirstNode && !isLastNode){
     return this.data
    }

    return '<span ' + TAG_ID + '="' + this.patId + '">' + this.data + '</span>'
  },
  append: function() {},
  preapend: function() {

  }
})



function getBlockAttributes(attributes){
  var Directive = require('../directive/index.js')
  var newAttrs = []
  var attr
  for (var i = 0; i < attributes.length; i++) {
    attr = attributes[i]
    if (Directive.isBlockDirective(attr.name)) {
      newAttrs.push(attr)
      break
    }
  }

  return newAttrs

}



module.exports = {
  // createCollection: function(attrs,childNodes) {

  //   return new Collection({
  //     tagName: tag,
  //     attributes: attributes,
  //     childNodes: childNodes
  //   })
  //   //return new Collection(childNodes)
  // },
  createElement: function(tag, attrs, childNodes) {
    var attributes = []
    _.each(attrs, function(value, key) {
      attributes.push({
        name: key,
        value: value
      })
    })

    var element = null

    if (tag == 'template') {

      //针对template的节点，只保留block类型的指令，并且只保留一个
      attributes = getBlockAttributes(attributes)
      //如果发现不到两个子节点，那么这个collection是没有意义的，直接，返回子节点
      if (childNodes && childNodes.length == 1 && childNodes[0].nodeType == 1) {
        //属性放到子节点上
        childNodes[0].attributes = childNodes[0].attributes.concat(attributes)
        return childNodes[0]
      }else if(!childNodes || childNodes.length == 0){
        return
      }else{
        element = new Collection({
          tagName: tag,
          attributes: attributes,
          childNodes: childNodes
        })
      }

    }else{
      element = new Element({
        tagName: tag,
        attributes: attributes,
        childNodes: childNodes
      })
    }

    childNodes && _.each(childNodes, function(child) {
      child.parentNode = element
    })

    return element
  },
  createTextNode: function(data) {
    if (!data) return

    return new TextNode({
      data: data
    })
  }

}
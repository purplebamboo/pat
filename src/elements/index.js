var _ = require('../util/index.js')
var Class = _.Class
var config = require('../config.js')


var noop = function() {}


var singgleCloseTags = {
  'area': true,
  'base': true,
  'br': true,
  'col': true,
  'embed': true,
  'hr': true,
  'img': true,
  'input': true,
  'keygen': true,
  'link': true,
  'meta': true,
  'param': true,
  'source': true,
  'track': true,
  'wbr': true
}

PAT_ID = 1

TAG_ID = config.tagId

function getPatId() {
  return PAT_ID++
}


/*
 * Glue methods for compatiblity
 */

function _hasClass(el, cls) {
  if (el.classList) {
    return el.classList.contains(cls)
  } else if (el.className) {
    return _.trim(el.className).split(/\s+/).indexOf(cls) >= 0
  }
}

function _removeClass(el, cls) {
  if (el.classList) {
    el.classList.remove(cls)
  } else {
    var classes = _.trim(el.className).split(/\s+/)

    for (var i = classes.length - 1; i >= 0; i--) {
      if (classes[i] == cls) {
        classes.splice(i, 1)
      }
    }

    el.className = classes.join(' ')
  }
}

function _addClass(el, cls) {
  if (el.classList) {
    el.classList.add(cls)
  } else if (!_hasClass(el, cls)) {
    el.className += ' ' + cls
  }
}




//一些dom的操作，会抛出事件
var domProp = {
  _normalizeDom:function(el){

    var results = []
    if (el.nodeType == 11) {
      results = _.toArray(el.childNodes) || []
    }else{
      results = [el]
    }

    return results
  },
  domBefore:function(el,target){
    var els = this._normalizeDom(el)
    this.view.$rootView.fire('beforeAddBlock',els,this)
    _.before(el,target)
    this.view.$rootView.fire('afetrAddBlock',els,this)
  },
  domAfter:function(el,target){
    var els = this._normalizeDom(el)

    this.view.$rootView.fire('beforeAddBlock',els,this)
    _.after(el,target)
    this.view.$rootView.fire('afetrAddBlock',els,this)
  },
  domReplace:function(target,el){
    var els = this._normalizeDom(el)
    var targets = this._normalizeDom(target)

    this.view.$rootView.fire('beforeAddBlock',els,this)
    this.view.$rootView.fire('beforeDeleteBlock',targets,this)
    _.replace(target,el)
    this.view.$rootView.fire('afterDeleteBlock',targets,this)
    this.view.$rootView.fire('afetrAddBlock',els,this)
  },
  domRemove:function(el){
    var els = this._normalizeDom(el)
    this.view.$rootView.fire('beforeDeleteBlock',els,this)
    _.remove(el)
    this.view.$rootView.fire('afterDeleteBlock',els,this)
  }
}

var Node = Class.extend(domProp,{
  __VD__:true,
  init: function() {

  },
  mountView: function(view) {
    var html, self

    self = this
    self.view = view

    //mountView被认为只有在一次性生成dom放到页面上才会使用
    //所以这里可以直接认为有了patId后就已经生成了dom,可以拿到dom
    self.mountId()

    html = this.deleted ? self.mountDeleted(view) : self.mountHtml(view)

    //view.on('afterMount',function(){

    //self.mounted = true
    //})

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
    var self = this

    if (!self.patId || !self.view) return
    if (self.element) return self.element

    self.element = _.queryRealDom(self)
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

    var element = this.getElement()

    this.parentNode._findAndSplice(this, dstEl)

    //如果我还不在dom上直接返回
    if (!element) return

    //看对方在不在dom上
    if (dstEl.getElement()) {
      //对于collection要特殊处理
      if (dstEl.nodeType == -1) {
        for (var i = 0,l = dstEl.childNodes.length; i < l; i++) {
          this.domBefore(dstEl.childNodes[i].getElement(),this.getElement())
        }
        this.domRemove(this.getElement())

      }else{
        this.domReplace(this.getElement(),dstEl.getElement())
      }
      //dstEl.remove()
    }else{
      //挨个的拿人家的子节点，替换
      var mountHtml = dstEl.mountView(this.view)
      var frag = _.string2frag(mountHtml)
      // for (var i = 0,l = nodes.length; i < l; i++) {
      //   this.domBefore(nodes[0],this.getElement())
      // }
      this.domBefore(frag,this.getElement())
      this.domRemove(this.getElement())
    }

    return dstEl
  },
  before:function(dstEl){

    var dstChilds = dstEl.parentNode.childNodes
    var index = _.indexOf(dstChilds,dstEl)
    dstEl.parentNode.childNodes.splice(index,0,this)
    this.parentNode = dstEl.parentNode

    //如果对方不在dom上，就没必要操作
    if (!dstEl.getElement()) return

    var dstNode = dstEl.nodeType == -1 ? dstEl.endElement : dstEl.getElement()

    //如果自己在dom上
    if (this.getElement()){

      if (this.nodeType == -1) {
        for (var i = 0,l = this.childNodes.length; i < l; i++) {
          this.domBefore(this.childNodes[i].getElement(),dstNode)
        }
      }else{
        this.domBefore(this.element,dstNode)
      }

    }else{
      var mountHtml = this.mountView(dstEl.view)
      var frag = _.string2frag(mountHtml)
      //for (var i = 0,l = nodes.length; i < l; i++) {
        this.domBefore(frag,dstEl.getElement())
      //}
    }
  },
  after:function(dstEl){

    var dstChilds = dstEl.parentNode.childNodes
    var index = _.indexOf(dstChilds,dstEl) + 1

    dstEl.parentNode.childNodes.splice(index,0,this)
    this.parentNode = dstEl.parentNode

    //如果对方不在dom上，就没必要操作
    if (!dstEl.getElement()) return

    var dstNode = dstEl.nodeType == -1 ? dstEl.endElement : dstEl.getElement()
    //如果自己在dom上
    if (this.getElement()){
      if (this.nodeType == -1) {
        for (var i = 0,l = this.childNodes.length; i < l; i++) {
          this.domAfter(this.childNodes[i].getElement(),dstNode)
        }
      }else{
        this.domAfter(this.element,dstNode)
      }

    }else{
      var mountHtml = this.mountView(dstEl.view)
      var frag = _.string2frag(mountHtml)
      //for (var i = 0,l = nodes.length; i < l; i++) {
        this.domAfter(frag,dstNode)
      //}
    }

  },
  remove: function(softDeleted) {

    var lastElement = this.getElement()

    if (softDeleted) {
      this.deleted = true
    } else {
      this.parentNode._findAndSplice(this)
    }

    if (!lastElement) return
    //软删除的话不是真的删除，而是加一个占位符
    if (softDeleted) {
      var deletedNode = _.string2node(this.mountDeleted())
      this.domReplace(lastElement,deletedNode)
      this.element = deletedNode
    }else{
      this.domRemove(lastElement)
    }
  }
})




var Element = Node.extend({
  init: function(options) {
    this.options = options
    this.attributes = options.attributes
    this.tagName = options.tagName
    this.childNodes = options.childNodes
    this.hasBlock = options.hasBlock
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
  hasClass:function(classname){
    var index = _.indexOfKey(this.attributes, 'name', 'class')

    if (index == -1) return false

    var classStr = this.attributes[index].value

    var classes = _.trim(classStr).split(/\s+/)

    return _.indexOf(classes,classname) == -1 ? false : true

  },
  addClass:function(classname){

    if (!classname) return

    var classStr = this.getAttribute('class')
    classStr += ' ' + classname

    var index = _.indexOfKey(this.attributes, 'name', 'class')
    var attr = {
      name: 'class',
      value: classStr
    }

    if (index !== -1) {
      this.attributes[index] = attr
    } else {
      this.attributes.push(attr)
    }

    if (!this.getElement()) return

    _addClass(this.getElement(),classname)

  },
  removeClass:function(classname){

    var index = _.indexOfKey(this.attributes, 'name', 'class')

    if (index == -1) return

    var classStr = this.attributes[index].value

    var classes = _.trim(classStr).split(/\s+/)

    _.findAndRemove(classes,classname)

    this.attributes[index].value = classes.join(' ')

    if (!this.getElement()) return

    _removeClass(this.getElement(),classname)

  },
  getAttribute:function(key){
    var index = _.indexOfKey(this.attributes, 'name', key)
    if (index !== -1) {
      return this.attributes[index].value
    }

    return ''
  },
  setAttribute: function(key, value) {


    if (value === undefined || value === null) {
      value = ''
    }

    //不允许存在破坏节点的特殊字符
    //todo 一些防止xss的处理
    //还有{{{}}}的特殊处理，具有回转的效果
    // if (_.isString(value)) {
    //   //value = _.htmlspecialchars(value)
    //   //value = value.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // }

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
    if (!this.getElement()) return
    var element = this.getElement()

    this.view.$rootView.fire('beforeUpdateAttribute', [element], this)

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
    if (!this.getElement()) return

    var element = this.getElement()
    this.view.$rootView.fire('beforeRemoveAttribute', [element], key, this)
    node.removeAttribute(key)
    this.view.$rootView.fire('afterRemoveAttribute', [element], key, this)

  },
  mountHtml: function(view) {
    var tagName = this.tagName
    var attrsString = ''

    _.each(this.attributes, function(attr) {
      //如果不是debug跳过指令属性
      if (attr.name.indexOf(config.prefix+'-') == 0) return
      //todo 需要判断整数的情况
      attrsString += [' ', attr.name, '="', attr.value, '" '].join('')
    })

    attrsString += ' ' + TAG_ID + '="' + this.patId + '"'

    if (singgleCloseTags[tagName]) {
      return '<' + tagName + attrsString + ' />'
    }

    var childHtml = ''
    _.each(this.childNodes, function(child) {
      childHtml += child.mountView(view)
    })

    return '<' + tagName + attrsString + '>' + childHtml + '</' + tagName + '>'
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
    this.hasBlock = options.hasBlock
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
    //集合的软删除，需要通过自己的id去找
    if (this.deleted) {
      this.element = _.queryRealDom(this)
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
  remove: function(softDeleted) {
    var lastElement = this.getElement()
    if (softDeleted) {
      this.deleted = true
    } else {
      this.parentNode._findAndSplice(this)
    }

    if (!lastElement) return
    //软删除的话不是真的删除，而是加一个占位符
    var childNodes = this.childNodes
    if (softDeleted) {
      var deletedNode = _.string2node(this.mountDeleted())
      this.domReplace(lastElement,deletedNode)
      this.element = deletedNode
      //this.childNodes.shift()
    }
    //挨个删除子节点，这个是硬删除，没必要留着了。有个位置留着就行
    while(this.childNodes.length){
      this.childNodes[0].remove()
    }
    //this.childNodes = []
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

    if (text === undefined || text === null) {
      text = ''
    }

    if (_.isString(text)) {
      text = _.htmlspecialchars(text)
    }

    this.data = text
    //修改真实dom
    if (!this.getElement()) return
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
  }
})


function isBlockAttribute(name){
  var Directive = require('../directive/index.js')
  return Directive.isBlockDirective(name)
}


function getBlockAttributes(attributes){

  var newAttrs = []
  var attr
  for (var i = 0; i < attributes.length; i++) {
    attr = attributes[i]
    if (isBlockAttribute(attr.name)) {
      newAttrs.push(attr)
      break
    }
  }

  return newAttrs

}



module.exports = {
  createRoot: function(childNodes) {
    var root = new Collection({
      tagName: 'template',
      attributes: [],
      childNodes: childNodes,
      hasBlock:false
    })

    root.__ROOT__ = true

    childNodes && _.each(childNodes, function(child) {
      child.parentNode = root
    })

    return root
  },
  createElement: function(tag, attrs, childNodes) {
    var attributes = []
    var hasBlock = false

    childNodes = childNodes || []

    _.each(attrs, function(value, key) {
      attributes.push({
        name: key,
        value: value
      })

      if (isBlockAttribute(key)) {
        hasBlock = true
      }
    })

    var element = null
    if (tag == 'template') {

      //针对template的节点，只保留block类型的指令，并且只保留一个
      attributes = getBlockAttributes(attributes)
      //如果发现不到两个子节点，并且子节点没有block的指令
      //那么这个collection是没有意义的，直接，返回子节点
      if (childNodes && childNodes.length == 1 && childNodes[0].nodeType == 1 && !childNodes[0].hasBlock) {
        //属性放到子节点上
        childNodes[0].options.attributes = childNodes[0].attributes = childNodes[0].attributes.concat(attributes)
        childNodes[0].options.hasBlock = childNodes[0].hasBlock = true

        return childNodes[0]
      }else if(!childNodes || childNodes.length == 0){
        return
      }else{
        element = new Collection({
          tagName: tag,
          attributes: attributes,
          childNodes: childNodes,
          hasBlock:hasBlock
        })
      }

    }else{
      element = new Element({
        tagName: tag,
        attributes: attributes,
        childNodes: childNodes,
        hasBlock:hasBlock
      })
    }

    childNodes && _.each(childNodes, function(child) {
      child.parentNode = element
    })

    element.hasBlock = hasBlock

    return element
  },
  createTextNode: function(data) {
    if (!data){
      data = ''
    }

    return new TextNode({
      data: data
    })
  }

}
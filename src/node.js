

/**
 * 为什么要有这个类？
 *
 * 我们平时使用时，都是针对一个element节点操作
 * 但是当我们使用<template>这种节点时，会针对多个节点同时操作
 * 所以我们需要做一层封装，用来决定当前这个特殊节点，怎么删除，怎么添加
 */

var _ = require('./util')

/**
 * 支持普通节点，template节点
 *
 */

function Node (el) {

  this.el = el

  this.attrs = el.attributes

  //如果是template,需要特殊处理
  if (el.tagName && el.tagName.toLowerCase() === 'template') {
    //chrome下面可以直接拿content就是个documentFragment,不支持的需要兼容
    if (this.el.content) {
      this.el = this.el.content
    }else{
      this.el = nodeToFrag(this.el)
    }
  }

  //如果是特殊的经过转换的template兼容写法
  if (el.getAttribute && el.getAttribute('_pat_tmpl') === 'true') {
    this.el = nodeToFrag(this.el)
  }


  this.isFrag = this.el.nodeType === 11

  if (!this.isFrag) {
    this.initNormal()
  }else{
    this.initFragment()
  }

}


//初始化普通节点的几个方法
Node.prototype.initNormal = function() {

  var curEl = this.el

  this.before = function(target){
    return _.before(curEl,target)
  }

  this.after = function(target){
    return _.after(curEl,target)
  }

  this.remove = function(target){
    return _.remove(curEl,target)
  }

  this.clone = function(){
    return new Node(_.clone(curEl))
  }
}
//初始化特殊节点Fragment的几个方法
Node.prototype.initFragment = function() {
  var curEl = this.el
  this.start = _.createAnchor('frag-start',true)
  this.end = _.createAnchor('frag-end',true)
  _.prepend(this.start, curEl)
  curEl.appendChild(this.end)

  //documentFragment直接可以before
  this.before = function(target){
    return _.before(curEl,target)
  }
  this.after = function(target){
    return _.after(curEl,target)
  }
  //documentFragment进行remove时比较麻烦，需要特殊处理不少东西
  //策略是从占位节点开始挨个的删除
  this.remove = this._fragmentRemove
  this.clone = this._fragmentClone
}


Node.prototype._fragmentRemove = function() {

  if (!this.start || !this.end) {
    if (process.env.NODE_ENV != 'production') _.error('can‘t find a start or end anchor while use fragmentRemove')
    return
  }

  var node = this.start
  var prevNode
  while(node != this.end){
    prevNode = node
    node = node.nextSibling
    _.remove(prevNode)
  }
  _.remove(this.end)

}

Node.prototype._fragmentClone = function(){
  //各种兼容性问题，待做
  return new Node(_.clone(this.el))
}

function nodeToFrag(el){
  var frag = document.createDocumentFragment()
  var child
  while (child = el.firstChild) {
    frag.appendChild(child)
  }
  return frag
}


module.exports = Node

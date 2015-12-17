

/**
 * 为什么要有这个类？
 *
 * 我们平时使用时，都是针对一个element节点操作
 * 但是当我们使用<template>这种节点时，会针对多个节点同事操作
 * 所以我们需要做一层封装，用来决定当前这个节点，怎么删除，怎么添加
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
    //chrome下面可以直接拿content就是个documentFragment,ie下待兼容
    this.el = this.el.content
  }

  this.isFrag = el instanceof DocumentFragment

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
  this.start = _.createAnchor('frag-start')
  this.end = _.createAnchor('frag-end')
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
    _.error('can‘t find a start or end anchor while use fragmentRemove')
    return
  }
  debugger
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
  //各种兼容性问题
  return new Node(_.clone(this.el))
}


module.exports = Node

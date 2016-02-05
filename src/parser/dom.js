

/**
 * 用来分析模板字符串，解析成virtual dom
 */

var _ = require('../util/index.js')
var parser = require('./index.js')
var Element = require('../elements/index.js')
var Config = require('../config.js')




var delimiters = Config.delimiters
var blockStartReg = new RegExp(delimiters[0] + '\\#([^(]*)\\((.*?)\\)' + delimiters[1],'g')
var blockStartRegFalse = new RegExp(delimiters[0] + '\\^([^(]*)\\((.*?)\\)' + delimiters[1],'g')
var blockEndReg = new RegExp(delimiters[0] + '\\/(.*?)' + delimiters[1],'g')

var createElement = Element.createElement
var createTextNode = Element.createTextNode

TAG_RE = parser.TAG_RE
TEXT_NODE = 'text'


/**
 * 收集模板中的各种Tag
 *
 * @param {String} template
 */
function collectTags(structure,template) {
  var inner
  var last_offset = 0

  template.replace(/<[\w\/\s]+[^>]*>/g, function(match, offset) {

    if (offset > last_offset) {
      analyzeText(structure,template.slice(last_offset, offset))
    }

    inner = match.match(/<\/?(\w+)([^>]*?)\/?>$/)

    if (!inner && process.env.NODE_ENV != 'production') {
      _.error('Bad tag' + match + '.')
    }

    structure.push({
      tagName: inner[1].toLowerCase()
    })
    structure.end++

    if (/<\/\w+/.test(match)) {
      structure[structure.end].isEnd = true
    } else if (inner[2] !== '') {
      structure[structure.end].attrs = analyzeAttributes(inner[2])
    }

    last_offset = offset + match.length

    return match
  })

  if (last_offset != template.length) {
    analyzeText(structure,template.slice(last_offset))
  }
}

//对于前后的回车空格全部删除
//text如果里面有{{}}需要作为单独的节点
function analyzeText(structure,tempText){

  tempText = tempText.replace(/^[\n\s\t]+/g,'').replace(/[\n\s\t]+$/g,'')

  if (!tempText) return

  //找出里面有没有特殊的占位节点
  var tokens = spText(tempText)

  _.each(tokens,function(text){
    structure.push({
      tagName:TEXT_NODE,
      text:text
    })
    structure.end++
  })

}

function spText(text){
  //匹配不到插值说明是普通的，直接返回
  if (!TAG_RE.test(text)) {
    return [text]
  }

  var result = []
  var lastIndex = TAG_RE.lastIndex = 0
  var match, index
  while (match = TAG_RE.exec(text)) {
    index = match.index
      // push text token
    if (index > lastIndex) {
      result.push(text.slice(lastIndex, index))
    }
    result.push(match[0])
    lastIndex = index + match[0].length
  }

  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex))
  }

  return result

}

function analyzeAttributes(attrString){
  var attributes = {}
  var attrs,name,value,index
  //严谨起见，避免出现多个空格的情况
  attrString = attrString.replace(/\ (?=\ )/g, '')

  attrs = attrString.match(/[^=]+=('[^']*'|"[^"]*")|[^\s]+/g)//注意，属性里可能有引号
  _.each(attrs,function(attr){
    index = attr.indexOf('=')
    if (~index) {
      name = attr.slice(0,index)
      value = attr.slice(index+1).replace(/^('|")/,'').replace(/('|")$/,'')
    }else{
      name = attr
      value = ''
    }
    attributes[_.trim(name)] = _.trim(value)
  })

  return attributes

}


/**
 * 从后到前分析html tag
 *
 * @param {Array} tags
 * @param {Number} pointer
 * @param {Object} [pair]
 *
 * 思路：
 * 倒序分析tags————循环A，如果到头了就退出
 *    如果不是end
 *       如果有待配对tag且tagName相同
 *          与待配对的tag配上了，放到close_tag标记里
 *          退出循环A
 *       否则
 *          这是一个非闭合性的tag或TEXT_NODE，放到记录数组里
 *          进入下一轮循环A
 *    否则
 *       从前一个tag开始，寻找它的待配对tag
 *       如果子任务的返回没有close_tag
 *          tag没有闭合，抛出错误
 *          中止
 *       整理返回结果
 *       同步pointer
 *       进入下一轮循环A
 *
 * 返回记录数组
 */
function getStructure(tags, pointer, pair) {
  var re = {
      found: []
    },
    tmp

  for (var i = pointer; i >= 0; i--) {
    if (!tags[i].isEnd) {
      if (
        pair != undefined &&
        tags[i].tagName == pair.tagName
      ) {
        re.close_tag = tags[i]
        re.latest_pointer = i
        break;
      } else if (tags[i].tagName === TEXT_NODE) {
        re.found.unshift(createTextNode(tags[i].text))
      } else {
        re.found.unshift(createElement(tags[i].tagName,tags[i].attrs))
      }
    } else {
      tmp = getStructure(tags, i - 1, tags[i])
      if (!tmp && process.env.NODE_ENV != 'production') {
        _.error(tags[i - 1].tagName + ' does not have correspond start tag.')
        return
      }
      if (!tmp.close_tag && process.env.NODE_ENV != 'production') {
        _.error(tags[i].tagName + ' does not have correspond start tag.')
        return
      }
      tmp.close_tag.paired = true
      i = tmp.latest_pointer
      if (tmp.found.length != 0) {
        tmp.close_tag.children = tmp.found
      }
      re.found.unshift(createElement(tmp.close_tag.tagName,tmp.close_tag.attrs,tmp.close_tag.children))
    }
  }

  /**
   * 普通情况下，for循环后i会比实际情况小1，这是因为for循环会先改变i再对i>=0做判断。
   * 但是，如果是break的情况，i就是实际情况，所以这里要对i做区分处理。
   */
  if (re.latest_pointer === undefined) {
    re.latest_pointer = i + 1;
  }

  return re
}


//对template做一次正则替换，以支持mustache的一些写法
function _normalize(template){

  var newTpl = template + ''

  newTpl = newTpl.replace(blockStartReg,'<template t-$1="$2">')
  newTpl = newTpl.replace(blockStartRegFalse,'<template t-$1="!($2)">')
  newTpl = newTpl.replace(blockEndReg,'</template>')

  return newTpl

}


exports.transfer = function(template) {

  if (_.isObject(template) && template.__VD__) {
    return template
  }

  if (template == '') {
    return createTextNode('')
  }

  template = _normalize(template)

  var structure = []
  var result,rootElement

  structure.end = -1
  collectTags(structure,template)
  result = getStructure(structure,structure.length - 1)
  rootElement = createElement('template',{},result.found)

  return rootElement
}






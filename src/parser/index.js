var config = require('../config.js')
var _ = require('../util')
var expParser = require('./expression.js')
var dirParser = require('./directive.js')
var Cache = require('../cache')
var parseTextCache = new Cache(500,500)
var prefix = config.prefix

var delimiters = config.delimiters

var regexEscapeRE = /[-.*+?^${}()|[\]\/\\]/g

function escapeRegex(str) {
  return str.replace(regexEscapeRE, '\\$&')
}

var dirRegx = new RegExp('^' + prefix + '-([^=]+)')
var argRegx = /:(.*)$/

var expressionRegx = /([^|]+)\|?([\sA-Za-z$_]*)/


var open = escapeRegex(config.delimiters[0])
var close = escapeRegex(config.delimiters[1])
var unsafeOpen = escapeRegex(config.unsafeDelimiters[0])
var unsafeClose = escapeRegex(config.unsafeDelimiters[1])

var tagRE = new RegExp(
  unsafeOpen + '(.+?)' + unsafeClose + '|' +
  open + '(.+?)' + close,
  'g'
)

var htmlRE = new RegExp(
  '^' + unsafeOpen + '.*' + unsafeClose + '$'
)

var interpolationRegx = new RegExp(
  unsafeOpen + '(.+?)' + unsafeClose + '|' +
  open + '(.+?)' + close
)


//解析指令
/**
 * 解析指令，这里分两种情况
 * 1. 普通属性上的插值指令  id="J_{{name}}"
 * 2. 指令属性   sk-for="xxx"
 *
 * @param  {Attr} attr 属性对象
 * @return 指令描述
 *
 * @example
 *
 * sk-bind='test.text'
 *
 * {
 *   expObj:expObj,
 *   directive:'bind',
 *   name:'sk-bind',
 *   value:'test.text',
 *   args:[], //参数数组
 *   priority:3000, //指令的优先级，值越大，绑定时优先级越高
 *   oneTime:false, //是否是一次性指令，不会响应数据变化
 *   block:false, //是否是block类型的指令
 *   isInterpolationRegx: true //是否是插值
 *
 * }
 */
exports.parseDirective = function(attr) {
  var name = attr.name
  var value = attr.value
  var match, args, tokens, directive, obj

  //value里面有插值的情况下，就认为是插值属性节点，普通指令不支持插值写法
  if (interpolationRegx.test(value)) {

    //如果这个时候还能找到指令需要提示，指令不能包括插值，这种情况下优先处理插值
    if (process.env.NODE_ENV != 'production' && dirRegx.test(name)) {
      _.log('{{}} can not use in a directive,otherwise the directive will not compiled.')
    }

    tokens = exports.parseText(value)

    return {
      name: name,
      value: value,
      directive: 'bind',
      args: [name],
      oneTime: false,
      block:false,
      expObj: exports.token2expression(tokens),
      isInterpolationRegx: true //标识一下是插值
    }
  }

  directive = name.match(dirRegx)[1]
  //普通指令解析
  //普通指令全部转义，全部不是onetime
  if (argRegx.test(directive)) {
    obj = directive.split(':')
    directive = obj[0]
    args = obj[1] ? obj[1].split('|') : []
  }


  var dirOptions = require('../directive').__directives[directive] || {}

  return {
    name: name,
    value: value,
    directive: directive,
    args: args || [],
    oneTime: false,
    block: dirOptions.block,
    priority: dirOptions.priority,
    expObj: exports.parseExpression(value)
  }
}

/**
 * 解析表达式,不需要支持太复杂的表达式
 * @param  {[type]} attr [description]
 * @return {string}
 *
 * @example
 *
 *   hello + 1 + "hello" | test
 *
 * @return
 * {
 *   exp: _that.applyFilter('_scope.hello + 1 + "hello"',test),
 *   getter: fn,
 *   setter: fn
 * }
 *
 *
 */
exports.parseExpression = function(text) {


  var filters,body,dirParsed

  dirParsed = dirParser.parse(text)

  if (!dirParsed.expression) return ''

  body = dirParsed.expression
  filters = dirParsed.filters || []

  if (filters.length > 0) {
    body = '_that.applyFilter(' + body + ',"' + filters.join(',') + '")'
  }

  return expParser.compileExpFns(body)
}


TextTemplateParserTypes = {
  text: 0,
  binding: 1
}


/**
 * 用来解析一段文本，找出普通文本和 插值
 * @param  {text} text 一段文本
 * @return {array}    返回一个数组
 */
exports.parseText = function(text) {

  text = text.replace(/\n/g, '')
  var tokens = []
  var cachekey = text
  // try cache
  var hit = parseTextCache.get(cachekey)
  if (hit) {
    return hit
  }

  //匹配不到插值说明是普通的，直接返回
  if (!tagRE.test(text)) {
    tokens = [{
      type: TextTemplateParserTypes.text,
      value: text
    }]
    parseTextCache.set(cachekey, tokens)

    return tokens
  }

  var lastIndex = tagRE.lastIndex = 0
  var match, index, html, value, first, oneTime
  while (match = tagRE.exec(text)) {
    index = match.index
      // push text token
    if (index > lastIndex) {
      tokens.push({
        type: TextTemplateParserTypes.text,
        value: text.slice(lastIndex, index)
      })
    }
    // tag token
    html = htmlRE.test(match[0])
    value = html ? match[1] : match[2]
    first = value.charCodeAt(0)
    oneTime = first === 42 // *
    value = oneTime ? value.slice(1) : value
    tokens.push({
      type: TextTemplateParserTypes.binding,
      value: _.trim(value),
      html: html,
      oneTime: oneTime
    })
    lastIndex = index + match[0].length
  }
  if (lastIndex < text.length) {
    tokens.push({
      type: TextTemplateParserTypes.text,
      value: text.slice(lastIndex)
    })
  }

  parseTextCache.set(cachekey, tokens)

  return tokens
}

/**
 * 用来将上面生成的token合成一个expression
 * @return {[type]} [description]
 */
exports.token2expression = function(tokens) {
  var mergedExpression = []

  _.each(tokens, function(token) {

    if (token.type == TextTemplateParserTypes.text) {
      mergedExpression.push('"' + token.value + '"')
    } else {
      mergedExpression.push('(' + exports.parseExpression(token.value).exp + ')')
    }
  })

  var merged = mergedExpression.join('+')

  return {
    exp: merged,
    getter: expParser.makeGetter(merged)
  }
}

exports.TAG_RE = tagRE
exports.INTERPOLATION_REGX = interpolationRegx
exports.DIR_REGX = dirRegx
exports.TextTemplateParserTypes = TextTemplateParserTypes

var config = require('../config.js')
var _ = require('../util')
var expParser = require('./expression.js')

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
 *   expression:'@test.text',
 *   directive:'bind',
 *   name:'sk-bind',
 *   value:'test.text',
 *   args:[], //参数数组
 *   oneTime:false, //是否是一次性指令，不会响应数据变化
 *   html:false, //是否支持html格式，也就是不会被转义
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

    //如果这个时候还能找到指令需要报错提示，指令不能包括插值，这种情况下优先处理插值
    if (process.env.NODE_ENV != 'production' && dirRegx.test(name)) {
      _.error('{{}} can not use in a directive,otherwise the directive will not compiled.')
    }

    tokens = exports.parseText(value)

    return {
      name: name,
      value: value,
      directive: 'bind',
      args: [name],
      oneTime: false,
      html: false,
      block:false,
      expression: exports.token2expression(tokens),
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
    html: false,
    block: dirOptions.block,
    priority: dirOptions.priority,
    expression: exports.parseExpression(value)
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
 *
 *   _that.applyFilter('_scope.hello + 1 + "hello"',test),
 *
 */
exports.parseExpression = function(text) {


  var match,expression,filterName,body

  match = text.match(expressionRegx)

  if (!match) {
    if (process.env.NODE_ENV != 'production') _.error('can not find a expression')
    return ''
  }

  expression = _.trim(match[1])
  filterName = _.trim(match[2])

  body = expParser.compileExpFns(expression)

  if (filterName) {
    body = '_that.applyFilter(' + body + ',"' + filterName + '")'
  }

  return body
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

  //匹配不到插值说明是普通的，直接返回
  if (!tagRE.test(text)) {
    return [{
      type: TextTemplateParserTypes.text,
      value: text
    }]
  }

  var tokens = []
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

  return tokens;
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
      mergedExpression.push('(' + exports.parseExpression(token.value) + ')')
    }
  })

  return mergedExpression.join('+')
}

exports.INTERPOLATION_REGX = interpolationRegx
exports.DIR_REGX = dirRegx
exports.TextTemplateParserTypes = TextTemplateParserTypes
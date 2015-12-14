var _ = require('./util')
var Directive = require('./directive')
var Watcher = require('./watcher')
var parser = require('./parser')
var parseDirective = parser.parseDirective
var parseText = parser.parseText
var parseExpression = parser.parseExpression
var config = require('./config')

/**
 * 绑定directive
 * @param  {[type]} describe 描述信息
 * @return {[type]}          [description]
 *
 *
 * eg.
 *
 *{
 *  view:xx,
 *  expression:xx,
 *  directive:xx,
 *  el:xx,
 *  html:xx,
 *  oneTime:xx
 *}
 *
 */
function _bindDir(describe) {
  var dirInstance, watcher, view

  view = describe.view
  dirInstance = Directive.create(describe)


  //先去watch池子里找,value可以作为key
  watcher = view.__watchers[describe.value]

  if (watcher) {
    //使用老的，如果不是一次性的，就不需要加入对应的指令池
    if (!describe.oneTime) {
      watcher.__directives.push(dirInstance)
    }

  }else{
    //新建一个watch
    watcher = new Watcher(view.$data, describe.expression)
    watcher.__view = view
    //看是不是一次性的，新的watch需要加入view的watch池子
    if (!describe.oneTime) {
      watcher.__directives.push(dirInstance)
      view.__watchers[describe.value] = watcher
    }
  }

  dirInstance.__watcher = watcher
  //执行绑定
  dirInstance.bind(describe.args)
  //首次自动调用update
  dirInstance.update(watcher.getValue())

  return dirInstance
}

//解析属性，解析出directive，这个只针对element
function _compileDirective(el, view) {
  var attrs, describe, skipChildren, childNodes

  //以下几种情况下，不需要编译当前节点
  //1. 不是element节点
  //2. 如果el已经被编译过了，就不需要重复编译了
  //3. view标识 不需要编译自己的root element的情况
  if ((_.isElement(el) && el.nodeType === 1) && !el.hasCompiled && (view.__rootCompile || el != view.$el)) {

    el.hasCompiled = true

    attrs = _.toArray(el.attributes)
    _.each(attrs, function(attr) {

      //不是directive就返回
      if (!Directive.isDirective(attr)) return

      describe = parseDirective(attr)
      describe.view = view
      describe.el = el


      //如果不是debug模式，可以把属性删除了.插值的不用管，只需要去掉指令定义
      if (!config.debug && !describe.isInterpolationRegx && el && el.removeAttribute) {
        el.removeAttribute(describe.name)
      }

      dirInstance = _bindDir(describe)


      //对于有block的directive,需要跳过子节点的解析
      if (dirInstance.block) {
        skipChildren = true
      }
      //todo 两个以上的block类型directive需要报错
    })
  }

  //有block的情况需要跳过子节点的编译，比如if,for,bind
  if (!skipChildren && el.hasChildNodes()) {
    childNodes = _.toArray(el.childNodes)
    _.each(childNodes, function(child) {
      exports.parse(child, view)
    })
  }
}


//解析text情况会很复杂，会支持多个插值，并且多个插值里面都有expression
function _compileTextNode(el, view) {
  var tokens, token, text, expObj, placeholder

  tokens = parseText(el.data)

  if (!(tokens.length === 1 && tokens[0].type === parser.TextTemplateParserTypes.text)) {

    placeholder = _.createAnchor('text-place-holder')
    _.replace(el, placeholder)

    for (_i = 0, _len = tokens.length; _i < _len; _i++) {
      token = tokens[_i];
      text = document.createTextNode(token.value)

      _.before(text, placeholder)
      //是插值需要特殊处理，绑定directive
      if (token.type === parser.TextTemplateParserTypes.binding) {
        _bindDir({
          name:'',
          value:token.value,
          view: view,
          expression: parseExpression(token.value),
          oneTime: token.oneTime,
          html:token.html,
          directive: 'textTemplate',
          el: text
        })
      }
    }
  }

}


exports.parse = function(el, view) {

  if (!_.isElement(el)) return

  //对于文本节点采用比较特殊的处理
  if (el.nodeType == 3) {
    _compileTextNode(el, view)
    return
  }
  //编译普通节点
  _compileDirective(el, view)

}
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
 * @param  {object} describe 描述信息
 */
function _bindDir(describe) {
  var dirInstance, watcher, view, value

  //如果不是debug模式，可以把属性删除了.
  if (!config.debug && describe.el && describe.el.removeAttribute) {
    describe.el.removeAttribute(describe.name)
  }


  view = describe.view
  dirInstance = Directive.create(describe)


  //先去watch池子里找,value可以作为key
  watcher = view.__watchers[describe.value]

  if (watcher) {
    //使用老的watcher，如果是一次性的，就不需要加入对应的指令池
    if (!describe.oneTime) {
      watcher.__directives.push(dirInstance)
    }

  }else{
    //新建一个watch
    watcher = new Watcher(view, describe.expression)
    //看是不是一次性的，新的watch需要加入view的watch池子
    if (!describe.oneTime) {
      watcher.__directives.push(dirInstance)
      view.__watchers[describe.value] = watcher
    }
  }

  dirInstance.__watcher = watcher
  //执行绑定
  dirInstance.bind(describe.args)
  //todo... 这边获取值可以缓存住,优化
  value = watcher.getValue()
  //赋值
  watcher.last = value
  //首次自动调用update
  dirInstance.update(value)

  return dirInstance
}

//解析属性，解析出directive，这个只针对element
function _compileDirective(el,view,attributes) {
  var attrs, describe, skipChildren, childNodes,blockDirectiveCount,isCurViewRoot

  //if (el.hasCompiled) return

  isCurViewRoot = el === view.$el ? true : false

  blockDirectiveCount = 0
  //el.hasCompiled = true
  attributes = attributes || []

  var describes = [],blockDescribes = []
  _.each(attributes,function(attr){

    //不是directive就返回
    if (!Directive.isDirective(attr)) return

    describe = parseDirective(attr)
    describe.view = view
    describe.el = el

    describe.block ? blockDescribes.push(describe) : describes.push(describe)

  })

  if (process.env.NODE_ENV != 'production' && blockDescribes.length > 1 ){
    _.log('one element can only have one block directive.')
  }

  /**
   * 策略是：
   * 1. 如果有block并且不是在当前的root上，那么就可以交给子集的block指令去解析，它会负责创建新的view
   * 2. 如果有block并且是在当前的root上，那么证明block的解析已经由父级view完成，那么只需要解析剩余的其他指令就可以了
   * 3. 没有block那么就正常解析普通就行。
   */

  if (!isCurViewRoot && blockDescribes.length) {
    //只管第一个block
    _bindDir(blockDescribes[0])

    //重置为未处理
    //el.hasCompiled = false
    return
  }

  //排序，之后去绑定
  describes.sort(function(a, b) {
    a = a.priority || 100
    b = b.priority || 100
    return a > b ? -1 : a === b ? 0 : 1
  })

  _.each(describes,function(des){
    _bindDir(des)
  })

  if (el.hasChildNodes()) {
    childNodes = _.toArray(el.childNodes)
    _.each(childNodes, function(child) {
      exports.parse(child, view)
    })
  }
}


//解析text情况会很复杂，会支持多个插值，并且多个插值里面都有expression
function _compileTextNode(el, view) {
  var tokens, token, text, placeholder

  tokens = parseText(el.data)

  if (!(tokens.length === 1 && tokens[0].type === parser.TextTemplateParserTypes.text)) {

    placeholder = _.createAnchor('text-place-holder')
    _.replace(el, placeholder)
    for (var i = 0, len = tokens.length; i < len; i++) {
      token = tokens[i];
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
    _.remove(placeholder)
  }

}



exports.parseRoot = function(el,view){

  var attrs = null
  if (view.__node) {
    attrs = _.toArray(view.__node.attrs)
  }else{
    attrs = _.toArray(el.attributes)
  }

  //去重,需不需要合并之前的值?
  //attrs = attrs.concat(el.attributes ? _.toArray(el.attributes) : [])
  _compileDirective(el,view,attrs)
}



exports.parse = function(el,view) {

  if (!_.isElement(el)) return

  //对于文本节点采用比较特殊的处理
  if (el.nodeType == 3 && _.trim(el.data)) {
    _compileTextNode(el, view)
  }

  //编译普通节点
  if ((el.nodeType == 1) && el.tagName !== 'SCRIPT') {
    _compileDirective(el, view, _.toArray(el.attributes))
  }
}
var _ = require('./util')
var Directive = require('./directive')
var Watcher = require('./watcher/index.js')
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
  // if (!config.debug && describe.el && describe.el.removeAttribute) {
  //   describe.el.removeAttribute(describe.name)
  // }


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
  dirInstance.initialize && dirInstance.initialize()
  //执行绑定
  //dirInstance.bind(describe.args)
  //todo... 这边获取值可以缓存住,优化
  value = watcher.getValue()
  //赋值
  watcher.last = value
  //首次自动调用bind
  dirInstance.bind(value)
  //dirInstance.update(value)

  return dirInstance
}

//解析属性，解析出directive，这个只针对element
function _compileDirective(el,view,attributes) {
  var attrs, describe, skipChildren, childNodes,blockDirectiveCount,isCurViewRoot


  isCurViewRoot = el === view.$el ? true : false

  blockDirectiveCount = 0
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
   * 1. 如果有block并且block没有解析，那么就可以交给子集的block指令去解析，它会负责解析自己的区块
   * 2. 如果有block并且block已经解析过了，那么证明block的解析已经由父级view完成，那么只需要解析剩余的其他指令就可以了
   * 3. 没有block那么就正常解析普通就行。
   */

  if (!isCurViewRoot && blockDescribes.length) {
    //只管第一个block
    //el.isBlockBind = true
    _bindDir(blockDescribes[0])
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

//解析text，只会有一个
function _compileTextNode(el, view) {
  var tokens, token, text, placeholder,oneTime

  token = parseText(el.data)[0]

  oneTime = token.oneTime

  //对于普通的文本节点作为 一次性的不需要更新
  if (token.type === parser.TextTemplateParserTypes.text) {
    oneTime = true
  }

  _bindDir({
    name:'',
    value:token.value,
    view: view,
    expression: parseExpression(token.value),
    oneTime:oneTime,
    //html:token.html,
    directive: token.html ? 'html' : 'text',
    el: el
  })
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

  //编译集合节点
  if ((el.nodeType == -1)) {
    //todo  只保留block节点
    _compileDirective(el, view, _.toArray(el.attributes))
  }


}
var _ = require('./util')
var Directive = require('./directive')
var Data = require('./data/index.js')
var Watcher = require('./watcher/index.js')
var parser = require('./parser')
var parseDirective = parser.parseDirective
var parseText = parser.parseText
var parseExpression = parser.parseExpression
var config = require('./config')



// function _handelUnregisterKey(describe){
//   var expression = describe.expression
//   var view = describe.view
//   var match = expression.match(/_scope\.([\w]+)/)
//   var key,newObj
//   if (!match || !match[1]) return

//   key = match[1]
//   newObj = {}
//   newObj[key] = ''

//   //从最顶级开始添加
//   view.$rootView.__addData(newObj)

//   // if (!_.hasKey(view.$data.__ori__,key)) {
//   //   newObj[key] = ''
//   //   _.each(view.$data.__ori__,function(v,k){
//   //     newObj[k] = view.$data[k]
//   //   })

//   //   view.$data = Data.inject(newObj)
//   // }

// }


/**
 * 绑定directive，初始化指令
 * @param  {object} describe 描述信息
 */
function _bindDir(describe) {
  var dirInstance, watcher, view, value


  view = describe.view
  dirInstance = Directive.create(describe)

  //这里需要做一个特殊处理，就是如果expression是单独的一级key并且data里面不存在，我们需要重新赋值data
  //_handelUnregisterKey(describe)

  //先去watch池子里找,value可以作为key
  watcher = view.__watchers[describe.value]

  if (!watcher){
    watcher = new Watcher(view, describe.expression)
    view.__watchers[describe.value] = watcher
  }

  //看是不是一次性的，一次性的不需要加入到watcher的指令池，不需要更新
  if (!describe.oneTime) {
    watcher.__directives.push(dirInstance)
  }

  dirInstance.__watcher = watcher
  //执行初始化，如果有的话
  dirInstance.initialize && dirInstance.initialize()
  //todo... 这边获取值可以缓存住,优化
  //第一次取值，会通过get set绑定好数据依赖
  value = watcher.getValue()
  //赋值
  watcher.last = value
  //调用bind
  dirInstance.bind(value)

  return dirInstance
}

//解析属性，解析出directive，这个只针对element
function _compileDirective(el,view,attributes) {
  var attrs, describe, skipChildren, childNodes,isCurViewRoot


  isCurViewRoot = el === view.$el ? true : false

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
   * 1. 如果有block并且不是在根节点上，那么就可以交给子block指令去解析，它会负责解析自己的区块
   * 2. 如果有block但是是在根节点上，那么证明block的解析已经由父级view完成，那么只需要解析剩余的其他指令就可以了
   * 3. 没有block那么就正常解析普通就行。
   */

  if (!isCurViewRoot && blockDescribes.length) {
    //只管第一个block
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
  //针对变量类型的 文本进行指令解析，区分html和text
  if (token.type === parser.TextTemplateParserTypes.binding) {

    _bindDir({
      name:'',
      value:token.value,
      view: view,
      expression: parseExpression(token.value),
      oneTime:oneTime,
      directive: token.html ? 'html' : 'text',
      el: el
    })
  }

}

exports.parse = function(el,view) {

  if (!_.isElement(el)) return

  //对于文本节点采用比较特殊的处理
  if (el.nodeType == 3 && _.trim(el.data)) {
    _compileTextNode(el, view)
  }

  //普通节点
  if ((el.nodeType == 1) && el.tagName !== 'SCRIPT') {
    _compileDirective(el, view, _.toArray(el.attributes))
  }

  //集合节点
  if ((el.nodeType == -1)) {
    _compileDirective(el, view, _.toArray(el.attributes))
  }


}
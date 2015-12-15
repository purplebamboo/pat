



exports.defaultOptions = {
  el:'',
  template:'',
  rootCompile:true,
  //是否整个替换掉el节点
  replace:true,
}


exports.defaultLog = function(msg) {
  console.log(msg)
}


exports.prefix = 'sk'
exports.delimiters = ['{{','}}']
exports.unsafeDelimiters = ['{{{','}}}']

exports.debug = false
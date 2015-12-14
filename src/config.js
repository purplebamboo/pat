



exports.defaultOptions = {
  el:'',
  template:'',
  //是否整个替换掉el节点，默认为true
  replace:true,
}


exports.defaultLog = function(msg) {
  console.log(msg)
}


exports.prefix = 'sk'
exports.delimiters = ['{{','}}']
exports.unsafeDelimiters = ['{{{','}}}']

exports.debug = false



var _ = require('./util')
//需要针对ie8做出若干的兼容



//对于不支持template标签的，需要创建标签定义
_supportTemplate = (function _supportTemplate(){
  var a = document.createElement('div')
  a.innerHTML = '<template>test</template>'
  return !!a.firstChild.innerHTML
})()

if (!_supportTemplate) {
  document.createElement('template')
}


//为了兼容低版本的浏览器，需要对模板做一些特殊的处理。
//ie8以下使用innerHTML添加的自定义标签，无法去获取。http://www.cnblogs.com/ecma/archive/2012/02/01/2335047.html
//当然对于不使用模板的不会有问题，会当作正常的标签。
//所以我们需要针对模板中的template标签做特殊处理。
exports.checkTmpl = function(tmpl){

  if (!_supportTemplate) {
    tmpl = tmpl.replace(/<template[\s]+/g,'<div _pat_tmpl="true" ').replace(/<\/template>/g,'</div>')
  }

  return _.trim(tmpl)
}


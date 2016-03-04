//用来打包生成对应的文档html

var fs = require('fs')
var marked = require('marked')

// Synchronous highlighting with highlight.js
marked.setOptions({
  breaks:true
})


var guide = fs.readFileSync('./doc/mds/guide.md')
var guideHtml = marked(guide.toString())


fs.writeFileSync('./doc/views/guide/index.html',guideHtml)

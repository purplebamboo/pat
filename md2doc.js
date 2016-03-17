//用来打包生成对应的文档html

var fs = require('fs')
var marked = require('marked')

// Synchronous highlighting with highlight.js
marked.setOptions({
  breaks:true
})


var layout = fs.readFileSync('./doc/layout.tpl').toString()

var render = function(content) {
  return layout.replace('{{content}}',content)
}

var guideHtml = marked(fs.readFileSync('./doc/mds/guide.md').toString())
var docHtml = marked(fs.readFileSync('./doc/mds/doc.md').toString())
var exampleHtml = marked(fs.readFileSync('./doc/mds/example.md').toString())


fs.writeFileSync('./doc/views/guide.html',render(guideHtml))
fs.writeFileSync('./doc/views/doc.html',render(docHtml))
fs.writeFileSync('./doc/views/example.html',render(exampleHtml))

# Pat


pat是一个轻量化的指令型模板解决方案。

vue很好，很强大，但是在我们现有的框架结构下整个引入vue不现实。原因有：

* 一些vue的功能跟我们的有所重复
* 不支持ie8

基于此，我们经过精简参考vue，angular的指令写法，实现一套轻量级的模板引擎，使用脏检测代替defineproperty实现的数据监听，达到兼容ie8的目的。另外去掉一些不是特别需要功能，得到一个最轻量最适合我们目前架构使用的模板引擎。


## usage

```
<div id="test">
  {{text}}
</div>

<script type="text/javascript">
var h = new Pat({
  el:'test',
  data:{
    text:'hello world'
  }
})

//可以更改数据局部更新模板
h.$data.text = 'hello alimama'
//需要触发脏检测，实际使用时会结合到框架当中
h.$apply()
</script>


```

更多相关指令用法查看文档：[doc](./doc/doc.md)


## examle

相关例子都在 `./examples`,可以直接使用浏览器打开查看

## test

采用karma + jasmine做功能性测试，后期考虑使用nightwatch或者casper来做ui的e2e测试

```
npm test
```

## build

项目使用webpack打包，在根目录执行：

```
npm run-script build
```


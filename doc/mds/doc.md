# pat文档

## 基本用法


pat的使用很简单，我们看个最简单的例子：



```js

html:
<div id="test"></div>

js:
var p = new Pat({
  el:'test',
  data:{
    text:'hello'
  },
  template:'{{text}}'
})

```
最终会把 hello渲染到id为test的dom元素里面。


基本语法如下：

```
var p = new Pat(options)
```

option具体配置如下：


| 参数 | 类型 | 要求 | 备注 |
| -------- | -------- | -------- | -------- |
| options.el | string,element | 必选 | 需要渲染的目标节点 |
| options.data | object | 必选 | 渲染所用的数据 |
| options.template | string | 可选 | 渲染所需要的模板，非必须，如果没传，就会以el的innerHTML作为模板 |
| options.dataCheckType | string | 可选 | 数据检测方式，支持两种defineProperties，dirtyCheck。详情请看局部刷新那节。 |
| options.filters | object | 可选 | 数据管道过滤函数，参考filters那一节 |
| options.watchers | object | 可选 | 用户自定义watcher用来监听数据变化，详情请见watchers一节 |



## 基本模板语法

pat里面的模板功能都是使用指令实现的，指令是写在dom上的一个以`t-`开头的属性，pat会给这样的dom绑定一段逻辑，从而实现复杂的功能。

但是指令的写法可读性差，因此pat实现了一套类似mustache预发的兼容，这只是一个语法糖，本质上还是会转换成指令执行。

下面我们看下pat的基本模板语法：

### 插值

类似于`{{expression}}`这种语法我们称之为“插值”。可以渲染一段文本。

expression可以是简单的表达式，比如基本的逻辑运算还有三元操作都是支持的。

> 这算是比较特殊的，本质上最后还是会转换成对应的指令应用逻辑。


例子：

```js

html:
<div id="test">
    <div id="{{id}}">{{name+'我是附加的文本'}}</div>
    <div>{{{html}}}</div>
</div>

js:
var p = new Pat({
  el:'test',
  data:{
    id:'test2',
    name:'pat',
    html:'<strong>pat</strong>'
  },
  template:'{{text}}'
})

```
可以看到上面的插值有三种用法：

* 普通的文本渲染使用`{{name}}`,会进行转义。
* 另外类似于mustache的风格，我们使用`{{{html}}}`三个大括弧来实现渲染html文本的渲染。
* 另外会发现插值也可以用在属性上。当插值里面的表达式的返回结果为null或者false的时候这个属性不会渲染到dom上。


### if指令

pat使用if判断也很容易：

语法为：

```js
<xxx t-if="expression">...</xxx>

//或者mustache风格

{{#if(expression)}}
...
{{/if}}

```

else的语法为：

```js

<xxx t-unless="expression">...</xxx>

//或者mustache风格

{{#unless(expression)}}
...
{{/unless}}
//等价于:
{{^if(expression)}}

{{/if}}



```

推荐使用mustache风格的语法，可以得到更好的可读性

例子：

```js

html:
<div id="test">
    <div t-if="name == 'pat'">
        {{name+'我是附加的文本'}}
    </div>

    <!--推荐下面的mustache的风格-->

    {{#if(name="pat")}}
        <div>{{name+'我是附加的文本'}}</div>
    {{/if}}
</div>

js:
var p = new Pat({
  el:'test',
  data:{
    id:'test2',
    name:'pat',
    html:'<strong>pat</strong>'
  },
  template:'{{text}}'
})

```

### for指令

for指令用来实现列表的渲染，相关语法如下：

```js

<xxx t-for="item in 数组对象">{{item.xxx}}-{{item.__INDEX__}}</xxx>

//或者mustache风格

{{#for(item in 数组对象)}}
    {{item.xxx}}-{{__INDEX__}}
{{/for}}


```

需要有一个子scope命名，比如这里的item。这也是跟vue和angular的语法保持一致。另外可以通过`__INDEX__`拿到当前的索引。


例子：



```js

html:
<div id="test">
    <div t-for="item in lists">
        {{item.name+'当前index'+__INDEX__}}
    </div>

    <!--推荐下面的mustache的风格-->

    {{#for(item in lists)}}
        <div>{{item.name+'当前index'+__INDEX__}}</div>
    {{/for}}
</div>

js:
var p = new Pat({
  el:'test',
  data:{
    id:'test2',
    name:'pat',
    lists:[{
        name:'111'
    },{
        name:'222'
    }],
    html:'<strong>pat</strong>'
  },
  template:'{{text}}'
})

```



## 局部刷新

除了常规的基本的模板功能，pat还支持局部刷新的功能，通过修改数据，对应的模板会自动发生变更。

每一个pat实例都会有一个$data对象，通过修改这个对象，可以达到局部刷新的功能。

例子如下:


```js

html:
<div id="test">
    {{#if(name="pat")}}
        <div>{{name+'我是附加的文本'}}</div>
    {{/if}}
</div>

js:
var p = new Pat({
  el:'test',
  data:{
    id:'test2',
    name:'pat',
    html:'<strong>pat</strong>'
  },
  template:'{{text}}'
})


p.$data.name = 'hide'
//此时对应的div就会销毁

```

可以看到，pat会根据数据变更修改对应的dom。

### defineProperties

pat默认使用defineProperties给data的每个key注入钩子来达到监听数据变化的目的。上面的例子就是使用的这种模式。


使用时需要注意以下几点：


* 所有key需要提前写好，这样才能正常监听到变更，否则不会触发局部刷新。
* 由于为了兼容ie8，pat在ie8下使用vbscript模拟defineProperties的功能，这有一定的限制。比如不能往p.$data里赋值新的属性，另外`value`作为vbscript的特殊值也不能使用。使用起来开发体验会比较一般。
* 在此模式下，pat会重写数组的push，splice等方法，用来触发数据变更监听，但是通过数组下标的方式修改数据，无法触发。与vue一样，此时我们需要通过额外添加的方法$set(index,value)，来修改。
* pat支持批量更新，因此在一次赋值后，dom没有立即更新，可以使用实例对象的$apply(内部其实是$flushUpdate)方法来强制刷新。也可以使用$nextTick(callback)在回调里处理需要在一次批量更新之后需要执行的逻辑。



可以看到使用defineProperties，在开发时会有不少限制。再加上需要兼容ie8，实际使用会有不少坑。



### dirtyCheck

基于总总原因，pat同时支持使用脏检测的方式来监听数据的变化。
例子如下：

```js


html:
<div id="test">
    {{#if(name="pat")}}
        <div>{{name+'我是附加的文本'}}</div>
    {{/if}}
</div>

js:
var p = new Pat({
  el:'test',
  data:{
    id:'test2',
    name:'pat',
    dataCheckType:'dirtyCheck', //使用脏检测
    html:'<strong>pat</strong>'
  },
  template:'{{text}}'
})


p.$data.name = 'hide'
p.$apply()  //脏检测模式下，需要自己手动调用$apply（内部会调用$digest）来开始脏检测

//此时对应的div就会销毁


```

可以看到，差别不大，只需要在new的时候传入一个dataCheckType，设置为`dirtyCheck`。与defineProperties不同，脏检测模式下需要最后手动调用$apply来触发脏检测。

脏检测天生具备批量更新（调用$apply）。不需要提前写属性，不会对原始数据注入太多。对ie8的兼容也更好。但是脏检测不可避免的性能上会比defineProperties慢，（主要是更新慢）。



### defineProperties VS dirtyCheck

那么这两种模式我们怎么选择呢。

如果你的业务比较注重性能尤其是更新性能，你也不喜欢每次最后调用$apply，甚至你不需要兼容ie8。那么就使用defineProperties模式。

如果你的业务数据量不大，性能只要能说得过去。而且业务需要支持ie8，不希望提前写属性。那么推荐使用dirtyCheck模式。


## 特殊指令

pat还扩展了一些指令，用于特殊的需求。

### model双向绑定

现如今，双向绑定已经是很烂大街的功能了，有人推崇有人吐槽。pat使用`t-model`让使用者可以选择性的使用双向绑定。

例子：

```js

html:
<div id="test">{{text}}</div>
<input type="text" value="" t-model="text">

js:
var p = new Pat({
  el:'test',
  data:{
    text:'hello world'
  }
})

```

除了input外，checkbox，radio，textarea，select也都是支持的。具体可以查看[例子]()



### class指令

pat同时提供了`t-class`指令，用于给一个元素增加修改class。

语法为：

```js
<xxx t-class:classname="expression"></xxx>
```
在expression表达式为true时，会给当前dom节点增加名为classname的class。否则会去掉这个class。

例子

```js

html:
<div id="test">
    <div class="test1" t-class:test2="number > 10"  t-class:test3="number == 12">{{text}}</div>
</div>

js:
var p = new Pat({
  el:'test',
  data:{
    number:12
  }
})

//此时会同时具有test2 和 test3两个class

```


## filter

可以使用vue和angular里面的filter功能来对模板数据做出处理。

例子如下：

```js

html:
<div id="test">{{text|testFilter}}</div>

js:
var p = new Pat({
  el:'test',
  data:{
    text:'hello'
  },
  filters:{
    testFilter:function(value,scope){
        return "我是前缀-" + value
    }
  }
})

//渲染出来的是 我是前缀-hello

```

只要实例化时传入了filters的定义，就可以在模板里使用`|`加filter名称来对数据做出特殊处理。filter作为函数，第一个参数是`|`管道符前面表达式的执行结果。第二个参数是当前的scope。this指向当前实例对象。


## watcher


pat也支持angular以及vue里面的watcher监听，用户可以自己监听一个表达式的变化，增加回调处理。


例子如下：

```js

html:
<div id="test">{{text}}</div>

js:
var p = new Pat({
  el:'test',
  data:{
    text:'hello'
  },
  watchers:{
    'text':function(old,new){
        console.log('old:'+old+'-new:'+new)
    }
  }
})

p.$data.text = 'hi'
//这个时候控制台会打出： old:hello-new:hi

```
watcher的回调函数，第一个参数是老的值，第二个参数是新的值。

## 配置

可以通过Pat.config(options),来设定一些全局的默认配置

包括下面这些：


| 参数 | 类型 | 含义 |
| -------- | -------- | -------- |
|options.prefix|string|指令的前缀，默认是t|
|options.tagId|string|pat在dom上的标识，默认是p-id|
|options.delimiters|array|普通插值的分割符，默认是['{{','}}'] |
|options.unsafeDelimiters|array|html类型的插值分隔符，默认是['{{{','}}}'] |
|options.defaultIterator|String|for指令的默认key的名称,默认是`__INDEX__`|
|options.debug|Boolean|是否开启debug模式，如果开启，在非压缩版本下会打出很多信息。默认为false。|
|options.dataCheckType|String|数据检测方式 支持两种数据变化检测方式 defineProperties dirtyCheck,默认是defineProperties|




## 服务端渲染

由于pat使用了virtual dom中间层，对原生dom没有强依赖，因此服务端的渲染会比较容易实现。目前还在开发中，敬请期待。
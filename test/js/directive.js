//验证各种指令
describe("[pat:directive.js]", function() {


  var data,el,pat

  var setValue = function(key,value){
    pat.$data[key] = value
    pat.$apply()
  }


  describe("(test bind)", function() {
    beforeEach(function(){
      el = document.createElement('div')
      data = {
        name:'pat',
        text:'hello world',
        sp:'<span>11</span>'
      }
    })

    it("use t-bind render attribute",function(){
      el.innerHTML = '<span id="test" t-bind:class="name"><span id="test2" t-bind:t="sp" t-bind:class="name|test">{{text}}</span></span>'
      pat = new Pat({
        el:el,
        data:data,
        filters:{
          test:function(value){
            return value + '-test'
          }
        }
      })

      expect($(el).find('#test').attr('class')).toEqual('pat')
      expect($(el).find('#test2').attr('class')).toEqual('pat-test')
      expect($(el).find('#test2').attr('t')).toBe('<span>11</span>')
      pat.$data.sp = '<span>22</span>'
      pat.$apply()
      expect($(el).find('#test2').attr('t')).toBe('<span>22</span>')

    })

  })

  describe("(test class)", function() {
    beforeEach(function(){
      el = document.createElement('div')
      data = {
        name:'pat',
        key:10,
        test:2
      }
    })

    it("use t-bind render attribute",function(){
      pat = new Pat({
        el:el,
        data:data,
        template:'<span id="test" class="a b" t-class:haha="key == 10" t-class:hello="test == 2">1111</span>'
      })


      expect($(el).find('#test').attr('class')).toEqual('a b haha hello')
      setValue('key',1)
      expect($(el).find('#test').attr('class')).toEqual('a b hello')
      setValue('test',1)
      expect($(el).find('#test').attr('class')).toEqual('a b')
      setValue('key',10)
      expect($(el).find('#test').attr('class')).toEqual('a b haha')


    })

  })

  describe("(test if and unless)", function() {

    beforeEach(function(){
      el = document.createElement('div')
      data = {
        status:1,
        text:'hello world',
        sp:'<span class="span">11</span>'
      }
    })


    it("use t-if and unless to make html show or destroy",function(){

      pat = new Pat({
        el:el,
        data:data,
        template:'<span t-if="status == 1">111</span><span t-unless="status == 1">222</span>'
      })

      expect($(el)[0].childNodes.length).toBe(2)
      expect($(el)[0].childNodes[0].innerHTML).toBe('111')


      setValue('status',2)
      expect($(el)[0].childNodes[1].innerHTML).toBe('222')

    })

    it("use t-if and unless with < >",function(){
      //el.innerHTML = '<span t-if="key > 10" >111</span>'

      pat = new Pat({
        el:el,
        data:{
          key:11
        },
        template:'<span t-if="key > 10" >111</span><span t-if="key < 10" >222</span>'
      })

      expect($(el)[0].childNodes.length).toBe(2)
      expect($(el)[0].childNodes[0].innerHTML).toBe('111')
      expect($(el)[0].childNodes[1].nodeType).toBe(8)

      setValue('key',2)
      expect($(el)[0].childNodes[0].nodeType).toBe(8)
      expect($(el)[0].childNodes[1].innerHTML).toBe('222')

    })

    it("use t-if and unless with complex expression",function(){

      pat = new Pat({
        el:el,
        template:'<span t-if="status == 1 && test !== 2">111</span>',
        data:{
          status:1,
          test:2
        }
      })
      expect($(el)[0].childNodes.length).toBe(1)
      expect($(el)[0].childNodes[0].nodeType).toBe(8)

      setValue('test',1)
      expect($(el)[0].childNodes[0].innerHTML).toBe('111')

    })

    it("use t-if and unless with template",function(){

      pat = new Pat({
        el:el,
        data:data,
        template:'<template t-if="status < 1">{{*text}}--{{{sp}}}</template><template t-unless="status < 1">{{*text}}</template>'
      })

      expect($.trim($(el).html())).toMatch('hello world')
      setValue('status',0)
      expect($(el).find('.span').html()).toBe('11')

    })


  })


  describe("(test for directive)", function() {
    beforeEach(function(){
      el = document.createElement('div')
      data = {
        status:1,
        text:'text',
        lists:[{
          name:'hello',
          text:'<span class="t1">world</span>'
        },{
          name:'hi',
          text:'<span class="t2">earth</span>'
        }]
      }

    })



    it("use t-for to render list",function(){
      el.innerHTML = '<div t-for="item in lists" id="{{item.name}}">{{text}}--{{{item.text}}}</div>'

      pat = new Pat({
        el:el,
        data:data
      })


      expect($($(el).children()[0]).attr('id')).toBe('hello')
      expect($($(el).children()[1]).find('.t2').html()).toBe('earth')
      expect($($(el).children()[1]).find('.t2').html().toLowerCase()).toEqual('earth')

      setValue('text','hahaha')
      expect($($(el).children()[1]).html().toLowerCase()).toMatch('hahaha')


      pat.$data.lists[0].name = 'hahaha'
      pat.$apply()

      expect($($(el).children()[0]).attr('id')).toBe('hahaha')

      pat.$data.lists[0].text = 'tesadasdt111'
      pat.$apply()

      expect($($(el).children()[0]).html()).toMatch('tesadasdt111')

    })




    it("use t-for with template",function(){

      pat = new Pat({
        el:el,
        data:data,
        template:'<template t-for="item in lists" id="{{item.name}}">{{text}}--{{{*item.text}}}</template>'
      })
      expect($(el).find('.t1').html()).toBe('world')
      expect($(el).find('.t2').html()).toBe('earth')
      //测试一次性是否有效
      pat.$data.lists[0].text = 'hahaha'
      pat.$apply()
      //setValue('lists[0].text','hahaha')
      expect($(el).find('.t1').html()).toBe('world')

    })

    it("test t-for with change item",function(){

      pat = new Pat({
        el:el,
        data:{
          lists:[{
            name:'1',
            text:'11111'
          },{
            name:'2',
            text:'22222'
          },{
            name:'3',
            text:'333'
          },{
            name:'4',
            text:'444444444'
          }]
        },
        template:'<template class="container4" t-for="(key,item) in lists"><div id="{{key}}">{{*item.name}}|{{*item.text}}</div></template>'
      })

      expect($(el).children().length).toBe(4)

      pat.$data.lists.push({
        name:'5',
        text:'5555555'
      })
      pat.$apply()

      expect($(el).children().length).toBe(5)

      expect($($(el).children()[4]).attr('id')).toBe('4')

      expect($($(el).children()[4]).html()).toEqual('5|5555555')

      pat.$data.lists.splice(1,1,{
        name:'hahaha'
      })
      pat.$apply()
      expect($(el).children().length).toBe(5)
      expect($($(el).children()[1]).attr('id')).toBe('1')
      expect($($(el).children()[1]).html()).toEqual('hahaha|')
      expect($($(el).children()[0]).html()).toEqual('1|11111')
      expect($($(el).children()[2]).html()).toEqual('3|333')

    })

    it("use t-for with lazy model",function(){
      el.innerHTML = '<div t-for:lazy="item in lists" id="{{item.name}}">{{text}}--{{{item.text}}}</div>'

      pat = new Pat({
        el:el,
        data:data
      })

      expect($($(el).children()[1]).html().toLowerCase()).toMatch('text')

      //setValue('text','hahaha')
      pat.$data.lists.$set(1,{
        name:'hello111',
        text:'<span class="t2">test</span>'
      })
      pat.$apply()
      //不会变化
      expect($($(el).children()[1]).html().toLowerCase()).toMatch('earth')

      setValue('lists',[{
          name:'hello',
          text:'<span class="t1">world</span>'
        },{
          name:'hello111',
          text:'<span class="t2">test</span>'
        }])
      //全部改变数组，才会变化
      expect($($(el).children()[1]).html().toLowerCase()).toMatch('test')

    })
  })


  describe("(test v-model directive)", function() {
    beforeEach(function(){
      el = document.createElement('div')
      data = {
        status:1,
        text:'text',
        lists:[{
          name:'hello',
          text:'<span class="1">world</span>'
        },{
          name:'hi',
          text:'<span class="2">earth</span>'
        }]
      }
    })

    it("use t-model trigger update",function(){

      pat = new Pat({
        el:el,
        data:data,
        template:'<div t-for="item in lists" id="{{item.name}}">{{text}}--{{{item.text}}}</div><input type="text" t-model="lists[0].text">'
      })

      expect($(el).find('.1').html()).toBe('world')
      expect($(el).find('input').val()).toBe('<span class="1">world</span>')


      $(el).find('input').val('replace')
      //怎么触发blur事件呢，这边不好弄
      $(el).find('input').blur()
    })

    //t-modle的测试用例还不完善，还要进步弄。本身t-model还没完全开发完成
    //other todo

  })

})


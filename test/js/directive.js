//验证各种指令
describe("[pat:directive.js]", function() {


  var data,el,pat

  var setValue = function(key,value){
    pat.$data[key] = value
    pat.$apply()
  }


  describe("test bind", function() {
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
      expect($(el).find('#test')).toHaveClass('pat')
      expect($(el).find('#test2')).toHaveClass('pat-test')
      expect($(el).find('#test2').attr('t')).toBe('&lt;span&gt;11&lt;/span&gt;')

    })

  })

  describe("test if and unless", function() {

    beforeEach(function(){
      el = document.createElement('div')
      data = {
        status:1,
        text:'hello world',
        sp:'<span>11</span>'
      }
    })


    it("use t-if and unless to make html show or destroy",function(){
      el.innerHTML = '<span t-if="status == 1">111</span><span t-unless="status == 1">222</span>'

      pat = new Pat({
        el:el,
        data:data
      })

      expect($(el).children().length).toBe(1)
      expect($(el).children()[0].innerHTML).toBe('111')


      setValue('status',2)
      expect($(el).children()[0].innerHTML).toBe('222')

    })

    it("use t-if and unless with template",function(){
      el.innerHTML = '<template t-if="status < 1">{{text}}--{{{sp}}}</template><template t-unless="status < 1">{{text}}</template>'

      pat = new Pat({
        el:el,
        data:data
      })
      expect($(el).html()).toBe('hello world')
      setValue('status',0)
      expect($(el).find('span').html()).toBe('11')

    })


  })


  describe("test for directive", function() {
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



    it("use t-for to render list",function(){
      el.innerHTML = '<div t-for="item in lists" id="{{item.name}}">{{text}}--{{{item.text}}}</div>'

      pat = new Pat({
        el:el,
        data:data
      })


      expect($($(el).children()[0]).attr('id')).toBe('hello')
      expect($($(el).children()[1]).find('span').html()).toBe('earth')
      expect($($(el).children()[1]).html()).toEqual('text--<span class="2">earth</span>')

      setValue('text','hahaha')
      expect($($(el).children()[1]).html()).toEqual('hahaha--<span class="2">earth</span>')


      pat.$data.lists[0].name = 'hahaha'
      pat.$apply()

      expect($($(el).children()[0]).attr('id')).toBe('hahaha')

      pat.$data.lists[0].text = 'tesadasdt111'
      pat.$apply()

      expect($($(el).children()[0]).html()).toMatch('tesadasdt111')

    })

    it("use t-for with template",function(){
      el.innerHTML = '<template t-for="item in lists" id="{{item.name}}">{{text}}--{{{*item.text}}}</template>'

      pat = new Pat({
        el:el,
        data:data
      })

      expect($(el).find('.1').html()).toBe('world')
      expect($(el).find('.2').html()).toBe('earth')
      //测试一次性是否有效
      setValue('lists[0].text','hahaha')
      expect($(el).find('.1').html()).toBe('world')

    })

    it("use t-for with lazy model",function(){
      el.innerHTML = '<div t-for:lazy="item in lists" id="{{item.name}}">{{text}}--{{{item.text}}}</div>'

      pat = new Pat({
        el:el,
        data:data
      })

      expect($($(el).children()[1]).html()).toEqual('text--<span class="2">earth</span>')

      setValue('text','hahaha')
      //不会变化
      expect($($(el).children()[1]).html()).toEqual('text--<span class="2">earth</span>')

      setValue('lists',[{name:'new',text:'item'}])
      //全部改变数组，才会变化
      expect($(el).html()).toEqual('<div id="new">hahaha--item</div>')

    })
  })


  describe("test v-model directive", function() {
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
      el.innerHTML = '<div t-for="item in lists" id="{{item.name}}">{{text}}--{{{item.text}}}</div><input type="text" t-model="lists[0].text">'

      pat = new Pat({
        el:el,
        data:data
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


//测试插值{{}}
describe("[pat:interpolation.js]", function() {

  var data,el,pat

  var setValue = function(key,value){
    pat.$data[key] = value
    pat.$apply()
  }

  beforeEach(function(){
    el = document.createElement('div')
    data = {
      name:'pat',
      status:1,
      text:'hello world'
    }
  })

  it("use {{}} render text",function(){
    el.innerHTML = '<span id="test">{{text}}</span>'
    pat = new Pat({
      el:el,
      data:data
    })

    expect($(el).find('#test').html()).toMatch("hello world")

    setValue('text',"hello text")
    expect($(el).find('#test').html()).toMatch("hello text")

    setValue('text',"hello <span>world</span>")
    expect($(el).find('#test').html()).toMatch('hello &lt;span&gt;world&lt;/span&gt;')
  })

  it("use {{{}}} render html",function(){
    el.innerHTML = '<span id="test">{{{text}}}</span>'
    pat = new Pat({
      el:el,
      data:data
    })
    expect($(el).find('#test').html()).toMatch("hello world")

    setValue('text',"hello <span>world</span>")

    expect($(el).find('#test').html().toLowerCase()).toMatch('hello')
    expect($(el).find('#test').children(1)[0].tagName).toEqual('SPAN')
  })

  it("use {{*}} render only once",function(){
    el.innerHTML = '<span id="test">{{*text}}</span>'
    pat = new Pat({
      el:el,
      data:data
    })
    expect($(el).find('#test').html()).toEqual("hello world")
    setValue('text',"hello <span>world</span>")

    expect($(el).find('#test').html()).toEqual('hello world')

  })


  it("{{}} can also use in attributes",function(){
    el.innerHTML = '<span id="test" class="{{name}}">{{*text}}</span>'
    pat = new Pat({
      el:el,
      data:data
    })

    expect($(el).find('#test').attr('class')).toEqual("pat")

    setValue('name',"hello")
    expect($(el).find('#test').attr('class')).toEqual('hello')

  })


  it("{{}} render radio",function(){

    pat = new Pat({
      el:el,
      data:data,
      template:'<input class="t-m" type="radio" value="1" checked="{{status}}">'
    })

    expect($(el).find('.t-m')[0].checked).toBe(true)
    setValue('status',0)
    expect($(el).find('.t-m')[0].checked).toBe(false)
  })


  it("{{}} render checkbox",function(){

    pat = new Pat({
      el:el,
      data:data,
      template:'<input class="t-m" type="checkbox" value="1" checked="{{status}}">'
    })

    expect($(el).find('.t-m')[0].checked).toBe(true)
    setValue('status',0)
    expect($(el).find('.t-m')[0].checked).toBe(false)
  })

  it("{{}} render select",function(){

    pat = new Pat({
      el:el,
      data:data,
      template:'<select><option value="1" selected="{{status == 1}}">111</option><option value="2" selected="{{status == 2}}">222</option></select>'
    })

    expect($(el).find('option')[0].selected).toBe(true)
    setValue('status',2)
    expect($(el).find('option')[0].selected).toBe(false)
    expect($(el).find('option')[1].selected).toBe(true)
  })


  it("{{}} use with textarea",function(){
    pat = new Pat({
      el:el,
      data:data,
      template:'<textarea id="te">{{text}}22222</textarea>'
    })
    expect($(el).find('#te').attr('value')).toEqual("hello world22222")
    expect($(el).find('#te').html()).toEqual("hello world22222")
    setValue('text',"haha")
    expect($(el).find('#te')[0].value).toEqual("haha22222")
    //expect($(el).find('#te').html()).toEqual("hello world22222")
  })

})
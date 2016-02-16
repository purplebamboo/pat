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

})
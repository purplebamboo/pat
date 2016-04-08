//验证虚拟dom的解析是否有问题

describe("[pat:dom.js]",function(){

  var transfer = Pat.Dom.transfer
  //var transfer =

  it("normal dom transfer",function(){

    var html = '<span id="test" >22222</span>'

    var dom = transfer(html)

    expect(dom.__ROOT__).toEqual(true)
    expect(dom.tagName).toEqual("template")
    expect(dom.childNodes.length).toEqual(1)
    expect(dom.childNodes[0].nodeType).toEqual(1)
    expect(dom.childNodes[0].attributes[0]).toEqual({
      name:'id',
      value:'test'
    })
    expect(dom.childNodes[0].hasBlock).toEqual(false)
    expect(dom.childNodes[0].childNodes[0].data).toEqual('22222')

  })

  it("transfer with directive filter",function(){
    var html = '<span id="test" t-if:selected="a == b">{{test|aa}}2222</span>'
    var dom = transfer(html)

    expect(dom.childNodes[0].attributes[0]).toEqual({
      name:'id',
      value:'test'
    })
    expect(dom.childNodes[0].attributes[1]).toEqual({
      name: "t-if:selected",
      value: "a == b"
    })

    expect(dom.childNodes[0].childNodes[0].data).toEqual('{{test|aa}}')
    expect(dom.childNodes[0].childNodes[1].data).toEqual('2222')


  })

  it("transfer with special charset",function(){

    var sptext = '<i class="color-c advfont icon-info" bx-name="app/exts/popover/popover" bx-options="{\n'+
          'placement: \'bottom\','+
          'align: \'right\','+
          'offset: {'+
            'left:8,'+
            'top:8'+
          '},'+
          'elClass: \'msg msg-alert\','+
          'content: \'图片美观且被选择较多的商品\''+
        '}" >&#xe600;</i>'

    var html = sptext + '<span __iefix-_  t-if:selected-2-tt="a >=||&&< b">{{a_1*%=A!||}}{{tt}}</span>'

    var dom = transfer(html)

    expect(dom.childNodes[0].attributes.length).toEqual(3)
    expect(dom.childNodes[0].attributes[2].name).toEqual('bx-options')
    expect(dom.childNodes[0].attributes[2].value).toEqual("{\nplacement: 'bottom',align: 'right',offset: {left:8,top:8},elClass: 'msg msg-alert',content: '图片美观且被选择较多的商品'}")
    expect(dom.childNodes[0].childNodes[0].data).toEqual("&#xe600;")
    expect(dom.childNodes[0].childNodes[0].oneTime).toEqual(true)
    expect(dom.childNodes[1].tagName).toEqual('span')
    expect(dom.childNodes[1].attributes[0].name).toEqual("__iefix-_")
    expect(dom.childNodes[1].attributes[0].value).toEqual(undefined)
    expect(dom.childNodes[1].attributes[1].name).toEqual('t-if:selected-2-tt')
    expect(dom.childNodes[1].attributes[1].value).toEqual('a >=||&&< b')
    expect(dom.childNodes[1].childNodes[0].data).toEqual('{{a_1*%=A!||}}')
    expect(dom.childNodes[1].childNodes[1].data).toEqual('{{tt}}')


  })

  it("transfer complex html",function(){
    var html = '{{#for(a in b)}}'+
    '<span id="test"><!--asdasdasdasd<asdasd<&vghj\n\tc><-->'+
      '{{#if(a)}}'+
      '<div id=11>{{ccc}}</div>'+
      '{{/if}}'+
      '{{^if(a=>11)}}'+
      '<div id="222">{{{ddd}}}</div>2222'+
      '{{/if}}'+
    '</span>'+
    '<input type="text" value="" />'+
    '{{/for}}'
    var dom = transfer(html)

    expect(dom.childNodes[0].tagName).toEqual("template")
    expect(dom.childNodes[0].hasBlock).toEqual(true)
    expect(dom.childNodes[0].attributes[0]).toEqual({name: "t-for", value: "a in b"})
    expect(dom.childNodes[0].attributes[0]).toEqual({name: "t-for", value: "a in b"})
    expect(dom.childNodes[0].nodeType).toEqual(-1)
    expect(dom.childNodes[0].childNodes[0].childNodes.length).toEqual(2)
    expect(dom.childNodes[0].childNodes[0].childNodes[0].tagName).toEqual("div")
    expect(dom.childNodes[0].childNodes[0].childNodes[0].hasBlock).toEqual(true)
    expect(dom.childNodes[0].childNodes[0].childNodes[0].childNodes[0].data).toEqual('{{ccc}}')
    expect(dom.childNodes[0].childNodes[0].childNodes[1].tagName).toEqual('template')
    expect(dom.childNodes[0].childNodes[0].childNodes[1].attributes[0]).toEqual({name: "t-if", value: "!(a=>11)"})
    expect(dom.childNodes[0].childNodes[1].tagName).toEqual("input")

  })

})
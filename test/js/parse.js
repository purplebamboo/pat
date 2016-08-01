//验证指令，插值等属性的解析是否出错
//包括三个部分：
//1. parseExpression
//2. parseText
//3. parseDirective

describe("[pat:parse.js]", function() {

  var data,el,pat
  var Parser = Pat.Parser


  describe("(parseExpression)",function(){
    it("normal parse expression",function(){

      expect(Parser.parseExpression('hello + 1 + "hello"').exp).toEqual('_scope.hello+1+"hello"')

      expect(Parser.parseExpression('hello.a + {{tt}} + "hello{{}}"').exp).toEqual('_scope.hello.a+{{_scope.tt}}+"hello{{}}"')
      expect(Parser.parseExpression('hello.a.slice(test.m) + "hello{{}}" ').exp).toEqual('_scope.hello.a.slice(_scope.test.m)+"hello{{}}"')


    })
    it("parse with filter",function(){
      expect(Parser.parseExpression('hello | test').exp).toEqual('_that.applyFilter(_scope.hello,"test")')

      //不规范的filter
      expect(Parser.parseExpression('hello | {{ttt').exp).toEqual('_that.applyFilter(_scope.hello,"{{ttt")')

      //多个filter
      expect(Parser.parseExpression('hello | {{ttt | ddd').exp).toEqual('_that.applyFilter(_scope.hello,"{{ttt,ddd")')

    })

  })


  describe("(parseText)",function(){


    it("test parse text",function(){
      expect(Parser.parseText('hello {{world}}')[1].value).toEqual('world')
      //测试解析text
      var t = Parser.parseText('aaa {{{haha|test}}} wo {{22}}')

      expect(t[0]).toEqual({
        type:0,
        value:"aaa "
      })
      expect(t[1].value).toEqual("haha|test")
      expect(t[2]).toEqual({
        type:0,
        value:" wo "
      })
      expect(t[3]).toEqual({type: 1, value: "22", html: false, oneTime: false})

    })
    it("test token to expression",function(){
      var t = Parser.parseText('aaa {{{haha|test}}} wo {{22}}')
      expect(Parser.token2expression(t).exp).toEqual('"aaa "+(_that.applyFilter(_scope.haha,"test"))+" wo "+(22)')
    })
  })

  describe("(parseDirective)",function(){
    var testDiv = document.createElement('div')
    testDiv.setAttribute('id','{{test}}')
    testDiv.setAttribute('t-if','{{haha|test}}')
    testDiv.setAttribute('t-if:a','a < b')

    var attr = testDiv.attributes[0]
    var attr2 = testDiv.attributes[1]
    var attr3 = testDiv.attributes[2]
    it("test normal parse directive",function(){
      var parsedt = Parser.parseDirective(attr)
      parsedt.expObj = null

      expect(parsedt).toEqual({
        name: 'id',
        value: '{{test}}',
        directive: 'bind',
        args: ['id'],
        oneTime: false,
        block: false,
        expObj: null,
        isInterpolationRegx: true
      })

      var parsed = Parser.parseDirective(attr3)
      expect(parsed.directive).toBe('if')
      expect(parsed.block).toBe(true)
      expect(parsed.args).toEqual(["a"])
      expect(parsed.expObj.exp).toEqual('_scope.a<_scope.b')

    })

    it("test when a {{}} in a directive expression",function(){

      var parsed2 = Parser.parseDirective(attr2)

      expect(parsed2.directive).toBe('bind')
      expect(parsed2.block).toBe(false)
      expect(parsed2.args).toEqual(["t-if"])
      expect(parsed2.expObj.exp).toEqual('(_that.applyFilter(_scope.haha,"test"))')

    })
  })

})

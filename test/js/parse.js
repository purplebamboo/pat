//验证各种属性的解析是否正确



describe("[pat:parse.js]", function() {

  var data,el,pat
  var Parser = Pat.Parser


  describe("parseExpression",function(){
    it("normal parse expression",function(){

      expect(Parser.parseExpression('hello + 1 + "hello"')).toEqual('_scope.hello+1+"hello"')

      //special {{}}
      expect(Parser.parseExpression('hello.a + {{tt}} + "hello{{}}"')).toEqual('_scope.hello.a+{{_scope.tt}}+"hello{{}}"')
      //complex expression
      expect(Parser.parseExpression('hello.a.slice(test.m) + "hello{{}}" ')).toEqual('_scope.hello.a.slice(_scope.test.m)+"hello{{}}"')


    })
    it("parse with filter",function(){
      expect(Parser.parseExpression('hello | test')).toEqual('_that.applyFilter(_scope.hello,"test")')

      //不规范的filter
      expect(Parser.parseExpression('hello | {{ttt')).toEqual('_scope.hello')

    })

  })


  describe("parseText",function(){


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
      expect(Parser.token2expression(t)).toEqual('"aaa "+(_that.applyFilter(_scope.haha,"test"))+" wo "+(22)')
    })
  })

  describe("parseDirective",function(){
    var testDiv = document.createElement('div')
    testDiv.setAttribute('id','{{test}}')
    testDiv.setAttribute('t-if','{{haha|test}}')
    testDiv.setAttribute('t-if:a','a < b')

    var attr = testDiv.attributes[0]
    var attr2 = testDiv.attributes[1]
    var attr3 = testDiv.attributes[2]
    it("test normal parse directive",function(){

      expect(Parser.parseDirective(attr)).toEqual({
        name: 'id',
        value: '{{test}}',
        directive: 'bind',
        args: ['id'],
        oneTime: false,
        html: false,
        block: false,
        expression: '(_scope.test)',
        isInterpolationRegx: true
      })

      var parsed = Parser.parseDirective(attr3)
      expect(parsed.directive).toBe('if')
      expect(parsed.block).toBe(true)
      expect(parsed.args).toEqual(["a"])
      expect(parsed.expression).toEqual('_scope.a<_scope.b')

    })

    it("test when a {{}} in a directive expression",function(){

      var parsed2 = Parser.parseDirective(attr2)

      expect(parsed2.directive).toBe('bind')
      expect(parsed2.block).toBe(false)
      expect(parsed2.html).toBe(false)
      expect(parsed2.args).toEqual(["t-if"])
      expect(parsed2.expression).toEqual('(_that.applyFilter(_scope.haha,"test"))')

    })
  })

})
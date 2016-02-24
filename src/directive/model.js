var _ = require('../util/index.js')



Util = {
  bindEvent: (function() {
    if ('addEventListener' in window) {
      return function(el, event, handler) {
        return el.addEventListener(event, handler, false)
      }
    }
    return function(el, event, handler) {
      return el.attachEvent('on' + event, handler)
    };
  })(),
  unbindEvent: (function() {
    if ('removeEventListener' in window) {
      return function(el, event, handler) {
        return el.removeEventListener(event, handler, false)
      };
    }
    return function(el, event, handler) {
      if (handler) {
        return el.detachEvent('on' + event, handler)
      }else{
        return el.detachEvent('on' + event)
      }
    };
  })(),
  getValue: function(el) {
    var o, _i, _len, _results;
    if (el.type === 'checkbox') {
      return el.checked;
    } else if (el.type === 'select-multiple') {
      _results = [];
      for (_i = 0, _len = el.length; _i < _len; _i++) {
        o = el[_i];
        if (o.selected) {
          _results.push(o.value)
        }
      }
      return _results
    } else {
      return el.value
    }
  }
}


var tagTypes = {
  'text':{
    //callback:'',
    update:function(value){
      this.el.setAttribute('value',value)
    }
  },
  'checkbox':{
    //callback:'',
    update:function(value){
      this.el.setAttribute('checked',value)
    }
  },
  'radio':{
    //callback:'',
    update:function(value){
      var self = this
      var domValue = self.el.getAttribute('value')
      if (value == domValue) {
        self.el.setAttribute('checked',true)
      }else{
        self.el.setAttribute('checked',false)
      }
    }
  },
  'select':{
    //callback:'',
    update:function(value){
      this.el.setAttribute('checked',value)
    }
  }
}


module.exports = {
  priority: 3000,
  bind:function(value) {
    //添加事件监听
    var self = this

    var tagName = self.el.tagName.toUpperCase()
    var handler,element

    if (tagName === 'INPUT') {
      handler = tagTypes[self.el.getAttribute('type')] || tagTypes.text
    } else if (tagName === 'SELECT') {
      handler = tagTypes.select
    } else if (tagName === 'TEXTAREA') {
      handler = tagTypes.text
    } else {
      process.env.NODE_ENV !== 'production' && _.error(
        't-model does not support element type: ' + tagName
      )
      return
    }

    self.handler = handler

    self.callback = function(){
      //var self = this
      var val = Util.getValue(self.el.getElement())
      var key = self.describe.value

      if (val == self.curValue) return

      //看下是不是改的一级key,是的话就需要从rootView开始改
      if (self.view.orikeys && _.inArray(self.view.orikeys,key)) {
        self.setValue(key, val,self.view.$rootView.$data)
      }else{
        self.setValue(key, val,self.view.$data)
      }
    }

    self.view.on('afterMount',function(){
      element = self.el.getElement()
      Util.bindEvent(element, 'change', self.callback)
    })

    this.update(value)

  },
  setValue: function(key, val,scope) {
    if (_.isString(val)) {
      val = '"'+val+'"'
    }
    return new Function('$scope', 'return $scope.' + key + '=' + val)(scope)
  },
  update: function(value) {

    //不允许存在破坏节点的特殊字符
    if (_.isString(value)) {
      value = _.htmlspecialchars(value)
    }

    if (value === undefined || value === null) {
      value = ''
    }

    this.curValue = value
    this.handler.update.call(this,value)

  },
  unbind: function() {
    Util.unbindEvent(this.el.getElement(), 'change',this.callback)
  }
}
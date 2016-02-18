var _ = require('../util')


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
  getInputValue: function(el) {
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


module.exports = {
  priority: 3000,
  bind:function(value) {
    //添加事件监听
    var self = this

    self.blurFn = function() {
      var val = Util.getInputValue(self.el.getElement())
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
      Util.bindEvent(self.el.getElement(), 'blur', self.blurFn)
    })

    this.update(value)

  },
  setValue: function(key, val,scope) {
    return new Function('$scope', 'return $scope.' + key + '="' + val + '"')(scope)
  },
  update: function(value) {
    if (value === undefined || value === null) {
      value = ''
    }

    //不允许存在破坏节点的特殊字符
    //todo 一些防止xss的处理
    //还有{{{}}}的特殊处理，具有回转的效果
    if (_.isString(value)) {
      value = _.htmlspecialchars(value)
      //value = value.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }

    this.curValue = value
    this.el.setAttribute('value',value)
  },
  unbind: function() {
    Util.unbindEvent(this.el.getElement(), 'blur',self.blurFn)
  }
}
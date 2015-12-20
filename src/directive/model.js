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
      return el.detachEvent('on' + event, handler)
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
  bind:function(args) {
    //添加事件监听
    var self = this
    Util.bindEvent(self.el, 'blur', function() {
      var val = Util.getInputValue(self.el)
      var key = self.describe.value

      if (val != self.curValue) {
        //这边其实有个坑，如果这个t-modle是在一个for循环语句里，这里修改的只会是当前的scope里面的属性值
        //这样从父级脏检测的话，父级老的值会把当前的值冲掉。就会是没有改变。这个还没想好怎么做
        self.setValue(key, val)
        //需要整个rootview脏检测,使用$apply防止脏检测冲突
        self.view.$rootView.$apply()
      }
    })
  },
  setValue: function(key, val) {
    return new Function('$scope', 'return $scope.' + key + '="' + val + '"')(this.view.$data)
  },
  update: function(value) {
    this.curValue = value
    this.el.value = value
  },
  unbind: function() {
    Util.unbindEvent(this.el, 'blur')
  }
}
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
    } else if (el.tagName.toUpperCase === 'SELECT') {
      return this._getSelectedValue(el)
    } else {
      return el.value
    }
  },
  _getSelectedValue:function(el){

    var multi = el.hasAttribute('multiple')
    var res = multi ? [] : null
    var op, val, selected
    for (var i = 0, l = el.options.length; i < l; i++) {
      op = el.options[i]
      selected = op.selected
      if (selected) {
        val = op.value
        if (multi) {
          res.push(val)
        } else {
          return val
        }
      }
    }
    return res
  }
}



var defaultCallback = function() {
  var self = this
  var val = Util.getValue(self.el.getElement())
  var key = self.describe.value

  if (val == self.curValue) return

  //看下是不是改的一级key,是的话就需要从rootView开始改
  if (self.view.orikeys && _.inArray(self.view.orikeys, key)) {
    self.setValue(key, val, self.view.$rootView.$data)
  } else {
    self.setValue(key, val, self.view.$data)
  }
}


var tagTypes = {
  'text':{
    eventType:'keydown',
    callback:defaultCallback,
    update:function(value){
      this.el.setAttribute('value',value)
    }
  },
  'checkbox':{
    eventType:'click',
    callback:function(){
      var self = this
      var el = self.el.getElement()
      var model = self.__watcher.last
      if (_.isArray(model)) {
        var val = el.value
        if (el.checked) {
          if (_.indexOf(model, val) < 0) {
            model.push(val)
          }
        } else {
          model.$remove(val)
        }
      } else {
        defaultCallback.call(this)
      }
    },
    update:function(value){
      var checked
      var self = this
      if (_.isArray(value)) {
        checked = _.indexOf(value, self.el.getAttribute('value')) > -1
        this.el.setAttribute('checked',checked)
      }else{
        this.el.setAttribute('checked',value)
      }
    }
  },
  'radio':{
    eventType:'click',
    callback:defaultCallback,
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
    eventType:'change',
    callback:defaultCallback,
    update:function(value){
      var self = this
      var el = self.el
      var multi = el.hasAttribute('multiple') && _.isArray(value)
      var options = el.childNodes

      var i = options.length
      var op, val,tmp
      while (i--) {
        op = options[i]
        val = op.getAttribute('value')
        tmp = multi
          ? indexOf(value, val) > -1
          : value == val
        op.setAttribute('selected',tmp)
      }
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

    self.callback = _.bind(self.handler.callback,self)
    self.eventType = self.handler.eventType


    self.view.on('afterMount',function(){
      element = self.el.getElement()
      Util.bindEvent(element, self.eventType, self.callback)
    })

    this.el.__pat_model = this

    this.update(value)

  },
  setValue: function(key, val,scope) {
    if (_.isString(val)) {
      val = '"'+val+'"'
    }
    return new Function('$scope', 'return $scope.' + key + '=' + val)(scope)
  },
  forceUpdate:function(){
    if (this.__watcher) {
      this.update(this.__watcher.getValue())
    }
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
    this.el.__pat_model = null
    Util.unbindEvent(this.el.getElement(), this.eventType,this.callback)
  }
}
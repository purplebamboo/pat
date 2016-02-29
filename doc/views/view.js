define(
  'views/view',
  [
    'jquery',
    'underscore',
    'magix',
    'pat'
  ],
  function($, _, Magix, Pat) {

    var Now = $.now();

    return Magix.View.mixin({

      /**
       * 加载进度动画效果
       */
      animateLoading: function () {
        var uxloading = $('.block-switch-loading')
        uxloading.css({
          opacity: 1,
          width: 0
        })
        uxloading.animate({
          width: '100%'
        }, 200, 'linear', function () {
          var _this = this
          setTimeout(function () {
            uxloading.animate({
              opacity: 0
            }, 250)
          }, 250)
        })
      },

      /**
       * 更新view
       */
      setView:function(){
        var me = this
        var sign = me.sign
        var wrapper = $('#' + me.id)
        var n = me.$(me.id)

        var options
        if (!me.rendered) {


          me.beginUpdate(me.id)
          if (sign > 0) {
            if (n) {
              me.undelegateEvents(n)

              //me._data = me.data
              options = {
                el:wrapper[0],
                data:me.data,
                template:me.tmpl,
                //dataCheckType:'dirtyCheck'
              }

              me.filters = me.filters || {}
              //全局filter
              options.filters = _.defaults(me.filters,Magix.local('filters'))
              //局部filter
              _.each(me.filters,function(filter,key){
                me.filters[key] = _.bind(filter,me)
              })

              me.__pat = new Pat(options)
              //重新赋值，因为被pat托管了、、脏检测模式下已经不需要了
              me.data = me.__pat.$data
              me.delegateEvents(n)
            }
          }
          me.endUpdate(me.id)

          me.on('destroy', function () {
            if (me.__pat) me.__pat.$destroy()
          })

        }else{
          if (!me.data.__inject__) {
            _.extend(me.__pat.$data,me.data)
            me.data = me.__pat.$data
          }
          me.__pat.$apply()
        }
      }
    })
  }
)
define(
  'views/guide/index',
  [
    'magix',
    'jquery'
  ],
  function (Magix,$) {
    return Magix.View.extend({
      init: function () {

      },
      render: function (e) {
        var me = this
        me.data = {
          text:'hello world'
        }

        me.setHTML(me.id,me.tmpl)
        //me.setView()
        debugger
        $('#'+me.id).find('pre code').each(function(i, block) {
          hljs.highlightBlock(block)
        })

      }
    })
  }
)
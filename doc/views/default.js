define(
  'views/default',
  [
    'magix',
  ],
  function (Magix) {
    return Magix.View.extend({
      init: function () {
        var me = this

        me.observeLocation({
          path: true
        })
      },
      render: function (e) {
        var me = this

        me.setView()
        me.animateLoading()
        me.mountVframes()
      },
      mountVframes: function () {
        window.scrollTo(0, 0)
        var me = this
        var vom = me.vom
        var loc = me.location
        var pathname = loc.path

        var mainVframe = vom.get('magix_vf_main')

        if (mainVframe) {
          mainVframe.mountView(pathname)
        }
      }
    })
  }
)
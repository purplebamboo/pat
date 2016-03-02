define(
  'views/example/index',
  [
    'magix',
  ],
  function (Magix) {
    return Magix.View.extend({
      init: function () {

      },
      render: function (e) {
        var me = this
        me.setView()
      }
    })
  }
)
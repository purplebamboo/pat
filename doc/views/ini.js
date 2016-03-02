define(
  'views/ini',
  [
    'magix'
  ],
  function(Magix) {
    var MainView = 'views/default'
    var T = {
      routes: {
        'views/default': [
          {path:'views/guide/index'},
          {path:'views/example/index'},
          {path:'views/doc/index'},
        ]
      }
    }

    return {
      defaultView: MainView,
      defaultPath: 'views/guide/index',
      //unfoundView: 'views/common/404',
      tagName: 'div',
      extensions: [
        'views/view'
      ],
      routes: function(pathname) {
        if (!$.isEmptyObject(T.routes)) {
          var s
          $.each(T.routes, function(k, item) {
            $.each(item, function(i, v) {
              if (v.path == pathname) {
                s = k
                return false
              }
            })
            if (s) return false
          })
          if (s) return s
          return this.unfoundView
        }
        return this.defaultView
      },
      error: function(e) {
        if (window.console) {
          window.console.error(e.stack)
        }
      }
    }
  }
)
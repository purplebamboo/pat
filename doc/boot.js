;(function() {
  // var script = function() {
  //   var scripts = document.getElementsByTagName('script')
  //   return scripts[scripts.length - 1]
  // }()

  // var base = function() {
  //   var src = script.getAttribute('src')
  //   var base = /(.*\/)(.+\/.+)/.exec(src)[1]
  //   return base
  // }()

  require.config({
    paths: {
      views:'./views/',
      magix: 'http://g.alicdn.com/thx/magix/2.0/requirejs-magix',
      pat: '//g.alicdn.com/mm/pat/1.0/pat'
    }
  })

  require(['magix','pat'], function (Magix,Pat) {

    Pat.config({
      debug:true
    })

    Magix.start({
      //edge: true,
      iniFile: 'views/ini'
    })
  })

})()
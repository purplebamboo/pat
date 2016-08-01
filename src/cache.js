// 从magix搬过来的cache模块

var _ = require('./util/index.js')

var hasOwnProperty = {}.hasOwnProperty

var G_SPLITER = '\u001f'
var G_COUNTER = 0

var G_Has = function(owner, prop) {
  return owner && hasOwnProperty.call(owner, prop) //false 0 G_NULL '' undefined
}
var _cacheSort = function(a, b) {
  return b.f - a.f || b.t - a.t
}
/**
 * Magix.Cache 类
 * @name Cache
 * @constructor
 * @param {Integer} max 最大值
 * @param {Integer} buffer 缓冲区大小
 * @param {Function} remove 当缓存的元素被删除时调用
 * @example
 * var c=Magix.cache(5,2)//创建一个可缓存5个，且缓存区为2个的缓存对象
 * c.set('key1',{})//缓存
 * c.get('key1')//获取
 * c.del('key1')//删除
 * c.has('key1')//判断
 * //注意：缓存通常配合其它方法使用，在Magix中，对路径的解析等使用了缓存。在使用缓存优化性能时，可以达到节省CPU和内存的双赢效果
 */
var G_Cache = function(max, buffer, me) {
  me = this
  me.c = []
  me.b = buffer | 0 || 5 //buffer先取整，如果为0则再默认5
  me.x = me.b + (max || 20)
}

_.assign(G_Cache.prototype, {
  /**
   * @lends Cache#
   */
  /**
   * 获取缓存的值
   * @param  {String} key
   * @return {Object} 初始设置的缓存对象
   */
  get: function(key) {
    var me = this
    var c = me.c
    var r = c[G_SPLITER + key]
    if (r) {
      r.f++
      r.t = G_COUNTER++
      //console.log(r.f)
      r = r.v
      //console.log('hit cache:'+key)
    }
    return r
  },

  /**
   * 设置缓存
   * @param {String} key 缓存的key
   * @param {Object} value 缓存的对象
   */
  set: function(okey, value) {
    var me = this
    var c = me.c

    var key = G_SPLITER + okey
    var r = c[key]
    var t = me.b,
      f
    if (!r) {
      if (c.length >= me.x) {
        c.sort(_cacheSort)
        while (t--) {

          r = c.pop()

          //为什么要判断r.f>0,考虑这样的情况：用户设置a,b，主动删除了a,重新设置a,数组中的a原来指向的对象残留在列表里，当排序删除时，如果不判断则会把新设置的删除，因为key都是a
          //
          if (r.f > 0) me.del(r.o) //如果没有引用，则删除

        }

      }
      r = {

        o: okey
      }
      c.push(r)
      c[key] = r
    }
    r.v = value
    r.f = 1
    r.t = G_COUNTER++
  },
  /**
   * 删除缓存
   * @param  {String} key 缓存key
   */
  del: function(k) {
    k = G_SPLITER + k
    var c = this.c
    var r = c[k]

    if (r) {
      r.f = -1
      r.v = ''
      delete c[k]
    }
  },
  /**
   * 检测缓存中是否有给定的key
   * @param  {String} key 缓存key
   * @return {Boolean}
   */
  has: function(k) {
    return G_Has(this.c, G_SPLITER + k)
  }
})

module.exports = G_Cache

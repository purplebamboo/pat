/**
 * 指令的前缀
 *
 * @type {String}
 */
exports.prefix = 't'


/**
 * 当前版本号
 * @type {String}
 */
exports.version = '1.0'


/**
 * 标识id
 * @type {String}
 */
exports.tagId = 'p-id'


/**
 * 普通插值的分割符
 * @type {Array}
 */
exports.delimiters = ['{{','}}']


/**
 * html类型的插值分隔符
 * @type {Array}
 */
exports.unsafeDelimiters = ['{{{','}}}']


/**
 * for指令的默认key的名称
 * @type {String}
 */
exports.defaultIterator = '__INDEX__'


/**
 * 是否开启debug模式，如果开启，在非压缩版本下会打出很多信息。
 * @type {Boolean}
 */
exports.debug = false


/**
 * 数据检测方式 支持两种数据变化检测方式 defineProperties dirtyCheck
 * @type {String}
 */
exports.dataCheckType = 'defineProperties'
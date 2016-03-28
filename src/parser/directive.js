var _ = require('../util')

/**
 * Parser state
 */

var str, dir
var c, i, l, lastFilterIndex
var inSingle, inDouble, curly, square, paren

/**
 * Push a filter to the current directive object
 */

function pushFilter () {
  var filter = _.trim(str.slice(lastFilterIndex, i))

  if (filter) {
    (dir.filters = dir.filters || []).push(filter)
  }
  lastFilterIndex = i + 1
}

/**
 * Parse a directive value and extract the expression
 * and its filters into a descriptor.
 *
 * Example:
 *
 * "a + 1 | uppercase | uppercase" will yield:
 * {
 *   expression: 'a + 1',
 *   filters: ['uppercase','uppercase']
 * }
 *
 * @param {String} str
 * @return {Object}
 */

exports.parse = function (s) {


  str = s
  inSingle = inDouble = false
  curly = square = paren = 0
  lastFilterIndex = 0
  dir = {}

  for (i = 0, l = str.length; i < l; i++) {
    c = str.charCodeAt(i)
    if (inSingle) {
      // check single quote
      if (c === 0x27) inSingle = !inSingle
    } else if (inDouble) {
      // check double quote
      if (c === 0x22) inDouble = !inDouble
    } else if (
      c === 0x7C && // pipe
      str.charCodeAt(i + 1) !== 0x7C &&
      str.charCodeAt(i - 1) !== 0x7C
    ) {
      if (dir.expression == null) {
        // first filter, end of expression
        lastFilterIndex = i + 1
        dir.expression = _.trim(str.slice(0, i))
      } else {
        // already has filter
        pushFilter()
      }
    } else {
      switch (c) {
        case 0x22: inDouble = true; break // "
        case 0x27: inSingle = true; break // '
        case 0x28: paren++; break         // (
        case 0x29: paren--; break         // )
        case 0x5B: square++; break        // [
        case 0x5D: square--; break        // ]
        case 0x7B: curly++; break         // {
        case 0x7D: curly--; break         // }
      }
    }
  }

  if (dir.expression == null) {
    dir.expression = _.trim(str.slice(0, i))
  } else if (lastFilterIndex !== 0) {
    pushFilter()
  }

  return dir
}

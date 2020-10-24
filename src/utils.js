export const isElement = data => /HTML/.test(Object.prototype.toString.call(data)) && data.nodeType === 1
export const isNumber = data => /Number/.test(Object.prototype.toString.call(data))
// 求数组的交集
export const getArrayIntersection = (...arrays) => {
  const arrayCount = arrays.length
  if (arrayCount < 2) return []
  const result = []
  const countMap = {}
  arrays.reduce((a, b) => a.concat(b), []).forEach(item => {
    if (countMap[item]) {
      countMap[item]++
      countMap[item] === arrayCount && result.push(item)
    } else {
      countMap[item] = 1
    }
  })
  return result
}
export const applyStyle = (targetElement, styleData) => {
  const { style } = targetElement
  for (const key in styleData) {
    style[key] = styleData[key]
  }
}

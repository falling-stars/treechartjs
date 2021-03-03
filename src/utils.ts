export const isElement = (value: any) => /HTML/.test(Object.prototype.toString.call(value)) && value.nodeType === 1
export const isNumber = (value: any) => typeof value === 'number' && !isNaN(value)
// 求数组的交集
export const getArrayIntersection = (...groups: number[][]) => {
  const groupsCount = groups.length
  if (groupsCount < 2) return []
  const result: number[] = []
  const countMap: { [key: string]: number } = {}
  groups.reduce((a, b) => a.concat(b), []).forEach(item => {
    if (countMap[item]) {
      countMap[item]++
      countMap[item] === groupsCount && result.push(item)
    } else {
      countMap[item] = 1
    }
  })
  return result
}
export const applyStyle = (targetElement: HTMLElement, styleData: Partial<CSSStyleDeclaration>) => {
  const { style } = targetElement
  for (const key in styleData) {
    // @ts-ignore
    style[key] = styleData[key]
  }
}

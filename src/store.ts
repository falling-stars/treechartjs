import { SourceDataItem, DataItem, DataMap } from './types/store'

export default class Store {
  dataMap: DataMap = {}
  constructor(sourceData: SourceDataItem[]) {
    this.formatData(sourceData)
  }
  formatData(sourceData: SourceDataItem[]): DataItem | null {
    const { dataMap } = this
    let root: SourceDataItem | null = null
    sourceData.forEach(item => {
      const { id, parent } = item
      if (dataMap[id]) {
        Object.assign(dataMap[id], item)
      } else {
        dataMap[id] = Object.assign(item, { children: [] })
      }
      if (parent !== undefined) {
        if (dataMap[parent]) {
          dataMap[parent].children.push(item)
        } else {
          dataMap[parent] = { id: parent, children: [item] }
        }
      } else {
        root = item
      }
    })
    return root
  }
}

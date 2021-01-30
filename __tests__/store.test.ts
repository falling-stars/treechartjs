import Store from '../src/store'
import { RootData } from '../src/types/store'

const dataList = [
  { id: 0 },
  { id: 1, parent: 0 },
  { id: 11, parent: 1 },
  { id: 12, parent: 1 },
  { id: 2, parent: 0 },
  { id: 21, parent: 2 },
  { id: 211, parent: 21 }
]
const formatData: RootData = {
  id: 0,
  children: [
    {
      id: 1,
      parent: 0,
      children: [
        {
          id: 11,
          parent: 1,
          children: []
        },
        {
          id: 12,
          parent: 1,
          children: []
        }
      ]
    },
    {
      id: 2,
      parent: 0,
      children: [
        {
          id: 21,
          parent: 2,
          children: [
            {
              id: 211,
              parent: 21,
              children: []
            }
          ]
        }
      ]
    }
  ]
}

const store = new Store(dataList)

test('new store', () => {
  expect(store.root).toEqual(formatData)
})
test('remove store item', () => {
  store.remove(2)
  store.remove(12)
  formatData.children.splice(1, 1)
  formatData.children[0].children.splice(1, 1)
  expect(store.root).toEqual(formatData)
})
test('add store item', () => {
  // 重复id项
  store.add({ id: 1, parent: 0 })
  store.add({ id: 3, parent: 0 })
  store.add({ id: 31, parent: 3 })
  formatData.children.push({
    id: 3,
    parent: 0,
    children: [{ id: 31, parent: 3, children: [] }]
  })
})

import Store from '../src/store'

const dataList = [
  {id: 0},
  {id: 1, parent: 0},
  {id: 11, parent: 1},
  {id: 12, parent: 1},
  {id: 2, parent: 0},
  {id: 21, parent: 2},
  {id: 211, parent: 21}
]
const store = new Store(dataList)

test('new Store', () => {
  expect(store.root).toEqual({
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
  })
})
test('remove Store Item', () => {
  store.remove(2)
  store.remove(12)
  expect(store.root).toEqual({
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
          }
        ]
      }
    ]
  })
})
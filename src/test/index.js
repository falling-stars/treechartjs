import TreeChart from '../index'

const data = {
  name: 1,
  id: 1,
  children: [
    {
      name: 11,
      id: 11,
      children: [{ name: 111, id: 111 }]
    },
    {
      name: 12,
      id: 12,
      children: [
        { name: 121, id: 121 },
        {
          name: 122,
          id: 122,
          children: [{ name: 1221, id: 1221 }, { name: 1222, id: 1222 }, { name: 1223, id: 1223 }]
        }
      ]
    },
    {
      id: 13,
      name: 13,
      children: [{
        name: 131,
        id: 131,
        children: [
          {
            name: 1311,
            id: 1311,
            children: [{ name: 13111, id: 13111 }]
          }]
      }]
    },
    {
      id: 14,
      name: 14,
      children: [{ name: 141, id: 141 }]
    }
  ]
}
new TreeChart({
  data,
  container: document.querySelector('#demo'),
  distanceX: 100,
  distanceY: 40,
  draggable: true,
  smooth: 60,
  contentRender(data) {
    const container = document.createElement('div')
    container.style.width = '290px'
    container.style.height = '90px'
    container.style.border = 'solid 1px'
    container.innerText = data.name
    return container
  }
})
import TreeChart from '../src/index'

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
const chart = new TreeChart({
  data,
  container: document.querySelector('#demo'),
  distanceX: 80,
  distanceY: 80,
  draggable: true,
  dragScroll: true,
  scrollTriggerDistance: 20,
  allowFold: true,
  // extendSpace: 392,
  // line: {
  //   type: 'broken'
  // },
  dragControl(data) {
    return {
      drag: data.id !== 12,
      insertChild: data.id !== 12,
      insertPrevious: data.id !== 12,
      insertNext: data.id !== 12
    }
  },
  dragStart() {
    console.log('dragstart')
  },
  dragEnd(data) {
    console.log('dragend', data)
  },
  click() {
    console.log('click')
  },
  // mouseEnter(data) {
  //   console.log('enter', data)
  // },
  // mouseLeave(data) {
  //   console.log('leave', data)
  // },
  contentRender(data) {
    const container = document.createElement('div')
    const { style: containerStyle } = container
    containerStyle.width = '230px'
    containerStyle.height = '80px'
    containerStyle.border = 'solid 1px'
    containerStyle.lineHeight = '80px'
    container.innerText = data.name
    return container
  }
})

document.querySelector('.re-render').addEventListener('click', () => {
  chart.reRender(data)
})
document.querySelector('.re-render-node').addEventListener('click', () => {
  chart.reRenderNode('122', { name: 999, id: 999 })
})
document.querySelector('.remove-node').addEventListener('click', () => {
  chart.removeNode('11')
})
document.querySelector('.move-node').addEventListener('click', () => {
  chart.insertNode('12', '111', 'child')
})
document.querySelector('.insert-child').addEventListener('click', () => {
  chart.insertNode('12', { name: 'insertChild', id: 'insertChild' }, 'child')
})
document.querySelector('.insert-previous').addEventListener('click', () => {
  chart.insertNode('12', { name: 'insertPrevious', id: 'insertPrevious' }, 'previous')
})
document.querySelector('.insert-next').addEventListener('click', () => {
  chart.insertNode('12', { name: 'insertNext', id: 'insertNext' }, 'next')
})
document.querySelector('.destroy').addEventListener('click', () => {
  chart.destroy()
})

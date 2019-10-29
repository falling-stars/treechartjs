import './index.scss'

class TreeChart {
  constructor(options) {
    this.options = Object.assign(
      {
        distanceX: 60,
        distanceY: 60,
        draggable: false,
        smooth: 50
      },
      options
    )
    this.container = options.container
    this.container.classList.add('tree-chart')
    this.createNodes(options.data, this.container, true)
    this.createLink()
    if (this.options.draggable) {
      this.setCollideData()
      this.setDrag()
    }
  }

  createNodes(data, parentNode, isRoot) {
    const options = this.options
    const contentContainer = document.createElement('div')
    if (isRoot) {
      contentContainer.classList.add('is-node-container')
      this.nodeContainer = contentContainer
    }
    contentContainer.classList.add('tree-chart-container')
    // set distanceY
    contentContainer.style.marginBottom = `${ options.distanceY }px`
    const content = document.createElement('div')
    content.classList.add('tree-chart-content', `tree-chart-item-${ data.id }`)
    content.setAttribute('data-key', data.id)
    // setContent
    if (typeof options.contentRender === 'function') {
      const renderResult = options.contentRender(data)
      if (typeof renderResult === 'string') {
        content.innerHTML = renderResult
      } else if (typeof renderResult === 'object' && renderResult.nodeType === 1) {
        content.appendChild(renderResult)
      } else {
        content.innerText = 'Please check contentrender return type is string or element'
      }
    } else {
      content.innerText = 'Please set contentRender function'
    }
    contentContainer.appendChild(content)
    parentNode.appendChild(contentContainer)
    if (Array.isArray(data.children) && data.children.length) {
      const childrenContainer = document.createElement('div')
      childrenContainer.classList.add('tree-chart-children-container')
      // set distanceX
      childrenContainer.style.marginLeft = `${ options.distanceX }px`
      contentContainer.appendChild(childrenContainer)
      const childrenKeys = []
      for (const key in data.children) {
        if (data.children.hasOwnProperty(key)) {
          childrenKeys.push(data.children[key].id)
          this.createNodes(data.children[key], childrenContainer)
        }
      }
      content.setAttribute('data-children', childrenKeys.join())
    }
  }

  createLink() {
    const nodeContainer = this.nodeContainer
    const linkContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    this.linkContainer = linkContainer
    linkContainer.classList.add('tree-chart-link-container')
    linkContainer.setAttribute('width', `${ nodeContainer.clientWidth }px`)
    linkContainer.setAttribute('height', `${ nodeContainer.clientHeight }px`)
    this.container.appendChild(linkContainer)
    const contentList = document.querySelectorAll('.tree-chart-content')
    for (const item of contentList) {
      const childrenKey = item.getAttribute('data-children')
      if (childrenKey) {
        const from = {
          x: item.offsetLeft + item.offsetWidth,
          y: item.offsetTop + item.offsetHeight / 2,
          key: item.getAttribute('data-key')
        }
        childrenKey.split(',').forEach(key => {
          const childrenElement = document.querySelector(`.tree-chart-item-${ key }`)
          const to = {
            x: childrenElement.offsetLeft,
            y: childrenElement.offsetTop + childrenElement.offsetHeight / 2,
            key
          }
          this.drawLine(from, to)
        })
      }
    }
  }

  drawLine(from, to) {
    const options = this.options
    const lineClassName = `line-${ from.key }-${ to.key }`
    let link = null
    if (document.querySelector(`.${ lineClassName }`)) {
      link = document.querySelector(`.${ lineClassName }`)
    } else {
      link = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      link.classList.add(lineClassName)
      this.linkContainer.appendChild(link)
    }
    const centerX = (to.x - from.x) / 2
    const centerY = (to.y - from.y) / 2
    const M = `${ from.x } ${ from.y }`
    const L = `${ to.x } ${ to.y }`
    const Q1 = `${ from.x + centerX - options.smooth / 100 * centerX } ${ from.y }`
    const Q2 = `${ from.x + centerX } ${ from.y + centerY }`
    link.setAttribute('d', `M${ M } Q${ Q1 } ${ Q2 } T ${ L }`)
  }

  setCollideData() {
    this.collideData = {
      left: {
        list: []
      },
      right: {
        list: []
      },
      top: {
        list: []
      },
      bottom: {
        list: []
      },
      addData(data) {
        for (const keyName in data) {
          const keyValue = data.key
          if (data.hasOwnProperty(keyName) && keyName !== 'key') {
            const currentValue = data[keyName]
            const targetAttribute = this[keyName]
            targetAttribute.list.indexOf(currentValue) === -1 && targetAttribute.list.push(currentValue)
            if (targetAttribute[currentValue]) {
              targetAttribute[currentValue].push(keyValue)
            } else {
              targetAttribute[currentValue] = [keyValue]
            }
          }
        }
      }
    }
    document.querySelectorAll('.tree-chart-content').forEach(item => {
      const key = item.getAttribute('data-key')
      const left = item.offsetLeft
      const right = left + item.offsetWidth
      const top = item.offsetTop
      const bottom = top + item.offsetHeight
      this.collideData.addData({ left, right, top, bottom, key })
    })
    for (const key in this.collideData) {
      if (this.collideData.hasOwnProperty(key) && this.collideData[key].list) {
        this.collideData[key].list.sort((a, b) => a - b)
      }
    }
    this.collideRangeData = {}
    for (const key in this.collideData) {
      if (this.collideData.hasOwnProperty(key) && key !== 'addData') {
        // todo
      }
    }
  }

  setDrag() {
    const nodeContainer = this.nodeContainer
    const ghostContainer = document.createElement('div')
    ghostContainer.classList.add('tree-chart-ghost-container')
    ghostContainer.style.width = `${ nodeContainer.clientWidth }px`
    ghostContainer.style.height = `${ nodeContainer.clientHeight }px`
    this.container.appendChild(ghostContainer)
    let dragging = false
    let ghostElement = null
    let eventX = 0
    let eventY = 0
    nodeContainer.querySelectorAll('.tree-chart-content').forEach(itemElement => {
      itemElement.addEventListener('mousedown', e => {
        dragging = true
        const { offsetX, offsetY, currentTarget } = e
        eventX = offsetX
        eventY = offsetY
        ghostElement = currentTarget.cloneNode(true)
      })
    })
    nodeContainer.addEventListener('mousemove', e => {
      if (dragging) {
        getSelection ? getSelection().removeAllRanges() : document.selection.empty()
        nodeContainer.classList.add('cursor-move')
        !ghostContainer.contains(ghostElement) && ghostContainer.appendChild(ghostElement)
        const translateX = e.layerX - eventX
        const translateY = e.layerY - eventY
        ghostElement.style.transform = `translate(${ translateX }px, ${ translateY }px)`
        const right = translateX + ghostElement.offsetWidth
        const bottom = translateY + ghostElement.offsetHeight
        this.checkCollide(ghostElement.getAttribute('data-key'), translateX, right, translateY, bottom)
      }
    })
    nodeContainer.addEventListener('mouseup', e => {
      nodeContainer.classList.remove('cursor-move')
      dragging = false
      ghostElement = null
      ghostContainer.innerHTML = ''
    })
  }

  checkCollide(itemKey, left, right, top, bottom) {
    // Find covered contentElement
    const searchCurrent = (target, list, searchLarge) => {
      const listLen = list.length
      if (searchLarge) {
        for (let i = 0; i < listLen; i++) {
          if (list[i] >= target) return list[i]
        }
      } else {
        for (let i = listLen - 1; i > -1; i--) {
          if (list[i] <= target) return list[i]
        }
      }
      return null
    }

    const collideData = this.collideData
    const leftList = collideData.left.list
    const topList = collideData.top.list
    const rightList = collideData.right.list
    const bottomList = collideData.bottom.list

    // 寻找边界内的坐标
    const searchLeft = searchCurrent(left, rightList, true)
    const searchTop = searchCurrent(top, bottomList, true)
    const searchRight = searchCurrent(right, leftList)
    const searchBottom = searchCurrent(top, topList)

    let leftTopCover = null

    // 左顶点和上顶点求交集确定被覆盖的元素
    const leftCatchList = collideData.right[searchLeft]
    const topCatchList = collideData.bottom[searchTop]
    for (const leftItem of leftCatchList) {
      if (leftItem !== itemKey && topCatchList.includes(leftItem)) {
        leftTopCover = leftItem
        break
      }
    }

    console.log(leftCatchList, topCatchList)
  }
}

export default TreeChart
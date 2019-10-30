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
      this.setPositionData('sort')
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
    const container = this.container
    const nodeContainer = this.nodeContainer
    const linkContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    this.linkContainer = linkContainer
    linkContainer.classList.add('tree-chart-link-container')
    linkContainer.setAttribute('width', `${ nodeContainer.clientWidth }px`)
    linkContainer.setAttribute('height', `${ nodeContainer.clientHeight }px`)
    container.appendChild(linkContainer)
    const contentList = document.querySelectorAll('.tree-chart-content')
    const { left: offsetLeftValue, top: offsetTopValue } = container.getBoundingClientRect()
    for (const item of contentList) {
      const childrenKeys = item.getAttribute('data-children')
      const itemLayout = item.getBoundingClientRect()
      const itemKey = item.getAttribute('data-key')
      if (childrenKeys) {
        const from = {
          x: itemLayout.left - offsetLeftValue + item.offsetWidth,
          y: itemLayout.top - offsetTopValue + item.offsetHeight / 2,
          key: itemKey
        }
        childrenKeys.split(',').forEach(childKey => {
          const childrenElement = document.querySelector(`.tree-chart-item-${ childKey }`)
          const childrenLayout = childrenElement.getBoundingClientRect()
          const to = {
            x: childrenLayout.left - offsetLeftValue,
            y: childrenLayout.top - offsetTopValue + childrenElement.offsetHeight / 2,
            key: childKey
          }
          this.drawLine(from, to)
        })
      }
      this.options.draggable && this.setPositionData('add', {
        left: itemLayout.left - offsetLeftValue,
        right: itemLayout.right - offsetLeftValue,
        top: itemLayout.top - offsetTopValue,
        bottom: itemLayout.bottom - offsetTopValue,
        key: itemKey
      })
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

  setPositionData(operation, data) {
    if (!this.positionData) {
      this.positionData = {
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
            if (data.hasOwnProperty(keyName) && /left|right|top|bottom/.test(keyName)) {
              const currentValue = data[keyName]
              const targetAttribute = this[keyName]
              targetAttribute.list.indexOf(currentValue) === -1 && targetAttribute.list.push(currentValue)
              if (targetAttribute[currentValue]) {
                targetAttribute[currentValue].push(keyValue)
              } else {
                targetAttribute[currentValue] = [keyValue]
              }
              this[keyValue] = data
            }
          }
        }
      }
    }
    const positionData = this.positionData
    if (operation === 'add') positionData.addData(data)
    if (operation === 'sort') {
      for (const key in positionData) {
        if (positionData.hasOwnProperty(key) && positionData[key].list) {
          positionData[key].list.sort((a, b) => a - b)
        }
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
    let draggingElement = null
    let ghostElement = null
    let moveX = 0
    let moveY = 0
    const resetStyle = () => {
      const tempLink = this.linkContainer.querySelector('.line-from-to')
      tempLink && this.linkContainer.removeChild(tempLink)
      document.querySelectorAll('.tree-chart-content').forEach(node => {
        node.classList.remove('become-previous')
        node.classList.remove('become-next')
        node.classList.remove('become-child')
      })
    }
    nodeContainer.querySelectorAll('.tree-chart-content').forEach(itemElement => {
      itemElement.addEventListener('mousedown', e => {
        const currentTarget = e.currentTarget
        draggingElement = currentTarget
        ghostElement = currentTarget.cloneNode(true)
        const currentKey = currentTarget.getAttribute('data-key')
        moveX = this.positionData[currentKey].left
        moveY = this.positionData[currentKey].top
      })
    })
    nodeContainer.addEventListener('mousemove', e => {
      if (draggingElement) {
        getSelection ? getSelection().removeAllRanges() : document.selection.empty()
        nodeContainer.classList.add('cursor-move')
        !ghostContainer.contains(ghostElement) && ghostContainer.appendChild(ghostElement)
        moveX = moveX + e.movementX
        moveY = moveY + e.movementY
        ghostElement.style.transform = `translate(${ moveX }px, ${ moveY }px)`
        const right = moveX + ghostElement.offsetWidth
        const bottom = moveY + ghostElement.offsetHeight
        resetStyle()
        const collideNode = this.getCollideNode(ghostElement.getAttribute('data-key'), moveX, right, moveY, bottom)
        const allowCoverNode = []
        collideNode.forEach(node => {
          const draggingParent = draggingElement.parentElement
          // ignore root Node
          if (draggingParent === this.nodeContainer) return
          // ignore childNode
          if (draggingParent.contains(node)) return
          allowCoverNode.push(node)
          // ignore first parentNode
          // if (draggingElement.parentElement.parentElement.previousElementSibling === node) return
        })
        if (allowCoverNode.length === 1) {
          const targetNode = allowCoverNode[0]
          const targetNodeKey = targetNode.getAttribute('data-key')
          const { top: targetTop, bottom: targetBottom, left: targetLeft, right: targetRight } = this.positionData[targetNodeKey]
          // 位置偏上或者偏下(40%)则认为是添加兄弟节点
          const offsetValue = (targetBottom - targetTop) * 0.4
          const topPositionValue = targetTop + offsetValue
          const bottomPositionValue = targetBottom - offsetValue

          const parentKey = targetNode.parentElement.parentElement.previousElementSibling.getAttribute('data-key')
          const parentPosition = this.positionData[parentKey]

          let insertType = ''

          if (bottom <= topPositionValue) {
            // 在上方插入
            insertType = 'previous'
          } else if (moveY >= bottomPositionValue) {
            // 在下方插入
            insertType = 'next'
          } else {
            // 作为子节点插入
            insertType = 'child'
          }
          targetNode.classList.add(`become-${ insertType }`)

          let from = null
          let to = null
          if (insertType === 'previous' || insertType === 'next') {
            from = {
              x: parentPosition.right,
              y: (parentPosition.top + parentPosition.bottom) / 2,
              key: 'from'
            }
            to = {
              x: targetLeft,
              y: insertType === 'previous' ? targetTop - 20 : targetBottom + 20,
              key: 'to'
            }
          } else {
            from = {
              x: targetRight,
              y: (targetTop + targetBottom) / 2,
              key: 'from'
            }
            to = {
              x: targetRight + 20,
              y: (targetTop + targetBottom) / 2,
              key: 'to'
            }
          }
          this.drawLine(from, to)
        }
      }
    })
    nodeContainer.addEventListener('mouseup', e => {
      nodeContainer.classList.remove('cursor-move')
      draggingElement = null
      ghostElement = null
      ghostContainer.innerHTML = ''
      moveX = 0
      moveY = 0
      resetStyle()
    })
  }

  getCollideNode(moveItemKey, left, right, top, bottom) {
    // Find current collide contentElement position
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

    const getRangeList = (startItem, data, direct = 'after') => {
      let result = []
      !isNaN(startItem) && data.list.forEach(item => {
        if (direct === 'before' ? item <= startItem : item >= startItem) {
          result = result.concat(data[item])
        }
      })
      return result
    }

    const positionData = this.positionData
    const leftList = positionData.left.list
    const topList = positionData.top.list
    const rightList = positionData.right.list
    const bottomList = positionData.bottom.list

    // 寻找边界内的坐标
    const searchLeft = searchCurrent(left, rightList, true)
    const searchTop = searchCurrent(top, bottomList, true)
    const searchRight = searchCurrent(right, leftList)
    const searchBottom = searchCurrent(bottom, topList)

    const leftTopCollide = []
    const rightBottomCollide = []

    // 左顶点和上顶点求交集确定在右下方的元素
    const leftCatchList = getRangeList(searchLeft, positionData.right)
    const topCatchList = getRangeList(searchTop, positionData.bottom)
    leftCatchList.forEach(item => {
      if (item !== moveItemKey && topCatchList.includes(item)) {
        leftTopCollide.push(item)
      }
    })

    // 右顶点和下顶点求交集确定在左上方的元素
    const rightCatchList = getRangeList(searchRight, positionData.left, 'before')
    const bottomCatchList = getRangeList(searchBottom, positionData.top, 'before')
    rightCatchList.forEach(item => {
      if (item !== moveItemKey && bottomCatchList.includes(item)) {
        rightBottomCollide.push(item)
      }
    })

    // 两个区间求交集确定被碰撞的元素
    const collideNode = []
    leftTopCollide.forEach(item => {
      rightBottomCollide.includes(item) && collideNode.push(document.querySelector(`.tree-chart-item-${ item }`))
    })

    return collideNode
  }
}

export default TreeChart
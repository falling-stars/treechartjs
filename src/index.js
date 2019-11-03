import './index.scss'

class TreeChart {
  constructor(options) {
    this.options = Object.assign(
      {
        distanceX: 60,
        distanceY: 60,
        draggable: false,
        // 光滑程度
        smooth: 50,
        scrollSpeed: 8,
        // 触发滚动的距离
        scrollTriggerDistance: 50
      },
      options
    )
    this.draggable = this.options.draggable
    this.rootContainer = options.container
    this.rootContainer.classList.add('tree-chart')
    this.createNodes(options.data, this.rootContainer, true)
    this.createLink()
    if (this.draggable) {
      this.setPositionData('sort')
      this.setDrag()
      this.foolowScrollData = {
        interval: null,
        direct: ''
      }
    }
    this.resize()
  }

  // 数据数据结构生成节点
  createNodes(data, parentNode, isRoot) {
    const options = this.options

    const contentContainer = document.createElement('div')
    contentContainer.classList.add('tree-chart-container')
    contentContainer.style.marginBottom = `${ options.distanceY }px`

    const content = document.createElement('div')
    content.classList.add('tree-chart-content', `tree-chart-item-${ data.id }`)
    content.setAttribute('data-key', data.id)
    // 生成用户自定义模板
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

    if (isRoot) {
      contentContainer.classList.add('is-node-container')
      this.draggable && contentContainer.classList.add('is-draggable')
      this.rootNode = content
      this.rootNodeContainer = contentContainer
    }

    if (Array.isArray(data.children) && data.children.length) {
      const childrenContainer = document.createElement('div')
      childrenContainer.classList.add('tree-chart-children-container')
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

  // 根据节点间父子关系生成连线信息
  createLink() {
    const rootContainer = this.rootContainer
    const linkContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    this.linkContainer = linkContainer
    linkContainer.classList.add('tree-chart-link-container')
    rootContainer.appendChild(linkContainer)

    const { left: offsetLeftValue, top: offsetTopValue } = rootContainer.getBoundingClientRect()

    const nodeList = document.querySelectorAll('.tree-chart-content')
    for (const item of nodeList) {
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
      this.draggable && this.setPositionData('add', {
        left: itemLayout.left - offsetLeftValue,
        right: itemLayout.right - offsetLeftValue,
        top: itemLayout.top - offsetTopValue,
        bottom: itemLayout.bottom - offsetTopValue,
        key: itemKey
      })
    }
  }

  // 两点间连线
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

  // 生成节点位置信息
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

  // 绑定拖动事件
  setDrag() {
    const rootNodeContainer = this.rootNodeContainer
    const rootContainer = this.rootContainer

    // 设置镜像层
    const ghostContainer = document.createElement('div')
    ghostContainer.classList.add('tree-chart-ghost-container')
    rootContainer.appendChild(ghostContainer)

    const dragData = this.dragData = {
      element: null,
      ghostContainer,
      ghostElement: null,
      ghostTranslateX: 0,
      ghostTranslateY: 0,
      // mousedown事件在节点的触发位置
      eventOffsetX: 0,
      eventOffsetY: 0
    }

    rootNodeContainer.addEventListener('mousedown', e => {
      const dragNode = e.path.find(el => el.nodeType === 1 && el.classList.contains('tree-chart-content'))
      // 根节点不允许拖动
      if (dragNode && dragNode !== this.rootNode) {
        dragData.element = dragNode
        dragData.ghostElement = dragNode.cloneNode(true)
        const { left, top } = this.positionData[dragNode.getAttribute('data-key')]
        dragData.eventOffsetX = e.clientX + rootContainer.scrollLeft - left
        dragData.eventOffsetY = e.clientY + rootContainer.scrollTop - top
      }
    })
    rootNodeContainer.addEventListener('mousemove', e => {
      if (dragData.element) {
        // 清除文字选择对拖动的影响
        getSelection ? getSelection().removeAllRanges() : document.selection.empty()
        rootNodeContainer.classList.add('cursor-move')
        // 添加镜像元素
        !dragData.ghostContainer.contains(dragData.ghostElement) && dragData.ghostContainer.appendChild(dragData.ghostElement)
        dragData.ghostTranslateX = e.clientX + rootContainer.scrollLeft - dragData.eventOffsetX
        dragData.ghostTranslateY = e.clientY + rootContainer.scrollTop - dragData.eventOffsetY
        dragData.ghostElement.style.transform = `translate(${ dragData.ghostTranslateX }px, ${ dragData.ghostTranslateY }px)`
        const ghostPosition = this.getGhostPosition()
        this.setDragEffect(ghostPosition)
        // 跟随滚动
        this.followScroll(ghostPosition)
      }
    })
    rootNodeContainer.addEventListener('mouseup', () => {
      console.log(dragData.element)
    })

    const cancelDrag = () => {
      if (!dragData.element) return
      this.rootNodeContainer.classList.remove('cursor-move')
      dragData.element = null
      dragData.ghostContainer.innerHTML = ''
      dragData.ghostElement = null
      dragData.ghostTranslateX = 0
      dragData.ghostTranslateY = 0
      dragData.eventOffsetX = 0
      dragData.eventOffsetY = 0
      this.removeDragEffect()
      this.stopFollowScroll()
      this.resize()
    }
    this.cancelDrag = cancelDrag.bind(this)
    window.addEventListener('mouseup', this.cancelDrag)

    // 考虑滚动情况
    const oldScroll = {
      top: rootContainer.scrollTop,
      left: rootContainer.scrollLeft
    }
    rootContainer.addEventListener('scroll', () => {
      if (dragData.element && dragData.ghostElement) {
        dragData.ghostTranslateY = dragData.ghostTranslateY + rootContainer.scrollTop - oldScroll.top
        dragData.ghostTranslateX = dragData.ghostTranslateX + rootContainer.scrollLeft - oldScroll.left
        dragData.ghostElement.style.transform = `translate(${ dragData.ghostTranslateX }px, ${ dragData.ghostTranslateY }px)`
        this.setDragEffect(this.getGhostPosition())
      }
      oldScroll.top = rootContainer.scrollTop
      oldScroll.left = rootContainer.scrollLeft
    })
  }

  getGhostPosition() {
    const dragData = this.dragData
    return {
      left: dragData.ghostTranslateX,
      top: dragData.ghostTranslateY,
      right: dragData.ghostTranslateX + dragData.ghostElement.offsetWidth,
      bottom: dragData.ghostTranslateY + dragData.ghostElement.offsetHeight
    }
  }

  removeDragEffect() {
    const tempLink = this.linkContainer.querySelector('.line-from-to')
    tempLink && this.linkContainer.removeChild(tempLink)
    document.querySelectorAll('.collide-node').forEach(node => {
      node.classList.remove('become-previous', 'become-next', 'become-child')
    })
    const tempChildrenContainer = document.querySelector('.temp-children-container')
    tempChildrenContainer && tempChildrenContainer.parentElement.removeChild(tempChildrenContainer)
  }

  // 生成拖动效果
  createDragEffect(coverNode, { top: ghostTop, bottom: ghostBottom }) {
    let insertType = ''
    let from = null
    let to = null

    const coverNodeKey = coverNode.getAttribute('data-key')
    const { top: coverNodeTop, bottom: coverNodeBottom, left: coverNodeLeft, right: coverNodeRight } = this.positionData[coverNodeKey]

    // 如果被覆盖的是根节点的话只允许作为子节点插入
    if (coverNode === this.rootNode) {
      insertType = 'child'
    } else {
      // 位置偏上或者偏下(45%)则认为是添加兄弟节点
      const offsetValue = (coverNodeBottom - coverNodeTop) * 0.45
      const topPositionValue = coverNodeTop + offsetValue
      const bottomPositionValue = coverNodeBottom - offsetValue

      const parentKey = coverNode.parentElement.parentElement.previousElementSibling.getAttribute('data-key')
      const parentPosition = this.positionData[parentKey]

      if (ghostBottom <= topPositionValue) {
        // 在上方插入
        insertType = 'previous'
      } else if (ghostTop >= bottomPositionValue) {
        // 在下方插入
        insertType = 'next'
      } else {
        // 作为子节点插入
        insertType = 'child'
      }

      // 禁止插入到后一个兄弟节点的上面
      if (insertType === 'previous') {
        const nextContentContainer = this.dragData.element.parentElement.nextElementSibling
        if (nextContentContainer && nextContentContainer.querySelector('.tree-chart-content') === coverNode) insertType = 'child'
      }
      // 禁止插入到前一个兄弟节点的下面
      if (insertType === 'next') {
        const previousContentContainer = this.dragData.element.parentElement.previousElementSibling
        if (previousContentContainer && previousContentContainer.querySelector('.tree-chart-content') === coverNode) insertType = 'child'
      }

      if (insertType === 'previous' || insertType === 'next') {
        from = {
          x: parentPosition.right,
          y: (parentPosition.top + parentPosition.bottom) / 2,
          key: 'from'
        }
        to = {
          x: coverNodeLeft,
          y: insertType === 'previous' ? coverNodeTop - 20 : coverNodeBottom + 20,
          key: 'to'
        }
      }
    }
    coverNode.classList.add(`become-${ insertType }`, 'collide-node')

    if (insertType === 'child') {
      from = {
        x: coverNodeRight,
        y: (coverNodeTop + coverNodeBottom) / 2,
        key: 'from'
      }
      // 有子节点的情况
      if (coverNode.nextElementSibling) {
        const childNodeList = coverNode.nextElementSibling.childNodes
        const insertPreviousKey = childNodeList[childNodeList.length - 1].querySelector('.tree-chart-content').getAttribute('data-key')
        const { left: childPreviousLeft, bottom: childPreviousBottom } = this.positionData[insertPreviousKey]
        to = {
          x: childPreviousLeft,
          y: childPreviousBottom + 20,
          key: 'to'
        }
      } else {
        // 没有子节点的情况创建一个临时节点
        const childrenContainer = document.createElement('div')
        childrenContainer.classList.add('tree-chart-children-container', 'temp-children-container')
        childrenContainer.style.marginLeft = `${ this.options.distanceX }px`

        const chartContainer = document.createElement('div')
        chartContainer.classList.add('tree-chart-container')

        const chartContent = document.createElement('div')
        chartContent.classList.add('tree-chart-content', 'temp-chart-content')
        chartContent.style.width = `${ coverNodeRight - coverNodeLeft }px`
        chartContent.style.height = `${ coverNodeBottom - coverNodeTop }px`

        chartContainer.appendChild(chartContent)
        childrenContainer.appendChild(chartContainer)
        coverNode.parentElement.appendChild(childrenContainer)
        to = {
          x: coverNodeRight + this.options.distanceX,
          y: (coverNodeTop + coverNodeBottom) / 2,
          key: 'to'
        }
        this.resize()
      }
    }
    this.drawLine(from, to)
  }

  // 获取拖动过程中碰撞的元素
  getCollideNode({ left, right, top, bottom }) {
    const draggingElementKey = this.dragData.element.getAttribute('data-key')
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

    const getRangeList = (flagItem, data, direct = 'after') => {
      let result = []
      flagItem && data.list.forEach(item => {
        if (direct === 'before' ? item <= flagItem : item >= flagItem) {
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
      if (item !== draggingElementKey && topCatchList.includes(item)) {
        leftTopCollide.push(item)
      }
    })

    // 右顶点和下顶点求交集确定在左上方的元素
    const rightCatchList = getRangeList(searchRight, positionData.left, 'before')
    const bottomCatchList = getRangeList(searchBottom, positionData.top, 'before')
    rightCatchList.forEach(item => {
      if (item !== draggingElementKey && bottomCatchList.includes(item)) {
        rightBottomCollide.push(item)
      }
    })

    const draggingParentElement = this.dragData.element.parentElement
    // 两个区间求交集确定目标元素
    const collideNode = []
    leftTopCollide.forEach(item => {
      if (!rightBottomCollide.includes(item)) return
      const node = document.querySelector(`.tree-chart-item-${ item }`)
      // 不可拖到子节点上
      if (draggingParentElement.contains(node)) return
      // 不可拖到第一个父节点上
      if (draggingParentElement.parentElement.previousElementSibling === node) return
      collideNode.push({ node, key: item, position: this.positionData[item] })
    })

    if (!collideNode.length) return null
    if (collideNode.length === 1) return collideNode[0].node

    // 如果存在多个被覆盖的节点需要根据覆盖面积决策，被覆盖的节点最多有四个
    const isLeft = position => position.left <= left
    const isTop = position => position.top <= top

    // 面积计算
    const setArea = (type, item) => {
      const collidePosition = item.position
      switch (type) {
        case 'leftTop':
          item.area = (collidePosition.right - left) * (collidePosition.bottom - top)
          break
        case 'leftBottom':
          item.area = (collidePosition.right - left) * (bottom - collidePosition.top)
          break
        case 'rightTop':
          item.area = (right - collidePosition.left) * (collidePosition.bottom - top)
          break
        case 'rightBottom':
          item.area = (right - collidePosition.left) * (bottom - collidePosition.top)
      }
    }
    collideNode.forEach(item => {
      const itemPosition = item.position
      if (isLeft(itemPosition)) {
        setArea(isTop(itemPosition) ? 'leftTop' : 'leftBottom', item)
        // 左侧
      } else {
        // 右侧
        setArea(isTop(itemPosition) ? 'rightTop' : 'rightBottom', item)
      }
    })
    collideNode.sort((a, b) => b.area - a.area)
    return collideNode[0].node
  }

  setDragEffect(ghostElementPosition) {
    this.removeDragEffect()
    const collideNode = this.getCollideNode(ghostElementPosition)
    collideNode && this.createDragEffect(collideNode, ghostElementPosition)
  }

  resize() {
    const { clientWidth, clientHeight } = this.rootNodeContainer
    const linkContainer = this.linkContainer
    linkContainer.setAttribute('width', `${ clientWidth }px`)
    linkContainer.setAttribute('height', `${ clientHeight }px`)
    if (this.dragData.ghostContainer) {
      const ghostContainerStyle = this.dragData.ghostContainer.style
      ghostContainerStyle.width = `${ clientWidth }px`
      ghostContainerStyle.height = `${ clientHeight }px`
    }
  }

  followScroll({ left, top, right, bottom }) {
    const rootContainer = this.rootContainer
    const { scrollLeft, scrollTop, clientWidth, clientHeight, scrollWidth, scrollHeight } = rootContainer
    const distance = this.options.scrollTriggerDistance
    let direct = ''
    const hasRightContent = scrollWidth - scrollLeft > clientWidth
    const hasBottomContent = scrollHeight - scrollTop > clientHeight
    if (scrollLeft > 0 && left < scrollLeft + distance) {
      direct = 'Left'
    } else if (scrollTop > 0 && top < scrollTop + distance) {
      direct = 'Top'
    } else if (hasRightContent && clientWidth + scrollLeft - distance < right) {
      direct = 'Right'
    } else if (hasBottomContent && clientHeight + scrollTop - distance < bottom) {
      direct = 'Bottom'
    } else {
      return this.stopFollowScroll()
    }
    if (this.foolowScrollData.direct !== direct) {
      this.stopFollowScroll(false)
      this.foolowScrollData.direct = direct
      const scrollSpeed = this.options.scrollSpeed
      this.foolowScrollData.interval = setInterval(() => {
        if (direct === 'Left' || direct === 'Top') {
          rootContainer[`scroll${ direct }`] -= scrollSpeed
        } else {
          if (direct === 'Right') {
            rootContainer.scrollLeft += scrollSpeed
          } else {
            rootContainer.scrollTop += scrollSpeed
          }
        }
        let stop = false
        switch (direct) {
          case 'Left':
            stop = scrollLeft === 0
            break
          case 'Top':
            stop = scrollTop === 0
            break
          case 'Right':
            stop = scrollLeft + clientWidth === scrollWidth
            break
          case 'Bottom':
            stop = !scrollTop > 0
        }
        stop && this.stopFollowScroll()
      }, 20)
    }
  }

  stopFollowScroll(clearDirect = true) {
    this.foolowScrollData.interval && clearInterval(this.foolowScrollData.interval)
    if (clearDirect) this.foolowScrollData.direct = ''
  }

  destroy() {
    if (this.draggable) {
      window.removeEventListener('mouseup', this.cancelDrag)
    }
  }
}

export default TreeChart
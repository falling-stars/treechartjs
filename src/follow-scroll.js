export default class FollowScroll {
  constructor(option) {
    const { scrollContainer, eventContainer, scrollTriggerDistance, scrollSpeed } = option
    this.scrollContainer = scrollContainer
    this.eventContainer = eventContainer
    this.scrollSpeed = scrollSpeed
    this.triggerDistance = scrollTriggerDistance || 0
    this.targetNode = null
    this.interval = 0
    this.directData = {
      left: false,
      right: false,
      top: false,
      bottom: false
    }
    this.setEvent()
  }

  setEvent() {
    const { eventContainer } = this
    this.mouseMoveHandler = e => {
      const { button, movementX, movementY } = e
      // 处理Chrome76版本长按不移动也会触发的情况
      if (movementX === 0 && movementY === 0) return
      if (button || !this.targetNode) return
      this.setDirectData(e)
      this.triggerScroll()
    }
    eventContainer.addEventListener('mousemove', this.mouseMoveHandler)
  }

  setDirectData(event) {
    const { movementX, movementY } = event
    const { scrollContainer, targetNode, triggerDistance, directData } = this
    const { scrollLeft, scrollTop, scrollWidth, scrollHeight, clientWidth, clientHeight } = scrollContainer
    const { left: scrollContainerLeft, right: scrollContainerRight, top: scrollContainerTop, bottom: scrollContainerBottom } = scrollContainer.getBoundingClientRect()
    const { left: targetNodeLeft, right: targetNodeRight, top: targetNodeTop, bottom: targetNodeBottom } = targetNode.getBoundingClientRect()

    if (targetNodeLeft - scrollContainerLeft < triggerDistance) directData.left = true
    if (targetNodeTop - scrollContainerTop < triggerDistance) directData.top = true
    if (scrollContainerRight - targetNodeRight < triggerDistance) directData.right = true
    if (scrollContainerBottom - targetNodeBottom < triggerDistance) directData.bottom = true
    if (movementX > 0 || scrollLeft === 0) directData.left = false
    if (movementY > 0 || scrollTop === 0) directData.top = false
    if (movementX < 0 || scrollLeft + clientWidth >= scrollWidth) directData.right = false
    if (movementY < 0 || scrollTop + clientHeight >= scrollHeight) directData.bottom = false
  }

  triggerScroll() {
    const { directData, scrollContainer, scrollSpeed } = this
    let existDirect = false
    for (const key in directData) {
      if (directData[key]) {
        existDirect = true
        break
      }
    }
    if (!existDirect) return this.stop(true)
    if (this.interval) return
    this.interval = setInterval(() => {
      let { scrollLeft, scrollTop } = scrollContainer
      if (directData.left) scrollLeft -= scrollSpeed
      if (directData.right) scrollLeft += scrollSpeed
      if (directData.top) scrollTop -= scrollSpeed
      if (directData.bottom) scrollTop += scrollSpeed
      scrollContainer.scrollLeft = scrollLeft
      scrollContainer.scrollTop = scrollTop
    }, 20)
  }

  start(targetNode) {
    this.targetNode = targetNode
  }

  stop(keepTargetNode = false) {
    if (!keepTargetNode) this.targetNode = null
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = 0
    }
  }

  destroy() {
    this.eventContainer.removeEventListener('mousemove', this.mouseMoveHandler)
    this.targetNode = this.scrollContainer = this.eventContainer = null
    this.interval = 0
  }
}

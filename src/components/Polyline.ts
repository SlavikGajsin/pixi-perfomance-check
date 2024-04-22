import { BitmapText, Color, Graphics, Sprite, Text, Point as PixiPoint } from "pixi.js";

type Point = {x: number, y: number}

class GraphArrowhead {
  sprite: Graphics

  constructor(isTail = false) {
    this.sprite = new Graphics()
      .beginFill(0xFFFFFF, 1)
      .drawPolygon(0, 0, 8, 4, 0, 8)
    this.sprite.width = 5
    this.sprite.height = 6
    // this.sprite.anchor.set(1, 0.5)
    this.sprite.pivot.set(6, 5)

    if (isTail)
      this.sprite.scale.set(-1, 0)
  }
}

export class Polyline {
  private points: Point[]
  graphics: Graphics
  private width: number
  private color: string
  label: Text
  tail: GraphArrowhead
  head: GraphArrowhead

  private dashAnimationOffset = 0
  private dashAnimationIndex = 0
  private dashAnimationTime = 5
  private isAnimationOn = false
  private readonly dashArray = [20, 10, 5, 10]
  private dashAnimationTotalOffset = 0
  private totalLength = 0

  constructor({
    width,
    color,
    points,
    label
  }: {
    width: number
    color: string
    points: Point[]
    label: string
  }) {
    this.graphics = new Graphics().lineStyle(this.width, this.color).lineTextureStyle({ cap: 'round', join: 'round' })
    this.label = new Text(label, { fill: 0xffffff })
    this.label.anchor.set(0.5, 0.5)
    this.color = color
    this.width = width
    this.points = points

    this.tail = new GraphArrowhead(true)
    this.head = new GraphArrowhead()

    this.graphics.addChild(this.label, this.tail.sprite, this.head.sprite)
    this.draw(points)
    this.startAnimation()
  }

  private getLabelPosition(points: Point[]) {
    let totalLength = 0
    const lines: { length: number, totalLength: number, points: [Point, Point] }[] = []

    for (let i = 0; i < points.length - 1; i++) {
      const [fromPoint, toPoint] = [points[i], points[i + 1]]
      const dx = fromPoint.x - toPoint.x
      const dy = fromPoint.y - toPoint.y
      const length = Math.hypot(dx, dy)
      totalLength += length
      lines.push({ length, totalLength, points: [fromPoint, toPoint]})
    }

    const middle = Math.ceil(totalLength / 2)
    const exactLine = lines.find(line => middle < line.totalLength)

    if (!exactLine) return

    const [fromPoint, toPoint] = exactLine.points
    const dx = fromPoint.x - toPoint.x
    const dy = fromPoint.y - toPoint.y
    const hypotOffset = exactLine.totalLength - middle

    const xOffset = toPoint.x - fromPoint.x
    const yOffset = toPoint.y - fromPoint.y
    const rab = Math.sqrt(Math.pow(xOffset, 2) + Math.pow(yOffset, 2))
    const ratio = hypotOffset / rab
    const coordinates = {
      x: fromPoint.x + (xOffset * ratio),
      y: fromPoint.y + (yOffset * ratio),
    }

    const rotation = Math.atan2(dy, dx)

    return {
      coordinates,
      rotation
    }
  }

  private getTailData(points: Point[]) {
    const [from, to] = [points[0], points[1]]
    const dx = from.x - to.x
    const dy = from.y - to.y
    const rotation = Math.atan2(dy, dx) + Math.PI

    return {
      rotation,
      position: from
    }
  }

  private getHeadData(points: Point[]) {
    const [from, to] = [points[points.length - 2], points[points.length - 1]]
    const dx = from.x - to.x
    const dy = from.y - to.y
    const rotation = Math.atan2(dy, dx) + Math.PI

    return {
      rotation,
      position: to
    }
  }

  private getNumberArraySum(array: number[]): number {
    return array.reduce((acc, num) => acc + num, 0)
  }

  private getVectorRotation(fromPoint: Point, toPoint: Point) {
    const dx = fromPoint.x - toPoint.x
    const dy = fromPoint.y - toPoint.y
    return Math.atan2(dy, dx) + Math.PI
  }

  private getVectorOffsetPosition({
    startPoint,
    endPoint,
    offset,
  }: {
    startPoint: Point
    endPoint: Point
    offset: number
  }) {
    const rotation = this.getVectorRotation(startPoint, endPoint)
    const offsetX = Math.cos(rotation) * offset
    const offsetY = Math.sin(rotation) * offset
    return {
      x: startPoint.x + offsetX,
      y: startPoint.y + offsetY,
    }
  }

  tick() {
    if (this.isAnimationOn) {
      if (this.dashAnimationTotalOffset >= this.totalLength) {
        console.log('REACHED')
        this.dashAnimationTotalOffset = 0
      }
      this.dashAnimationOffset += 1 / this.dashAnimationTime
      if (this.dashAnimationOffset % this.dashArray.length >= this.dashArray[this.dashAnimationIndex]) {
        if (this.dashAnimationIndex + 1 >= this.dashArray.length) {
          this.dashAnimationIndex = 0
        } else {
          this.dashAnimationIndex++
        }
        // this.dashAnimationOffset = 0
      }
      this.draw(this.points)
      requestAnimationFrame(() => this.tick())
    }
  }

  startAnimation() {
    this.isAnimationOn = true
    requestAnimationFrame(() => this.tick())
  }

  private drawDashedLine(
    points: [Point, Point],
    dashArray: number[],
    offset: { left: number , index: number }
  ): { left: number, index: number } {
    const [startPoint, endPoint] = points

    const appliedDashOffset = offset.left % this.getNumberArraySum(dashArray)

    const dx = endPoint.x - startPoint.x
    const dy = endPoint.y - startPoint.y
    const angle = Math.atan2(dy, dx)
    const distance = Math.sqrt(dx ** 2 + dy ** 2)
    let dashDistance = 0
    let dashIdx = offset.index
    let dashLeft = 0


    const dashPos = new PixiPoint(startPoint.x, startPoint.y)
    this.graphics.moveTo(startPoint.x, startPoint.y)

    if (appliedDashOffset) {
      const toPoint = this.getVectorOffsetPosition({
        startPoint,
        endPoint,
        offset: appliedDashOffset
      })
      dashPos.copyFrom(toPoint)
      if (dashIdx % 2 === 1) {
        this.graphics.lineTo(toPoint.x, toPoint.y)
      }
      else {
        this.graphics.moveTo(toPoint.x, toPoint.y)
      }

      dashDistance += appliedDashOffset
    }

    while (dashDistance < distance) {
      const currentDash = dashArray[dashIdx % dashArray.length]
      const isSpace = dashIdx % 2 === 1

      const nextDistance = dashDistance + currentDash
      dashDistance = Math.min(nextDistance, distance)

      dashLeft = nextDistance - distance

      const drawDash = nextDistance > distance
        ? currentDash - dashLeft
        : currentDash

      const nextPos = new PixiPoint(
        dashPos.x + Math.cos(angle) * drawDash,
        dashPos.y + Math.sin(angle) * drawDash,
      )

      this.graphics.moveTo(dashPos.x, dashPos.y)

      if (!isSpace)
        this.graphics.lineTo(nextPos.x, nextPos.y)

      dashPos.copyFrom(nextPos)

      dashIdx++
    }

    return { left: dashLeft, index: dashIdx }
  }

  private drawDashed(
    points: Point[],
    dashArray: number[]
  ) {
    this.graphics.moveTo(points[0].x, points[0].y)

    let dashLeft = this.dashAnimationOffset
    let dashLeftIndex = this.dashAnimationIndex

    points.forEach((p, i) => {
      if (i === 0) {
        this.graphics.moveTo(p.x, p.y)
        return
      }
      if (!dashArray.length) {
        this.graphics.lineTo(p.x, p.y)
        return
      }

      const prev = points[i - 1]

      // this.graphics.lineStyle(2, 0xFFFFFF)

      const { left, index } = this.drawDashedLine([prev, p], dashArray, {
        left: dashLeft, index: dashLeftIndex
      })
      dashLeftIndex = index
      dashLeft = left
    })
  }

  private setTotalLength(points: Point[]) {
    let length = 0

    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i].x - points[i + 1].x
      const dy = points[i].y - points[i + 1].y
      length += Math.hypot(dx, dy)
    }
    this.totalLength = length
  }

  draw(points: Point[]): void {
    this.points = points
    this.graphics.clear()
    // this.graphics.lineStyle(this.width, 'red')
    // this.points.forEach(({ x, y }, index) => {
    //   if (index === 0) {
    //     this.graphics.moveTo(x, y)
    //     return
    //   }
    //
    //   this.graphics.lineTo(x, y)
    // })
    this.setTotalLength(points)
    this.graphics.lineStyle(this.width, this.color)
    this.drawDashed(points, [10, 10])

    const labelData = this.getLabelPosition(points)

    if (labelData) {

      this.label.rotation = labelData.rotation
      this.graphics.addChild(this.label)
    }

    const headData = this.getHeadData(points)
    if (headData) {
      this.head.sprite.position = headData.position
      this.head.sprite.rotation = headData.rotation
    }

    const tailData = this.getTailData(points)
    if (tailData) {
      this.tail.sprite.position = tailData.position
      this.tail.sprite.rotation = tailData.rotation
    }
  }
}

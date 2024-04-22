<script setup lang="ts">
import {Application, Container, Graphics, Sprite, Text, Texture, Ticker} from 'pixi.js'
import {onMounted, ref} from "vue";
import {Polyline} from "./Polyline";

let app: Application
let view = ref()

const FPS = ref(0)

const cacheGraphics = ref<boolean>(false)

type Point = [number, number]

let points: Point[] = []

const setPoints = (length: number) => {
  console.log(length)
  points = Array.from({ length }).map((_, index) => [index + 5, index + 5])
}

setPoints(1_000)

const createSprite = () => {
  const sprite = new Sprite(Texture.WHITE)
  sprite.height = 2
  sprite.anchor.set(0, 0.5)
  return sprite
}

class ArrowHead extends Graphics {
  constructor(width = 20, height = 16, fill = 0xffffff) {
    super()
    this
        .beginFill(fill)
        .drawPolygon(0, 0, width, height/2, 0, height)
    this.pivot.set(width, height/2)
  }
}

const drawGraphics = (graphicsContainers: Graphics[], points: Point[]) => {
  graphicsContainers.forEach(graphicsPolyline => {
    graphicsPolyline.clear().lineStyle(2, 0xffffff)
    points.forEach((p, i) => {
      if (i === 0) graphicsPolyline.moveTo(...p)
      graphicsPolyline.lineTo(...p)
    })

    // const p1 = points[points.length - 2]
    // const p2 = points[points.length - 1]
    // const dx = p2[0] - p1[0]
    // const dy = p2[1] - p1[1]
    // head.position.set(...p2)
    // head.rotation = Math.atan2(dy, dx)
    //
    // text.position.set(...p2)
    // text.x += 10
    // text.y -= 10
  })


  // const testDot = new Graphics()
  //     .beginFill(0xff0000)
  //     .drawCircle(100, 100, 20)
  //
  // testDot.addChild(
  //     new Graphics()
  //         .beginFill(0x0000ff)
  //         .drawCircle(10, 10, 5)
  // )
  //
  //
  // graphicsPolyline.addChild(testDot)
  // graphicsPolyline.cacheAsBitmap = true
}

const spriteContainers: Container[] = []
const graphicsContainers: Graphics[] = []

const drawSprites = (spriteContainers: Container[], points: Point[]) => {
  spriteContainers.forEach(spriteContainter => {
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]
      const p2 = points[i + 1]
      const sprite = spriteContainter.children[i] || createSprite()
      const dx = p2[0] - p1[0]
      const dy = p2[1] - p1[1]
      sprite.tint = 0x00ff00
      sprite.width = Math.hypot(dx, dy)
      sprite.rotation = Math.atan2(dy, dx)
      sprite.position.set(...p1)

      if (i === points.length - 2) {
        const head = spriteContainter.children[spriteContainter.children.length - 1]
        head.position.set(...points[points.length - 1])
        head.rotation = sprite.rotation
      }
    }
  })
}

const checkGraphics = () => {
  let startTime = performance.now()
  drawGraphics(graphicsContainers, points)
  return (performance.now() - startTime) / 1000
}

const checkSprites = () => {
  const startTime = performance.now()
  drawSprites(spriteContainers, points)
  return (performance.now() - startTime) / 1000
}

const logBetterResult = (graphicsResult, spritesResult) => {
  if (graphicsResult < spritesResult) {
    const offset = spritesResult / graphicsResult
    console.log(`GRAPHICS result is ${offset} times better`)
    return
  }

  const offset = graphicsResult / spritesResult
  console.log(`SPRITES result is ${offset} times better`)
}

const checkPerfomance = () => {
  const graphicsDuration = checkGraphics()
  console.log('GRAPHICS:', graphicsDuration)
  const spritesDuration = checkSprites()
  console.log('SPRITES:', spritesDuration)
  logBetterResult(graphicsDuration, spritesDuration)
  console.log('---------------------')

}

let graphicsPolyline: Polyline

onMounted(() => {
  app = new Application({
    view: view.value,
    resizeTo: window,
    resolution: window.devicePixelRatio
  })

  view.value.style.width = '100%'
  view.value.style.height = '100%'

  graphicsPolyline = new Polyline({
    width: 2,
    color: '#FFFFFF',
    label: '',
    points: [{ x: 200, y: 200}, {x: 200, y: 100}, { x: 400, y: 689 }, { x: 523, y: 200 }, { x: 754, y: 450 }]
  })

  app.stage.addChild(graphicsPolyline.graphics)
  app.stage.addChild(graphicsPolyline.label)
  console.log(graphicsPolyline.graphics)

  // Array.from({ length: 1 }).map(() => {
  //   const spriteContainter = new Container<Sprite | ArrowHead>()
  //   points.forEach(() => {
  //     const sprite = createSprite()
  //     spriteContainter.addChild(sprite)
  //   })
  //   spriteContainter.addChild(new ArrowHead())
  //   app.stage.addChild(spriteContainter.setTransform(200, 0))
  //   spriteContainers.push(spriteContainter)
  //
  //   const graphicsPolyline = new Graphics()
  //   app.stage.addChild(graphicsPolyline)
  //   graphicsContainers.push(graphicsPolyline)
  // })
  //
  // checkPerfomance()
  //
  // const ticker = new Ticker()
  // ticker.start()
  // ticker.add((delta) => {
  //   FPS.value = ticker.FPS
  // })
})

const onCacheGraphics = () => {
  cacheGraphics.value = !cacheGraphics.value
}

const onRedraw = () => {
  checkPerfomance()
}

const pointsCount = ref<number>(points.length)

function onPointsCountSave() {
  setPoints(Number(pointsCount.value))
  checkPerfomance()
}
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: .5em;">
    FPS: {{ Math.round(FPS) }}
    <button style="width: 300px; display: flex; gap: 1em;" @click="onCacheGraphics">
      cache Graphics
      <span :style="{ color: cacheGraphics ? 'green' : 'red' }">{{ cacheGraphics ? 'cached' : 'not cached'}}</span>
    </button>
    <button style="width: 200px" @click="onRedraw">redraw</button>
    <div>
      points count <input placeholder="count" v-model="pointsCount"> <button @click="onPointsCountSave">save</button>
    </div>
  </div>

  <canvas ref="view"></canvas>
</template>

<style scoped>

</style>

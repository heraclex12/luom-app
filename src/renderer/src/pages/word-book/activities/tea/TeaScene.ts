// Bubble Tea Shop scene: a pastel shop counter. A round animal customer walks in and waits behind the counter; each
// right letter drops a tapioca pearl into the cup and the tea rises; a wrong letter bounces off the rim. A finished
// order gets a lid and a straw, slides over to the customer, who hops with hearts (or sighs, when given up) and leaves.
import * as THREE from 'three'
import { easeOutBack, flat, progress, shared, Stage } from '@/components/three/Stage'
import { CRITTER_KINDS, glyphTexture, makeCritter, type Critter, type Mood } from '@/components/three/critters'

const COUNTER_TOP = 1.0
const CUP_X = 1.3
const CUP_Z = 0.8
const CUP_H = 1.1
const SPOT_X = -1.7 // where the customer stands
const STEP_Y = 0.55 // customers stand on a step behind the counter (shoulders above it)
const OFF_X = -7.5 // off stage
/** Tea flavours: milk tea, taro, matcha, strawberry, mango, brown sugar. */
const FLAVOURS = ['#d9b38c', '#b79ad6', '#9ccf8b', '#f4a3b4', '#ffcc5c', '#b8865b']

interface Pearl {
  mesh: THREE.Mesh
  start: number
  to: THREE.Vector3
  /** Bounces off the rim and falls away (wrong letter). */
  miss: boolean
}

interface Floater {
  sprite: THREE.Sprite
  start: number
  from: THREE.Vector3
  drift: number
}

export class TeaScene extends Stage {
  private customer: Critter | null = null
  private leaving: { c: Critter; start: number; fromX: number }[] = []
  private custX = OFF_X
  private custTarget = OFF_X
  private hopStart = -10
  private shakeStart = -10
  private onArrive: (() => void) | null = null
  private cup = new THREE.Group()
  private tea: THREE.Mesh
  private teaMat = flat(FLAVOURS[0], { roughness: 0.5, transparent: true, opacity: 0.92 })
  private lid: THREE.Group
  private pearls: Pearl[] = []
  private pearlGeo = shared(new THREE.SphereGeometry(0.085, 10, 8))
  private pearlMat = flat('#3b2418', { roughness: 0.25, metalness: 0.1 })
  private missMat = flat('#e07a6a', { roughness: 0.4 })
  private fill = 0
  private fillShown = 0
  private letters = 1
  private laid = 0
  private serveStart = -10
  private served: ((v: void) => void) | null = null
  private floaters: Floater[] = []
  private heart = glyphTexture('heart', '#ff6f91')
  private coin = glyphTexture('sparkle', '#ffd34d')
  private bubble: HTMLElement | null = null
  private customerCount = 0

  constructor(canvas: HTMLCanvasElement) {
    super(canvas, { background: '#fbe3e8', fov: 38, shadows: true })
    this.scene.add(new THREE.HemisphereLight('#fffaf5', '#c9b6bd', 2.6))
    const sun = new THREE.DirectionalLight('#fff3e6', 2.2)
    sun.position.set(3, 8, 6)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 6, bottom: -3 })
    this.scene.add(sun)

    // Back wall, floor, a striped awning, a menu board and a shelf of cups.
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), flat('#fbd5dd'))
    wall.position.set(0, 4, -2.6)
    wall.receiveShadow = true
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 8), flat('#f3c4cd'))
    floor.rotation.x = -Math.PI / 2
    floor.position.z = -1
    floor.receiveShadow = true
    this.scene.add(wall, floor)
    for (let i = 0; i < 18; i++) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.9), flat(i % 2 ? '#ffffff' : '#ff8fa3'))
      stripe.position.set(-8 + i * 0.9, 4.25, -1.9)
      stripe.rotation.x = 0.5
      this.scene.add(stripe)
    }
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 0.1), flat('#3d6b5c'))
    board.position.set(2.6, 2.9, -2.5)
    this.scene.add(board)
    FLAVOURS.slice(0, 4).forEach((c, i) => {
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), flat(c))
      dot.position.set(1.85, 3.35 - i * 0.3, -2.44)
      const line = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.08), flat('#e8f2ee'))
      line.position.set(2.75, 3.35 - i * 0.3, -2.44)
      this.scene.add(dot, line)
    })
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 0.5), flat('#ffffff'))
    shelf.position.set(-2.4, 2.9, -2.35)
    this.scene.add(shelf)
    FLAVOURS.slice(0, 5).forEach((c, i) => {
      const mini = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.38, 12), flat(c))
      mini.position.set(-3.5 + i * 0.55, 3.14, -2.35)
      this.scene.add(mini)
    })
    // Hanging lamps.
    for (const x of [-3, 0, 3]) {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 4), flat('#5a4a50'))
      cord.position.set(x, 5.4, -1)
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.3, 14, 1, true), flat('#ffffff', { side: THREE.DoubleSide }))
      shade.position.set(x, 4.7, -1)
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff4c7' }))
      bulb.position.set(x, 4.58, -1)
      this.scene.add(cord, shade, bulb)
    }

    // Counter.
    const front = new THREE.Mesh(new THREE.BoxGeometry(12, COUNTER_TOP, 1.6), flat('#9fdcc8'))
    front.position.set(0, COUNTER_TOP / 2, CUP_Z)
    front.receiveShadow = true
    const top = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.12, 1.8), flat('#fff8f4'))
    top.position.set(0, COUNTER_TOP + 0.06, CUP_Z)
    top.receiveShadow = true
    this.scene.add(front, top)
    for (let i = 0; i < 12; i++) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 0.02), flat('#86cdb6'))
      panel.position.set(-5.5 + i, COUNTER_TOP / 2, CUP_Z + 0.81)
      this.scene.add(panel)
    }

    // The cup: clear plastic, tea inside, pearls at the bottom; lid + straw shown when served.
    const plastic = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.36, CUP_H, 28, 1, true),
      new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.32, roughness: 0.1, side: THREE.DoubleSide }),
    )
    plastic.position.y = CUP_H / 2
    const base = new THREE.Mesh(new THREE.CircleGeometry(0.36, 28), flat('#ffffff', { transparent: true, opacity: 0.5 }))
    base.rotation.x = -Math.PI / 2
    base.position.y = 0.01
    this.tea = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.34, 1, 28), this.teaMat)
    this.tea.position.y = 0.01
    this.tea.scale.y = 0.001
    this.lid = new THREE.Group()
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, roughness: 0.1 }),
    )
    dome.scale.y = 0.35
    const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 10), flat('#ff6f91'))
    straw.position.set(0.1, 0.35, 0)
    straw.rotation.z = -0.15
    this.lid.add(dome, straw)
    this.lid.position.y = CUP_H
    this.lid.visible = false
    this.cup.add(plastic, base, this.tea, this.lid)
    this.cup.position.set(CUP_X, COUNTER_TOP + 0.12, CUP_Z)
    this.cup.traverse((o) => (o.castShadow = true))
    this.scene.add(this.cup)
    this.frame()
  }

  protected onResize(): void {
    this.frame()
  }

  /** Keep the customer and the cup in view whatever the aspect. */
  private frame(): void {
    const halfWidth = 4
    const hHalf = Math.atan(Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.aspect)
    const d = Math.max(7.5, halfWidth / Math.tan(hHalf))
    this.camera.position.set(-0.2, 2.8, d)
    this.camera.lookAt(-0.2, 2.1, 0)
  }

  /** The speech bubble (HTML) that follows the customer's head. */
  setBubble(el: HTMLElement | null): void {
    this.bubble = el
    this.render()
  }

  /** Next customer: the previous one (if still here) leaves, an empty cup of a new flavour, a new animal walks in. */
  newOrder(letters: number, flavour: number): Promise<void> {
    if (this.customer) this.leaving.push({ c: this.customer, start: this.t, fromX: this.custX })
    for (const p of this.pearls) p.mesh.removeFromParent() // shared geometry + materials
    this.pearls = []
    this.letters = Math.max(1, letters)
    this.laid = 0
    this.fill = this.fillShown = 0
    this.tea.scale.y = 0.001
    this.teaMat.color.set(FLAVOURS[Math.abs(flavour) % FLAVOURS.length])
    this.lid.visible = false
    this.cup.position.set(CUP_X, COUNTER_TOP + 0.12, CUP_Z)
    this.serveStart = -10
    const c = makeCritter(CRITTER_KINDS[this.customerCount++ % CRITTER_KINDS.length])
    c.group.position.set(OFF_X, 0, -1)
    this.scene.add(c.group)
    this.customer = c
    this.custX = OFF_X
    this.custTarget = SPOT_X
    if (this.reduced) {
      this.custX = SPOT_X
      this.render()
      return Promise.resolve()
    }
    return new Promise((done) => (this.onArrive = done))
  }

  setMood(m: Mood): void {
    this.customer?.setMood(m)
    this.render()
  }

  /** A right letter: a pearl drops into the cup and the tea rises. */
  pearl(): void {
    const i = this.laid++
    const layer = Math.floor(i / 6)
    const a = (i % 6) * (Math.PI / 3) + layer * 0.5
    const to = new THREE.Vector3(Math.cos(a) * 0.2, 0.1 + layer * 0.15, Math.sin(a) * 0.2)
    const mesh = new THREE.Mesh(this.pearlGeo, this.pearlMat)
    this.cup.add(mesh)
    this.pearls.push({ mesh, start: this.t, to, miss: false })
    this.fill = Math.min(1, this.laid / this.letters)
    this.render()
  }

  /** A wrong letter: a red pearl bounces off the rim; the customer shakes their head. */
  miss(): void {
    const mesh = new THREE.Mesh(this.pearlGeo, this.missMat)
    this.cup.add(mesh)
    this.pearls.push({ mesh, start: this.t, to: new THREE.Vector3(1.4, -1.2, 0.6), miss: true })
    this.shakeStart = this.t
    this.render()
  }

  /** Lid and straw, slide the cup to the customer; happy = hop with hearts, else a sigh. Resolves when done. */
  serve(happy: boolean, coins: number): Promise<void> {
    this.lid.visible = true
    this.fill = 1
    this.serveStart = this.t
    this.customer?.setMood(happy ? 'happy' : 'sad')
    if (happy) {
      this.hopStart = this.t + 0.7
      for (let i = 0; i < 5; i++) this.float(this.heart, new THREE.Vector3(SPOT_X, 2.8, -0.8), 0.7 + i * 0.12, 0.4)
      for (let i = 0; i < Math.min(coins, 10); i++)
        this.float(this.coin, new THREE.Vector3(CUP_X - 1.2, COUNTER_TOP + 0.3, CUP_Z), 0.8 + i * 0.07, 0.25)
    }
    if (this.reduced) {
      this.render()
      return Promise.resolve()
    }
    return new Promise((done) => (this.served = done))
  }

  private float(tex: THREE.Texture, from: THREE.Vector3, delay: number, size: number): void {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }))
    sprite.scale.setScalar(size)
    sprite.visible = false
    this.scene.add(sprite)
    this.floaters.push({ sprite, start: this.t + delay, from, drift: (Math.random() - 0.5) * 1.6 })
  }

  protected update(t: number, dt: number): void {
    // Customer walks in / bobs while waiting / hops / shakes the head.
    const c = this.customer
    if (c) {
      const diff = this.custTarget - this.custX
      this.custX += Math.sign(diff) * Math.min(Math.abs(diff), dt * 5)
      const walking = Math.abs(diff) > 0.01
      const hop = progress(t, this.hopStart, 0.5)
      c.group.position.x = this.custX
      c.group.position.y = STEP_Y + (walking ? Math.abs(Math.sin(t * 11)) * 0.12 : Math.sin(t * 2) * 0.03) + (hop > 0 && hop < 1 ? Math.sin(hop * Math.PI) * 0.6 : 0)
      c.group.rotation.y = walking ? 0.5 : Math.sin(t * 0.9) * 0.08
      const shake = progress(t, this.shakeStart, 0.5)
      c.head.rotation.y = shake < 1 ? Math.sin(shake * Math.PI * 4) * 0.35 * (1 - shake) : 0
      if (!walking && this.onArrive) {
        const cb = this.onArrive
        this.onArrive = null
        cb()
      }
      this.placeLabel(this.bubble, new THREE.Vector3(this.custX, 2.35 + c.group.position.y, -1))
      if (this.bubble) this.bubble.style.opacity = walking ? '0' : '1'
    }
    for (const l of [...this.leaving]) {
      const k = progress(t, l.start, 1.8)
      l.c.group.position.x = l.fromX + (-OFF_X - l.fromX) * k // out the other side
      l.c.group.position.y = STEP_Y + Math.abs(Math.sin(t * 11)) * 0.12
      l.c.group.rotation.y = 0.6
      if (k >= 1) {
        this.discard(l.c.group)
        this.leaving.splice(this.leaving.indexOf(l), 1)
      }
    }
    // Pearls drop in with a bounce; misses hit the rim and fly off.
    for (const p of [...this.pearls]) {
      if (!p.miss) {
        const k = this.reduced ? 1 : progress(t, p.start, 0.45)
        p.mesh.position.set(p.to.x, p.to.y + (1 - easeOutBack(k)) * 2.2, p.to.z)
        continue
      }
      const k = this.reduced ? 1 : progress(t, p.start, 0.9)
      if (k < 0.35) {
        const q = k / 0.35
        p.mesh.position.set(0.3, 2.2 - q * (2.2 - CUP_H), 0.3)
      } else {
        const q = (k - 0.35) / 0.65
        p.mesh.position.set(0.3 + q * p.to.x, CUP_H + Math.sin(q * Math.PI) * 0.5 + q * q * p.to.y, 0.3 + q * p.to.z)
      }
      if (k >= 1) {
        p.mesh.removeFromParent()
        this.pearls.splice(this.pearls.indexOf(p), 1)
      }
    }
    // Tea level eases toward the fill.
    this.fillShown += (this.fill - this.fillShown) * Math.min(1, dt * 6 || 1)
    const h = Math.max(0.001, this.fillShown * (CUP_H - 0.15))
    this.tea.scale.y = h
    this.tea.position.y = 0.01 + h / 2
    // Serving: lid pops on, the cup slides to the customer.
    if (this.serveStart > 0) {
      const pop = this.reduced ? 1 : progress(t, this.serveStart, 0.3)
      this.lid.scale.setScalar(easeOutBack(pop))
      const slide = this.reduced ? 1 : progress(t, this.serveStart + 0.35, 0.6)
      this.cup.position.x = CUP_X + (SPOT_X + 1.25 - CUP_X) * (1 - Math.pow(1 - slide, 3))
      if (progress(t, this.serveStart, 2.1) >= 1 && this.served) {
        const done = this.served
        this.served = null
        done()
      }
    }
    for (const f of [...this.floaters]) {
      const k = progress(t, f.start, 1.4)
      f.sprite.visible = t >= f.start
      f.sprite.position.set(f.from.x + f.drift * k, f.from.y + k * 1.8, f.from.z + 0.4)
      f.sprite.material.opacity = 1 - k * k
      if (k >= 1) {
        f.sprite.removeFromParent()
        f.sprite.material.dispose() // the heart / coin texture is shared (freed in dispose)
        this.floaters.splice(this.floaters.indexOf(f), 1)
      }
    }
  }

  dispose(): void {
    this.pearlGeo.dispose()
    this.pearlMat.dispose()
    this.missMat.dispose()
    this.heart.dispose()
    this.coin.dispose()
    super.dispose()
  }
}

// Word garden, three.js part: a floating island with one low-poly plant per word (see wordbook/garden.ts for the
// model). The island grows with the learner's level: a fence, a cottage, a pond, a wood, a village… move in around the
// plants (wordbook/gardenWorld.ts says what and where; gardenDecor.ts builds them). Gentle sway, slow turn, drag to
// rotate, hover / click a plant (hover a trophy for its name). From level 100 floating islands join (gardenIslands.ts)
// and the look can change with the seasons or turn to night (gardenSky.ts). Streak visitors and trophies stand among
// the rest. Plants listed in `grow` start small and grow in (end of a study session); whatever has just arrived grows
// in the same way (`reveal` keys). Honours prefers-reduced-motion (still frames only).
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import type { GardenWorld, Plant, ShownLook, Trophy, VisitorKind } from '@/wordbook'
import { flowerFor, gardenLayout, gardenRadius, gardenWorld, plantVariant } from '@/wordbook'
import { DecorKit, type Anim } from './gardenDecor'
import { buildIslet } from './gardenIslands'
import { buildLand } from './gardenLand'
import { GardenSky } from './gardenSky'
import { buildPeople, buildTownLand } from './gardenTown'

// The app's world: the one green for stems, amber seeds, blue water drops (ground colours: gardenDecor's GROUND).
const C = {
  seed: '#d8ae5a',
  stem: '#2f7a52',
  leaf: '#4f9d63',
  leafDry: '#c9a94e',
  drop: '#6f9fe0',
}

/** What the pointer is over: a plant (clickable) or a trophy (its name). */
export type HoverTarget = { kind: 'plant'; plant: Plant } | { kind: 'trophy'; trophy: Trophy }

export interface GardenCallbacks {
  onHover: (target: HoverTarget | null, screen: { x: number; y: number } | null) => void
  onSelect: (plant: Plant) => void
  /** A floating island was clicked (its index in the world's islands). */
  onIslet?: (index: number) => void
}

/** Where the camera looks and how much it keeps in view (it glides between them). */
interface View {
  target: THREE.Vector3
  fit: number
}

/** Everything the garden shows. */
export interface GardenView {
  plants: readonly Plant[]
  /** dictIds that grow in with a little delay each (end of a study session). */
  grow?: ReadonlySet<number>
  /** The learner's level: which world. */
  level?: number
  /** Things that have just arrived and grow in: `tier:N`, `visitor:fox`, `trophy:list:3`. */
  reveal?: ReadonlySet<string>
  visitors?: readonly VisitorKind[]
  trophies?: readonly Trophy[]
  look?: ShownLook
}

interface PlantNode {
  plant: Plant
  group: THREE.Group
  /** Swaying part (everything above ground). */
  top: THREE.Group
  drop?: THREE.Mesh
  phase: number
  /** Grow-in: start time (s) or null when fully grown. */
  growAt: number | null
  scale: number
}

/** Something a world brought; it grows in when that world has just arrived. */
interface DecorNode {
  group: THREE.Group
  growAt: number | null
  scale: number
}

/** Overall plant size relative to the spacing between plants. */
const PLANT_SIZE = 1.45

const mat = (color: string, extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...extra })

export class GardenScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200)
  private world = new THREE.Group()
  private island = new THREE.Group()
  private plantsGroup = new THREE.Group()
  private decorGroup = new THREE.Group()
  private nodes: PlantNode[] = []
  private kit = new DecorKit()
  private garden: GardenWorld = gardenWorld(1)
  private decor: DecorNode[] = []
  private anims: Anim[] = []
  /** Farthest ground from the centre (castle island included): camera and shadow framing. */
  private extent = 2
  /** Garden rescue: the plant being asked about (ring at its foot), timed effects, auto-turn switch. */
  private focused: PlantNode | null = null
  private ring: THREE.Mesh
  private effects: { kind: 'water' | 'shake'; node: PlantNode; start: number; done: () => void; drops?: THREE.Mesh[] }[] = []
  private autoRotate = true
  private lastT = 0
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2(-9, -9)
  private hovered: PlantNode | null = null
  /** Seconds since the plants were (re)set: drives sway and the grow-in. */
  private timer = new THREE.Timer()
  private frame = 0
  private running = false
  private visible = true
  private yaw = -0.5
  private pitch = 0.5
  private drag: { x: number; y: number; yaw: number; pitch: number; moved: boolean } | null = null
  private radius = 2
  private readonly reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  private readonly geo = {
    seed: new THREE.SphereGeometry(0.11, 7, 5),
    stem: new THREE.CylinderGeometry(0.025, 0.035, 1, 5),
    leaf: new THREE.SphereGeometry(0.12, 6, 4),
    drop: new THREE.SphereGeometry(0.075, 8, 6),
    hit: new THREE.CylinderGeometry(0.26, 0.26, 1.1, 6),
  }
  private readonly mats = {
    seed: mat(C.seed),
    stem: mat(C.stem),
    leaf: mat(C.leaf),
    leafDry: mat(C.leafDry),
    drop: mat(C.drop, { emissive: C.drop, emissiveIntensity: 0.35, roughness: 0.3, transparent: true, opacity: 0.92 }),
    hit: new THREE.MeshBasicMaterial({ visible: false }),
  }

  constructor(
    private canvas: HTMLCanvasElement,
    private cb: GardenCallbacks,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    // Soft all-round light from a built-in studio room (no image files): rounder, less flat shading.
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose()

    this.hemi = new THREE.HemisphereLight('#fff8ec', '#6b6255', 1.6)
    this.scene.add(this.hemi, this.sky.group)
    const sun = new THREE.DirectionalLight('#fff6e8', 2.2)
    sun.position.set(4, 9, 5)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.bias = -0.0004
    sun.shadow.normalBias = 0.02
    this.scene.add(sun)
    this.sun = sun

    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.27, 40),
      new THREE.MeshBasicMaterial({ color: '#e3b12f', transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
    )
    this.ring.rotation.x = -Math.PI / 2
    this.ring.position.y = 0.012
    this.ring.visible = false
    this.world.add(this.island, this.decorGroup, this.plantsGroup)
    this.scene.add(this.world)

    canvas.addEventListener('pointerdown', this.onDown)
    window.addEventListener('pointermove', this.onMove)
    window.addEventListener('pointerup', this.onUp)
    canvas.addEventListener('pointerleave', this.onLeave)
    canvas.addEventListener('wheel', this.onWheel, { passive: false })
  }
  private sun: THREE.DirectionalLight
  private hemi: THREE.HemisphereLight
  private sky = new GardenSky()
  private look: ShownLook = 'summer'
  private landAnims: Anim[] = []
  /** Pinch to zoom (trackpad): 1 = the whole garden in view. */
  private zoom = 1
  /** Floating islands (for visits and clicks). */
  private islets: { group: THREE.Group; islet: import('@/wordbook').Islet }[] = []
  /** Camera: where it is looking now, and where it is gliding to. */
  private view: View = { target: new THREE.Vector3(0, -0.6, 0), fit: 3 }
  private goal: View = { target: new THREE.Vector3(0, -0.6, 0), fit: 3 }
  /** Visiting an island (index), or null for the whole garden. */
  private visiting: number | null = null
  /** A just-arrived world's centrepiece being shown: return to the whole garden at this time. */
  private showUntil: number | null = null
  private burst: { points: THREE.Points; start: number } | null = null
  /** Night only: bloom so lamps, lanterns, windows and fireflies glow. */
  private composer: EffectComposer | null = null
  private bloom: UnrealBloomPass | null = null
  /** Trophies on the island (hover shows their names). */
  private trophyNodes: { group: THREE.Group; trophy: Trophy }[] = []
  private hoveredTrophy: Trophy | null = null

  /** Replace the plants and the world around them (see GardenView). */
  setGarden(view: GardenView): void {
    const { plants, grow = new Set<number>(), level = 1, reveal = new Set<string>(), visitors = [], trophies = [], look = 'summer' } = view
    this.garden = gardenWorld(level)
    this.kit.look = look
    const layout = gardenLayout(plants.length, this.garden, { visitors, trophies: trophies.map((t) => t.key) })
    this.radius = layout.radius
    this.extent = layout.extent
    this.buildIsland(layout, plants.length)
    for (const n of this.nodes) this.plantsGroup.remove(n.group)
    this.nodes = []
    this.focused = null
    this.ring.removeFromParent()
    this.effects = []
    let order = 0
    for (const p of plants) {
      const v = plantVariant(p.dictId)
      const group = new THREE.Group()
      group.position.set(p.x, 0, p.z)
      group.rotation.y = v.turn
      const top = new THREE.Group()
      group.add(top)
      const drop = this.buildPlant(p, top, v.hue)
      const hit = new THREE.Mesh(this.geo.hit, this.mats.hit)
      hit.position.y = 0.5
      hit.userData.dictId = p.dictId
      group.add(hit)
      const growing = grow.has(p.dictId) && !this.reduced
      const node: PlantNode = {
        plant: p,
        group,
        top,
        drop,
        phase: v.hue * Math.PI * 2,
        growAt: growing ? 0.35 + order++ * 0.12 : null,
        scale: v.scale * PLANT_SIZE,
      }
      group.scale.setScalar(growing ? 0.001 : v.scale * PLANT_SIZE)
      this.nodes.push(node)
      this.plantsGroup.add(group)
    }
    this.buildWorld(layout, reveal, visitors, trophies)
    this.sky.set(look, this.extent, this.scene, this.hemi, this.sun)
    this.look = look
    // Camera: keep visiting an island if it is still there, else the whole garden; show what has just arrived.
    this.goal = this.visiting !== null && this.islets[this.visiting] ? this.goal : this.homeView()
    if (this.visiting !== null && !this.islets[this.visiting]) this.visiting = null
    this.view = { target: this.goal.target.clone(), fit: this.goal.fit }
    this.lastCamT = 0
    const arrived = [...reveal].find((k) => k.startsWith('tier:'))
    if (arrived) {
      const tier = Number(arrived.slice(5))
      const isl = this.islets.find((i) => i.islet.tier === tier)
      const CENTRE = ['cottage', 'pond', 'treehouse', 'farm', 'chapel', 'fountain']
      const item = layout.items.find((it) => it.reveal === arrived && CENTRE.includes(it.kind))
      if (isl) this.showArrival(isl.islet.x, isl.islet.lift + isl.islet.radius * 0.4, isl.islet.z, isl.islet.radius * 1.5)
      else if (item) {
        // Settlements are seen whole: step back further for the village and the town.
        const wide = item.kind === 'fountain' ? 4.2 : item.kind === 'chapel' ? 3.4 : item.kind === 'farm' ? 3.0 : 0
        this.showArrival(item.x, 0.4 * layout.scale, item.z, Math.max(2.2, item.size * 3.2, wide * layout.scale))
      }
    }
    if (look === 'night' && !this.composer) this.makeComposer()
    // Light covers the island; camera distance follows its size.
    const s = this.sun.shadow.camera
    s.left = s.bottom = -this.extent - 1
    s.right = s.top = this.extent + 1
    s.far = 60
    s.updateProjectionMatrix()
    const size = this.extent > 6 ? 2048 : 1024
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size)
      this.sun.shadow.map?.dispose()
      this.sun.shadow.map = null
    }
    this.timer = new THREE.Timer()
    this.placeCamera()
    this.renderOnce()
    this.start()
  }

  // ── garden rescue ──

  private node(dictId: number): PlantNode | null {
    return this.nodes.find((n) => n.plant.dictId === dictId) ?? null
  }

  /** Stop / resume the slow turn (rescue keeps the view still). */
  setAutoRotate(on: boolean): void {
    this.autoRotate = on
  }

  /** Put the pulsing ring at a plant's foot (null hides it). */
  focusPlant(dictId: number | null): void {
    this.focused = dictId == null ? null : this.node(dictId)
    this.ring.removeFromParent()
    if (this.focused) {
      this.focused.group.add(this.ring)
      this.ring.visible = true
    }
    if (this.reduced) this.renderOnce()
  }

  /** Watering can over a plant, then it perks up as a healthy sprout. Resolves when done. */
  waterPlant(dictId: number): Promise<void> {
    const node = this.node(dictId)
    if (!node) return Promise.resolve()
    return new Promise((done) => {
      if (this.reduced) {
        this.revive(node, this.lastT)
        this.renderOnce()
        done()
        return
      }
      const drops = Array.from({ length: 12 }, (_, i) => {
        const d = new THREE.Mesh(this.geo.drop, this.mats.drop)
        const a = (i / 12) * Math.PI * 2
        d.scale.setScalar(0.55)
        d.position.set(Math.cos(a) * 0.16 * (1 + (i % 3) * 0.4), 1.5 + (i % 4) * 0.12, Math.sin(a) * 0.16)
        d.userData.y0 = d.position.y
        node.group.add(d)
        return d
      })
      this.effects.push({ kind: 'water', node, start: this.lastT, done, drops })
    })
  }

  /** A short shudder (wrong answer). */
  shakePlant(dictId: number): Promise<void> {
    const node = this.node(dictId)
    if (!node || this.reduced) return Promise.resolve()
    return new Promise((done) => this.effects.push({ kind: 'shake', node, start: this.lastT, done }))
  }

  private revive(node: PlantNode, t: number): void {
    node.top.clear()
    node.drop?.removeFromParent()
    node.drop = undefined
    node.plant = { ...node.plant, stage: 'sprout' }
    this.buildPlant(node.plant, node.top, plantVariant(node.plant.dictId).hue)
    node.growAt = this.reduced ? null : t - 0.45 // join the grow-in curve half way: a quick bounce
  }

  private runEffects(t: number): void {
    for (const fx of [...this.effects]) {
      const k = (t - fx.start) / (fx.kind === 'water' ? 0.9 : 0.5)
      if (fx.kind === 'water') {
        for (const d of fx.drops ?? []) d.position.y = (d.userData.y0 as number) - Math.min(1, k) * 1.2
        for (const d of fx.drops ?? []) d.visible = k < 0.95
      } else {
        fx.node.group.rotation.z = k < 1 ? Math.sin(k * Math.PI * 6) * 0.22 * (1 - k) : 0
      }
      if (k >= 1) {
        if (fx.kind === 'water') {
          for (const d of fx.drops ?? []) d.removeFromParent()
          this.revive(fx.node, t)
        }
        this.effects.splice(this.effects.indexOf(fx), 1)
        fx.done()
      }
    }
  }

  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return
    this.renderer.setSize(width, height, false)
    this.composer?.setSize(width, height)
    this.camera.aspect = width / height
    this.placeCamera()
    this.renderOnce()
  }

  setVisible(v: boolean): void {
    this.visible = v
    if (v) this.start()
  }

  dispose(): void {
    this.running = false
    cancelAnimationFrame(this.frame)
    this.canvas.removeEventListener('pointerdown', this.onDown)
    window.removeEventListener('pointermove', this.onMove)
    window.removeEventListener('pointerup', this.onUp)
    this.canvas.removeEventListener('pointerleave', this.onLeave)
    this.canvas.removeEventListener('wheel', this.onWheel)
    disposeOwn(this.island)
    this.scene.environment?.dispose()
    this.composer?.dispose()
    this.ring.geometry.dispose()
    Object.values(this.geo).forEach((g) => g.dispose())
    ;[this.mats.seed, this.mats.stem, this.mats.leaf, this.mats.leafDry, this.mats.drop, this.mats.hit].forEach((m) => m.dispose())
    this.kit.dispose()
    this.sky.dispose()
    this.renderer.dispose()
  }

  // ── building ──

  /** The island and what the worlds have done to the land (gardenLand.ts). */
  private buildIsland(layout: ReturnType<typeof gardenLayout>, plantCount: number): void {
    disposeOwn(this.island)
    this.island.clear()
    const bridges = layout.islets.map((i) => Math.atan2(i.z, i.x))
    const land = buildLand(this.kit, layout, this.garden.tier, gardenRadius(plantCount), bridges)
    this.island.add(land.group)
    this.landAnims = land.anims
  }

  /** Everything around the plants: fence, placed things, visitors, trophies, islands, critters. */
  private buildWorld(
    layout: ReturnType<typeof gardenLayout>,
    reveal: ReadonlySet<string>,
    visitors: readonly VisitorKind[],
    trophies: readonly Trophy[],
  ): void {
    this.decorGroup.traverse((o) => {
      if (o instanceof THREE.InstancedMesh) o.dispose()
    })
    disposeOwn(this.decorGroup)
    this.decorGroup.clear()
    this.islets = []
    this.decor = []
    this.anims = []
    this.trophyNodes = []
    this.hoveredTrophy = null
    const t0 = 0.4
    let order = 0
    const add = (group: THREE.Group, key: string): void => {
      this.decorGroup.add(group)
      const growing = reveal.has(key) && !this.reduced
      const node: DecorNode = { group, scale: group.scale.x, growAt: growing ? t0 + order++ * 0.15 : null }
      if (growing) group.scale.setScalar(0.001)
      this.decor.push(node)
    }
    if (layout.fence) {
      add(this.kit.fence(layout.fence.radius, layout.fence.gate), 'tier:1')
      this.decorGroup.add(this.kit.scatter(layout, layout.fence.radius + 0.15))
    }
    let pond: THREE.Group | null = null
    for (const item of layout.items) {
      const trophy = item.ref ? trophies.find((t) => t.key === item.ref) : undefined
      const built = this.kit.build(item, trophy)
      // A big plant area scales the world up with it (layout.scale).
      built.group.scale.multiplyScalar(layout.scale)
      if (item.kind === 'pond') pond = built.group
      if (trophy) this.trophyNodes.push({ group: built.group, trophy })
      if (built.anim) this.anims.push(built.anim)
      add(built.group, item.reveal)
    }
    for (const isl of layout.islets) {
      const built = buildIslet(this.kit, isl, layout.radius, this.kit.look, layout.scale)
      built.group.userData.isletIndex = this.islets.length
      this.islets.push({ group: built.group, islet: isl })
      this.anims.push(built.anim)
      add(built.group, `tier:${isl.tier}`)
    }
    // The settlements' lanes, squares, bridges and bunting; their people and carts.
    if (layout.villageLane || layout.townStreet || layout.squares.length) {
      const town = buildTownLand(this.kit, layout)
      this.decorGroup.add(town.group)
      this.anims.push(...town.anims)
    }
    if (layout.road) {
      const people = buildPeople(this.kit, layout, this.garden.tier, this.garden.progress)
      this.anims.push(people.anim)
      add(people.group, `tier:${Math.min(this.garden.tier, 7)}`)
    }
    if (visitors.includes('dragon')) {
      const d = this.kit.dragon(this.extent)
      this.anims.push(d.anim)
      add(d.group, 'visitor:dragon')
    }
    const blooms = this.nodes
      .filter((n) => n.plant.stage === 'bloom')
      .map((n) => new THREE.Vector3(n.plant.x, DecorKit.height(flowerFor(n.plant.dictId, this.garden.flowers)) * n.scale, n.plant.z))
    const ctx = { inner: Math.max(0.8, this.radius - this.garden.ring - 0.9), extent: this.extent, blooms, pond }
    for (const [kind, count] of Object.entries(this.garden.critters) as [keyof GardenWorld['critters'], number][])
      for (let i = 0; i < count; i++) {
        const c = this.kit.critter(kind, i, ctx)
        if (!c) continue
        this.anims.push(c.anim)
        if (!c.group.parent) this.decorGroup.add(c.group)
      }
  }

  /** Meshes for one plant into `top`; returns the water drop for thirsty plants. */
  private buildPlant(p: Plant, top: THREE.Group, hue: number): THREE.Mesh | undefined {
    const add = (geo: THREE.BufferGeometry, m: THREE.Material, set: (o: THREE.Mesh) => void): THREE.Mesh => {
      const o = new THREE.Mesh(geo, m)
      o.castShadow = true
      set(o)
      top.add(o)
      return o
    }
    if (p.stage === 'seed') {
      // A little mound of soil with a two-leaf shoot.
      add(this.geo.seed, this.mats.seed, (o) => {
        o.scale.set(1.25, 0.5, 1.25)
        o.position.y = 0.01
      })
      add(this.geo.stem, this.mats.stem, (o) => {
        o.scale.set(0.8, 0.12, 0.8)
        o.position.y = 0.1
      })
      for (const side of [-1, 1])
        add(this.geo.leaf, this.mats.leaf, (o) => {
          o.scale.set(0.55, 0.22, 0.4)
          o.position.set(side * 0.055, 0.17, 0)
          o.rotation.z = side * 0.55
        })
      return undefined
    }
    const flower = p.stage === 'bloom' ? flowerFor(p.dictId, this.garden.flowers) : null
    const height = flower ? DecorKit.height(flower) : 0.5
    const dry = p.stage === 'thirsty'
    const lean = dry ? 0.32 : 0
    add(this.geo.stem, this.mats.stem, (o) => {
      o.scale.y = height
      o.position.y = height / 2
      o.rotation.z = lean
      o.position.x = -Math.sin(lean) * height * 0.5
    })
    const tipX = -Math.sin(lean) * height
    const tipY = Math.cos(lean) * height
    const leafMat = dry ? this.mats.leafDry : this.mats.leaf
    for (const side of [-1, 1]) {
      add(this.geo.leaf, leafMat, (o) => {
        o.scale.set(1.25, 0.32, 0.6)
        o.position.set(tipX * 0.45 + side * 0.11, tipY * 0.45, 0)
        o.rotation.z = side * (dry ? -0.6 : 0.45)
      })
    }
    if (flower) {
      this.kit.flower(flower, top, tipX, tipY, hue)
    } else if (!dry) {
      add(this.geo.leaf, this.mats.leaf, (o) => {
        o.scale.set(0.5, 0.75, 0.5)
        o.position.set(tipX, tipY + 0.04, 0)
      })
    }
    if (dry) {
      const drop = new THREE.Mesh(this.geo.drop, this.mats.drop)
      drop.scale.set(1, 1.3, 1)
      drop.position.set(tipX, height + 0.28, 0)
      drop.userData.baseY = height + 0.28
      top.parent?.add(drop) // not swaying with the plant
      return drop
    }
    return undefined
  }

  // ── camera & loop ──

  private placeCamera(): void {
    // Far enough to fit the island both vertically and, in narrow views, horizontally.
    const hHalf = Math.atan(Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.aspect)
    const fit = this.view.fit
    const d = Math.max(fit * 2.75 + 0.6, (fit * 1.12) / Math.tan(hHalf)) * this.zoom
    const target = this.view.target
    this.camera.position.set(
      target.x + Math.sin(this.yaw) * Math.cos(this.pitch) * d,
      target.y + Math.sin(this.pitch) * d,
      target.z + Math.cos(this.yaw) * Math.cos(this.pitch) * d,
    )
    this.camera.lookAt(target)
    this.camera.updateProjectionMatrix()
  }

  /** The whole garden: islands float above and below it and the castle stands tall, so leave room; aim a little low
   * so the near edge and some of the cliffs underneath show too. */
  private homeView(): View {
    return {
      target: new THREE.Vector3(0, -0.35 - this.extent * 0.12, 0),
      fit: this.extent + (this.garden.islands.length ? 1.2 : 0),
    }
  }

  /** Glide to an island (index) or back to the whole garden (null). */
  visit(index: number | null): void {
    const isl = index === null ? null : this.islets[index]
    this.visiting = isl ? index : null
    this.showUntil = null
    if (!isl) this.goal = this.homeView()
    else {
      const { x, z, lift, radius } = isl.islet
      this.goal = { target: new THREE.Vector3(x, lift + radius * 0.35, z), fit: radius * 1.45 }
    }
    if (this.reduced) {
      this.view = { target: this.goal.target.clone(), fit: this.goal.fit }
      this.placeCamera()
      this.draw()
    }
  }

  /** Show something that has just arrived: glide to it with a burst of sparkles, then back after a while. */
  private showArrival(x: number, y: number, z: number, fit: number): void {
    if (this.reduced) return
    this.goal = { target: new THREE.Vector3(x, y, z), fit }
    this.showUntil = 6.5
    const n = 90
    const pos = new Float32Array(n * 3)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: '#ffe08a', size: 0.12 * Math.max(1, fit / 2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    )
    points.position.set(x, y, z)
    points.userData.own = true
    points.userData.ownMaterial = true
    points.userData.dirs = Array.from({ length: n }, (_, i) => {
      const a = i * 2.39996
      const up = 0.3 + ((i * 0.618) % 1) * 0.9
      return new THREE.Vector3(Math.cos(a), up, Math.sin(a)).multiplyScalar(fit * 0.9)
    })
    this.world.add(points)
    this.burst?.points.removeFromParent()
    this.burst = { points, start: 0.6 }
  }

  private start(): void {
    if (this.running || this.reduced || !this.visible) return
    this.running = true
    const tick = (): void => {
      if (!this.running || !this.visible) {
        this.running = false
        return
      }
      this.timer.update()
      this.update(this.timer.getElapsed())
      this.draw()
      this.frame = requestAnimationFrame(tick)
    }
    this.frame = requestAnimationFrame(tick)
  }

  private makeComposer(): void {
    const size = this.renderer.getSize(new THREE.Vector2())
    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.6, 0.4, 0.7)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())
    this.composer.setSize(size.x, size.y)
  }

  /** Bloom at night (the background is dark then); a plain render by day keeps the canvas see-through. */
  private draw(): void {
    if (this.look === 'night' && this.composer) this.composer.render()
    else this.renderer.render(this.scene, this.camera)
  }

  private renderOnce(): void {
    this.timer.update()
    this.update(this.reduced ? 1e6 : this.timer.getElapsed())
    this.draw()
  }

  private lastCamT = 0

  private update(t: number): void {
    this.lastT = t
    this.runEffects(t)
    if (this.focused && !this.reduced) {
      const p = 1 + Math.sin(t * 4) * 0.12
      this.ring.scale.set(p, p, p)
    }
    if (!this.reduced) {
      if (!this.drag && this.autoRotate) this.yaw += this.visiting === null ? 0.0012 : 0.0025
      this.world.position.y = Math.sin(t * 0.8) * 0.05
      if (this.showUntil !== null && t > this.showUntil) {
        this.showUntil = null
        this.goal = this.homeView()
      }
      // Glide towards the goal view.
      const k = 1 - Math.exp(-Math.max(0, t - this.lastCamT) * 2.2)
      this.lastCamT = t
      this.view.target.lerp(this.goal.target, k)
      this.view.fit += (this.goal.fit - this.view.fit) * k
      this.placeCamera()
    }
    if (this.burst) {
      const k = (t - this.burst.start) / 2.4
      const pts = this.burst.points
      if (k >= 1) {
        pts.geometry.dispose()
        ;(pts.material as THREE.Material).dispose()
        pts.removeFromParent()
        this.burst = null
      } else if (k > 0) {
        const attr = pts.geometry.getAttribute('position') as THREE.BufferAttribute
        const e = 1 - Math.pow(1 - k, 3)
        ;(pts.userData.dirs as THREE.Vector3[]).forEach((d, i) => attr.setXYZ(i, d.x * e, d.y * e - k * k * 0.6, d.z * e))
        attr.needsUpdate = true
        ;(pts.material as THREE.PointsMaterial).opacity = 1 - k
      }
    }
    this.kit.time.value = t
    for (const a of this.landAnims) a(t)
    for (const a of this.anims) a(t)
    this.sky.update(t)
    for (const d of this.decor) {
      if (d.growAt === null) continue
      const k = Math.min(1, Math.max(0, (t - d.growAt) / 0.9))
      const c = 1.9
      const e = k === 0 ? 0 : 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2)
      d.group.scale.setScalar(Math.max(0.001, d.scale * e))
      if (k >= 1) d.growAt = null
    }
    for (const n of this.nodes) {
      if (!this.reduced) {
        n.top.rotation.z = Math.sin(t * 1.3 + n.phase) * 0.06
        n.top.rotation.x = Math.cos(t * 1.1 + n.phase) * 0.04
        if (n.drop) n.drop.position.y = (n.drop.userData.baseY as number) + Math.sin(t * 2.2 + n.phase) * 0.05
      }
      let s = n.scale
      if (n.growAt !== null) {
        const k = Math.min(1, Math.max(0, (t - n.growAt) / 0.9))
        // ease-out-back: overshoot a little, settle.
        const c = 1.9
        const e = k === 0 ? 0 : 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2)
        s = Math.max(0.001, n.scale * e)
        if (k >= 1) n.growAt = null
      }
      const hover = this.hovered === n ? 1.12 : 1
      n.group.scale.setScalar(s * hover)
    }
    this.pick()
  }

  // ── pointer ──

  private pick(): void {
    if (this.drag?.moved) return
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.raycaster.intersectObjects(this.plantsGroup.children, true)
    const id = hits.find((h) => h.object.userData.dictId != null)?.object.userData.dictId as number | undefined
    const node = id != null ? (this.nodes.find((n) => n.plant.dictId === id) ?? null) : null
    if (node !== this.hovered) {
      this.hovered = node
      this.canvas.style.cursor = node ? 'pointer' : 'grab'
      if (this.reduced) this.draw()
    }
    // No plant under the pointer: maybe a trophy.
    let trophy: { group: THREE.Group; trophy: Trophy } | null = null
    if (!node && this.trophyNodes.length) {
      const th = this.raycaster.intersectObjects(
        this.trophyNodes.map((t) => t.group),
        true,
      )[0]
      if (th) trophy = this.trophyNodes.find((t) => t.group === th.object.parent || t.group === th.object.parent?.parent) ?? null
    }
    if ((trophy?.trophy ?? null) !== this.hoveredTrophy) {
      this.hoveredTrophy = trophy?.trophy ?? null
      if (!node) this.canvas.style.cursor = 'grab'
    }
    const screen = (o: THREE.Object3D, lift: number): { x: number; y: number } => {
      const p = new THREE.Vector3()
      o.getWorldPosition(p)
      p.y += lift
      p.project(this.camera)
      const rect = this.canvas.getBoundingClientRect()
      return { x: ((p.x + 1) / 2) * rect.width, y: ((1 - p.y) / 2) * rect.height }
    }
    if (node) this.cb.onHover({ kind: 'plant', plant: node.plant }, screen(node.group, 0.95))
    else if (trophy) this.cb.onHover({ kind: 'trophy', trophy: trophy.trophy }, screen(trophy.group, 0.6))
    else this.cb.onHover(null, null)
  }

  private setPointer(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect()
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
  }

  private onDown = (e: PointerEvent): void => {
    this.drag = { x: e.clientX, y: e.clientY, yaw: this.yaw, pitch: this.pitch, moved: false }
    this.canvas.style.cursor = 'grabbing'
  }

  private onMove = (e: PointerEvent): void => {
    if (this.drag) {
      const dx = e.clientX - this.drag.x
      const dy = e.clientY - this.drag.y
      if (Math.abs(dx) + Math.abs(dy) > 4) this.drag.moved = true
      this.yaw = this.drag.yaw - dx * 0.008
      this.pitch = Math.min(1.25, Math.max(0.25, this.drag.pitch + dy * 0.006))
      if (this.reduced) {
        this.placeCamera()
        this.draw()
      }
      if (this.drag.moved) this.cb.onHover(null, null)
      return
    }
    if (e.target !== this.canvas) return
    this.setPointer(e)
    if (this.reduced) this.pick()
  }

  private onUp = (e: PointerEvent): void => {
    const d = this.drag
    this.drag = null
    if (!d) return
    this.canvas.style.cursor = this.hovered ? 'pointer' : 'grab'
    if (!d.moved && e.target === this.canvas) {
      this.setPointer(e)
      this.pick()
      if (this.hovered) this.cb.onSelect(this.hovered.plant)
      else if (this.islets.length) {
        const hit = this.raycaster.intersectObjects(this.islets.map((i) => i.group), true)[0]
        let o: THREE.Object3D | null = hit?.object ?? null
        while (o && o.userData.isletIndex === undefined) o = o.parent
        if (o) {
          const index = o.userData.isletIndex as number
          this.visit(index)
          this.cb.onIslet?.(index)
        }
      }
    }
  }

  private onWheel = (e: WheelEvent): void => {
    // Pinch on a trackpad arrives as a wheel event with ctrlKey; plain scrolling still scrolls the page.
    if (!e.ctrlKey) return
    e.preventDefault()
    this.zoom = Math.min(1.15, Math.max(0.4, this.zoom * Math.exp(e.deltaY * 0.01)))
    this.placeCamera()
    if (this.reduced) this.draw()
  }

  private onLeave = (): void => {
    this.pointer.set(-9, -9)
    if (this.reduced) this.pick()
  }
}

/** Free the geometries a build made for itself (shared ones belong to the kit). */
function disposeOwn(root: THREE.Object3D): void {
  root.traverse((o) => {
    if (!o.userData.own) return
    if (o instanceof THREE.InstancedMesh) o.dispose()
    if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
      o.geometry.dispose()
      if (o.userData.ownMaterial) (o.material as THREE.Material).dispose()
    }
  })
}

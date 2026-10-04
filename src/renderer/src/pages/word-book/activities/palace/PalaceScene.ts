// Memory Palace scene: a cozy reading room with seven objects that words "live" on. The camera glides from object
// to object along a fixed route; the object in question glows; word labels (HTML, positioned here every frame) appear
// on their objects.
import * as THREE from 'three'
import { flat, progress, Stage } from '@/components/three/Stage'

export const SPOTS = ['lamp', 'bookshelf', 'table', 'armchair', 'window', 'plant', 'clock'] as const
export type Spot = (typeof SPOTS)[number]

export const SPOT_NAME: Record<Spot, string> = {
  lamp: 'the reading lamp',
  bookshelf: 'the bookshelf',
  table: 'the tea table',
  armchair: 'the armchair',
  window: 'the window',
  plant: 'the plant',
  clock: 'the clock',
}

interface SpotInfo {
  group: THREE.Group
  /** Where the label sits and the camera looks. */
  anchor: THREE.Vector3
  /** Camera position when visiting. */
  view: THREE.Vector3
  glow: THREE.Mesh
}

const OVERVIEW = { pos: new THREE.Vector3(0, 5.2, 9.5), look: new THREE.Vector3(0, 1.4, -1) }

export class PalaceScene extends Stage {
  private spots = new Map<Spot, SpotInfo>()
  private focused: Spot | null = null
  private labels = new Map<Spot, HTMLElement>()
  private camFrom = { pos: OVERVIEW.pos.clone(), look: OVERVIEW.look.clone() }
  private camTo = { pos: OVERVIEW.pos.clone(), look: OVERVIEW.look.clone() }
  private camStart = -10
  private look = OVERVIEW.look.clone()
  private sparkle: { pts: THREE.Points; start: number; at: THREE.Vector3 } | null = null

  constructor(canvas: HTMLCanvasElement) {
    super(canvas, { background: '#e9e4dc', fov: 45, shadows: true })
    this.scene.add(new THREE.HemisphereLight('#fff8ee', '#5d544a', 1.3))
    const sun = new THREE.DirectionalLight('#ffe7c2', 1.8)
    sun.position.set(-6, 9, 6)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 })
    this.scene.add(sun)

    // Room: floor, rug, back and left walls.
    const floor = new THREE.Mesh(new THREE.BoxGeometry(14, 0.2, 10), flat('#b98d62'))
    floor.position.y = -0.1
    floor.receiveShadow = true
    const rug = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.04, 32), flat('#3f8f73'))
    rug.position.set(0.3, 0.02, 0.8)
    rug.receiveShadow = true
    const back = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 0.2), flat('#d6e2dc'))
    back.position.set(0, 3, -5)
    back.receiveShadow = true
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.2, 6, 10), flat('#c9d8d1'))
    left.position.set(-7, 3, 0)
    left.receiveShadow = true
    this.scene.add(floor, rug, back, left)

    this.add('lamp', this.lamp(), new THREE.Vector3(-5.2, 0, -3.4), 2.9, new THREE.Vector3(-2.6, 2.6, 1.6))
    this.add('bookshelf', this.bookshelf(), new THREE.Vector3(-2.2, 0, -4.4), 2.2, new THREE.Vector3(-1.2, 2.4, 1.6))
    this.add('table', this.table(), new THREE.Vector3(0.6, 0, 0.6), 1.2, new THREE.Vector3(1.6, 2.8, 4.6))
    this.add('armchair', this.armchair(), new THREE.Vector3(-3.4, 0, 1.2), 1.4, new THREE.Vector3(-1.2, 2.6, 5))
    this.add('window', this.window(), new THREE.Vector3(2.8, 0, -4.85), 3.1, new THREE.Vector3(2, 2.8, 1.4))
    this.add('plant', this.plant(), new THREE.Vector3(5.2, 0, -3.2), 1.9, new THREE.Vector3(3.6, 2.4, 1.4))
    this.add('clock', this.clock(), new THREE.Vector3(-6.85, 3.6, -1.6), 0.0, new THREE.Vector3(-3.6, 3.4, 1.2))

    this.camera.position.copy(OVERVIEW.pos)
    this.camera.lookAt(OVERVIEW.look)
  }

  // ── furniture (low-poly, shared look with the garden) ──

  private add(spot: Spot, group: THREE.Group, at: THREE.Vector3, labelHeight: number, view: THREE.Vector3): void {
    group.position.copy(at)
    group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
    const glow = new THREE.Mesh(
      new THREE.RingGeometry(0.75, 0.9, 40),
      new THREE.MeshBasicMaterial({ color: '#ffd34d', transparent: true, opacity: 0, side: THREE.DoubleSide }),
    )
    if (spot === 'clock') {
      glow.rotation.y = Math.PI / 2
      glow.position.set(0.12, 0, 0)
    } else {
      glow.rotation.x = -Math.PI / 2
      glow.position.y = 0.03
    }
    group.add(glow)
    this.scene.add(group)
    this.spots.set(spot, { group, anchor: at.clone().add(new THREE.Vector3(0, labelHeight, 0)), view, glow })
  }

  private lamp(): THREE.Group {
    const g = new THREE.Group()
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.3, 8), flat('#3b3b3b'))
    pole.position.y = 1.15
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.1, 16), flat('#3b3b3b'))
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 0.6, 16, 1, true),
      flat('#f3dfa9', { emissive: '#f3cf6a', emissiveIntensity: 0.35, side: THREE.DoubleSide }),
    )
    shade.position.y = 2.45
    const bulb = new THREE.PointLight('#ffd98a', 3, 6, 1.5)
    bulb.position.y = 2.2
    g.add(pole, base, shade, bulb)
    return g
  }

  private bookshelf(): THREE.Group {
    const g = new THREE.Group()
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 0.6), flat('#8b5e3c'))
    frame.position.y = 1.2
    g.add(frame)
    const colors = ['#d9534f', '#3f8f73', '#f0c05a', '#5b7fb5', '#c98bb9', '#e9e4dc']
    for (let shelf = 0; shelf < 3; shelf++) {
      let x = -0.95
      for (let b = 0; b < 7; b++) {
        const w = 0.16 + ((b * 7 + shelf * 3) % 4) * 0.04
        const h = 0.5 + ((b + shelf) % 3) * 0.08
        const book = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.4), flat(colors[(b + shelf * 2) % colors.length]))
        book.position.set(x + w / 2, 0.35 + shelf * 0.75 + h / 2, 0.12)
        x += w + 0.03
        g.add(book)
      }
    }
    return g
  }

  private table(): THREE.Group {
    const g = new THREE.Group()
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.1, 20), flat('#a0714a'))
    top.position.y = 0.75
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 0.75, 8), flat('#7a5236'))
    leg.position.y = 0.37
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), flat('#e9e4dc'))
    pot.scale.y = 0.8
    pot.position.set(0.2, 0.95, 0)
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.12, 10), flat('#3f8f73'))
    cup.position.set(-0.3, 0.86, 0.2)
    g.add(top, leg, pot, cup)
    return g
  }

  private armchair(): THREE.Group {
    const g = new THREE.Group()
    const c = flat('#d9825b')
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.45, 1.2), c)
    seat.position.y = 0.4
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.0, 0.3), c)
    back.position.set(0, 0.95, -0.45)
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.55, 1.2), c)
    armL.position.set(-0.65, 0.65, 0)
    const armR = armL.clone()
    armR.position.x = 0.65
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.15), flat('#f0c05a'))
    cushion.position.set(0.2, 0.85, -0.25)
    cushion.rotation.z = 0.2
    g.add(seat, back, armL, armR, cushion)
    g.rotation.y = 0.5
    return g
  }

  private window(): THREE.Group {
    const g = new THREE.Group()
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.8), new THREE.MeshBasicMaterial({ color: '#a8d8f0' }))
    sky.position.set(0, 2.9, 0.12)
    const hill = new THREE.Mesh(new THREE.CircleGeometry(1.1, 20, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#7cc39c' }))
    hill.position.set(0.3, 2.0, 0.13)
    const frameMat = flat('#f4f1ea')
    const bars = [
      [2.4, 0.12, 0, 3.85],
      [2.4, 0.12, 0, 1.95],
      [0.12, 2.0, -1.15, 2.9],
      [0.12, 2.0, 1.15, 2.9],
      [0.08, 1.8, 0, 2.9],
      [2.2, 0.08, 0, 2.9],
    ]
    for (const [w, h, x, y] of bars) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), frameMat)
      bar.position.set(x, y, 0.16)
      g.add(bar)
    }
    g.add(sky, hill)
    return g
  }

  private plant(): THREE.Group {
    const g = new THREE.Group()
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.6, 12), flat('#c96f4a'))
    pot.position.y = 0.3
    g.add(pot)
    for (let i = 0; i < 7; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 4), flat(i % 2 ? '#4cb187' : '#3d9a74'))
      leaf.scale.set(0.5, 1.6, 0.25)
      const a = (i / 7) * Math.PI * 2
      leaf.position.set(Math.cos(a) * 0.25, 0.95 + (i % 3) * 0.12, Math.sin(a) * 0.25)
      leaf.rotation.set(Math.sin(a) * 0.5, a, Math.cos(a) * 0.5)
      g.add(leaf)
    }
    return g
  }

  private clock(): THREE.Group {
    const g = new THREE.Group()
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 24), flat('#f4f1ea'))
    face.rotation.z = Math.PI / 2
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.06, 6, 24), flat('#8b5e3c'))
    rim.rotation.y = Math.PI / 2
    const hand1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.04), flat('#1b2220'))
    hand1.position.set(0.07, 0.15, 0)
    const hand2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.3), flat('#1b2220'))
    hand2.position.set(0.07, 0, 0.12)
    g.add(face, rim, hand1, hand2)
    return g
  }

  // ── control ──

  /** HTML labels to keep positioned over their objects (spot → element). */
  setLabels(labels: Map<Spot, HTMLElement>): void {
    this.labels = labels
    this.render()
  }

  /** Glide to a spot (glowing) or back to the overview (null). */
  visit(spot: Spot | null): void {
    this.focused = spot
    const s = spot ? this.spots.get(spot) : null
    this.camFrom = { pos: this.camera.position.clone(), look: this.look.clone() }
    this.camTo = s ? { pos: s.view.clone(), look: s.anchor.clone().add(new THREE.Vector3(0, -0.6, 0)) } : { ...OVERVIEW }
    this.camStart = this.t
    this.render()
  }

  /** Gold sparkle over a spot (right answer / placed word). */
  celebrate(spot: Spot): void {
    const s = this.spots.get(spot)
    if (!s || this.reduced) return
    if (this.sparkle) this.scene.remove(this.sparkle.pts)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(24 * 3), 3))
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffd34d', size: 0.12, transparent: true }))
    this.scene.add(pts)
    this.sparkle = { pts, start: this.t, at: s.anchor.clone() }
  }

  protected update(t: number): void {
    // Camera glide (ease in-out).
    const k = this.reduced ? 1 : progress(t, this.camStart, 1.1)
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
    this.camera.position.lerpVectors(this.camFrom.pos, this.camTo.pos, e)
    this.look.lerpVectors(this.camFrom.look, this.camTo.look, e)
    this.camera.lookAt(this.look)
    for (const [spot, s] of this.spots) {
      const mat = s.glow.material as THREE.MeshBasicMaterial
      mat.opacity = spot === this.focused ? 0.55 + Math.sin(t * 4) * 0.3 : 0
      s.glow.scale.setScalar(spot === this.focused ? 1 + Math.sin(t * 4) * 0.06 : 1)
    }
    if (this.sparkle) {
      const sk = progress(t, this.sparkle.start, 1)
      const pos = this.sparkle.pts.geometry.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < pos.count; i++) {
        const a = (i / pos.count) * Math.PI * 2
        const r = 0.3 + sk * 0.9
        pos.setXYZ(i, this.sparkle.at.x + Math.cos(a) * r, this.sparkle.at.y + sk * 0.6 + Math.sin(a * 3) * 0.1, this.sparkle.at.z + Math.sin(a) * r)
      }
      pos.needsUpdate = true
      ;(this.sparkle.pts.material as THREE.PointsMaterial).opacity = 1 - sk
      if (sk >= 1) {
        this.scene.remove(this.sparkle.pts)
        this.sparkle = null
      }
    }
    // Labels follow their objects (hidden when behind the camera).
    for (const [spot, el] of this.labels) {
      const s = this.spots.get(spot)
      if (!s) continue
      const v = s.anchor.clone().project(this.camera)
      const visible = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1
      const rect = this.canvas.getBoundingClientRect()
      el.style.transform = `translate(-50%, -100%) translate(${((v.x + 1) / 2) * rect.width}px, ${((1 - v.y) / 2) * rect.height}px)`
      el.style.opacity = visible ? '' : '0'
    }
  }
}

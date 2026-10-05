// Frog Hop scene: a pond stretching away from the camera, rows of three lily pads, a frog on the near bank and a
// lotus home on the far bank. Each row's pads carry meanings (HTML labels placed here). The right pad: the frog hops
// on (a fast answer is a big spinning leap). A wrong pad sinks under the frog, which swims back, splashing.
import * as THREE from 'three'
import { flat, progress, shared, Stage } from '@/components/three/Stage'
import { glyphTexture, makeFrog } from '@/components/three/critters'

const ROW_GAP = 2.7
const PAD_X = [-3.1, 0, 3.1]
const START = new THREE.Vector3(0, 0.12, 2.6)

interface Pad {
  mesh: THREE.Mesh
  sunkAt: number | null
  bobAt: number
}

interface Hop {
  from: THREE.Vector3
  to: THREE.Vector3
  start: number
  duration: number
  height: number
  spin: boolean
  /** Fall in and swim back to `from` after landing (wrong pad). */
  sink: Pad | null
  done: () => void
}

export class FrogScene extends Stage {
  private frog = makeFrog()
  private rows: Pad[][] = []
  private labels: (HTMLElement | null)[] = []
  private labelRow = 0
  private hop: Hop | null = null
  private frogPos = START.clone()
  private camZ = START.z
  private camX = 0
  private ring: THREE.Mesh
  private ringAt: THREE.Vector3 | null = null
  private splashes: { pts: THREE.Points; start: number; at: THREE.Vector3 }[] = []
  private heart = glyphTexture('heart', '#ff6f91')
  private hearts: { s: THREE.Sprite; start: number; dx: number }[] = []
  private home = new THREE.Group()
  private padGeo = shared(new THREE.CircleGeometry(0.95, 20, 0.35, Math.PI * 1.85))
  private danceAt = -10

  constructor(canvas: HTMLCanvasElement) {
    super(canvas, { background: '#d6f0ea', fov: 42, shadows: true })
    this.scene.fog = new THREE.Fog('#d6f0ea', 16, 34)
    this.scene.add(new THREE.HemisphereLight('#f6fffb', '#5f8278', 1.5))
    const sun = new THREE.DirectionalLight('#fff4e0', 2)
    sun.position.set(-5, 12, 6)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -40, far: 60 })
    this.scene.add(sun)
    this.scene.add(sun.target)

    const water = new THREE.Mesh(new THREE.PlaneGeometry(14, 80), flat('#86d3e8', { roughness: 0.3 }))
    water.rotation.x = -Math.PI / 2
    water.position.set(0, -0.05, -30)
    water.receiveShadow = true
    this.scene.add(water)
    for (const side of [-1, 1]) {
      const bank = new THREE.Mesh(new THREE.BoxGeometry(10, 0.6, 80), flat('#9fd6a6'))
      bank.position.set(side * 9.5, 0.1, -30)
      bank.receiveShadow = true
      this.scene.add(bank)
      for (let i = 0; i < 16; i++) {
        const z = 3 - i * 4.3
        const x = side * (5.1 + (i % 3) * 0.5)
        const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.3, 5), flat('#5c9a5a'))
        reed.position.set(x, 0.65, z)
        const flower = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.16, 0),
          flat(['#ff9eaa', '#ffd36e', '#c6a8ff', '#ffffff'][i % 4]),
        )
        flower.position.set(x + side * 0.6, 0.5, z + 1.4)
        this.scene.add(reed, flower)
      }
    }
    const nearBank = new THREE.Mesh(new THREE.BoxGeometry(14, 0.6, 3), flat('#9fd6a6'))
    nearBank.position.set(0, -0.2, START.z + 1)
    nearBank.receiveShadow = true
    this.scene.add(nearBank)
    this.frog.group.position.copy(START)
    this.frog.group.scale.setScalar(0.8)
    this.scene.add(this.frog.group)

    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(1.05, 1.2, 40),
      new THREE.MeshBasicMaterial({ color: '#ffe066', transparent: true, opacity: 0.95, side: THREE.DoubleSide }),
    )
    this.ring.rotation.x = -Math.PI / 2
    this.ring.visible = false
    this.scene.add(this.ring)
    this.scene.add(this.home)
    this.place()
  }

  /** HTML labels for the three pads of the current row. */
  setLabels(els: (HTMLElement | null)[], row: number): void {
    this.labels = els
    this.labelRow = row
    this.render()
  }

  /** A new round of `n` rows: the frog back on the near bank. */
  setRows(n: number): void {
    for (const row of this.rows) for (const p of row) this.discard(p.mesh)
    this.rows = Array.from({ length: n }, (_, r) =>
      PAD_X.map((x, k) => {
        const mesh = new THREE.Mesh(this.padGeo, flat(k % 2 ? '#5fb36b' : '#6cc077', { side: THREE.DoubleSide }))
        mesh.rotation.x = -Math.PI / 2
        mesh.rotation.z = r * 1.3 + k
        mesh.position.set(x + Math.sin(r * 2 + k) * 0.25, 0, this.rowZ(r))
        mesh.receiveShadow = true
        this.scene.add(mesh)
        return { mesh, sunkAt: null, bobAt: -10 }
      }),
    )
    // Far bank with a lotus home.
    for (const c of [...this.home.children]) this.discard(c)
    const z = this.rowZ(n) - 0.6
    const bank = new THREE.Mesh(new THREE.BoxGeometry(14, 0.6, 4), flat('#9fd6a6'))
    bank.position.set(0, -0.2, z - 1.4)
    bank.receiveShadow = true
    const lotusPad = new THREE.Mesh(new THREE.CircleGeometry(1.9, 20), flat('#4fa761', { side: THREE.DoubleSide }))
    lotusPad.rotation.x = -Math.PI / 2
    lotusPad.position.set(0.6, 0.12, z - 0.7)
    this.home.add(bank, lotusPad)
    for (let i = 0; i < 8; i++) {
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), flat(i % 2 ? '#ffb3c6' : '#ffd1dc'))
      const a = (i / 8) * Math.PI * 2
      petal.scale.set(0.6, 1.3, 0.6)
      petal.position.set(1.7 + Math.cos(a) * 0.35, 0.55, z - 0.9 + Math.sin(a) * 0.35)
      petal.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5)
      this.home.add(petal)
    }
    const centre = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), flat('#ffd34d'))
    centre.position.set(1.7, 0.6, z - 0.9)
    this.home.add(centre)
    this.frogPos.copy(START)
    this.frog.group.position.copy(START)
    this.frog.setMood('idle')
    this.hop = null
    this.ringAt = null
    this.danceAt = -10
    this.camZ = START.z
    this.camX = 0
    this.place()
  }

  private rowZ(r: number): number {
    return -r * ROW_GAP
  }

  private padTop(row: number, pad: number): THREE.Vector3 {
    const p = this.rows[row]?.[pad]
    return p ? p.mesh.position.clone().setY(0.08) : new THREE.Vector3(PAD_X[pad], 0.08, this.rowZ(row))
  }

  /** Hop onto a pad: `ok` lands (a `leap` spins), else the pad sinks and the frog swims back. Resolves after. */
  jump(row: number, pad: number, ok: boolean, leap = false): Promise<void> {
    const target = this.padTop(row, pad)
    const p = this.rows[row]?.[pad] ?? null
    return this.hopTo(target, { spin: ok && leap, height: ok && leap ? 2.2 : 1.3, sink: ok ? null : p, landPad: p })
  }

  /** Move on after a wrong answer: hop onto the right pad (no fanfare). */
  moveTo(row: number, pad: number): Promise<void> {
    this.ringAt = null
    return this.hopTo(this.padTop(row, pad), { spin: false, height: 1.2, sink: null, landPad: this.rows[row]?.[pad] ?? null })
  }

  /** Round over: hop onto the lotus, dance, hearts. */
  finish(): Promise<void> {
    const z = this.rowZ(this.rows.length) - 0.6
    return this.hopTo(new THREE.Vector3(0, 0.25, z - 0.6), { spin: true, height: 2, sink: null, landPad: null }).then(() => {
      this.frog.setMood('happy')
      this.danceAt = this.t
      for (let i = 0; i < 6; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.heart, transparent: true, depthWrite: false }))
        s.scale.setScalar(0.4)
        s.visible = false
        this.scene.add(s)
        this.hearts.push({ s, start: this.t + i * 0.15, dx: (i - 2.5) * 0.3 })
      }
    })
  }

  /** Glow ring on the right pad (after a miss). */
  glow(row: number, pad: number): void {
    this.ringAt = this.padTop(row, pad)
    this.render()
  }

  private hopTo(to: THREE.Vector3, o: { spin: boolean; height: number; sink: Pad | null; landPad: Pad | null }): Promise<void> {
    const from = this.frogPos.clone()
    this.frog.setMood(o.sink ? 'idle' : 'happy')
    if (this.reduced) {
      if (!o.sink) this.frogPos.copy(to)
      else o.sink.sunkAt = this.t
      this.place()
      return Promise.resolve()
    }
    return new Promise((done) => {
      this.hop = {
        from,
        to,
        start: this.t,
        duration: o.spin ? 0.7 : 0.55,
        height: o.height,
        spin: o.spin,
        sink: o.sink,
        done: () => {
          if (o.landPad) o.landPad.bobAt = this.t
          done()
        },
      }
    })
  }

  /** Camera follows the frog; labels sit on the current row's pads. */
  private place(): void {
    this.camZ += (this.frogPos.z - this.camZ) * (this.reduced ? 1 : 0.06)
    this.camX += (this.frogPos.x * 0.35 - this.camX) * (this.reduced ? 1 : 0.06)
    const aspect = this.camera.aspect || 1.6
    const back = aspect < 1.4 ? 8.5 : 6.6
    this.camera.position.set(this.camX, 4.6, this.camZ + back)
    this.camera.lookAt(this.camX, 0, this.camZ - 3.2)
    // Labels never wider than the gap between neighbouring pads on screen (long meanings wrap instead of overlapping).
    const row = this.rows[this.labelRow] ?? []
    const xs = row.map((p) => this.toScreen(p.mesh.position.clone().setY(0.2)).x)
    const gap = Math.min(...xs.slice(1).map((x, i) => x - xs[i]))
    this.labels.forEach((el, k) => {
      const pad = row[k]
      if (!el || !pad) return
      if (Number.isFinite(gap)) el.style.maxWidth = `${Math.max(96, Math.floor(gap - 12))}px`
      this.placeLabel(el, pad.mesh.position.clone().setY(0.2))
      el.style.opacity = pad.sunkAt === null ? '' : '0'
    })
  }

  protected update(t: number): void {
    const h = this.hop
    if (h) {
      const k = progress(t, h.start, h.duration)
      if (k < 1) {
        const p = h.from.clone().lerp(h.to, k)
        p.y += Math.sin(k * Math.PI) * h.height
        this.frogPos.copy(p)
        this.frog.group.rotation.y = Math.PI + (h.spin ? k * Math.PI * 2 : 0) // toward the far bank
        this.frog.group.scale.set(0.8, 0.8 * (1 + Math.sin(k * Math.PI) * 0.25), 0.8)
      } else if (!h.sink) {
        this.frogPos.copy(h.to)
        this.frog.group.rotation.y = Math.PI // then turns back to face you
        this.frog.group.scale.setScalar(0.8)
        this.hop = null
        h.done()
      } else {
        // Wrong pad: it sinks, the frog drops in with a splash, then swims back to where it came from.
        if (h.sink.sunkAt === null) {
          h.sink.sunkAt = t
          this.splash(h.to)
          this.frog.setMood('sad')
        }
        const s = progress(t, h.sink.sunkAt, 1.6)
        if (s < 0.3) this.frogPos.copy(h.to).setY(h.to.y - (s / 0.3) * 0.45)
        else {
          const q = (s - 0.3) / 0.7
          const p = h.to.clone().lerp(h.from, q)
          p.y = -0.37 + Math.sin(q * Math.PI) * 0.05 + (q > 0.9 ? (q - 0.9) * 5 * (h.from.y + 0.37) : 0)
          this.frogPos.copy(p)
          this.frog.group.rotation.y = 0 // swims back toward the camera
        }
        if (s >= 1) {
          this.frogPos.copy(h.from)
          this.frog.setMood('idle')
          this.hop = null
          h.done()
        }
      }
    }
    // Waiting: turn back to face you.
    if (!this.hop) this.frog.group.rotation.y += (0 - this.frog.group.rotation.y) * (this.reduced ? 1 : 0.12)
    const dance = progress(t, this.danceAt, 1.6)
    this.frog.group.position.copy(this.frogPos)
    if (dance > 0 && dance < 1) {
      this.frog.group.position.y += Math.abs(Math.sin(dance * Math.PI * 4)) * 0.4
      this.frog.group.rotation.y = Math.sin(dance * Math.PI * 4) * 0.5
    }
    // Pads bob after a landing and sink when wrong.
    this.rows.forEach((row, r) =>
      row.forEach((p, k) => {
        const bob = progress(t, p.bobAt, 0.6)
        const sink = p.sunkAt === null ? 0 : progress(t, p.sunkAt, 0.6)
        p.mesh.position.y = Math.sin(t * 1.3 + r + k) * 0.02 - (bob < 1 ? Math.sin(bob * Math.PI) * 0.12 : 0) - sink * 0.5
        p.mesh.visible = sink < 1
      }),
    )
    this.ring.visible = !!this.ringAt
    if (this.ringAt) {
      this.ring.position.copy(this.ringAt).setY(0.06)
      this.ring.scale.setScalar(1 + Math.sin(t * 6) * 0.06)
    }
    for (const s of [...this.splashes]) {
      const k = progress(t, s.start, 0.7)
      const pos = s.pts.geometry.getAttribute('position') as THREE.BufferAttribute
      for (let j = 0; j < pos.count; j++) {
        const a = (j / pos.count) * Math.PI * 2
        pos.setXYZ(j, s.at.x + Math.cos(a) * k, Math.sin(k * Math.PI) * (0.5 + (j % 3) * 0.2), s.at.z + Math.sin(a) * k)
      }
      pos.needsUpdate = true
      ;(s.pts.material as THREE.PointsMaterial).opacity = 1 - k
      if (k >= 1) {
        this.discard(s.pts)
        this.splashes.splice(this.splashes.indexOf(s), 1)
      }
    }
    for (const hrt of [...this.hearts]) {
      const k = progress(t, hrt.start, 1.4)
      hrt.s.visible = t >= hrt.start
      hrt.s.position.set(this.frogPos.x + hrt.dx * k * 3, this.frogPos.y + 0.9 + k * 1.6, this.frogPos.z)
      hrt.s.material.opacity = 1 - k * k
      if (k >= 1) {
        hrt.s.removeFromParent()
        hrt.s.material.dispose()
        this.hearts.splice(this.hearts.indexOf(hrt), 1)
      }
    }
    this.place()
  }

  private splash(at: THREE.Vector3): void {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(20 * 3), 3))
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.18, transparent: true }))
    this.scene.add(pts)
    this.splashes.push({ pts, start: this.t, at: at.clone() })
  }

  dispose(): void {
    this.padGeo.dispose()
    super.dispose()
  }
}

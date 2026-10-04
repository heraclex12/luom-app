// Word Bridge scene: two banks over a river. Each right letter lays a plank (with its letter) and the sprout walks
// onto it; a wrong letter drops a red plank into the water; a finished word sends the sprout across with a hop.
import * as THREE from 'three'
import { easeOutBack, flat, progress, Stage } from '@/components/three/Stage'

const GAP = 8 // river width between the banks (x from -GAP/2 to GAP/2)
const BANK_TOP = 0

interface Plank {
  mesh: THREE.Mesh
  start: number
  x: number
}

interface Falling {
  mesh: THREE.Mesh
  start: number
  x: number
}

export class BridgeScene extends Stage {
  private planks: Plank[] = []
  private falling: Falling[] = []
  private splashes: { pts: THREE.Points; start: number }[] = []
  private ripples: THREE.Mesh[] = []
  private walker = new THREE.Group()
  private walkerX = -GAP / 2 - 1
  private walkerTarget = -GAP / 2 - 1
  private hopStart = -10
  private letters = 1
  private plankGeo = new THREE.BoxGeometry(1, 0.14, 1.6)
  private texCache = new Map<string, THREE.CanvasTexture>()
  private onArrive: (() => void) | null = null

  constructor(canvas: HTMLCanvasElement) {
    super(canvas, { background: '#e6f0ed', fov: 36, shadows: true })
    this.scene.add(new THREE.HemisphereLight('#f6fbff', '#6c7d77', 1.5))
    const sun = new THREE.DirectionalLight('#fff4e2', 2.1)
    sun.position.set(-4, 10, 7)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 8, bottom: -8 })
    this.scene.add(sun)

    // River with drifting ripples.
    const water = new THREE.Mesh(new THREE.PlaneGeometry(40, 10), flat('#7cc3e6', { roughness: 0.35 }))
    water.rotation.x = -Math.PI / 2
    water.position.y = -0.9
    water.receiveShadow = true
    this.scene.add(water)
    for (let i = 0; i < 14; i++) {
      const r = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9 + (i % 3) * 0.5, 0.06),
        new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 }),
      )
      r.rotation.x = -Math.PI / 2
      r.position.set(-GAP / 2 + ((i * 1.7) % GAP), -0.88, -2.6 + ((i * 0.83) % 5))
      this.ripples.push(r)
      this.scene.add(r)
    }

    // Banks: grass top on soil.
    for (const side of [-1, 1]) {
      const soil = new THREE.Mesh(new THREE.BoxGeometry(8, 1.6, 6), flat('#8a7a63'))
      soil.position.set(side * (GAP / 2 + 4), BANK_TOP - 0.8, 0)
      const grass = new THREE.Mesh(new THREE.BoxGeometry(8, 0.25, 6), flat('#8fcaa9'))
      grass.position.set(side * (GAP / 2 + 4), BANK_TOP - 0.06, 0)
      grass.receiveShadow = true
      this.scene.add(soil, grass)
      // Posts at the bridge ends.
      for (const z of [-0.9, 0.9]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.1, 6), flat('#7a5a3c'))
        post.position.set(side * (GAP / 2 + 0.2), BANK_TOP + 0.45, z)
        post.castShadow = true
        this.scene.add(post)
      }
      // A couple of bushes.
      for (let k = 0; k < 2; k++) {
        const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45 + k * 0.15, 0), flat('#4cb187'))
        bush.position.set(side * (GAP / 2 + 2.2 + k * 1.6), BANK_TOP + 0.3, -1.8 + k * 0.6)
        bush.castShadow = true
        this.scene.add(bush)
      }
    }

    // The walker: a little sprout with eyes.
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.35, 4, 10), flat('#3fa57d'))
    body.position.y = 0.55
    const eyeGeo = new THREE.SphereGeometry(0.055, 8, 6)
    const eyeMat = flat('#1b2220')
    for (const z of [-0.11, 0.11]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat)
      eye.position.set(0.24, 0.68, z)
      this.walker.add(eye)
    }
    for (const side of [-1, 1]) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 4), flat('#4cb187'))
      leaf.scale.set(1.4, 0.35, 0.7)
      leaf.position.set(side * 0.1, 1.08, 0)
      leaf.rotation.z = side * 0.6
      this.walker.add(leaf)
    }
    body.castShadow = true
    this.walker.add(body)
    this.walker.position.set(this.walkerX, BANK_TOP, 0)
    this.scene.add(this.walker)
    this.frame()
  }

  protected onResize(): void {
    this.frame()
  }

  /** Fit the river and both bridge ends horizontally whatever the aspect. */
  private frame(): void {
    const halfWidth = GAP / 2 + 2.6
    const hHalf = Math.atan(Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.aspect)
    const d = Math.max(12, halfWidth / Math.tan(hHalf))
    this.camera.position.set(0, d * 0.42, d)
    this.camera.lookAt(0, -0.3, 0)
  }

  /** A new word with `letters` planks to lay; the sprout goes back to the left bank. */
  startWord(letters: number): void {
    for (const p of this.planks) this.scene.remove(p.mesh)
    this.planks = []
    this.letters = Math.max(1, letters)
    this.walkerX = this.walkerTarget = -GAP / 2 - 1
    this.onArrive = null
    this.render()
  }

  private plankX(i: number): number {
    const w = GAP / this.letters
    return -GAP / 2 + w * (i + 0.5)
  }

  private letterTexture(letter: string, hinted: boolean): THREE.CanvasTexture {
    const key = `${letter}|${hinted}`
    const hit = this.texCache.get(key)
    if (hit) return hit
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const g = c.getContext('2d')!
    g.fillStyle = hinted ? '#f2cf6b' : '#c99a68'
    g.fillRect(0, 0, 128, 128)
    g.strokeStyle = 'rgba(80,50,20,.35)'
    g.lineWidth = 4
    for (let y = 22; y < 128; y += 34) {
      g.beginPath()
      g.moveTo(0, y)
      g.lineTo(128, y + 6)
      g.stroke()
    }
    g.fillStyle = '#2b1d10'
    g.font = 'bold 84px ui-rounded, -apple-system, sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(letter.toUpperCase(), 64, 70)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    this.texCache.set(key, tex)
    return tex
  }

  /** Lay plank `i` with its letter (yellow when the letter was revealed) and walk onto it. */
  layPlank(i: number, letter: string, hinted = false): void {
    const w = GAP / this.letters
    const top = new THREE.MeshStandardMaterial({ map: this.letterTexture(letter, hinted), roughness: 0.8, flatShading: true })
    const side = flat(hinted ? '#d9b14c' : '#a77b52')
    const mesh = new THREE.Mesh(this.plankGeo, [side, side, top, side, side, side])
    mesh.scale.set(w * 0.92, 1, 1)
    mesh.castShadow = true
    mesh.receiveShadow = true
    const x = this.plankX(i)
    mesh.position.set(x, BANK_TOP - 0.07, 0)
    this.scene.add(mesh)
    this.planks.push({ mesh, start: this.t, x })
    this.walkerTarget = x
    this.render()
  }

  /** A wrong letter: a red plank appears where the next one would go and falls into the river with a splash. */
  crack(nextIndex: number): void {
    const w = GAP / this.letters
    const mesh = new THREE.Mesh(this.plankGeo, flat('#e07a6a'))
    mesh.scale.set(w * 0.92, 1, 1)
    const x = this.plankX(nextIndex)
    mesh.position.set(x, BANK_TOP - 0.07, 0)
    this.scene.add(mesh)
    this.falling.push({ mesh, start: this.t, x })
    this.render()
  }

  /** The word is complete: the sprout walks to the far bank and hops. Resolves on arrival. */
  complete(): Promise<void> {
    this.walkerTarget = GAP / 2 + 1.2
    if (this.reduced) {
      this.walkerX = this.walkerTarget
      this.render()
      return Promise.resolve()
    }
    return new Promise((done) => {
      this.onArrive = () => {
        this.hopStart = this.t
        setTimeout(done, 450)
      }
    })
  }

  protected update(t: number, dt: number): void {
    for (const r of this.ripples) {
      r.position.x += dt * 0.6
      if (r.position.x > GAP / 2 + 6) r.position.x = -GAP / 2 - 6
    }
    // Planks drop in from above with a little bounce.
    for (const p of this.planks) {
      const k = this.reduced ? 1 : progress(t, p.start, 0.35)
      p.mesh.position.y = BANK_TOP - 0.07 + (1 - easeOutBack(k)) * 0.8
    }
    // Wrong planks: tip and fall, then splash.
    for (const f of [...this.falling]) {
      const k = this.reduced ? 1 : progress(t, f.start, 0.9)
      f.mesh.position.y = BANK_TOP - 0.07 - k * k * 1.1
      f.mesh.rotation.z = k * 1.2
      f.mesh.rotation.x = k * 0.6
      if (k >= 1) {
        this.scene.remove(f.mesh)
        this.falling.splice(this.falling.indexOf(f), 1)
        this.splash(f.x)
      }
    }
    for (const s of [...this.splashes]) {
      const k = progress(t, s.start, 0.7)
      const pos = s.pts.geometry.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < pos.count; i++) {
        const a = (i / pos.count) * Math.PI * 2
        pos.setXYZ(i, s.pts.userData.x + Math.cos(a) * k * 0.9, -0.85 + Math.sin(k * Math.PI) * (0.5 + (i % 3) * 0.2), Math.sin(a) * k * 0.9)
      }
      pos.needsUpdate = true
      ;(s.pts.material as THREE.PointsMaterial).opacity = 1 - k
      if (k >= 1) {
        this.scene.remove(s.pts)
        this.splashes.splice(this.splashes.indexOf(s), 1)
      }
    }
    // Walk toward the target, bobbing; hop at the end.
    const diff = this.walkerTarget - this.walkerX
    const step = Math.sign(diff) * Math.min(Math.abs(diff), dt * 3.2)
    this.walkerX += step
    const walking = Math.abs(diff) > 0.01
    const hop = progress(t, this.hopStart, 0.45)
    this.walker.position.set(
      this.walkerX,
      BANK_TOP + (walking ? Math.abs(Math.sin(t * 12)) * 0.08 : 0) + (hop < 1 ? Math.sin(hop * Math.PI) * 0.7 : 0),
      0,
    )
    this.walker.rotation.z = walking ? Math.sin(t * 12) * 0.06 : 0
    if (!walking && this.onArrive) {
      const cb = this.onArrive
      this.onArrive = null
      cb()
    }
  }

  private splash(x: number): void {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(18 * 3), 3))
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.16, transparent: true }))
    pts.userData.x = x
    this.scene.add(pts)
    this.splashes.push({ pts, start: this.t })
  }
}

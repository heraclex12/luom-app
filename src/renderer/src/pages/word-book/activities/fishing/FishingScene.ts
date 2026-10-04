// Word Fishing scene: a round pond seen from above, a cat fishing from the dock. Four fish swim slow loops, each
// carrying an answer (HTML labels placed here). The right fish is reeled out of the water in an arc into the bucket;
// a wrong one splashes and dives away while the right one gets a glowing ring.
import * as THREE from 'three'
import { flat, progress, Stage } from '@/components/three/Stage'
import { glyphTexture, makeCritter } from '@/components/three/critters'
import type { FishLook } from '@/wordbook'
import { makeFish, type FishNode } from './fish'

const POND_R = 4.6
const FISH_Y = -0.2
const FISH_SCALE = 1.5
const BUCKET = new THREE.Vector3(2.3, 0.55, 5.1)
const ROD_TIP = new THREE.Vector3(0.9, 2.5, 3.2)
/** Loop centres of the four fish (one per quarter of the pond). */
const LOOPS = [
  { x: -2.3, z: -1.9 },
  { x: 1.0, z: -2.4 },
  { x: -1.5, z: 1.0 },
  { x: 2.4, z: 0.4 },
]

interface Swimmer {
  node: FishNode
  loop: { x: number; z: number }
  r: number
  speed: number
  phase: number
  born: number
  /** 'swim', reeled in ('caught') or diving off ('gone'). */
  mode: 'swim' | 'caught' | 'gone'
  modeAt: number
  from: THREE.Vector3
  done?: () => void
}

export class FishingScene extends Stage {
  private fish: Swimmer[] = []
  private labels: (HTMLElement | null)[] = []
  private ring: THREE.Mesh
  private ringOn = -1
  private line: THREE.Line
  private linePts = new Float32Array(6)
  private splashes: { pts: THREE.Points; start: number; at: THREE.Vector3 }[] = []
  private sparkle = glyphTexture('sparkle', '#fff4b0')
  private sparkles: { sprite: THREE.Sprite; start: number; at: THREE.Vector3 }[] = []
  private fisher = makeCritter('cat')

  constructor(canvas: HTMLCanvasElement) {
    super(canvas, { background: '#cfeee0', fov: 40, shadows: true })
    this.scene.add(new THREE.HemisphereLight('#f6fffb', '#6d8a7c', 1.5))
    const sun = new THREE.DirectionalLight('#fff6e4', 2)
    sun.position.set(-4, 10, 6)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9 })
    this.scene.add(sun)

    // Grass around a round pond: a lighter shallow ring, a darker bottom, a clear water surface.
    const grass = new THREE.Mesh(new THREE.RingGeometry(POND_R, 30, 48), flat('#a6dcb0'))
    grass.rotation.x = -Math.PI / 2
    grass.receiveShadow = true
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(POND_R, 48), flat('#3f8fa6'))
    bottom.rotation.x = -Math.PI / 2
    bottom.position.y = -0.9
    const bank = new THREE.Mesh(new THREE.CylinderGeometry(POND_R, POND_R - 0.4, 0.9, 48, 1, true), flat('#6a9c8b', { side: THREE.BackSide }))
    bank.position.y = -0.45
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(POND_R, 48),
      new THREE.MeshStandardMaterial({ color: '#8fd6f2', transparent: true, opacity: 0.38, roughness: 0.15 }),
    )
    water.rotation.x = -Math.PI / 2
    water.position.y = -0.08
    this.scene.add(grass, bottom, bank, water)
    // Stones on the rim, reeds, lily pads.
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2
      if (Math.sin(a) > 0.82) continue // leave room for the dock
      const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22 + (i % 3) * 0.08, 0), flat(i % 2 ? '#c9d4cf' : '#b5c2bc'))
      s.scale.y = 0.55
      s.position.set(Math.cos(a) * (POND_R + 0.1), 0.05, Math.sin(a) * (POND_R + 0.1))
      this.scene.add(s)
    }
    for (const [x, z] of [
      [-4.3, -2.2],
      [-4.6, -1.6],
      [4.4, -2.4],
      [4.1, -3],
      [-3.4, -3.6],
    ]) {
      const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.6, 5), flat('#5c9a5a'))
      reed.position.set(x, 0.8, z)
      const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.3, 3, 6), flat('#8a5a3a'))
      head.position.set(x, 1.55, z)
      this.scene.add(reed, head)
    }
    for (const [x, z] of [
      [-3.2, 0.2],
      [3.3, 0.6],
      [0.2, -3.6],
    ]) {
      const pad = new THREE.Mesh(new THREE.CircleGeometry(0.45, 14, 0.4, Math.PI * 1.8), flat('#5fb36b', { side: THREE.DoubleSide }))
      pad.rotation.x = -Math.PI / 2
      pad.position.set(x, -0.06, z)
      this.scene.add(pad)
    }
    // Dock with the cat, the rod and a bucket.
    const dock = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 3), flat('#c99a68'))
    dock.position.set(0.6, 0.2, 4.6)
    dock.castShadow = dock.receiveShadow = true
    this.scene.add(dock)
    for (const [x, z] of [
      [-0.4, 3.3],
      [1.6, 3.3],
    ]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.1, 6), flat('#8a6440'))
      post.position.set(x, -0.25, z)
      this.scene.add(post)
    }
    this.fisher.group.position.set(0.3, 0.3, 4.4)
    this.fisher.group.scale.setScalar(0.85)
    this.fisher.group.rotation.y = Math.PI
    this.scene.add(this.fisher.group)
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 2.6, 5), flat('#7a5235'))
    rod.position.set(0.6, 1.7, 3.8)
    rod.lookAt(ROD_TIP)
    rod.rotateX(Math.PI / 2)
    this.scene.add(rod)
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.6, 16, 1, true), flat('#7fb6d9', { side: THREE.DoubleSide }))
    bucket.position.copy(BUCKET).setY(0.6)
    const bucketBase = new THREE.Mesh(new THREE.CircleGeometry(0.34, 16), flat('#6aa3c6'))
    bucketBase.rotation.x = -Math.PI / 2
    bucketBase.position.copy(BUCKET).setY(0.31)
    this.scene.add(bucket, bucketBase)
    // Fishing line (rod tip → bobber or hooked fish), and the answer ring.
    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.BufferAttribute(this.linePts, 3))
    this.line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: '#ffffff' }))
    this.line.visible = false
    this.scene.add(this.line)
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.68, 36),
      new THREE.MeshBasicMaterial({ color: '#ffe066', transparent: true, opacity: 0.95, side: THREE.DoubleSide }),
    )
    this.ring.rotation.x = -Math.PI / 2
    this.ring.visible = false
    this.scene.add(this.ring)
    this.onResize()
  }

  /** Close on the pond; back off only when the view is too narrow for it. */
  protected onResize(): void {
    const hHalf = Math.atan(Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.aspect)
    const d = Math.max(1, 5.4 / Math.tan(hHalf) / 10)
    this.camera.position.set(0, 8 * d, 7 * d)
    this.camera.lookAt(0, -0.6, 0.5)
  }

  /** HTML answer labels, one per fish (same order as setFish). */
  setLabels(els: (HTMLElement | null)[]): void {
    this.labels = els
    this.render()
  }

  /** New question: fresh fish rise into the pond, one per answer. */
  setFish(looks: readonly FishLook[]): void {
    for (const f of this.fish) this.discard(f.node.group)
    this.fish = looks.slice(0, LOOPS.length).map((look, i) => {
      const node = makeFish(look)
      node.group.scale.multiplyScalar(FISH_SCALE)
      this.scene.add(node.group)
      return {
        node,
        loop: LOOPS[i],
        r: 0.55 + (i % 2) * 0.15,
        speed: (i % 2 ? -1 : 1) * (0.32 + i * 0.03),
        phase: i * 1.7,
        born: this.t,
        mode: 'swim' as const,
        modeAt: 0,
        from: new THREE.Vector3(),
      }
    })
    this.ringOn = -1
    this.ring.visible = false
    this.line.visible = false
    this.render()
  }

  /** Reel fish `i` out of the water into the bucket. Resolves when it lands. */
  catch(i: number): Promise<void> {
    const f = this.fish[i]
    if (!f) return Promise.resolve()
    f.mode = 'caught'
    f.modeAt = this.t
    f.from = f.node.group.position.clone()
    this.splash(f.from)
    this.fisher.setMood('happy')
    if (this.reduced) {
      f.node.group.visible = false
      this.render()
      return Promise.resolve()
    }
    return new Promise((done) => (f.done = done))
  }

  /** A wrong pick: the fish splashes and dives away. */
  escape(i: number): void {
    const f = this.fish[i]
    if (!f) return
    f.mode = 'gone'
    f.modeAt = this.t
    f.from = f.node.group.position.clone()
    this.splash(f.from)
    this.fisher.setMood('sad')
    this.render()
  }

  /** Ring around the right fish. */
  highlight(i: number): void {
    this.ringOn = i
    this.render()
  }

  /** Back to waiting (a new question). */
  calm(): void {
    this.fisher.setMood('idle')
  }

  private swimPos(f: Swimmer, t: number): { pos: THREE.Vector3; heading: number } {
    const a = f.phase + (t - f.born) * f.speed
    const pos = new THREE.Vector3(f.loop.x + Math.cos(a) * f.r * 1.3, FISH_Y, f.loop.z + Math.sin(a) * f.r)
    // Facing the direction of travel (+x is the nose).
    const dx = -Math.sin(a) * f.r * 1.3 * Math.sign(f.speed)
    const dz = Math.cos(a) * f.r * Math.sign(f.speed)
    return { pos, heading: Math.atan2(-dz, dx) }
  }

  protected update(t: number): void {
    this.fisher.group.position.y = 0.3 + Math.sin(t * 1.6) * 0.02
    this.line.visible = false
    this.fish.forEach((f, i) => {
      const g = f.node.group
      f.node.tail.rotation.y = Math.sin(t * (f.mode === 'swim' ? 6 : 18) + i) * 0.45
      if (f.mode === 'swim') {
        const { pos, heading } = this.swimPos(f, t)
        const rise = this.reduced ? 1 : progress(t, f.born, 0.8)
        g.position.copy(pos).setY(FISH_Y - (1 - rise) * 0.8)
        g.rotation.set(0, heading, Math.sin(t * 2 + i) * 0.05)
      } else if (f.mode === 'caught') {
        // Up out of the water in an arc to the bucket, flipping on the way.
        const k = this.reduced ? 1 : progress(t, f.modeAt + 0.25, 1.1)
        const p = f.from.clone().lerp(BUCKET, k)
        p.y += Math.sin(k * Math.PI) * 2.6
        g.position.copy(p)
        g.rotation.set(Math.sin(k * Math.PI * 3) * 0.6, 0, Math.PI / 2 * Math.sin(k * Math.PI))
        this.lineTo(g.position)
        if (k >= 1 && g.visible) {
          g.visible = false
          this.sparkleAt(BUCKET.clone().setY(1.1))
          const done = f.done
          f.done = undefined
          done?.()
        }
      } else {
        const k = this.reduced ? 1 : progress(t, f.modeAt, 1.2)
        const away = f.from.clone().setY(0).normalize().multiplyScalar(k * 2.5)
        g.position.set(f.from.x + away.x, FISH_Y - k * 0.9, f.from.z + away.z)
        g.visible = k < 1
      }
      const label = this.labels[i]
      if (label) {
        this.placeLabel(label, g.position.clone().setY(0.45))
        label.style.opacity = f.mode === 'swim' || (f.mode === 'caught' && g.visible) ? '' : '0'
      }
    })
    const target = this.fish[this.ringOn]
    this.ring.visible = !!target && target.mode === 'swim'
    if (target) {
      this.ring.position.copy(target.node.group.position).setY(-0.05)
      this.ring.scale.setScalar(1 + Math.sin(t * 6) * 0.08)
    }
    for (const s of [...this.splashes]) {
      const k = this.reduced ? 1 : progress(t, s.start, 0.7)
      const pos = s.pts.geometry.getAttribute('position') as THREE.BufferAttribute
      for (let j = 0; j < pos.count; j++) {
        const a = (j / pos.count) * Math.PI * 2
        pos.setXYZ(j, s.at.x + Math.cos(a) * k * 0.8, Math.sin(k * Math.PI) * (0.4 + (j % 3) * 0.2), s.at.z + Math.sin(a) * k * 0.8)
      }
      pos.needsUpdate = true
      ;(s.pts.material as THREE.PointsMaterial).opacity = 1 - k
      if (k >= 1) {
        this.discard(s.pts)
        this.splashes.splice(this.splashes.indexOf(s), 1)
      }
    }
    for (const s of [...this.sparkles]) {
      const k = progress(t, s.start, 0.8)
      s.sprite.scale.setScalar(0.4 + k * 1.4)
      s.sprite.material.opacity = 1 - k
      if (k >= 1) {
        s.sprite.removeFromParent()
        s.sprite.material.dispose()
        this.sparkles.splice(this.sparkles.indexOf(s), 1)
      }
    }
  }

  private lineTo(p: THREE.Vector3): void {
    this.linePts.set([ROD_TIP.x, ROD_TIP.y, ROD_TIP.z, p.x, p.y, p.z])
    this.line.geometry.getAttribute('position').needsUpdate = true
    this.line.visible = true
  }

  private splash(at: THREE.Vector3): void {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(18 * 3), 3))
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.16, transparent: true }))
    this.scene.add(pts)
    this.splashes.push({ pts, start: this.t, at: at.clone() })
  }

  private sparkleAt(at: THREE.Vector3): void {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.sparkle, transparent: true, depthWrite: false }))
    sprite.position.copy(at)
    this.scene.add(sprite)
    this.sparkles.push({ sprite, start: this.t, at })
  }

  dispose(): void {
    this.sparkle.dispose()
    super.dispose()
  }
}

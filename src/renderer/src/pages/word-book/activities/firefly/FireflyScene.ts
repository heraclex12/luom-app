// Firefly Night scene: a meadow at dusk under the moon, with a glass jar in front. Four big fireflies drift about,
// each carrying a spelling (HTML labels placed here); they flash together when the word is spoken. The right one
// flies into the jar, which glows brighter with every catch; a wrong one blinks out and drifts away.
import * as THREE from 'three'
import { flat, progress, Stage } from '@/components/three/Stage'
import { glyphTexture } from '@/components/three/critters'

const JAR = new THREE.Vector3(-3.1, 0, 1.6)
const JAR_H = 1.5
const ANCHORS = [-1.1, 1.1, 3.1, 5.0]

interface Fly {
  group: THREE.Group
  glow: THREE.Sprite
  wings: THREE.Mesh[]
  anchor: number
  phase: number
  mode: 'drift' | 'caught' | 'out'
  modeAt: number
  from: THREE.Vector3
  done?: () => void
}

export class FireflyScene extends Stage {
  private flies: Fly[] = []
  private labels: (HTMLElement | null)[] = []
  private glowTex = glyphTexture('sparkle', '#f6ff9a')
  private ambient: { s: THREE.Sprite; base: THREE.Vector3; phase: number }[] = []
  private inJar: { s: THREE.Sprite; phase: number }[] = []
  private jarLight: THREE.PointLight
  private jarHalo: THREE.Sprite
  private listenAt = -10
  private hintOn = -1

  constructor(canvas: HTMLCanvasElement) {
    super(canvas, { background: '#1d2448', fov: 40 })
    this.scene.fog = new THREE.Fog('#1d2448', 14, 30)
    this.scene.add(new THREE.HemisphereLight('#7f8fd8', '#1b2a2a', 1.1))
    const moonLight = new THREE.DirectionalLight('#c9d4ff', 0.9)
    moonLight.position.set(6, 8, 2)
    this.scene.add(moonLight)

    // Ground, rolling hills, trees, grass tufts, the moon.
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), flat('#2d5246'))
    ground.rotation.x = -Math.PI / 2
    this.scene.add(ground)
    for (const [x, z, r, c] of [
      [-6, -8, 5, '#28493f'],
      [3, -10, 7, '#244238'],
      [11, -7, 5, '#28493f'],
    ] as const) {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 8), flat(c))
      hill.scale.y = 0.35
      hill.position.set(x, 0, z)
      this.scene.add(hill)
    }
    for (const [x, z, h] of [
      [-7, -4, 3.2],
      [-5.6, -5, 2.4],
      [7.5, -4.5, 3],
      [9, -3, 2.2],
    ]) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.8, 6), flat('#3a2e2a'))
      trunk.position.set(x, 0.4, z)
      const crown = new THREE.Mesh(new THREE.ConeGeometry(h * 0.38, h, 7), flat('#1e3a33'))
      crown.position.set(x, 0.8 + h / 2, z)
      this.scene.add(trunk, crown)
    }
    for (let i = 0; i < 40; i++) {
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.35 + (i % 3) * 0.12, 4), flat(i % 2 ? '#3d7060' : '#356454'))
      tuft.position.set(-6 + ((i * 2.37) % 13), 0.15, -1.5 + ((i * 1.13) % 4.5))
      this.scene.add(tuft)
    }
    const moon = new THREE.Mesh(new THREE.SphereGeometry(0.9, 20, 14), new THREE.MeshBasicMaterial({ color: '#fff6d6' }))
    moon.position.set(7, 7.5, -14)
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: '#fff6d6', transparent: true, opacity: 0.35, depthWrite: false }))
    halo.scale.setScalar(5)
    halo.position.copy(moon.position)
    this.scene.add(moon, halo)

    // Background fireflies twinkling.
    for (let i = 0; i < 26; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, transparent: true, depthWrite: false }))
      const base = new THREE.Vector3(-8 + ((i * 3.1) % 18), 0.6 + ((i * 0.77) % 3.2), -6 + ((i * 1.9) % 5))
      s.position.copy(base)
      s.scale.setScalar(0.25)
      this.ambient.push({ s, base, phase: i * 1.3 })
      this.scene.add(s)
    }

    // The jar: glass, a cork, the glow of the fireflies inside.
    const glass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.62, JAR_H, 24, 1, true),
      new THREE.MeshStandardMaterial({ color: '#d9f2ff', transparent: true, opacity: 0.22, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }),
    )
    glass.position.copy(JAR).setY(JAR_H / 2)
    const neck = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 6, 24), flat('#cfe8f2', { transparent: true, opacity: 0.6 }))
    neck.rotation.x = Math.PI / 2
    neck.position.copy(JAR).setY(JAR_H)
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 0.25, 14), flat('#b98a5e'))
    cork.position.copy(JAR).setY(JAR_H + 0.12)
    const string = new THREE.Mesh(new THREE.TorusGeometry(0.63, 0.025, 4, 24), flat('#e4c48b'))
    string.rotation.x = Math.PI / 2
    string.position.copy(JAR).setY(JAR_H - 0.12)
    this.scene.add(glass, neck, cork, string)
    this.jarLight = new THREE.PointLight('#f2ff9a', 0.3, 7, 1.6)
    this.jarLight.position.copy(JAR).setY(JAR_H / 2)
    this.jarHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, transparent: true, opacity: 0, depthWrite: false }))
    this.jarHalo.position.copy(JAR).setY(JAR_H / 2)
    this.jarHalo.scale.setScalar(2.6)
    this.scene.add(this.jarLight, this.jarHalo)

    this.frame()
  }

  protected onResize(): void {
    this.frame()
  }

  private frame(): void {
    const hHalf = Math.atan(Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.aspect)
    const d = Math.max(8, 4.6 / Math.tan(hHalf))
    this.camera.position.set(0.7, 2.3, d)
    this.camera.lookAt(0.7, 1.55, 0)
  }

  setLabels(els: (HTMLElement | null)[]): void {
    this.labels = els
    this.render()
  }

  /** A new question: `n` fireflies drift in. */
  setFlies(n: number): void {
    for (const f of this.flies) this.discard(f.group)
    this.hintOn = -1
    this.flies = ANCHORS.slice(0, n).map((anchor, i) => {
      const group = new THREE.Group()
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.12, 3, 6), flat('#3b3328'))
      body.rotation.z = Math.PI / 2
      const tail = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: '#f4ff8a' }))
      tail.position.x = -0.12
      const wings = [-1, 1].map((s) => {
        const w = new THREE.Mesh(
          new THREE.CircleGeometry(0.12, 10),
          new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
        )
        w.position.set(0.02, 0.06, s * 0.05)
        w.rotation.x = Math.PI / 2
        group.add(w)
        return w
      })
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, transparent: true, depthWrite: false }))
      glow.scale.setScalar(0.9)
      glow.position.x = -0.12
      group.add(body, tail, glow)
      this.scene.add(group)
      return { group, glow, wings, anchor, phase: i * 1.9, mode: 'drift' as const, modeAt: this.t, from: new THREE.Vector3() }
    })
    this.render()
  }

  /** The word is playing: every firefly flashes. */
  listen(): void {
    this.listenAt = this.t
    this.render()
  }

  /** The right firefly flies into the jar. Resolves when it is in. */
  catchFly(i: number): Promise<void> {
    const f = this.flies[i]
    if (!f) return Promise.resolve()
    f.mode = 'caught'
    f.modeAt = this.t
    f.from = f.group.position.clone()
    if (this.reduced) {
      f.group.visible = false
      this.addToJar()
      return Promise.resolve()
    }
    return new Promise((done) => (f.done = done))
  }

  /** A wrong pick blinks out and drifts away. */
  missFly(i: number): void {
    const f = this.flies[i]
    if (!f) return
    f.mode = 'out'
    f.modeAt = this.t
    f.from = f.group.position.clone()
    this.render()
  }

  /** The right one glows bigger. */
  hint(i: number): void {
    this.hintOn = i
    this.render()
  }

  /** Start a round with an empty jar. */
  emptyJar(): void {
    for (const j of this.inJar) {
      j.s.removeFromParent()
      j.s.material.dispose()
    }
    this.inJar = []
    this.render()
  }

  private addToJar(): void {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, transparent: true, depthWrite: false }))
    s.scale.setScalar(0.35)
    this.scene.add(s)
    this.inJar.push({ s, phase: this.inJar.length * 2.3 })
  }

  private dronePos(f: Fly, t: number): THREE.Vector3 {
    const a = t * 0.5 + f.phase
    return new THREE.Vector3(f.anchor + Math.sin(a) * 0.5, 1.6 + Math.sin(a * 1.7) * 0.3 + (this.flies.indexOf(f) % 2 ? 0.75 : 0), 0.4 + Math.cos(a * 0.8) * 0.5)
  }

  protected update(t: number): void {
    const flash = 1 - progress(t, this.listenAt, 0.8)
    this.flies.forEach((f, i) => {
      const g = f.group
      for (const [k, w] of f.wings.entries()) w.rotation.y = Math.sin(t * 30 + k * Math.PI) * 0.6
      const pulse = 0.85 + Math.sin(t * 3 + f.phase) * 0.15 + flash * 0.8 + (i === this.hintOn ? 0.5 + Math.sin(t * 8) * 0.25 : 0)
      if (f.mode === 'drift') {
        const p = this.dronePos(f, t)
        const enter = this.reduced ? 1 : progress(t, f.modeAt, 0.9)
        g.position.copy(p).add(new THREE.Vector3(0, (1 - enter) * 2, 0))
        g.rotation.y = Math.cos(t * 0.5 + f.phase) > 0 ? 0 : Math.PI
        f.glow.scale.setScalar(0.9 * pulse)
        f.glow.material.opacity = enter
      } else if (f.mode === 'caught') {
        const k = this.reduced ? 1 : progress(t, f.modeAt, 1.2)
        const mouth = JAR.clone().setY(JAR_H + 0.6)
        const p = f.from.clone().lerp(mouth, k)
        p.y += Math.sin(k * Math.PI) * 1.2
        if (k > 0.85) p.y -= (k - 0.85) * 6
        g.position.copy(p)
        f.glow.scale.setScalar(1.2 + Math.sin(k * Math.PI) * 0.8)
        if (k >= 1 && g.visible) {
          g.visible = false
          this.addToJar()
          const done = f.done
          f.done = undefined
          done?.()
        }
      } else {
        const k = this.reduced ? 1 : progress(t, f.modeAt, 1.4)
        g.position.copy(f.from).add(new THREE.Vector3(k * 1.5, k * 1.8, -k * 2))
        f.glow.material.opacity = Math.max(0, 1 - k * 2) * (Math.sin(k * 40) > 0 ? 1 : 0.3)
        g.visible = k < 1
      }
      const label = this.labels[i]
      if (label) {
        this.placeLabel(label, g.position.clone().add(new THREE.Vector3(0, 0.35, 0)))
        label.style.opacity = f.mode === 'drift' ? '' : '0'
      }
    })
    for (const a of this.ambient) {
      a.s.position.set(a.base.x + Math.sin(t * 0.3 + a.phase) * 0.4, a.base.y + Math.sin(t * 0.5 + a.phase) * 0.25, a.base.z)
      a.s.material.opacity = 0.25 + 0.75 * Math.max(0, Math.sin(t * 1.4 + a.phase))
    }
    // Fireflies in the jar bob around; the jar's glow follows how many there are.
    this.inJar.forEach((j, i) => {
      const a = t * 0.9 + j.phase
      j.s.position.set(JAR.x + Math.sin(a) * 0.32, 0.35 + ((i * 0.37) % 0.9) + Math.sin(a * 1.6) * 0.12, JAR.z + Math.cos(a) * 0.32)
      j.s.material.opacity = 0.7 + Math.sin(t * 3 + j.phase) * 0.3
    })
    const n = this.inJar.length
    this.jarLight.intensity = 0.3 + n * 1.1
    this.jarHalo.material.opacity = Math.min(0.85, n * 0.11)
  }

  dispose(): void {
    this.glowTex.dispose()
    super.dispose()
  }
}

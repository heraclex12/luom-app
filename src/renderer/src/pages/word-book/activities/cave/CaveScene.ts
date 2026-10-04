// Echo Cave scene: a dim cave with a ring of crystals, one per word of the round. The current crystal pulses; each
// time the word plays a sound ripple spreads across the floor. Right = the crystal lights up (gold for a near miss),
// wrong = it goes grey with a shake.
import * as THREE from 'three'
import { flat, progress, Stage } from '@/components/three/Stage'
import { plantVariant } from '@/wordbook'

interface Crystal {
  mesh: THREE.Mesh
  mat: THREE.MeshStandardMaterial
  state: 'idle' | 'lit' | 'near' | 'dark'
  changedAt: number
}

export class CaveScene extends Stage {
  private crystals: Crystal[] = []
  private focus = -1
  private ripples: { mesh: THREE.Mesh; start: number }[] = []
  private glow: THREE.PointLight

  constructor(canvas: HTMLCanvasElement) {
    super(canvas, { background: '#0d1517', fov: 55 })
    this.scene.fog = new THREE.Fog('#0d1517', 10, 26)
    this.scene.add(new THREE.HemisphereLight('#8fb3bd', '#152024', 1.4))
    this.glow = new THREE.PointLight('#7fe6cf', 14, 14, 1.4)
    this.glow.position.set(0, 2.2, 0)
    this.scene.add(this.glow)

    // Cave shell (seen from inside) and floor.
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(14, 1), flat('#2f474d', { side: THREE.BackSide }))
    shell.scale.set(1.3, 0.55, 1)
    shell.position.y = 3
    this.scene.add(shell)
    const floor = new THREE.Mesh(new THREE.CircleGeometry(12, 28), flat('#26393d'))
    floor.rotation.x = -Math.PI / 2
    this.scene.add(floor)
    // Stalactites and a few stalagmites, always in the same places.
    for (let i = 0; i < 26; i++) {
      const v = plantVariant(900 + i)
      const a = v.turn
      const r = 3 + v.hue * 7
      const h = 0.8 + v.scale * 2.2
      const up = i % 3 === 0
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.18 + v.hue * 0.25, h, 5), flat(up ? '#2f4549' : '#33494d'))
      cone.position.set(Math.cos(a) * r, up ? h / 2 : 6.2 - h / 2, Math.sin(a) * r - 2)
      if (!up) cone.rotation.x = Math.PI
      this.scene.add(cone)
    }
    this.camera.position.set(0, 2.3, 7.4)
    this.camera.lookAt(0, 1.1, 0)
  }

  /** A crystal for each word of the round, in an arc facing the camera. */
  setup(count: number): void {
    for (const c of this.crystals) this.scene.remove(c.mesh)
    this.crystals = Array.from({ length: count }, (_, i) => {
      const a = Math.PI * (0.15 + (0.7 * i) / Math.max(1, count - 1))
      const mat = flat('#5f8792', { emissive: '#000000', roughness: 0.3, transparent: true, opacity: 0.95 })
      const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), mat)
      mesh.scale.set(0.8, 1.6, 0.8)
      mesh.position.set(Math.cos(a) * -4.6, 0.95, 1.2 - Math.sin(a) * 2.2)
      this.scene.add(mesh)
      return { mesh, mat, state: 'idle' as const, changedAt: 0 }
    })
    this.focus = -1
    this.render()
  }

  setFocus(i: number): void {
    this.focus = i
    this.render()
  }

  /** The word is playing: a ripple spreads from the middle. */
  ripple(): void {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 0.68, 48),
      new THREE.MeshBasicMaterial({ color: '#7fe6cf', transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.set(0, 0.02, 0)
    this.scene.add(ring)
    this.ripples.push({ mesh: ring, start: this.t })
    this.render()
  }

  /** Right (lit), near miss (near) or wrong (dark). */
  mark(i: number, result: 'lit' | 'near' | 'dark'): void {
    const c = this.crystals[i]
    if (!c) return
    c.state = result
    c.changedAt = this.t
    c.mat.color.set(result === 'lit' ? '#6ff0cf' : result === 'near' ? '#f5cf5a' : '#3a4143')
    c.mat.emissive.set(result === 'lit' ? '#2fb894' : result === 'near' ? '#a07a14' : '#000000')
    this.render()
  }

  protected update(t: number): void {
    this.crystals.forEach((c, i) => {
      const focused = i === this.focus && c.state === 'idle'
      const pulse = focused ? 1 + Math.sin(t * 4) * 0.08 : 1
      c.mesh.rotation.y = t * (c.state === 'lit' || c.state === 'near' ? 1.2 : 0.3) + i
      const k = progress(t, c.changedAt, 0.5)
      const shake = c.state === 'dark' && k < 1 ? Math.sin(k * Math.PI * 8) * 0.12 * (1 - k) : 0
      c.mesh.position.x += shake - (c.mesh.userData.lastShake ?? 0)
      c.mesh.userData.lastShake = shake
      const pop = (c.state === 'lit' || c.state === 'near') && k < 1 ? 1 + Math.sin(k * Math.PI) * 0.35 : 1
      c.mesh.scale.set(0.8 * pulse * pop, 1.6 * pulse * pop, 0.8 * pulse * pop)
      if (focused) c.mat.emissive.setRGB(0.05 + Math.sin(t * 4) * 0.03, 0.12, 0.13)
    })
    this.glow.intensity = 5 + Math.sin(t * 1.3) * 0.8
    for (const r of [...this.ripples]) {
      const k = this.reduced ? 1 : progress(t, r.start, 1.6)
      r.mesh.scale.setScalar(1 + k * 9)
      ;(r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - k)
      if (k >= 1) {
        this.scene.remove(r.mesh)
        this.ripples.splice(this.ripples.indexOf(r), 1)
      }
    }
  }
}

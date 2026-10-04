// Aquarium scene: a glass tank with sand, swaying seaweed, a little castle and rising bubbles. Every fish caught in
// Word Fishing swims here, sized by how well its word is learned (golden when mastered). Hovering a fish names it.
import * as THREE from 'three'
import { flat, Stage } from '@/components/three/Stage'
import type { FishLook } from '@/wordbook'
import { makeFish, type FishNode } from './fish'

const W = 8 // tank inner size
const H = 4.4
const D = 3

interface Resident {
  dictId: number
  node: FishNode
  /** Lissajous path parameters (stay inside the tank). */
  ax: number
  ay: number
  az: number
  fx: number
  fy: number
  fz: number
  phase: number
}

export class AquariumScene extends Stage {
  private fish: Resident[] = []
  private weeds: THREE.Object3D[] = []
  private bubbles: THREE.Mesh[] = []
  private raycaster = new THREE.Raycaster()
  private pointer: THREE.Vector2 | null = null
  private hovered: Resident | null = null
  private label: HTMLElement | null = null

  constructor(
    canvas: HTMLCanvasElement,
    private onHover: (dictId: number | null) => void,
  ) {
    super(canvas, { background: '#e8f4f1', fov: 36 })
    this.scene.add(new THREE.HemisphereLight('#f4fdff', '#6b8a8a', 1.5))
    const sun = new THREE.DirectionalLight('#ffffff', 1.6)
    sun.position.set(2, 8, 6)
    this.scene.add(sun)
    const glow = new THREE.PointLight('#bff3ff', 6, 12, 1.5)
    glow.position.set(0, H, 1)
    this.scene.add(glow)

    // Stand, water volume, glass frame, sand, pebbles, a castle, seaweed, bubbles.
    const stand = new THREE.Mesh(new THREE.BoxGeometry(W + 0.8, 0.5, D + 0.6), flat('#8c6a54'))
    stand.position.y = -0.25
    const water = new THREE.Mesh(
      new THREE.BoxGeometry(W, H, D),
      new THREE.MeshStandardMaterial({ color: '#9fdcf0', transparent: true, opacity: 0.28, roughness: 0.05, depthWrite: false }),
    )
    water.position.y = H / 2
    water.renderOrder = 2
    const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), flat('#7cc7dc'))
    back.position.set(0, H / 2, -D / 2)
    const sand = new THREE.Mesh(new THREE.BoxGeometry(W, 0.35, D), flat('#f1dca6'))
    sand.position.y = 0.17
    this.scene.add(stand, back, sand, water)
    const frameMat = flat('#2f4a52')
    for (const [x, y, w, h] of [
      [0, H, W + 0.2, 0.12],
      [0, 0, W + 0.2, 0.12],
      [-W / 2, H / 2, 0.12, H],
      [W / 2, H / 2, 0.12, H],
    ]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), frameMat)
      bar.position.set(x, y, D / 2)
      this.scene.add(bar)
    }
    for (let i = 0; i < 18; i++) {
      const p = new THREE.Mesh(new THREE.DodecahedronGeometry(0.1 + (i % 4) * 0.04, 0), flat(['#c3cfd0', '#f2a7a0', '#a7c7e7', '#d9d2c5'][i % 4]))
      p.position.set(-W / 2 + 0.4 + ((i * 1.37) % (W - 0.8)), 0.38, -D / 2 + 0.3 + ((i * 0.71) % (D - 0.6)))
      this.scene.add(p)
    }
    const castle = new THREE.Group()
    const keep = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.7), flat('#f4b8c4'))
    keep.position.y = 0.9
    castle.add(keep)
    for (const s of [-1, 1]) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 1.5, 8), flat('#f7c9d2'))
      tower.position.set(s * 0.55, 1.1, 0)
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.45, 8), flat('#8a7bd6'))
      roof.position.set(s * 0.55, 2.05, 0)
      castle.add(tower, roof)
    }
    const door = new THREE.Mesh(new THREE.CircleGeometry(0.2, 12, 0, Math.PI), flat('#5a4560'))
    door.position.set(0, 0.36, 0.36)
    castle.add(door)
    castle.position.set(2.6, 0, -0.6)
    this.scene.add(castle)
    for (let i = 0; i < 7; i++) {
      const weed = new THREE.Group()
      const x = -W / 2 + 0.6 + i * 1.05 + (i % 2) * 0.3
      const z = -D / 2 + 0.4 + (i % 3) * 0.5
      weed.position.set(x, 0.35, z)
      const segs = 4 + (i % 3)
      let parent: THREE.Object3D = weed
      for (let k = 0; k < segs; k++) {
        const seg = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.3, 3, 6), flat(i % 2 ? '#4fae7a' : '#6cc48f'))
        seg.position.y = k === 0 ? 0.2 : 0.38
        parent.add(seg)
        parent = seg
      }
      this.weeds.push(weed)
      this.scene.add(weed)
    }
    const bubbleMat = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, roughness: 0.1 })
    const bubbleGeo = new THREE.SphereGeometry(0.06, 8, 6)
    for (let i = 0; i < 14; i++) {
      const b = new THREE.Mesh(bubbleGeo, bubbleMat)
      b.position.set(-2.8 + (i % 3) * 0.12, (i / 14) * H, -0.4 + (i % 2) * 0.1)
      b.scale.setScalar(0.6 + (i % 4) * 0.25)
      this.bubbles.push(b)
      this.scene.add(b)
    }

    canvas.addEventListener('pointermove', this.onMove)
    canvas.addEventListener('pointerleave', this.onLeave)
    this.frame()
  }

  protected onResize(): void {
    this.frame()
  }

  private frame(): void {
    const hHalf = Math.atan(Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.aspect)
    const d = Math.max(9, (W / 2 + 0.8) / Math.tan(hHalf) + D / 2)
    this.camera.position.set(0, H / 2 + 0.6, d)
    this.camera.lookAt(0, H / 2 - 0.1, 0)
  }

  /** The label element that follows the hovered fish. */
  setLabel(el: HTMLElement | null): void {
    this.label = el
  }

  setFish(list: readonly { dictId: number; look: FishLook }[]): void {
    for (const f of this.fish) this.discard(f.node.group)
    this.fish = list.map(({ dictId, look }, i) => {
      const node = makeFish(look)
      node.body.userData.dictId = dictId
      this.scene.add(node.group)
      const r = (n: number): number => ((Math.sin(dictId * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1
      return {
        dictId,
        node,
        ax: W / 2 - 0.8 - r(1) * 1.2,
        ay: 0.6 + r(2) * 0.9,
        az: D / 2 - 0.6,
        fx: 0.08 + r(3) * 0.08,
        fy: 0.11 + r(4) * 0.1,
        fz: 0.13 + r(5) * 0.1,
        phase: i * 2.1 + r(6) * 6,
      }
    })
    this.render()
  }

  private onMove = (e: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect()
    this.pointer = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
    if (this.reduced) this.pick()
  }

  private onLeave = (): void => {
    this.pointer = null
    this.pick()
  }

  private pick(): void {
    let hit: Resident | null = null
    if (this.pointer) {
      this.raycaster.setFromCamera(this.pointer, this.camera)
      const target = this.raycaster.intersectObjects(this.fish.map((f) => f.node.body))[0]
      hit = target ? (this.fish.find((f) => f.node.body === target.object) ?? null) : null
    }
    if (hit !== this.hovered) {
      this.hovered = hit
      this.onHover(hit?.dictId ?? null)
    }
    this.render()
  }

  protected update(t: number): void {
    for (const f of this.fish) {
      const a = t + f.phase
      const x = Math.sin(a * f.fx * Math.PI) * f.ax
      const y = H / 2 + Math.sin(a * f.fy * Math.PI) * f.ay
      const z = Math.sin(a * f.fz * Math.PI) * f.az * 0.8
      const dx = Math.cos(a * f.fx * Math.PI) * f.fx * f.ax
      const dz = Math.cos(a * f.fz * Math.PI) * f.fz * f.az * 0.8
      const g = f.node.group
      g.position.set(x, y, z)
      g.rotation.y = Math.atan2(-dz, dx)
      f.node.tail.rotation.y = Math.sin(t * 7 + f.phase) * 0.4
    }
    this.weeds.forEach((w, i) => {
      let seg = w.children[0]
      let k = 0
      while (seg) {
        seg.rotation.z = Math.sin(t * 1.2 + i + k * 0.6) * 0.18
        seg = seg.children[0]
        k++
      }
    })
    for (const b of this.bubbles) {
      b.position.y += 0.012
      b.position.x += Math.sin(t * 3 + b.position.y * 4) * 0.002
      if (b.position.y > H - 0.1) b.position.y = 0.4
    }
    if (this.pointer && !this.reduced) this.pick()
    if (this.label) {
      this.label.style.opacity = this.hovered ? '1' : '0'
      if (this.hovered) this.placeLabel(this.label, this.hovered.node.group.position.clone().add(new THREE.Vector3(0, 0.45, 0)))
    }
  }

  dispose(): void {
    this.canvas.removeEventListener('pointermove', this.onMove)
    this.canvas.removeEventListener('pointerleave', this.onLeave)
    super.dispose()
  }
}

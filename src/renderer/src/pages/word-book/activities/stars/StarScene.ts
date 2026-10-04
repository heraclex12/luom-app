// Star Sentences scene: a night sky with a twinkling starfield. Each question gets its own constellation; a right
// answer draws its lines star by star and sends a shooting star across, a wrong one makes it flicker and dim.
import * as THREE from 'three'
import { plantVariant } from '@/wordbook'
import { progress, Stage } from '@/components/three/Stage'

interface Constellation {
  group: THREE.Group
  stars: THREE.Mesh[]
  lines: THREE.LineSegments
  segments: number
  /** Draw-in start (s) once answered right; null until then. */
  drawAt: number | null
  dimAt: number | null
}

export class StarScene extends Stage {
  private field: THREE.Points
  private current: Constellation | null = null
  private old: { c: Constellation; start: number }[] = []
  private shooting: { mesh: THREE.Mesh; start: number } | null = null
  private starGeo = new THREE.OctahedronGeometry(0.24, 0)

  constructor(canvas: HTMLCanvasElement) {
    super(canvas, { background: '#0e1726', fov: 50 })
    // Starfield on a far dome in front of the camera.
    const n = 520
    const pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const v = plantVariant(i + 7)
      pos[i * 3] = (v.hue - 0.5) * 70
      pos[i * 3 + 1] = (v.scale - 0.85) / 0.3 * 34 - 10
      pos[i * 3 + 2] = -18 - (v.turn / (Math.PI * 2)) * 14
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    this.field = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#cfe3ff', size: 0.12, transparent: true, opacity: 0.85 }))
    this.scene.add(this.field)
    this.camera.position.set(0, 0, 10)
    this.camera.lookAt(0, 0, 0)
  }

  /** A new constellation for the next sentence (shape stable per word). */
  showConstellation(seed: number): void {
    if (this.current) this.old.push({ c: this.current, start: this.t })
    const group = new THREE.Group()
    const count = 5 + (seed % 3)
    const points: THREE.Vector3[] = []
    for (let i = 0; i < count; i++) {
      const v = plantVariant(seed * 31 + i)
      const a = (i / count) * Math.PI * 2 + v.turn * 0.25
      const r = 2 + v.hue * 2.2
      points.push(new THREE.Vector3(Math.cos(a) * r * 1.5, Math.sin(a) * r * 0.75 + 1.2, -2 - v.scale))
    }
    const stars = points.map((p) => {
      const s = new THREE.Mesh(this.starGeo, new THREE.MeshBasicMaterial({ color: '#9fb3c8', transparent: true, opacity: 0.6 }))
      s.position.copy(p)
      group.add(s)
      return s
    })
    // Lines as a chain through the stars (drawn in on a right answer).
    const linePos = new Float32Array((count - 1) * 2 * 3)
    for (let i = 0; i < count - 1; i++) {
      linePos.set([points[i].x, points[i].y, points[i].z, points[i + 1].x, points[i + 1].y, points[i + 1].z], i * 6)
    }
    const lg = new THREE.BufferGeometry()
    lg.setAttribute('position', new THREE.BufferAttribute(linePos, 3))
    lg.setDrawRange(0, 0)
    const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: '#ffd34d', transparent: true, opacity: 0.85 }))
    group.add(lines)
    group.scale.setScalar(0.001)
    this.scene.add(group)
    this.current = { group, stars, lines, segments: count - 1, drawAt: null, dimAt: null }
    this.render()
  }

  /** Right answer: draw the constellation and send a shooting star. */
  lightUp(): void {
    if (!this.current) return
    this.current.drawAt = this.t
    for (const s of this.current.stars) (s.material as THREE.MeshBasicMaterial).color.set('#fff3c4')
    const streak = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0, 2.2, 6),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9 }),
    )
    streak.rotation.z = Math.PI / 2.6
    this.scene.add(streak)
    this.shooting = { mesh: streak, start: this.t }
    this.render()
  }

  /** Wrong answer: the constellation flickers and dims. */
  dim(): void {
    if (!this.current) return
    this.current.dimAt = this.t
    this.render()
  }

  protected update(t: number): void {
    ;(this.field.material as THREE.PointsMaterial).opacity = 0.7 + Math.sin(t * 1.7) * 0.15
    this.field.rotation.z = Math.sin(t * 0.05) * 0.02
    const c = this.current
    if (c) {
      // A new constellation scales in.
      if (c.group.scale.x < 1) c.group.scale.setScalar(this.reduced ? 1 : Math.min(1, c.group.scale.x + 0.06))
      c.stars.forEach((s, i) => {
        const tw = 1 + Math.sin(t * 3 + i) * 0.12
        s.scale.setScalar(tw * (c.drawAt != null ? 1.5 : 1))
        s.rotation.y = t * 0.6 + i
      })
      if (c.drawAt != null) {
        const k = this.reduced ? 1 : progress(t, c.drawAt, 1.2)
        c.lines.geometry.setDrawRange(0, Math.round(k * c.segments) * 2)
      }
      if (c.dimAt != null) {
        const k = this.reduced ? 1 : progress(t, c.dimAt, 0.8)
        const flicker = k < 1 ? (Math.sin(k * 40) > 0 ? 0.25 : 0.6) : 0.25
        for (const s of c.stars) (s.material as THREE.MeshBasicMaterial).opacity = flicker
      }
    }
    // Old constellations drift back and fade.
    for (const o of [...this.old]) {
      const k = this.reduced ? 1 : progress(t, o.start, 0.8)
      o.c.group.position.z = -k * 4
      o.c.group.traverse((m) => {
        const mat = (m as THREE.Mesh).material as THREE.Material | undefined
        if (mat && 'opacity' in mat) mat.opacity = Math.min(mat.opacity, 1 - k)
      })
      if (k >= 1) {
        this.scene.remove(o.c.group)
        this.old.splice(this.old.indexOf(o), 1)
      }
    }
    if (this.shooting) {
      const k = this.reduced ? 1 : progress(t, this.shooting.start, 0.9)
      this.shooting.mesh.position.set(-9 + k * 18, 5 - k * 5, -3)
      ;(this.shooting.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - k
      if (k >= 1) {
        this.scene.remove(this.shooting.mesh)
        this.shooting = null
      }
    }
  }
}

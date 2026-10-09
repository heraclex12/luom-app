// Seasons and night for the word garden (from level 100, see wordbook/gardenRewards.ts): light, background and what
// drifts through the air — petals in spring, leaves in autumn, snow in winter, stars and fireflies at night. Colours
// of the ground and trees are switched by the DecorKit's look; this file only does sky, light and particles.
import * as THREE from 'three'
import type { ShownLook } from '@/wordbook'

interface Light {
  sky: string
  ground: string
  hemi: number
  sun: string
  sunI: number
  background: string | null
}

const LIGHT: Record<ShownLook, Light> = {
  summer: { sky: '#fff8ec', ground: '#6b6255', hemi: 1.6, sun: '#fff6e8', sunI: 2.2, background: null },
  spring: { sky: '#fffaf2', ground: '#6b6a55', hemi: 1.7, sun: '#fff8ee', sunI: 2.2, background: null },
  autumn: { sky: '#fff1dc', ground: '#6b5a45', hemi: 1.55, sun: '#ffe0b5', sunI: 2.3, background: null },
  winter: { sky: '#f4f8ff', ground: '#7d8a99', hemi: 1.75, sun: '#ffffff', sunI: 1.9, background: null },
  night: { sky: '#8197cc', ground: '#141b26', hemi: 0.55, sun: '#a9bfff', sunI: 0.5, background: '#172331' },
}

/** Soft round dot for the particles. */
function dotTexture(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = c.height = 32
  const ctx = c.getContext('2d')!
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.6, 'rgba(255,255,255,0.9)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 32, 32)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export class GardenSky {
  readonly group = new THREE.Group()
  private tex = dotTexture()
  private air: THREE.Points | null = null
  private seeds: Float32Array = new Float32Array(0)
  private look: ShownLook = 'summer'
  private extent = 3

  /** Light the scene for `look` and fill the air (`extent` = how far the garden reaches). */
  set(look: ShownLook, extent: number, scene: THREE.Scene, hemi: THREE.HemisphereLight, sun: THREE.DirectionalLight): void {
    this.look = look
    this.extent = extent
    const l = LIGHT[look]
    hemi.color.set(l.sky)
    hemi.groundColor.set(l.ground)
    hemi.intensity = l.hemi
    sun.color.set(l.sun)
    sun.intensity = l.sunI
    scene.background = l.background ? new THREE.Color(l.background) : null
    this.clear()
    if (look === 'summer') return
    if (look === 'night') this.group.add(this.stars())
    const n = look === 'night' ? 60 : look === 'winter' ? 420 : 160
    const pos = new Float32Array(n * 3)
    const col = new Float32Array(n * 3)
    this.seeds = new Float32Array(n)
    const palette = {
      spring: ['#f6c1d1', '#ffffff', '#f4a6bf'],
      autumn: ['#e58a3a', '#f0b443', '#c8582c'],
      winter: ['#ffffff'],
      night: ['#ffe680', '#fff3a8'],
    }[look].map((c) => new THREE.Color(c))
    for (let i = 0; i < n; i++) {
      this.seeds[i] = Math.random()
      const c = palette[i % palette.length]
      col.set([c.r, c.g, c.b], i * 3)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
    const mat = new THREE.PointsMaterial({
      size: look === 'night' ? 0.11 : look === 'winter' ? 0.07 : 0.09,
      map: this.tex,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: look === 'night' ? THREE.AdditiveBlending : THREE.NormalBlending,
    })
    this.air = new THREE.Points(geo, mat)
    this.group.add(this.air)
    this.update(0)
  }

  private stars(): THREE.Points {
    const n = 500
    const pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      // Upper half of a big sphere round the garden.
      const u = Math.random() * Math.PI * 2
      const v = Math.acos(Math.random() * 0.9)
      const r = 60
      pos.set([Math.sin(v) * Math.cos(u) * r, Math.cos(v) * r - 5, Math.sin(v) * Math.sin(u) * r], i * 3)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return new THREE.Points(geo, new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, color: '#ffffff', map: this.tex, transparent: true, depthWrite: false }))
  }

  update(t: number): void {
    if (!this.air) return
    const pos = this.air.geometry.getAttribute('position') as THREE.BufferAttribute
    const R = this.extent + 0.5
    const H = 6
    for (let i = 0; i < this.seeds.length; i++) {
      const s = this.seeds[i]
      const a = s * 97.3
      const r = Math.sqrt((s * 7.31) % 1) * R
      let x = Math.cos(a) * r
      let z = Math.sin(a) * r
      let y: number
      if (this.look === 'night') {
        // Fireflies drift low over the garden.
        x += Math.sin(t * 0.4 + s * 40) * 0.4
        z += Math.cos(t * 0.33 + s * 30) * 0.4
        y = 0.3 + ((s * 13.7) % 1) * 1.3 + Math.sin(t * 0.8 + s * 20) * 0.15
      } else {
        const speed = this.look === 'winter' ? 0.45 : 0.25
        y = H - ((t * speed + s * H * 3.1) % H) - 0.5
        const sway = this.look === 'winter' ? 0.15 : 0.4
        x += Math.sin(t * 0.9 + s * 50) * sway
        z += Math.cos(t * 0.7 + s * 70) * sway
      }
      pos.setXYZ(i, x, y, z)
    }
    pos.needsUpdate = true
    if (this.look === 'night') (this.air.material as THREE.PointsMaterial).opacity = 0.75 + Math.sin(t * 2.3) * 0.25
  }

  private clear(): void {
    for (const o of [...this.group.children]) {
      if (o instanceof THREE.Points) {
        o.geometry.dispose()
        ;(o.material as THREE.Material).dispose()
      }
      o.removeFromParent()
    }
    this.air = null
  }

  dispose(): void {
    this.clear()
    this.tex.dispose()
  }
}

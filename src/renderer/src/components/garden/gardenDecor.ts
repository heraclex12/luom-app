// Word garden worlds, three.js part: the low-poly things that move in as the learner levels up (see
// wordbook/gardenWorld.ts for what comes when and where it stands): fence, cottage, pond, trees, houses, windmill,
// clock tower…, the critters that wander about, the flower kinds mastered words bloom into, the streak visitors and
// trophies (wordbook/gardenRewards.ts). Islands are in gardenIslands.ts. Everything is built from primitives;
// geometries and materials are cached here and shared. `look` (season / night) recolours what it builds.
import * as THREE from 'three'
import type { CritterKind, DecorItem, FlowerKind, GardenLayout, ShownLook, Trophy } from '@/wordbook'

/** Per-frame update of something that moves (t = seconds). */
export type Anim = (t: number) => void

export const P = {
  white: '#f7f5f0',
  cream: '#efe7da',
  stone: '#cfc6b8',
  stoneDark: '#a99f92',
  wood: '#b07a4f',
  woodDark: '#7a5236',
  green: '#2f8a63',
  leaf: '#4f9d63',
  leafLight: '#6bb574',
  pine: '#2f7a52',
  mint: '#9fe0bf',
  coral: '#e5533d',
  amber: '#f2a531',
  blue: '#4a6cf0',
  sky: '#cfe6f7',
  water: '#7fb9e3',
  pink: '#f4b6c8',
  pinkDeep: '#ec8fab',
  lavender: '#9b86d6',
  bluebell: '#6f86e8',
  yellow: '#f6c945',
  brown: '#8b6a4a',
  dark: '#2b3430',
  lamp: '#ffd98a',
}

type MatExtra = THREE.MeshStandardMaterialParameters

/** Ground colours of the islands (recoloured by the look like everything else). */
export const GROUND = { grass: '#a6cf8f', grassEdge: '#7db06d', soil: '#9a8670', tuft: '#86bd73' }

/** Lily pads stay green whatever the season. */
export const PAD = '#4e9a62'

/** Season recolouring: greens turn fresh in spring, orange in autumn, snowy in winter. Night only relights. */
const TINT: Record<ShownLook, Record<string, string>> = {
  summer: {},
  night: {},
  spring: {
    [GROUND.grass]: '#b2dc95',
    [GROUND.tuft]: '#93cf7e',
    [P.leaf]: '#79c27c',
    [P.leafLight]: '#a3da8f',
  },
  autumn: {
    [GROUND.grass]: '#b5c98c',
    [GROUND.grassEdge]: '#93a96a',
    [GROUND.tuft]: '#c2a35a',
    [P.leaf]: '#e08a3c',
    [P.leafLight]: '#f0b443',
    [P.pink]: '#f0a35e',
    [P.pinkDeep]: '#d9673a',
    '#86c46a': '#b9c27e',
    '#9fcb86': '#bcc48a',
    '#8fd16f': '#d8c65a',
    '#a6dc86': '#e3d27a',
  },
  winter: {
    [GROUND.grass]: '#eef3f6',
    [GROUND.grassEdge]: '#cddbe4',
    [GROUND.tuft]: '#ffffff',
    [P.leaf]: '#e3ecf1',
    [P.leafLight]: '#ffffff',
    [P.pink]: '#f3f5f8',
    [P.pinkDeep]: '#e6ebf0',
    [P.water]: '#d6ebf7',
    '#86c46a': '#e8eff3',
    '#8fd16f': '#e3ecf0',
    '#a6dc86': '#f2f6f8',
    '#9fcb86': '#e9f0f3',
    '#bcd39a': '#edf2f4',
  },
}

/** Metal of a trophy. */
const MEDAL: Record<Trophy['medal'], string> = { bronze: '#c58b52', silver: '#cfd6dc', gold: '#f2c14e' }

const place = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T => {
  o.position.set(x, y, z)
  return o
}

export class DecorKit {
  private mats = new Map<string, THREE.MeshStandardMaterial>()
  private geos = new Map<string, THREE.BufferGeometry>()
  /** Season or night: set before building. */
  look: ShownLook = 'summer'

  m(base: string, extra: MatExtra = {}, key = ''): THREE.MeshStandardMaterial {
    let color = TINT[this.look][base] ?? base
    // At night windows light up.
    if (this.look === 'night' && base === P.sky) {
      color = P.lamp
      extra = { ...extra, emissive: P.lamp, emissiveIntensity: 0.9 }
    }
    const k = `${color}|${key}|${JSON.stringify(extra)}`
    let mat = this.mats.get(k)
    if (!mat) {
      mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...extra })
      this.mats.set(k, mat)
    }
    return mat
  }

  /** Shared geometry, made once per key. */
  g<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
    let geo = this.geos.get(key)
    if (!geo) {
      geo = make()
      this.geos.set(key, geo)
    }
    return geo as T
  }

  mesh(geo: THREE.BufferGeometry, color: string | THREE.Material, extra?: MatExtra): THREE.Mesh {
    const o = new THREE.Mesh(geo, typeof color === 'string' ? this.m(color, extra) : color)
    o.castShadow = true
    o.receiveShadow = true
    return o
  }

  box(w: number, h: number, d: number, c: string | THREE.Material, extra?: MatExtra): THREE.Mesh {
    return this.mesh(this.g(`box${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), c, extra)
  }
  cyl(rt: number, rb: number, h: number, seg: number, c: string | THREE.Material, extra?: MatExtra): THREE.Mesh {
    return this.mesh(this.g(`cyl${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), c, extra)
  }
  ball(r: number, c: string | THREE.Material, seg = 7, extra?: MatExtra): THREE.Mesh {
    return this.mesh(this.g(`ball${r},${seg}`, () => new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2))), c, extra)
  }
  dome(r: number, c: string | THREE.Material): THREE.Mesh {
    return this.mesh(this.g(`dome${r}`, () => new THREE.SphereGeometry(r, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2)), c)
  }
  cone(r: number, h: number, seg: number, c: string | THREE.Material): THREE.Mesh {
    return this.mesh(this.g(`cone${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg)), c)
  }
  ico(r: number, c: string | THREE.Material): THREE.Mesh {
    return this.mesh(this.g(`ico${r}`, () => new THREE.IcosahedronGeometry(r, 0)), c)
  }
  rock(r: number, c: string = P.stone): THREE.Mesh {
    return this.mesh(this.g(`rock${r}`, () => new THREE.DodecahedronGeometry(r, 0)), c)
  }
  disc(r: number, c: string | THREE.Material, seg = 20): THREE.Mesh {
    const o = this.mesh(this.g(`disc${r},${seg}`, () => new THREE.CircleGeometry(r, seg)), c)
    o.rotation.x = -Math.PI / 2
    o.castShadow = false
    return o
  }
  /** Gable roof: a triangular prism (ridge along z). */
  roof(w: number, h: number, d: number, c: string): THREE.Mesh {
    return this.mesh(
      this.g(`roof${w},${h},${d}`, () => {
        const s = new THREE.Shape()
        s.moveTo(-w / 2, 0)
        s.lineTo(w / 2, 0)
        s.lineTo(0, h)
        s.closePath()
        const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false })
        geo.translate(0, 0, -d / 2)
        return geo
      }),
      c,
    )
  }

  dispose(): void {
    this.geos.forEach((g) => g.dispose())
    this.mats.forEach((m) => m.dispose())
    this.geos.clear()
    this.mats.clear()
  }

  // ── decor ──

  /** One placed thing; local +z faces the middle of the garden. `trophy` = the trophy it stands for. */
  build(item: DecorItem, trophy?: Trophy): { group: THREE.Group; anim?: Anim } {
    const g = new THREE.Group()
    g.position.set(item.x, 0, item.z)
    g.rotation.y = item.turn
    const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T => {
      o.position.set(x, y, z)
      g.add(o)
      return o
    }
    const s = item.seed
    switch (item.kind) {
      case 'stone': {
        const o = at(this.rock(0.09, P.stone), 0, 0.005, 0)
        o.scale.set(1.1, 0.35, 1)
        o.rotation.y = s * 6
        o.castShadow = false
        return { group: g }
      }
      case 'bush': {
        at(this.ico(0.16, P.leaf), 0, 0.12, 0)
        at(this.ico(0.12, P.leafLight), 0.11, 0.09, 0.05)
        at(this.ico(0.11, P.leaf), -0.1, 0.08, -0.04)
        if (s > 0.4) for (let i = 0; i < 4; i++) at(this.ball(0.025, s > 0.7 ? P.white : P.pink, 5), Math.cos(i * 1.7) * 0.13, 0.17 + (i % 2) * 0.05, Math.sin(i * 1.7) * 0.12)
        return { group: g }
      }
      case 'cottage':
        return this.house(g, { roof: P.green, wall: P.white, scale: 1, smoke: true })
      case 'house':
        return this.house(g, { roof: [P.coral, P.amber, P.blue][Math.floor(s * 3)], wall: s > 0.5 ? P.cream : P.white, scale: 0.82, smoke: false, tall: s > 0.45 })
      case 'bench': {
        at(this.box(0.5, 0.04, 0.16, P.wood), 0, 0.2, 0)
        at(this.box(0.5, 0.13, 0.03, P.wood), 0, 0.32, -0.07)
        for (const x of [-0.21, 0.21]) for (const z of [-0.06, 0.06]) at(this.box(0.03, 0.2, 0.03, P.woodDark), x, 0.1, z)
        return { group: g }
      }
      case 'mailbox': {
        at(this.box(0.04, 0.4, 0.04, P.woodDark), 0, 0.2, 0)
        at(this.box(0.12, 0.1, 0.18, P.blue), 0, 0.44, 0)
        at(this.cyl(0.06, 0.06, 0.18, 8, P.blue), 0, 0.49, 0).rotation.x = Math.PI / 2
        at(this.box(0.015, 0.12, 0.04, P.coral), 0.07, 0.52, -0.04)
        return { group: g }
      }
      case 'pond':
        return this.pond(g)
      case 'tree': {
        at(this.cyl(0.05, 0.08, 0.6, 6, P.brown), 0, 0.3, 0)
        at(this.ico(0.34, s > 0.5 ? P.leaf : P.leafLight), 0, 0.78, 0)
        at(this.ico(0.24, P.leafLight), 0.18, 0.66, 0.1)
        at(this.ico(0.22, P.leaf), -0.16, 0.95, -0.06)
        if (s > 0.6) for (let i = 0; i < 4; i++) at(this.ball(0.04, P.coral, 5), Math.cos(i * 1.9) * 0.3, 0.7 + (i % 2) * 0.18, Math.sin(i * 1.9) * 0.28)
        g.scale.setScalar(0.9 + s * 0.3)
        return { group: g }
      }
      case 'pine': {
        at(this.cyl(0.04, 0.06, 0.25, 6, P.brown), 0, 0.12, 0)
        at(this.cone(0.32, 0.5, 7, P.pine), 0, 0.45, 0)
        at(this.cone(0.25, 0.42, 7, P.pine), 0, 0.72, 0)
        at(this.cone(0.17, 0.36, 7, P.pine), 0, 0.96, 0)
        g.scale.setScalar(0.85 + s * 0.4)
        return { group: g }
      }
      case 'mushroom': {
        for (const [x, z, k] of [
          [0, 0, 1],
          [0.08, 0.05, 0.7],
          [-0.06, 0.07, 0.55],
        ] as const) {
          const m = new THREE.Group()
          m.position.set(x, 0, z)
          m.scale.setScalar(k)
          m.add(this.cyl(0.025, 0.03, 0.12, 6, P.white))
          m.children[0].position.y = 0.06
          const cap = this.dome(0.07, s > 0.5 ? P.coral : P.amber)
          cap.position.y = 0.11
          m.add(cap)
          for (let i = 0; i < 3; i++) {
            const d = this.ball(0.012, P.white, 4)
            d.position.set(Math.cos(i * 2.1) * 0.04, 0.16, Math.sin(i * 2.1) * 0.04)
            m.add(d)
          }
          g.add(m)
        }
        return { group: g }
      }
      case 'rabbit': {
        const body = new THREE.Group()
        g.add(body)
        const fur = s > 0.5 ? P.white : '#c9b49c'
        const add = (o: THREE.Mesh, x: number, y: number, z: number): THREE.Mesh => {
          o.position.set(x, y, z)
          body.add(o)
          return o
        }
        add(this.ball(0.08, fur), 0, 0.08, 0).scale.set(1, 0.9, 1.2)
        add(this.ball(0.055, fur), 0, 0.15, 0.08)
        for (const x of [-0.022, 0.022]) add(this.ball(0.02, fur, 5), x, 0.23, 0.07).scale.set(0.7, 2.2, 0.6)
        add(this.ball(0.025, P.white, 5), 0, 0.09, -0.1)
        const r0 = 0.14
        return {
          group: g,
          anim: (t) => {
            // Hops round a little loop, a hop every 1.4 s.
            const a = t * 0.45 + s * 6
            const hop = (t * 0.7 + s) % 1
            body.position.set(Math.cos(a) * r0, hop < 0.4 ? Math.sin((hop / 0.4) * Math.PI) * 0.1 : 0, Math.sin(a) * r0)
            body.rotation.y = -a
          },
        }
      }
      case 'windmill': {
        at(this.cyl(0.24, 0.34, 1.3, 8, P.white), 0, 0.65, 0)
        at(this.cone(0.32, 0.4, 8, P.coral), 0, 1.5, 0)
        at(this.box(0.16, 0.26, 0.03, P.woodDark), 0, 0.13, 0.32)
        at(this.box(0.12, 0.12, 0.03, P.sky), 0, 0.75, 0.29)
        const blades = new THREE.Group()
        blades.position.set(0, 1.22, 0.33)
        for (let i = 0; i < 4; i++) {
          const arm = new THREE.Group()
          arm.rotation.z = (i * Math.PI) / 2
          const pole = this.box(0.03, 0.72, 0.02, P.woodDark)
          pole.position.y = 0.36
          const sail = this.box(0.14, 0.52, 0.01, P.cream)
          sail.position.set(0.085, 0.42, 0)
          arm.add(pole, sail)
          blades.add(arm)
        }
        blades.add(this.ball(0.05, P.woodDark, 6))
        g.add(blades)
        return { group: g, anim: (t) => (blades.rotation.z = -t * 0.7) }
      }
      case 'lamp': {
        at(this.cyl(0.02, 0.03, 0.7, 6, P.dark), 0, 0.35, 0)
        at(this.box(0.1, 0.12, 0.1, P.lamp, { emissive: P.lamp, emissiveIntensity: 0.9 }), 0, 0.76, 0)
        at(this.cone(0.09, 0.07, 4, P.dark), 0, 0.855, 0).rotation.y = Math.PI / 4
        return { group: g }
      }
      case 'cat': {
        const coat = s > 0.5 ? P.amber : '#5a5552'
        at(this.ball(0.075, coat), 0, 0.075, 0).scale.set(1, 1.15, 1.1)
        at(this.ball(0.055, coat), 0, 0.18, 0.04)
        for (const x of [-0.03, 0.03]) at(this.cone(0.018, 0.04, 4, coat), x, 0.235, 0.04)
        const tail = new THREE.Group()
        tail.position.set(0, 0.04, -0.07)
        const tt = this.cyl(0.012, 0.014, 0.14, 5, coat)
        tt.position.y = 0.07
        tail.add(tt)
        tail.rotation.x = -0.6
        g.add(tail)
        return { group: g, anim: (t) => (tail.rotation.z = Math.sin(t * 1.6 + s * 5) * 0.5) }
      }
      case 'waterfall':
        return this.waterfall(g, item.size)
      case 'blossom': {
        at(this.cyl(0.05, 0.08, 0.55, 6, P.brown), 0, 0.27, 0)
        at(this.ico(0.32, P.pink), 0, 0.72, 0)
        at(this.ico(0.22, P.pinkDeep), 0.17, 0.62, 0.08)
        at(this.ico(0.2, P.pink), -0.15, 0.86, -0.05)
        const petals = Array.from({ length: 3 }, (_, i) => at(this.ball(0.022, P.pink, 4), 0, 0, 0).translateX(0.1 * i))
        return {
          group: g,
          anim: (t) => {
            petals.forEach((p, i) => {
              const k = (t * 0.18 + i / 3 + s) % 1
              p.position.set(Math.cos(i * 2.1) * 0.3 + Math.sin(k * 6) * 0.06, 0.65 * (1 - k), Math.sin(i * 2.1) * 0.3)
              p.visible = k < 0.97
            })
          },
        }
      }
      case 'deer':
        return this.deer(g, s)
      case 'well': {
        at(this.cyl(0.22, 0.24, 0.26, 10, P.stone), 0, 0.13, 0)
        at(this.disc(0.17, P.water), 0, 0.2, 0)
        for (const x of [-0.19, 0.19]) at(this.box(0.04, 0.5, 0.04, P.woodDark), x, 0.45, 0)
        at(this.roof(0.5, 0.18, 0.34, P.coral), 0, 0.68, 0).rotation.y = Math.PI / 2
        at(this.cyl(0.035, 0.03, 0.06, 6, P.wood), 0, 0.42, 0)
        return { group: g }
      }
      case 'clocktower':
        return this.clocktower(g)
      case 'trophy':
        return this.trophy(g, trophy)
      case 'hedgehog':
      case 'fox':
      case 'owl':
      case 'peacock':
      case 'turtle':
        return this.visitor(g, item.kind, s)
      case 'stall': {
        at(this.box(0.6, 0.3, 0.3, P.wood), 0, 0.15, 0.02)
        for (const x of [-0.28, 0.28]) at(this.box(0.03, 0.62, 0.03, P.woodDark), x, 0.31, -0.13)
        const awning = [P.coral, P.amber, P.blue][Math.floor(s * 3)]
        for (let i = 0; i < 5; i++) {
          const o = at(this.box(0.13, 0.02, 0.42, i % 2 ? P.white : awning), -0.26 + i * 0.13, 0.62, 0.04)
          o.rotation.x = 0.28
        }
        const fruit = [P.coral, P.amber, P.leafLight, P.yellow]
        for (let i = 0; i < 6; i++) at(this.ball(0.04, fruit[(i + Math.floor(s * 4)) % 4], 6), -0.2 + (i % 3) * 0.2, 0.33, (i < 3 ? -0.04 : 0.08))
        return { group: g }
      }
    }
  }

  /** Stone plinth with a cup (word list) or a star (collection) in its medal's metal; hover shows its name. */
  private trophy(g: THREE.Group, t?: Trophy): { group: THREE.Group; anim: Anim } {
    const metal = this.m(MEDAL[t?.medal ?? 'bronze'], { metalness: 0.55, roughness: 0.3 })
    const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T => {
      o.position.set(x, y, z)
      g.add(o)
      return o
    }
    at(this.box(0.26, 0.06, 0.26, P.stoneDark), 0, 0.03, 0)
    at(this.box(0.2, 0.22, 0.2, P.stone), 0, 0.17, 0)
    at(this.box(0.12, 0.05, 0.01, metal), 0, 0.17, 0.101)
    const prize = new THREE.Group()
    prize.position.y = 0.28
    g.add(prize)
    if (t?.key.startsWith('col:')) {
      const star = this.mesh(
        this.g('star', () => {
          const sh = new THREE.Shape()
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2 + Math.PI / 2
            const r = i % 2 ? 0.045 : 0.1
            if (i === 0) sh.moveTo(Math.cos(a) * r, Math.sin(a) * r)
            else sh.lineTo(Math.cos(a) * r, Math.sin(a) * r)
          }
          sh.closePath()
          return new THREE.ExtrudeGeometry(sh, { depth: 0.035, bevelEnabled: false }).translate(0, 0.1, -0.017)
        }),
        metal,
      )
      prize.add(star)
    } else {
      const cup = this.cyl(0.075, 0.035, 0.12, 12, metal)
      cup.position.y = 0.1
      const stem = this.cyl(0.015, 0.015, 0.05, 6, metal)
      stem.position.y = 0.025
      const base = this.cyl(0.05, 0.055, 0.02, 12, metal)
      prize.add(cup, stem, base)
      for (const side of [-1, 1]) {
        const handle = this.mesh(this.g('handle', () => new THREE.TorusGeometry(0.03, 0.008, 5, 10, Math.PI)), metal)
        handle.position.set(side * 0.075, 0.11, 0)
        handle.rotation.z = side * -Math.PI / 2
        prize.add(handle)
      }
    }
    g.userData.trophy = t?.key
    return { group: g, anim: (time) => (prize.rotation.y = time * 0.6) }
  }

  /** Streak visitors that walk: each wanders a small loop round its own spot. */
  private visitor(g: THREE.Group, kind: 'hedgehog' | 'fox' | 'owl' | 'peacock' | 'turtle', s: number): { group: THREE.Group; anim: Anim } {
    const body = new THREE.Group()
    g.add(body)
    const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number, parent: THREE.Object3D = body): T => {
      o.position.set(x, y, z)
      parent.add(o)
      return o
    }
    /** Walk a loop of radius `r` at `speed`, pausing now and then; `step` bobs while walking. */
    const wander = (r: number, speed: number, step: (t: number, walking: boolean) => void): Anim => {
      let dist = s * 10
      let last = 0
      return (t) => {
        const dt = Math.min(0.1, Math.max(0, t - last))
        last = t
        const walking = Math.sin(t * 0.35 + s * 9) > -0.4
        if (walking) dist += dt * speed
        const a = dist / r
        body.position.set(Math.cos(a) * r, 0, Math.sin(a) * r)
        body.rotation.y = -a
        step(t, walking)
      }
    }
    switch (kind) {
      case 'hedgehog': {
        at(this.dome(0.09, '#8a6a4f'), 0, 0.01, 0).scale.set(1, 0.85, 1.25)
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2
          const spike = at(this.cone(0.018, 0.07, 4, '#5c4433'), Math.cos(a) * 0.055, 0.06 + (i % 2) * 0.015, Math.sin(a) * 0.07 - 0.01)
          spike.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9)
        }
        const snout = at(this.cone(0.035, 0.08, 6, '#d9b98f'), 0, 0.04, 0.12)
        snout.rotation.x = Math.PI / 2
        at(this.ball(0.013, P.dark, 5), 0, 0.04, 0.16)
        return { group: g, anim: wander(0.16, 0.08, (t, w) => (body.position.y = w ? Math.abs(Math.sin(t * 9)) * 0.008 : 0)) }
      }
      case 'fox': {
        const orange = '#e07a35'
        const torso = this.mesh(this.g('foxBody', () => new THREE.CapsuleGeometry(0.06, 0.16, 3, 7)), orange)
        torso.rotation.x = Math.PI / 2
        at(torso, 0, 0.16, 0)
        at(this.ball(0.05, P.white, 6), 0, 0.15, 0.08).scale.set(0.9, 1, 0.8)
        const legs = [-1, 1].flatMap((x) => [-1, 1].map((z) => at(this.cyl(0.012, 0.01, 0.12, 5, P.dark), x * 0.035, 0.06, z * 0.08)))
        const head = new THREE.Group()
        head.position.set(0, 0.24, 0.13)
        body.add(head)
        at(this.ball(0.05, orange), 0, 0, 0, head)
        const snout = at(this.cone(0.03, 0.08, 6, P.white), 0, -0.01, 0.06, head)
        snout.rotation.x = Math.PI / 2
        at(this.ball(0.01, P.dark, 4), 0, -0.01, 0.1, head)
        for (const x of [-0.03, 0.03]) at(this.cone(0.02, 0.05, 4, orange), x, 0.05, -0.005, head)
        const tail = new THREE.Group()
        tail.position.set(0, 0.17, -0.13)
        body.add(tail)
        const tt = this.mesh(this.g('foxTail', () => new THREE.CapsuleGeometry(0.035, 0.12, 3, 6)), orange)
        tt.position.set(0, 0, -0.08)
        tt.rotation.x = Math.PI / 2 + 0.6
        tail.add(tt)
        at(this.ball(0.03, P.white, 5), 0, -0.07, -0.15, tail)
        return {
          group: g,
          anim: wander(0.25, 0.22, (t, w) => {
            legs.forEach((l, i) => (l.rotation.x = w ? Math.sin(t * 10 + (i % 2) * Math.PI) * 0.5 : 0))
            tail.rotation.y = Math.sin(t * 2.5) * 0.35
            head.rotation.y = w ? 0 : Math.sin(t * 0.8) * 0.6
          }),
        }
      }
      case 'owl': {
        at(this.cyl(0.08, 0.1, 0.22, 7, P.brown), 0, 0.11, 0, g)
        const owl = new THREE.Group()
        owl.position.y = 0.22
        g.add(owl)
        at(this.ball(0.07, '#9c7a55'), 0, 0.07, 0, owl).scale.set(1, 1.2, 0.95)
        const head = new THREE.Group()
        head.position.y = 0.16
        owl.add(head)
        at(this.ball(0.055, '#9c7a55'), 0, 0, 0, head)
        at(this.ball(0.045, '#e8d5b5', 7), 0, 0, 0.025, head).scale.set(1, 0.8, 0.5)
        for (const x of [-0.02, 0.02]) {
          at(this.ball(0.016, P.white, 6), x, 0.005, 0.045, head)
          at(this.ball(0.009, P.dark, 5), x, 0.005, 0.058, head)
          at(this.cone(0.014, 0.04, 4, '#7a5d40'), x * 1.8, 0.055, 0, head)
        }
        const beak = at(this.cone(0.008, 0.02, 4, P.amber), 0, -0.015, 0.055, head)
        beak.rotation.x = Math.PI
        body.removeFromParent()
        return {
          group: g,
          anim: (t) => {
            // Looks one way, then the other, now and then.
            const k = (t * 0.15 + s) % 1
            head.rotation.y = k < 0.3 ? 0 : k < 0.5 ? 1.2 : k < 0.7 ? -1.2 : 0
          },
        }
      }
      case 'peacock': {
        const blue = '#2a6fb0'
        at(this.ball(0.07, blue), 0, 0.13, 0).scale.set(0.9, 1, 1.3)
        for (const x of [-0.025, 0.025]) at(this.cyl(0.008, 0.008, 0.1, 4, P.dark), x, 0.05, 0)
        const neck = at(this.cyl(0.02, 0.028, 0.14, 6, blue), 0, 0.24, 0.06)
        neck.rotation.x = 0.3
        at(this.ball(0.032, blue), 0, 0.32, 0.08)
        for (let i = 0; i < 3; i++) at(this.ball(0.008, '#3fa39a', 4), (i - 1) * 0.012, 0.37, 0.07)
        const beak = at(this.cone(0.008, 0.03, 4, P.cream), 0, 0.32, 0.12)
        beak.rotation.x = Math.PI / 2
        const fan = new THREE.Group()
        fan.position.set(0, 0.14, -0.07)
        body.add(fan)
        for (let i = 0; i < 11; i++) {
          const a = -1.35 + (i / 10) * 2.7
          const feather = new THREE.Group()
          feather.rotation.z = a
          const f = this.ball(0.04, '#2f8a63', 6)
          f.scale.set(0.5, 2.8, 0.25)
          f.position.y = 0.11
          const eye = this.ball(0.018, '#2a6fb0', 5)
          eye.position.set(0, 0.2, -0.01)
          const ring = this.ball(0.026, P.amber, 5)
          ring.scale.set(1, 1, 0.3)
          ring.position.set(0, 0.2, -0.005)
          feather.add(f, ring, eye)
          fan.add(feather)
        }
        return {
          group: g,
          anim: wander(0.22, 0.07, (t, w) => {
            // Fans the tail out while standing, folds it to walk.
            const open = w ? 0.2 : 1
            fan.scale.x += (open - fan.scale.x) * 0.06
            fan.rotation.x = -0.35 - (1 - fan.scale.x) * 0.9
          }),
        }
      }
      case 'turtle': {
        at(this.dome(0.11, '#5e8f4e'), 0, 0.02, 0).scale.set(1, 0.75, 1.25)
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2
          at(this.ball(0.03, '#7aa865', 5), Math.cos(a) * 0.05, 0.085, Math.sin(a) * 0.06).scale.set(1, 0.4, 1)
        }
        const head = at(this.ball(0.04, '#a8c98f', 6), 0, 0.05, 0.15)
        const legs = [-1, 1].flatMap((x) => [-1, 1].map((z) => at(this.ball(0.03, '#a8c98f', 5), x * 0.09, 0.02, z * 0.08)))
        return {
          group: g,
          anim: wander(0.2, 0.025, (t, w) => {
            head.position.z = 0.15 + (w ? 0.015 : 0) + Math.sin(t * 0.7) * 0.008
            legs.forEach((l, i) => (l.position.y = 0.02 + (w ? Math.max(0, Math.sin(t * 3 + i * 1.6)) * 0.015 : 0)))
          }),
        }
      }
    }
  }

  /** The year-long streak's dragon: a serpentine body following its head round the garden, high up. */
  dragon(extent: number): { group: THREE.Group; anim: Anim } {
    const g = new THREE.Group()
    const green = '#3fa37a'
    const segs: THREE.Object3D[] = []
    const head = new THREE.Group()
    head.add(this.ball(0.13, green, 8))
    const snout = this.ball(0.08, green, 7)
    snout.position.z = 0.12
    snout.scale.set(1, 0.7, 1.2)
    head.add(snout)
    for (const x of [-1, 1]) {
      const horn = this.cone(0.025, 0.16, 5, P.amber)
      horn.position.set(x * 0.07, 0.12, -0.04)
      horn.rotation.x = -0.6
      const eye = this.ball(0.022, P.yellow, 5)
      eye.position.set(x * 0.07, 0.05, 0.08)
      const whisker = this.cyl(0.006, 0.004, 0.22, 3, P.amber)
      whisker.position.set(x * 0.08, -0.02, 0.2)
      whisker.rotation.set(Math.PI / 2 - 0.3, 0, x * 0.6)
      head.add(horn, eye, whisker)
    }
    g.add(head)
    segs.push(head)
    // A long, overlapping body so it reads as one serpent, with a golden crest down its back.
    const n = 30
    for (let i = 0; i < n; i++) {
      const r = Math.round(100 * 0.1 * (1 - (i / n) * 0.75)) / 100
      const seg = new THREE.Group()
      seg.add(this.ball(r, i % 3 === 0 ? '#4fb588' : green, 7))
      if (i % 3 === 1) {
        const spine = this.cone(Math.round(r * 40) / 100, Math.round(r * 110) / 100, 4, P.amber)
        spine.position.y = r * 0.9
        seg.add(spine)
      }
      g.add(seg)
      segs.push(seg)
    }
    const tail = this.cone(0.05, 0.16, 5, P.amber)
    tail.rotation.x = -Math.PI / 2
    segs[segs.length - 1].add(tail)
    for (const seg of segs) seg.scale.setScalar(1.6)
    const R = extent * 0.7
    const pathAt = (u: number, out: THREE.Vector3): THREE.Vector3 =>
      out.set(Math.cos(u) * R, 3.0 + Math.sin(u * 3) * 0.35, Math.sin(u) * R * 0.9)
    const p = new THREE.Vector3()
    const q = new THREE.Vector3()
    return {
      group: g,
      anim: (t) => {
        const u0 = t * 0.18
        segs.forEach((seg, i) => {
          const u = u0 - i * 0.028
          pathAt(u, p)
          // A sideways wave travelling down the body.
          const w = Math.sin(t * 3 - i * 0.6) * 0.12
          seg.position.set(p.x + Math.cos(u) * w, p.y + Math.cos(t * 3 - i * 0.6) * 0.05, p.z + Math.sin(u) * w)
          if (i === 0) {
            pathAt(u + 0.05, q)
            seg.lookAt(q)
          }
        })
      },
    }
  }

  private house(g: THREE.Group, o: { roof: string; wall: string; scale: number; smoke: boolean; tall?: boolean }): { group: THREE.Group; anim?: Anim } {
    const W = 1.0
    const H = o.tall ? 0.95 : 0.7
    const D = 0.8
    const add = <T extends THREE.Object3D>(m: T, x: number, y: number, z: number): T => {
      m.position.set(x, y, z)
      g.add(m)
      return m
    }
    add(this.box(W, H, D, o.wall), 0, H / 2, 0)
    add(this.roof(W + 0.18, 0.5, D + 0.16, o.roof), 0, H, 0)
    add(this.box(0.22, 0.4, 0.03, P.woodDark), 0, 0.2, D / 2 + 0.01)
    for (const x of [-0.3, 0.3]) add(this.box(0.18, 0.18, 0.03, P.sky), x, 0.42, D / 2 + 0.01)
    if (o.tall) for (const x of [-0.25, 0.25]) add(this.box(0.16, 0.16, 0.03, P.sky), x, 0.75, D / 2 + 0.01)
    for (const x of [-1, 1]) add(this.box(0.03, 0.18, 0.18, P.sky), x * (W / 2 + 0.01), 0.42, 0)
    add(this.box(0.12, 0.34, 0.12, P.stoneDark), 0.28, H + 0.32, -0.15)
    g.scale.setScalar(o.scale)
    if (!o.smoke) return { group: g }
    const puffs = Array.from({ length: 3 }, (_, i) =>
      add(this.ball(0.07, this.m('#ffffff', { transparent: true, opacity: 0.7 }, `smoke${i}`), 6), 0.28, H + 0.5, -0.15),
    )
    return {
      group: g,
      anim: (t) =>
        puffs.forEach((p, i) => {
          const k = (t * 0.25 + i / 3) % 1
          p.position.set(0.28 + k * 0.12, H + 0.52 + k * 0.7, -0.15 - k * 0.05)
          p.scale.setScalar(0.6 + k * 1.1)
          ;(p.material as THREE.MeshStandardMaterial).opacity = 0.65 * (1 - k)
        }),
    }
  }

  private pond(g: THREE.Group): { group: THREE.Group } {
    const water = this.cyl(0.66, 0.66, 0.04, 24, this.m(P.water, { roughness: 0.25, emissive: P.water, emissiveIntensity: 0.15 }))
    water.position.y = 0.0
    water.castShadow = false
    g.add(water)
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2
      const r = this.rock(0.07 + (i % 3) * 0.015, i % 2 ? P.stone : P.stoneDark)
      r.position.set(Math.cos(a) * 0.74, 0.02, Math.sin(a) * 0.74)
      r.scale.y = 0.6
      r.rotation.y = a * 3
      g.add(r)
    }
    const pads: THREE.Vector3[] = [new THREE.Vector3(0.3, 0.03, 0.22), new THREE.Vector3(-0.32, 0.03, 0.1), new THREE.Vector3(0.05, 0.03, -0.38)]
    pads.forEach((p, i) => {
      const pad = this.cyl(0.11, 0.11, 0.015, 9, PAD)
      pad.position.copy(p)
      pad.castShadow = false
      g.add(pad)
      if (i === 0) {
        for (let k = 0; k < 5; k++) {
          const petal = this.ball(0.03, P.pink, 5)
          const a = (k / 5) * Math.PI * 2
          petal.position.set(p.x + Math.cos(a) * 0.03 + 0.03, 0.06, p.z + Math.sin(a) * 0.03)
          petal.scale.set(1, 0.6, 1.6)
          petal.rotation.y = -a
          g.add(petal)
        }
      }
    })
    for (let i = 0; i < 4; i++) {
      const x = -0.55 + i * 0.07
      const z = -0.42 + (i % 2) * 0.06
      const reed = this.cyl(0.01, 0.012, 0.5, 4, P.pine)
      reed.position.set(x, 0.25, z)
      const tail = this.cyl(0.022, 0.022, 0.1, 5, P.brown)
      tail.position.set(x, 0.45, z)
      g.add(reed, tail)
    }
    g.userData.pads = pads
    return { group: g }
  }

  private waterfall(g: THREE.Group, size: number): { group: THREE.Group; anim: Anim } {
    const water = this.m(P.water, { roughness: 0.25, emissive: P.water, emissiveIntensity: 0.2 })
    const pool = this.cyl(0.22, 0.22, 0.04, 14, water)
    pool.position.set(0, 0.01, 0.06)
    g.add(pool)
    for (let i = 0; i < 7; i++) {
      const a = 0.4 + (i / 6) * (Math.PI * 2 - 0.8) + Math.PI / 2
      const r = this.rock(0.07, i % 2 ? P.stone : P.stoneDark)
      r.position.set(Math.cos(a) * 0.27, 0.04, 0.06 + Math.sin(a) * 0.27)
      g.add(r)
    }
    const channel = this.box(0.2, 0.03, size + 0.1, water)
    channel.position.set(0, 0.005, -size / 2 + 0.02)
    g.add(channel)
    // The sheet pours over the edge and thins out below the island.
    const sheets = [0.75, 0.45, 0.2].map((op, i) => {
      const s = this.box(0.2, 0.9, 0.04, this.m(P.water, { transparent: true, opacity: op, roughness: 0.2, emissive: P.water, emissiveIntensity: 0.25 }, `fall${i}`))
      s.position.set(0, -0.45 - i * 0.9, -size - 0.05)
      s.castShadow = false
      g.add(s)
      return s
    })
    const drops = Array.from({ length: 6 }, () => {
      const d = this.ball(0.03, this.m('#ffffff', { transparent: true, opacity: 0.85 }, 'spray'), 5)
      g.add(d)
      return d
    })
    return {
      group: g,
      anim: (t) => {
        drops.forEach((d, i) => {
          const k = (t * 0.6 + i / 6) % 1
          d.position.set(((i % 3) - 1) * 0.06, -k * 2.6, -size - 0.08 - k * 0.05)
        })
        sheets[0].scale.x = 1 + Math.sin(t * 5) * 0.03
      },
    }
  }

  private deer(g: THREE.Group, s: number): { group: THREE.Group; anim: Anim } {
    const coat = '#c08a5a'
    const body = this.mesh(this.g('deerBody', () => new THREE.CapsuleGeometry(0.08, 0.2, 3, 7)), coat)
    body.rotation.x = Math.PI / 2
    body.position.y = 0.3
    g.add(body)
    for (const x of [-0.05, 0.05]) for (const z of [-0.1, 0.1]) {
      const leg = this.cyl(0.015, 0.012, 0.24, 5, coat)
      leg.position.set(x, 0.12, z)
      g.add(leg)
    }
    const tail = this.ball(0.03, P.white, 5)
    tail.position.set(0, 0.34, -0.17)
    g.add(tail)
    const neck = new THREE.Group()
    neck.position.set(0, 0.34, 0.13)
    g.add(neck)
    const n = this.cyl(0.03, 0.04, 0.2, 6, coat)
    n.position.set(0, 0.08, 0.03)
    n.rotation.x = 0.4
    neck.add(n)
    const head = this.ball(0.055, coat)
    head.position.set(0, 0.19, 0.08)
    head.scale.set(0.9, 0.9, 1.4)
    neck.add(head)
    for (const x of [-1, 1]) {
      const ear = this.ball(0.02, coat, 5)
      ear.position.set(x * 0.045, 0.24, 0.05)
      ear.scale.set(0.8, 1.8, 0.6)
      neck.add(ear)
      if (s > 0.4) {
        const antler = this.cyl(0.007, 0.01, 0.12, 4, P.cream)
        antler.position.set(x * 0.03, 0.3, 0.05)
        antler.rotation.z = -x * 0.35
        neck.add(antler)
      }
    }
    return {
      group: g,
      anim: (t) => {
        // Grazes: head down for a while, then up to look around.
        const k = (t * 0.12 + s) % 1
        const down = k < 0.55 ? Math.min(1, k / 0.08, (0.55 - k) / 0.08) : 0
        neck.rotation.x = down * 1.15
        neck.rotation.y = down ? 0 : Math.sin(t * 0.8) * 0.4
      },
    }
  }

  private clocktower(g: THREE.Group): { group: THREE.Group; anim: Anim } {
    const add = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T => {
      o.position.set(x, y, z)
      g.add(o)
      return o
    }
    add(this.box(0.7, 0.3, 0.7, P.stone), 0, 0.15, 0)
    add(this.box(0.52, 1.9, 0.52, P.cream), 0, 1.25, 0)
    add(this.box(0.6, 0.1, 0.6, P.stoneDark), 0, 2.2, 0)
    add(this.cone(0.48, 0.7, 4, P.green), 0, 2.6, 0).rotation.y = Math.PI / 4
    add(this.box(0.18, 0.32, 0.03, P.woodDark), 0, 0.46, 0.27)
    for (const y of [0.9, 1.3]) add(this.box(0.12, 0.18, 0.03, P.sky), 0, y, 0.265)
    const hands: THREE.Object3D[] = []
    for (let i = 0; i < 4; i++) {
      const face = new THREE.Group()
      face.rotation.y = (i * Math.PI) / 2
      g.add(face)
      const dial = this.cyl(0.17, 0.17, 0.03, 16, P.white)
      dial.rotation.x = Math.PI / 2
      dial.position.set(0, 1.8, 0.27)
      face.add(dial)
      const pivot = new THREE.Group()
      pivot.position.set(0, 1.8, 0.29)
      const hh = this.box(0.025, 0.09, 0.012, P.dark)
      hh.position.y = 0.045
      const mm = new THREE.Group()
      const mh = this.box(0.018, 0.13, 0.012, P.dark)
      mh.position.y = 0.065
      mm.add(mh)
      pivot.add(hh, mm)
      pivot.rotation.z = -1.2
      face.add(pivot)
      hands.push(mm)
    }
    return { group: g, anim: (t) => hands.forEach((h) => (h.rotation.z = -t * 0.25)) }
  }

  /**
   * Grass tufts and wildflowers on the open ground between the plants' patch and the edge (instanced: hundreds cost
   * two draw calls). Stays clear of everything placed.
   */
  scatter(layout: GardenLayout, inner: number): THREE.Group {
    const g = new THREE.Group()
    const band = layout.radius - inner
    if (band < 0.3) return g
    const area = Math.PI * (layout.radius ** 2 - inner ** 2)
    const n = Math.min(600, Math.round(area * 2.2))
    const spots: { x: number; z: number; flower: boolean; k: number }[] = []
    // Fixed pseudo-random spots (mulberry32), even over the area.
    let seed = 0x2f8a63
    const rand = (): number => {
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32
    }
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2
      const k = rand()
      const lo = inner + 0.1
      const hi = layout.radius - 0.1
      const r = Math.sqrt(lo * lo + k * (hi * hi - lo * lo))
      const x = r * Math.cos(a)
      const z = r * Math.sin(a)
      if (layout.items.some((it) => Math.hypot(it.x - x, it.z - z) < it.size + 0.06)) continue
      spots.push({ x, z, flower: i % 5 === 0, k })
    }
    const m4 = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const v = new THREE.Vector3()
    const sc = new THREE.Vector3()
    const blades = spots.filter((s) => !s.flower)
    const tuft = new THREE.InstancedMesh(
      this.g('tuft', () => new THREE.ConeGeometry(0.028, 0.16, 4).translate(0, 0.08, 0)),
      this.m(GROUND.tuft),
      blades.length * 3,
    )
    blades.forEach((s, i) =>
      [-1, 0, 1].forEach((d, j) => {
        q.setFromEuler(new THREE.Euler(d * 0.35, s.k * 6, d * 0.3))
        m4.compose(v.set(s.x + d * 0.03, 0, s.z + j * 0.012), q, sc.setScalar(0.7 + s.k * 0.6))
        tuft.setMatrixAt(i * 3 + j, m4)
      }),
    )
    const flowers = spots.filter((s) => s.flower)
    const bloom = new THREE.InstancedMesh(this.g('wild', () => new THREE.SphereGeometry(0.03, 5, 3)), this.m('#ffffff'), flowers.length)
    const colours = [P.white, P.yellow, P.pink, P.bluebell, P.white].map((c) => new THREE.Color(c))
    flowers.forEach((s, i) => {
      m4.compose(v.set(s.x, 0.05, s.z), q.identity(), sc.set(1, 0.6, 1))
      bloom.setMatrixAt(i, m4)
      bloom.setColorAt(i, colours[i % colours.length])
    })
    tuft.receiveShadow = bloom.receiveShadow = true
    g.add(tuft, bloom)
    return g
  }

  /** Low fence round the plants with a gate (white pickets, two rails). */
  fence(radius: number, gate: number): THREE.Group {
    const g = new THREE.Group()
    const gap = 0.55 / radius
    const n = Math.max(12, Math.round((Math.PI * 2 * radius) / 0.3))
    const posts: number[] = []
    for (let i = 0; i < n; i++) {
      const a = gate + gap / 2 + (i / n) * (Math.PI * 2 - gap)
      posts.push(a)
    }
    posts.push(gate - gap / 2 + Math.PI * 2)
    posts.forEach((a, i) => {
      const gatePost = i === 0 || i === posts.length - 1
      const p = this.box(gatePost ? 0.06 : 0.045, gatePost ? 0.36 : 0.26, gatePost ? 0.06 : 0.03, P.white)
      p.position.set(Math.cos(a) * radius, gatePost ? 0.18 : 0.13, Math.sin(a) * radius)
      p.rotation.y = -a
      g.add(p)
      if (i < posts.length - 1) {
        const b = posts[i + 1]
        const mid = (a + b) / 2
        const len = 2 * radius * Math.sin((b - a) / 2)
        for (const y of [0.09, 0.19]) {
          const rail = this.box(0.02, 0.025, len, P.white)
          rail.position.set(Math.cos(mid) * radius, y, Math.sin(mid) * radius)
          rail.rotation.y = -mid
          rail.castShadow = false
          g.add(rail)
        }
      }
    })
    return g
  }

  // ── critters ──

  critter(
    kind: CritterKind,
    i: number,
    ctx: { inner: number; extent: number; blooms: THREE.Vector3[]; pond: THREE.Group | null },
  ): { group: THREE.Group; anim: Anim } | null {
    const g = new THREE.Group()
    const ph = i * 2.399 // golden angle: spread the phases
    switch (kind) {
      case 'butterfly': {
        const c = [P.coral, P.amber, P.bluebell, P.white, P.pinkDeep][i % 5]
        const wings = [-1, 1].map((side) => {
          const w = new THREE.Group()
          const m = this.mesh(this.g('wing', () => new THREE.CircleGeometry(0.075, 7)), this.m(c, { side: THREE.DoubleSide }, 'wing'))
          m.rotation.x = -Math.PI / 2
          m.position.x = side * 0.07
          m.scale.set(1, 1.25, 1)
          w.add(m)
          g.add(w)
          return { w, side }
        })
        g.add(this.ball(0.015, P.dark, 4))
        g.children[g.children.length - 1].scale.set(1, 1, 3)
        const R = Math.max(0.6, ctx.inner * 0.75)
        return {
          group: g,
          anim: (t) => {
            const a = t * 0.22 + ph
            g.position.set(Math.cos(a) * R * (0.6 + 0.4 * Math.sin(t * 0.31 + ph)), 1.0 + Math.sin(t * 1.3 + ph) * 0.18, Math.sin(a * 1.3) * R * 0.8)
            g.rotation.y = -a
            const f = Math.sin(t * 16 + ph) * 0.9
            wings.forEach(({ w, side }) => (w.rotation.z = side * f))
          },
        }
      }
      case 'bee': {
        const body = this.ball(0.035, P.yellow, 6)
        body.scale.set(1, 1, 1.4)
        const stripe = this.cyl(0.036, 0.036, 0.012, 8, P.dark)
        stripe.rotation.x = Math.PI / 2
        const wings = [-1, 1].map((side) => {
          const w = this.ball(0.025, this.m('#ffffff', { transparent: true, opacity: 0.7 }, 'beeWing'), 5)
          w.scale.set(1, 0.3, 0.6)
          w.position.set(side * 0.03, 0.03, 0)
          return w
        })
        g.add(body, stripe, ...wings)
        const spots = ctx.blooms.length ? ctx.blooms : [new THREE.Vector3(0.3, 0.8, 0), new THREE.Vector3(-0.4, 0.8, 0.3)]
        return {
          group: g,
          anim: (t) => {
            // Visits a flower for a few seconds, then flies to another.
            const slot = t / 4 + i * 1.7
            const k = slot % 1
            const a = spots[Math.floor(slot * 7.31 + i * 3) % spots.length]
            const b = spots[Math.floor((slot + 1) * 7.31 + i * 3) % spots.length]
            const move = k > 0.75 ? (k - 0.75) / 0.25 : 0
            const e = move * move * (3 - 2 * move)
            const orbit = t * 3 + ph
            g.position.set(
              a.x + (b.x - a.x) * e + Math.cos(orbit) * 0.12,
              a.y + 0.15 + (b.y - a.y) * e + Math.sin(t * 9 + ph) * 0.03 + Math.sin(e * Math.PI) * 0.4,
              a.z + (b.z - a.z) * e + Math.sin(orbit) * 0.12,
            )
            g.rotation.y = -orbit
            wings.forEach((w, j) => (w.rotation.z = (j ? 1 : -1) * Math.sin(t * 40) * 0.6))
          },
        }
      }
      case 'duck': {
        if (!ctx.pond) return null
        const duck = new THREE.Group()
        const white = i % 2 ? P.white : '#e9dcc4'
        duck.add(place(this.ball(0.07, white), 0, 0.05, 0))
        duck.children[0].scale.set(1, 0.75, 1.35)
        duck.add(place(this.ball(0.045, i % 2 ? P.white : P.pine), 0, 0.13, 0.07))
        const beak = this.cone(0.018, 0.05, 5, P.amber)
        beak.rotation.x = Math.PI / 2
        beak.position.set(0, 0.125, 0.125)
        duck.add(beak)
        g.add(duck)
        ctx.pond.add(g)
        return {
          group: g,
          anim: (t) => {
            const a = t * 0.3 + i * 0.9
            g.position.set(Math.cos(a) * 0.36, 0.01 + Math.sin(t * 2 + i) * 0.008, Math.sin(a) * 0.36)
            g.rotation.y = -a
          },
        }
      }
      case 'frog': {
        const pads = ctx.pond?.userData.pads as THREE.Vector3[] | undefined
        if (!ctx.pond || !pads) return null
        g.add(place(this.ball(0.045, P.leafLight), 0, 0.035, 0))
        g.children[0].scale.set(1.1, 0.7, 1)
        for (const x of [-0.025, 0.025]) {
          g.add(place(this.ball(0.015, P.white, 5), x, 0.07, 0.025))
          g.add(place(this.ball(0.007, P.dark, 4), x, 0.073, 0.037))
        }
        ctx.pond.add(g)
        return {
          group: g,
          anim: (t) => {
            // Sits on a pad, every 5 s jumps to the next one.
            const slot = t / 5
            const k = slot % 1
            const a = pads[Math.floor(slot) % pads.length]
            const b = pads[(Math.floor(slot) + 1) % pads.length]
            const jump = k > 0.85 ? (k - 0.85) / 0.15 : 0
            g.position.set(a.x + (b.x - a.x) * jump, a.y + Math.sin(jump * Math.PI) * 0.25, a.z + (b.z - a.z) * jump)
            g.rotation.y = Math.atan2(b.x - a.x, b.z - a.z)
          },
        }
      }
      case 'bird': {
        const body = this.ball(0.05, P.dark, 6)
        body.scale.set(0.8, 0.8, 1.6)
        g.add(body)
        const wings = [-1, 1].map((side) => {
          const w = new THREE.Group()
          const m = this.box(0.16, 0.01, 0.07, P.dark)
          m.position.x = side * 0.08
          w.add(m)
          g.add(w)
          return { w, side }
        })
        const R = ctx.extent * 0.55 + i * 0.5
        const h = 3.0 + i * 0.35
        return {
          group: g,
          anim: (t) => {
            const a = t * (0.3 - i * 0.03) + ph
            g.position.set(Math.cos(a) * R, h + Math.sin(t * 0.7 + ph) * 0.2, Math.sin(a) * R)
            g.rotation.y = -a
            const f = Math.sin(t * 7 + ph) * 0.6
            wings.forEach(({ w, side }) => (w.rotation.z = side * f))
          },
        }
      }
      case 'balloon': {
        const colours = i % 2 ? [P.green, P.white] : [P.coral, P.amber]
        for (let k = 0; k < 8; k++) {
          const slice = this.mesh(
            this.g(`balloon${k}`, () => new THREE.SphereGeometry(0.5, 3, 10, (k * Math.PI) / 4, Math.PI / 4)),
            colours[k % 2],
          )
          slice.scale.set(1, 1.15, 1)
          slice.position.y = 0.9
          g.add(slice)
        }
        g.add(place(this.box(0.24, 0.16, 0.24, P.wood), 0, 0.08, 0))
        for (const x of [-0.1, 0.1])
          for (const z of [-0.1, 0.1]) g.add(place(this.cyl(0.006, 0.006, 0.45, 3, P.woodDark), x, 0.38, z))
        g.scale.setScalar(0.6)
        const R = ctx.extent * 0.8 + i * 0.6
        return {
          group: g,
          anim: (t) => {
            const a = t * 0.05 + ph
            g.position.set(Math.cos(a) * R, 4.4 + i * 0.7 + Math.sin(t * 0.5 + ph) * 0.25, Math.sin(a) * R)
          },
        }
      }
    }
  }

  // ── flowers ──

  /** Stem height for a bloom of this kind (the daisy is 0.78). */
  static height(kind: FlowerKind): number {
    return { daisy: 0.78, tulip: 0.7, sunflower: 1.05, lavender: 0.62, bluebell: 0.66, rose: 0.74, poppy: 0.82, lily: 0.8 }[kind]
  }

  /** Flower head at the stem tip (tipX, tipY) into `top`; `hue` picks a colour within the kind. */
  flower(kind: FlowerKind, top: THREE.Group, tipX: number, tipY: number, hue: number): void {
    const add = (o: THREE.Mesh, x: number, y: number, z: number): THREE.Mesh => {
      o.position.set(x, y, z)
      top.add(o)
      return o
    }
    const pick = (cs: string[]): string => cs[Math.floor(hue * cs.length) % cs.length]
    switch (kind) {
      case 'daisy': {
        const c = pick([P.white, P.pink, P.coral, '#f1e9dc', P.amber, '#e98a6b'])
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2
          const p = add(this.ball(0.075, c, 6), tipX + Math.cos(a) * 0.1, tipY + 0.02, Math.sin(a) * 0.1)
          p.scale.set(1.15, 0.4, 0.75)
          p.rotation.y = -a
        }
        add(this.ball(0.065, P.yellow), tipX, tipY + 0.05, 0).scale.set(1, 0.7, 1)
        return
      }
      case 'tulip': {
        const c = pick([P.coral, P.pinkDeep, P.yellow, P.lavender, '#d94a5c'])
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2
          const p = add(this.ball(0.075, c, 6), tipX + Math.cos(a) * 0.045, tipY + 0.1, Math.sin(a) * 0.045)
          p.scale.set(0.75, 1.5, 0.75)
          p.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25)
        }
        return
      }
      case 'sunflower': {
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2
          const p = add(this.ball(0.06, P.yellow, 5), tipX + Math.cos(a) * 0.16, tipY + 0.04, Math.sin(a) * 0.16)
          p.scale.set(1.6, 0.35, 0.65)
          p.rotation.y = -a
        }
        add(this.cyl(0.12, 0.12, 0.05, 12, P.brown), tipX, tipY + 0.06, 0)
        return
      }
      case 'lavender': {
        const c = pick([P.lavender, '#8a72cc', '#b4a2e6'])
        for (let i = 0; i < 7; i++) add(this.ball(0.045 - i * 0.004, c, 5), tipX + Math.sin(i * 2.4) * 0.02, tipY + 0.02 + i * 0.065, Math.cos(i * 2.4) * 0.02)
        return
      }
      case 'bluebell': {
        const c = pick([P.bluebell, '#8aa0f0', P.white])
        add(this.cyl(0.012, 0.012, 0.2, 4, P.green), tipX + 0.06, tipY + 0.02, 0).rotation.z = -1.1
        for (let i = 0; i < 3; i++) {
          const b = add(this.cone(0.05, 0.09, 6, c), tipX + 0.04 + i * 0.07, tipY - 0.05 - i * 0.02, (i - 1) * 0.04)
          b.rotation.x = Math.PI
        }
        return
      }
      case 'rose': {
        const c = pick(['#d93a4a', P.pinkDeep, P.coral, P.white, P.yellow])
        add(this.ball(0.06, c, 6), tipX, tipY + 0.07, 0).scale.set(1, 1.1, 1)
        for (let ring = 0; ring < 2; ring++)
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 + ring * 0.6
            const p = add(this.ball(0.06, c, 6), tipX + Math.cos(a) * (0.06 + ring * 0.04), tipY + 0.06 - ring * 0.02, Math.sin(a) * (0.06 + ring * 0.04))
            p.scale.set(0.9, 0.8, 0.45)
            p.rotation.y = -a + Math.PI / 2
            p.rotation.z = 0.4 + ring * 0.4
          }
        return
      }
      case 'poppy': {
        const c = pick([P.coral, '#e0402e', P.amber])
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2
          const p = add(this.ball(0.09, c, 6), tipX + Math.cos(a) * 0.08, tipY + 0.06, Math.sin(a) * 0.08)
          p.scale.set(1.1, 0.5, 0.9)
          p.rotation.set(0, -a, 0.5)
        }
        add(this.ball(0.04, P.dark, 6), tipX, tipY + 0.08, 0).scale.set(1, 0.7, 1)
        return
      }
      case 'lily': {
        const c = pick([P.white, P.pink, '#f6d1a6'])
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2
          const p = add(this.ball(0.05, c, 5), tipX + Math.cos(a) * 0.1, tipY + 0.08, Math.sin(a) * 0.1)
          p.scale.set(2.4, 0.35, 0.7)
          p.rotation.set(0, -a, 0.55)
        }
        for (let i = 0; i < 3; i++) add(this.ball(0.015, P.amber, 4), tipX + Math.cos(i * 2.1) * 0.03, tipY + 0.16, Math.sin(i * 2.1) * 0.03)
        return
      }
    }
  }
}

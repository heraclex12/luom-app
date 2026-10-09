// Floating islands round the garden from level 100 on (see wordbook/gardenWorld.ts): the castle of the sky kingdom,
// then Sa Pa terraces, Ha Long Bay, Hoi An lanterns, a lotus lake, a bamboo grove, a snowy peak and a tropical beach.
// Each one floats at its own height and is linked to the garden's edge by a plank bridge.
import * as THREE from 'three'
import type { IslandKind, Islet, ShownLook } from '@/wordbook'
import { DecorKit, P, PAD, type Anim } from './gardenDecor'

const TOP: Record<IslandKind, string> = {
  castle: '#a6cf8f',
  terraces: '#86c46a',
  halong: '#a6cf8f',
  hoian: '#bcd39a',
  lotus: '#a6cf8f',
  bamboo: '#9fcb86',
  snow: '#eef3f6',
  beach: '#f1dca6',
}

/** One island with its bridge from the garden's edge (`gardenRadius`). */
export function buildIslet(kit: DecorKit, isl: Islet, gardenRadius: number, look: ShownLook): { group: THREE.Group; anim: Anim } {
  const g = new THREE.Group()
  const top = new THREE.Group()
  top.position.set(isl.x, isl.lift, isl.z)
  // Front (+z) faces the garden.
  top.rotation.y = Math.atan2(-isl.x, -isl.z)
  g.add(top)
  const r = isl.radius
  const water = isl.kind === 'halong' || isl.kind === 'lotus'
  const ground = kit.cyl(r, r * 0.95, 0.2, 24, TOP[isl.kind])
  ground.position.y = -0.1
  const rim = kit.cyl(r * 0.95, r * 0.88, 0.14, 24, isl.kind === 'snow' ? '#cfdbe3' : isl.kind === 'beach' ? '#d9c08a' : '#7db06d')
  rim.position.y = -0.27
  const under = kit.cone(r * 0.88, r * 0.9, 10, '#9a8670')
  under.rotation.x = Math.PI
  under.position.y = -0.34 - (r * 0.9) / 2
  top.add(ground, rim, under)
  if (water) {
    const lake = kit.cyl(r * 0.82, r * 0.82, 0.04, 24, kit.m(P.water, { roughness: 0.25, emissive: P.water, emissiveIntensity: 0.15 }))
    lake.position.y = 0.01
    lake.castShadow = false
    top.add(lake)
  }
  const anims: Anim[] = []
  const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number, parent: THREE.Object3D = top): T => {
    o.position.set(x, y, z)
    parent.add(o)
    return o
  }
  BUILD[isl.kind](kit, top, at, anims, look)

  // Bridge: planks from the garden's edge to the island (it may slope up or down), sagging a little.
  const dir = new THREE.Vector2(isl.x, isl.z).normalize()
  const from = new THREE.Vector3(dir.x * (gardenRadius - 0.25), 0.02, dir.y * (gardenRadius - 0.25))
  const to = new THREE.Vector3(isl.x - dir.x * (r - 0.25), isl.lift + 0.02, isl.z - dir.y * (r - 0.25))
  const n = Math.round(from.distanceTo(to) / 0.16)
  const yaw = Math.atan2(dir.x, dir.y)
  for (let i = 0; i <= n; i++) {
    const k = i / n
    const p = from.clone().lerp(to, k)
    p.y -= Math.sin(k * Math.PI) * 0.18
    const plank = kit.box(0.42, 0.03, 0.12, i % 2 ? P.wood : P.woodDark)
    plank.position.copy(p)
    plank.rotation.y = yaw
    g.add(plank)
    if (i % 4 === 0)
      for (const side of [-1, 1]) {
        const post = kit.cyl(0.015, 0.015, 0.22, 4, P.woodDark)
        post.position.set(p.x + Math.cos(yaw) * 0.21 * side, p.y + 0.11, p.z - Math.sin(yaw) * 0.21 * side)
        g.add(post)
      }
  }

  if (isl.kind === 'castle') {
    const bands = [P.coral, P.amber, P.yellow, P.leafLight, P.bluebell, P.lavender]
    const rainbow = new THREE.Group()
    rainbow.position.set(isl.x, isl.lift - 0.2, isl.z)
    rainbow.rotation.y = yaw + Math.PI / 2
    bands.forEach((c, i) => {
      const geo = kit.g(`rainbow${i}`, () => new THREE.TorusGeometry(2.2 - i * 0.09, 0.05, 6, 40, Math.PI))
      rainbow.add(new THREE.Mesh(geo, kit.m(c, { transparent: true, opacity: 0.55, emissive: c, emissiveIntensity: 0.25 }, 'rainbow')))
    })
    g.add(rainbow)
  }
  const phase = isl.x * 0.37
  return {
    group: g,
    anim: (t) => {
      top.position.y = isl.lift + Math.sin(t * 0.6 + phase) * 0.06
      for (const a of anims) a(t)
    },
  }
}

type At = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number, parent?: THREE.Object3D) => T
type Builder = (kit: DecorKit, top: THREE.Group, at: At, anims: Anim[], look: ShownLook) => void

const group = (parent: THREE.Object3D, x: number, y: number, z: number, scale = 1): THREE.Group => {
  const o = new THREE.Group()
  o.position.set(x, y, z)
  o.scale.setScalar(scale)
  parent.add(o)
  return o
}

/** A small person: shirt, head, conical hat (nón lá). */
function farmer(kit: DecorKit, parent: THREE.Object3D, shirt: string): THREE.Group {
  const f = new THREE.Group()
  const body = kit.cyl(0.045, 0.06, 0.16, 7, shirt)
  body.position.y = 0.12
  const legs = kit.cyl(0.04, 0.035, 0.08, 6, P.dark)
  legs.position.y = 0.04
  const head = kit.ball(0.04, '#e9c4a0', 7)
  head.position.y = 0.24
  const hat = kit.cone(0.1, 0.07, 10, '#efe0b0')
  hat.position.y = 0.29
  f.add(body, legs, head, hat)
  parent.add(f)
  return f
}

function pine(kit: DecorKit, parent: THREE.Object3D, x: number, z: number, scale: number, snowy = false): void {
  const p = group(parent, x, 0, z, scale)
  const trunk = kit.cyl(0.04, 0.06, 0.25, 6, P.brown)
  trunk.position.y = 0.12
  p.add(trunk)
  for (const [cr, ch, y] of [
    [0.32, 0.5, 0.45],
    [0.25, 0.42, 0.72],
    [0.17, 0.36, 0.96],
  ] as const) {
    const c = kit.cone(cr, ch, 7, P.pine)
    c.position.y = y
    p.add(c)
    if (snowy) {
      const cap = kit.cone(cr * 0.62, ch * 0.42, 7, '#ffffff')
      cap.position.y = y + ch * 0.3
      p.add(cap)
    }
  }
}

const BUILD: Record<IslandKind, Builder> = {
  castle(kit, top, at, anims) {
    const castle = group(top, 0, 0, 0)
    const w = 0.5
    for (const x of [-w, w])
      for (const z of [-w, w]) {
        at(kit.cyl(0.16, 0.18, 0.95, 10, P.cream), x, 0.47, z, castle)
        at(kit.cone(0.21, 0.4, 10, P.coral), x, 1.15, z, castle)
      }
    for (const [x, z, ry] of [
      [0, w, 0],
      [0, -w, 0],
      [w, 0, Math.PI / 2],
      [-w, 0, Math.PI / 2],
    ] as const)
      at(kit.box(2 * w, 0.55, 0.12, P.cream), x, 0.27, z, castle).rotation.y = ry
    at(kit.box(0.24, 0.36, 0.03, P.woodDark), 0, 0.18, w + 0.07, castle)
    at(kit.box(0.5, 1.15, 0.5, P.white), 0, 0.58, 0, castle)
    at(kit.cyl(0.16, 0.18, 0.6, 10, P.white), 0, 1.45, 0, castle)
    at(kit.cone(0.24, 0.5, 10, P.green), 0, 2.0, 0, castle)
    at(kit.cyl(0.008, 0.008, 0.35, 4, P.dark), 0, 2.4, 0, castle)
    const flag = at(kit.box(0.2, 0.11, 0.01, P.coral), 0.1, 2.5, 0, castle)
    pine(kit, top, 0.95, 0.3, 0.7)
    pine(kit, top, -0.9, -0.5, 0.7)
    anims.push((t) => {
      flag.scale.x = 1 + Math.sin(t * 4) * 0.12
      flag.rotation.y = Math.sin(t * 3) * 0.2
    })
  },

  terraces(kit, top, at, anims) {
    // Rice terraces stepping up to a stilt house.
    const steps = [
      [1.15, '#8fd16f'],
      [0.9, '#a6dc86'],
      [0.66, '#8fd16f'],
      [0.42, '#a6dc86'],
    ] as const
    steps.forEach(([rad, c], i) => {
      at(kit.cyl(rad, rad, 0.16, 20, '#7a6a52'), 0, 0.08 + i * 0.16, 0)
      const paddy = at(kit.cyl(rad - 0.03, rad - 0.03, 0.02, 20, kit.m(c, { roughness: 0.4 })), 0, 0.17 + i * 0.16, 0)
      paddy.castShadow = false
    })
    const house = group(top, 0, 0.66, 0)
    for (const x of [-0.1, 0.1]) for (const z of [-0.08, 0.08]) at(kit.cyl(0.012, 0.012, 0.12, 4, P.woodDark), x, 0.06, z, house)
    at(kit.box(0.26, 0.14, 0.2, P.wood), 0, 0.19, 0, house)
    at(kit.cone(0.22, 0.16, 4, '#c9a25e'), 0, 0.34, 0, house).rotation.y = Math.PI / 4
    // Water buffalo on the lowest step, a farmer on the next.
    const buffalo = group(top, 0.2, 0.18, 0.95, 1)
    const body = at(kit.ball(0.09, '#4b4f55'), 0, 0.12, 0, buffalo)
    body.scale.set(1, 0.85, 1.6)
    for (const x of [-0.05, 0.05]) for (const z of [-0.09, 0.09]) at(kit.cyl(0.018, 0.016, 0.1, 5, '#3c3f44'), x, 0.05, z, buffalo)
    const head = group(buffalo, 0, 0.13, 0.15)
    at(kit.ball(0.05, '#4b4f55'), 0, 0, 0.02, head).scale.set(0.9, 0.85, 1.2)
    for (const side of [-1, 1]) {
      const horn = at(kit.cone(0.015, 0.11, 5, P.cream), side * 0.06, 0.04, 0, head)
      horn.rotation.z = -side * 1.25
    }
    buffalo.rotation.y = 1.2
    const f = farmer(kit, top, P.blue)
    f.position.set(-0.55, 0.34, 0.45)
    anims.push((t) => {
      head.rotation.x = 0.5 + Math.sin(t * 0.7) * 0.35
      f.rotation.x = Math.max(0, Math.sin(t * 0.9)) * 0.45
    })
  },

  halong(kit, top, at, anims) {
    // Limestone peaks with green tops rising from the water.
    const peaks = [
      [0.45, -0.3, 1.0, 0.2],
      [-0.4, -0.45, 1.3, 0.24],
      [-0.6, 0.25, 0.8, 0.18],
      [0.65, 0.4, 0.7, 0.16],
      [0.05, -0.75, 0.9, 0.17],
    ] as const
    for (const [x, z, h, w] of peaks) {
      const rock = at(kit.cyl(w * 0.75, w, h, 7, '#b9b6a8'), x, h / 2, z)
      rock.rotation.y = x * 5
      at(kit.ico(w * 0.85, '#5e9a5c'), x, h + 0.02, z).scale.set(1, 0.7, 1)
    }
    // Junk boat with red sails, sailing between them.
    const boat = group(top, 0, 0.03, 0)
    const hull = at(kit.box(0.34, 0.08, 0.13, P.woodDark), 0, 0.04, 0, boat)
    hull.scale.set(1, 1, 1)
    at(kit.box(0.12, 0.06, 0.12, P.wood), -0.12, 0.1, 0, boat)
    for (const [x, h] of [
      [0.06, 0.32],
      [-0.06, 0.26],
    ] as const) {
      at(kit.cyl(0.008, 0.008, h, 4, P.dark), x, 0.08 + h / 2, 0, boat)
      const sail = at(kit.box(0.14, h * 0.8, 0.01, '#c0583a'), x, 0.1 + h * 0.45, 0, boat)
      sail.rotation.y = Math.PI / 2
    }
    anims.push((t) => {
      const a = t * 0.12
      boat.position.set(Math.cos(a) * 0.62, 0.03 + Math.sin(t * 1.7) * 0.01, Math.sin(a) * 0.62 + 0.15)
      boat.rotation.y = -a
      boat.rotation.z = Math.sin(t * 1.3) * 0.05
    })
  },

  hoian(kit, top, at, anims, look) {
    // Yellow old-town houses with brown tile roofs.
    const houses = [
      [-0.55, -0.35, 0.3],
      [0.05, -0.55, 0],
      [0.6, -0.25, -0.35],
    ] as const
    for (const [x, z, ry] of houses) {
      const h = group(top, x, 0, z)
      h.rotation.y = ry
      at(kit.box(0.5, 0.42, 0.4, '#f2c94c'), 0, 0.21, 0, h)
      at(kit.roof(0.62, 0.2, 0.5, '#9c4a2f'), 0, 0.42, 0, h).rotation.y = Math.PI / 2
      at(kit.box(0.14, 0.24, 0.02, P.woodDark), 0, 0.12, 0.21, h)
      for (const wx of [-0.15, 0.15]) at(kit.box(0.09, 0.09, 0.02, P.sky), wx, 0.3, 0.21, h)
    }
    // Strings of lanterns across the street.
    const glow = look === 'night' ? 1.1 : 0.35
    const colours = [P.coral, P.amber, '#d93a4a', P.pinkDeep, P.yellow, '#3fa39a']
    const lanterns: THREE.Object3D[] = []
    for (const [z, phase] of [
      [0.2, 0],
      [0.55, 1.3],
    ] as const) {
      for (const x of [-0.85, 0.85]) at(kit.cyl(0.015, 0.015, 0.55, 4, P.woodDark), x, 0.27, z)
      for (let i = 0; i < 7; i++) {
        const k = (i + 1) / 8
        const x = -0.85 + k * 1.7
        const y = 0.52 - Math.sin(k * Math.PI) * 0.12
        const c = colours[(i + (z > 0.3 ? 2 : 0)) % colours.length]
        const l = at(kit.ball(0.045, kit.m(c, { emissive: c, emissiveIntensity: glow }), 8), x, y, z)
        l.scale.set(1, 1.2, 1)
        l.userData.phase = phase + i * 0.6
        lanterns.push(l)
      }
    }
    anims.push((t) => lanterns.forEach((l) => (l.rotation.z = Math.sin(t * 1.2 + (l.userData.phase as number)) * 0.15)))
  },

  lotus(kit, top, at, anims) {
    // Pads and lotus flowers on the water, koi below, a pavilion on stilts.
    for (let i = 0; i < 14; i++) {
      const a = i * 2.4
      const rr = 0.25 + ((i * 0.37) % 0.8)
      const x = Math.cos(a) * rr
      const z = Math.sin(a) * rr + 0.15
      if (z < -0.2 && Math.abs(x) < 0.45) continue // pavilion
      const pad = at(kit.cyl(0.13, 0.13, 0.015, 10, PAD), x, 0.04, z)
      pad.castShadow = false
      if (i % 3 === 0)
        for (let k = 0; k < 6; k++) {
          const pa = (k / 6) * Math.PI * 2
          const petal = at(kit.ball(0.035, P.pink, 6), x + Math.cos(pa) * 0.035, 0.09, z + Math.sin(pa) * 0.035)
          petal.scale.set(0.8, 1.6, 0.8)
          petal.rotation.set(Math.sin(pa) * 0.5, 0, -Math.cos(pa) * 0.5)
        }
    }
    const pav = group(top, 0, 0, -0.45)
    for (const x of [-0.25, 0.25]) for (const z of [-0.2, 0.2]) at(kit.cyl(0.02, 0.02, 0.5, 5, '#8b4a2b'), x, 0.25, z, pav)
    at(kit.box(0.6, 0.04, 0.5, P.wood), 0, 0.12, 0, pav)
    at(kit.cone(0.48, 0.25, 4, '#6b3b2a'), 0, 0.62, 0, pav).rotation.y = Math.PI / 4
    const koi = [P.amber, P.white, P.coral].map((c, i) => {
      const fish = at(kit.ball(0.04, c, 6), 0, 0.03, 0)
      fish.scale.set(0.6, 0.5, 1.6)
      fish.userData.i = i
      return fish
    })
    anims.push((t) =>
      koi.forEach((fish, i) => {
        const a = t * (0.35 + i * 0.08) + i * 2.1
        fish.position.set(Math.cos(a) * (0.5 + i * 0.12), 0.035, Math.sin(a) * (0.4 + i * 0.1) + 0.2)
        fish.rotation.y = -a
      }),
    )
  },

  bamboo(kit, top, at, anims) {
    const stalks: THREE.Group[] = []
    for (let i = 0; i < 16; i++) {
      const a = i * 2.39996
      const rr = 0.35 + ((i * 0.53) % 0.75)
      const s = group(top, Math.cos(a) * rr, 0, Math.sin(a) * rr - 0.1)
      const h = 0.9 + ((i * 0.31) % 0.6)
      const c = i % 2 ? '#7cb342' : '#9ccc65'
      for (let k = 0; k < 4; k++) {
        at(kit.cyl(0.022, 0.024, h / 4 - 0.01, 6, c), 0, (k + 0.5) * (h / 4), 0, s)
        at(kit.cyl(0.027, 0.027, 0.012, 6, '#5d8a2e'), 0, (k + 1) * (h / 4), 0, s)
      }
      for (let k = 0; k < 3; k++) {
        const leaf = at(kit.box(0.16, 0.008, 0.035, '#6fa83a'), Math.cos(k * 2.1) * 0.07, h - 0.05 - k * 0.08, Math.sin(k * 2.1) * 0.07, s)
        leaf.rotation.set(0, -k * 2.1, -0.4)
      }
      s.userData.phase = i * 0.7
      stalks.push(s)
    }
    // Two pandas having bamboo for lunch, near the front.
    const pandas = [
      [-0.35, 0.75, 0.4],
      [0.4, 0.8, -0.5],
    ].map(([x, z, ry]) => {
      const p = group(top, x, 0, z)
      p.rotation.y = ry
      at(kit.ball(0.12, P.white), 0, 0.11, 0, p).scale.set(1, 1.05, 0.95)
      for (const sx of [-1, 1]) {
        at(kit.ball(0.05, P.dark), sx * 0.1, 0.04, 0.07, p)
        at(kit.ball(0.045, P.dark), sx * 0.1, 0.13, 0.08, p)
      }
      const head = group(p, 0, 0.27, 0.02)
      at(kit.ball(0.085, P.white), 0, 0, 0, head)
      for (const sx of [-1, 1]) {
        at(kit.ball(0.03, P.dark, 6), sx * 0.065, 0.065, 0, head)
        at(kit.ball(0.022, P.dark, 6), sx * 0.032, 0.01, 0.07, head).scale.set(1, 1.3, 0.6)
      }
      at(kit.ball(0.015, P.dark, 5), 0, -0.02, 0.085, head)
      const stick = at(kit.cyl(0.01, 0.01, 0.2, 5, '#9ccc65'), 0.06, 0.18, 0.1, p)
      stick.rotation.z = 0.5
      return head
    })
    anims.push((t) => {
      stalks.forEach((s) => (s.rotation.z = Math.sin(t * 0.9 + (s.userData.phase as number)) * 0.04))
      pandas.forEach((h, i) => (h.rotation.x = Math.max(0, Math.sin(t * 3 + i * 2)) * 0.15))
    })
  },

  snow(kit, top, at, anims) {
    at(kit.cone(0.75, 1.5, 7, '#a7a9ad'), -0.15, 0.75, -0.3)
    at(kit.cone(0.38, 0.6, 7, '#ffffff'), -0.15, 1.2, -0.3)
    pine(kit, top, 0.75, -0.35, 0.65, true)
    pine(kit, top, -0.85, 0.35, 0.55, true)
    pine(kit, top, 0.55, 0.65, 0.5, true)
    const cabin = group(top, 0.45, 0, 0.1)
    cabin.rotation.y = -0.6
    at(kit.box(0.42, 0.3, 0.34, '#8b5a3c'), 0, 0.15, 0, cabin)
    at(kit.roof(0.52, 0.22, 0.42, '#ffffff'), 0, 0.3, 0, cabin)
    at(kit.box(0.1, 0.17, 0.02, P.woodDark), 0, 0.09, 0.18, cabin)
    at(kit.box(0.08, 0.08, 0.02, P.sky), 0.12, 0.18, 0.18, cabin)
    const puffs = Array.from({ length: 3 }, (_, i) =>
      at(kit.ball(0.05, kit.m('#ffffff', { transparent: true, opacity: 0.7 }, `isnow${i}`), 6), 0.12, 0.5, -0.05, cabin),
    )
    at(kit.box(0.07, 0.18, 0.07, P.stoneDark), 0.12, 0.42, -0.05, cabin)
    // Penguins sliding round on their bellies.
    const penguins = [0, 1, 2].map((i) => {
      const p = group(top, 0, 0, 0)
      const body = new THREE.Group()
      p.add(body)
      at(kit.ball(0.06, P.dark), 0, 0.07, 0, body).scale.set(0.9, 1.3, 0.9)
      at(kit.ball(0.045, P.white), 0, 0.065, 0.025, body).scale.set(0.9, 1.3, 0.7)
      at(kit.ball(0.035, P.dark), 0, 0.15, 0, body)
      const beak = at(kit.cone(0.012, 0.035, 4, P.amber), 0, 0.15, 0.04, body)
      beak.rotation.x = Math.PI / 2
      p.userData.i = i
      return { p, body }
    })
    anims.push((t) => {
      puffs.forEach((pf, i) => {
        const k = (t * 0.25 + i / 3) % 1
        pf.position.set(0.12 + k * 0.1, 0.52 + k * 0.5, -0.05)
        pf.scale.setScalar(0.6 + k)
        ;(pf.material as THREE.MeshStandardMaterial).opacity = 0.6 * (1 - k)
      })
      penguins.forEach(({ p, body }, i) => {
        const a = t * 0.3 + i * 0.45
        p.position.set(Math.cos(a) * 0.9, 0, Math.sin(a) * 0.9 * 0.85 + 0.1)
        p.rotation.y = -a
        // Waddle, then slide for a while.
        const slide = Math.sin(t * 0.5 + i) > 0.3
        body.rotation.x = slide ? 1.3 : 0
        body.rotation.z = slide ? 0 : Math.sin(t * 8 + i) * 0.15
      })
    })
  },

  beach(kit, top, at, anims, look) {
    const lagoon = at(kit.cyl(0.55, 0.55, 0.03, 18, kit.m(P.water, { roughness: 0.25, emissive: P.water, emissiveIntensity: 0.15 })), 0.35, 0.01, 0.45)
    lagoon.castShadow = false
    const palms = [
      [-0.5, -0.3, 0.2],
      [-0.75, 0.3, -0.6],
      [0.1, -0.7, 1.2],
    ] as const
    for (const [x, z, ry] of palms) {
      const p = group(top, x, 0, z)
      p.rotation.y = ry
      for (let k = 0; k < 6; k++) {
        const seg = at(kit.cyl(0.035, 0.045, 0.16, 6, '#a8794f'), k * 0.03, 0.08 + k * 0.15, 0, p)
        seg.rotation.z = -0.18
      }
      const crown = group(p, 0.18, 0.95, 0)
      for (let k = 0; k < 7; k++) {
        const frond = at(kit.box(0.38, 0.012, 0.07, '#4caf50'), Math.cos(k * 0.9) * 0.16, -0.04, Math.sin(k * 0.9) * 0.16, crown)
        frond.rotation.set(0, -k * 0.9, -0.45)
      }
      for (let k = 0; k < 3; k++) at(kit.ball(0.035, '#7a5236', 6), Math.cos(k * 2) * 0.04, -0.06, Math.sin(k * 2) * 0.04, crown)
    }
    // Lighthouse: red and white rings, a lamp that sweeps round.
    const lh = group(top, 0.6, 0, -0.45)
    for (let k = 0; k < 6; k++) at(kit.cyl(0.15 - k * 0.012, 0.16 - k * 0.012, 0.2, 10, k % 2 ? P.coral : P.white), 0, 0.1 + k * 0.2, 0, lh)
    at(kit.cyl(0.11, 0.11, 0.14, 10, kit.m(P.lamp, { emissive: P.lamp, emissiveIntensity: look === 'night' ? 1.2 : 0.5 })), 0, 1.3, 0, lh)
    at(kit.cone(0.14, 0.16, 10, P.coral), 0, 1.45, 0, lh)
    const beam = group(lh, 0, 1.3, 0)
    const ray = at(kit.cone(0.12, 1.2, 8, kit.m(P.lamp, { transparent: true, opacity: look === 'night' ? 0.35 : 0.12, emissive: P.lamp, emissiveIntensity: 1 }, 'beam')), 0, 0, 0.6, beam)
    ray.rotation.x = -Math.PI / 2
    ray.castShadow = false
    // Sea turtles going to and from the lagoon.
    const turtles = [0, 1].map((i) => {
      const tt = group(top, 0, 0, 0)
      at(kit.dome(0.08, '#5e8f4e'), 0, 0.02, 0, tt).scale.set(1, 0.7, 1.2)
      at(kit.ball(0.03, '#8bbf7a', 6), 0, 0.03, 0.11, tt)
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) at(kit.ball(0.022, '#8bbf7a', 5), sx * 0.07, 0.015, sz * 0.06, tt).scale.set(1.4, 0.4, 0.8)
      return tt
    })
    anims.push((t) => {
      beam.rotation.y = t * 0.9
      turtles.forEach((tt, i) => {
        const a = t * 0.08 + i * Math.PI
        tt.position.set(0.35 + Math.cos(a) * 0.7, 0, 0.3 + Math.sin(a) * 0.35)
        tt.rotation.y = -a
      })
    })
  },
}

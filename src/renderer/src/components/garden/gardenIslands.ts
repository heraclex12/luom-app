// Floating islands round the garden from level 100 on (see wordbook/gardenWorld.ts): the castle of the sky kingdom,
// then Sa Pa terraces, Ha Long Bay, Hoi An lanterns, a lotus lake, a bamboo grove, a snowy peak and a tropical beach.
// They are the rarest things in the garden, so each is a little world of its own with something always moving: sky
// lanterns rising over Hoi An, an aurora over the snowy peak, lotuses opening, boats sailing between the karsts, mist,
// birds, waves. Each floats at its own height, linked to the garden's edge by a plank bridge. Built at a nominal size
// (ISLE) and scaled with the garden. Geometries made here are the build's own (userData.own: the scene frees them).
import * as THREE from 'three'
import type { IslandKind, Islet, ShownLook } from '@/wordbook'
import { DecorKit, GROUND, P, PAD, type Anim } from './gardenDecor'

/** Nominal island radius the builders draw at. */
const ISLE = 2.0

const TOP: Record<IslandKind, string> = {
  castle: GROUND.grass,
  terraces: '#86c46a',
  halong: GROUND.grass,
  hoian: '#bcd39a',
  lotus: GROUND.grass,
  bamboo: '#9fcb86',
  snow: '#eef3f6',
  beach: '#f1dca6',
}

const own = <T extends THREE.Object3D>(o: T): T => {
  o.userData.own = true
  return o
}

function random(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32
  }
}

type At = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number, parent?: THREE.Object3D) => T
interface Ctx {
  kit: DecorKit
  top: THREE.Group
  at: At
  anims: Anim[]
  look: ShownLook
  rand: () => number
}

/** One island with its bridge from the garden's edge (`gardenRadius`); `scale` = the garden's world scale. */
export function buildIslet(kit: DecorKit, isl: Islet, gardenRadius: number, look: ShownLook, scale: number): { group: THREE.Group; anim: Anim } {
  const g = new THREE.Group()
  const top = new THREE.Group()
  top.position.set(isl.x, isl.lift, isl.z)
  // Front (+z) faces the garden.
  const facing = Math.atan2(-isl.x, -isl.z)
  top.rotation.y = facing
  top.scale.setScalar(isl.radius / ISLE)
  top.userData.islet = isl.kind
  g.add(top)
  const rand = random(isl.tier * 97 + 3)
  base(kit, top, isl.kind, rand)
  const anims: Anim[] = []
  const at: At = (o, x, y, z, parent = top) => {
    o.position.set(x, y, z)
    parent.add(o)
    return o
  }
  BUILD[isl.kind]({ kit, top, at, anims, look, rand })

  // Bridge: planks from the garden's edge to the island (it may slope up or down), sagging a little.
  const dir = new THREE.Vector2(isl.x, isl.z).normalize()
  const from = new THREE.Vector3(dir.x * (gardenRadius - 0.25 * scale), 0.02, dir.y * (gardenRadius - 0.25 * scale))
  const to = new THREE.Vector3(isl.x - dir.x * (isl.radius - 0.3 * scale), isl.lift + 0.02, isl.z - dir.y * (isl.radius - 0.3 * scale))
  const n = Math.round(from.distanceTo(to) / (0.16 * scale))
  const yaw = Math.atan2(dir.x, dir.y)
  for (let i = 0; i <= n; i++) {
    const k = i / n
    const p = from.clone().lerp(to, k)
    p.y -= Math.sin(k * Math.PI) * 0.25 * scale
    const plank = kit.box(0.42, 0.03, 0.12, i % 2 ? P.wood : P.woodDark)
    plank.position.copy(p)
    plank.rotation.y = yaw
    plank.scale.setScalar(scale)
    g.add(plank)
    if (i % 4 === 0)
      for (const side of [-1, 1]) {
        const post = kit.cyl(0.015, 0.015, 0.22, 4, P.woodDark)
        post.scale.setScalar(scale)
        post.position.set(p.x + Math.cos(yaw) * 0.21 * side * scale, p.y + 0.11 * scale, p.z - Math.sin(yaw) * 0.21 * side * scale)
        g.add(post)
      }
  }

  const phase = isl.x * 0.37
  return {
    group: g,
    anim: (t) => {
      top.position.y = isl.lift + Math.sin(t * 0.5 + phase) * 0.08 * scale
      top.rotation.y = facing + Math.sin(t * 0.2 + phase) * 0.03
      for (const a of anims) a(t)
    },
  }
}

/** Ground, a wavy edge, an earth band and a jagged rock below with a few roots and crystals. */
function base(kit: DecorKit, top: THREE.Group, kind: IslandKind, rand: () => number): void {
  const geo = new THREE.CylinderGeometry(ISLE, ISLE * 0.98, 0.22, 64, 1)
  const pos = geo.getAttribute('position') as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    if (Math.hypot(v.x, v.z) < ISLE * 0.9) continue
    const a = Math.atan2(v.z, v.x)
    const k = 1 + 0.04 * (1 + Math.sin(a * 4 + 1.1) * Math.sin(a * 3))
    pos.setXYZ(i, v.x * k, v.y, v.z * k)
  }
  geo.computeVertexNormals()
  const ground = own(new THREE.Mesh(geo, kit.m(TOP[kind])))
  ground.position.y = -0.11
  ground.receiveShadow = true
  const earth = own(new THREE.Mesh(new THREE.CylinderGeometry(ISLE * 1.02, ISLE * 0.92, 0.2, 40), kit.m(kind === 'snow' ? '#cfdbe3' : kind === 'beach' ? '#d9c08a' : '#8c6a4c')))
  earth.position.y = -0.32
  const rockGeo = new THREE.ConeGeometry(ISLE * 0.92, ISLE * 1.3, 12, 3)
  rockGeo.rotateX(Math.PI)
  const rp = rockGeo.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < rp.count; i++) {
    v.fromBufferAttribute(rp, i)
    const j = 1 + (rand() - 0.5) * 0.2
    rp.setXYZ(i, v.x * j, v.y + (rand() - 0.5) * 0.15, v.z * j)
  }
  rockGeo.computeVertexNormals()
  const rock = own(new THREE.Mesh(rockGeo, kit.m('#7a6a59')))
  rock.position.y = -0.42 - ISLE * 0.65
  rock.castShadow = true
  top.add(ground, earth, rock)
  for (let i = 0; i < 10; i++) {
    const a = rand() * Math.PI * 2
    const d = ISLE * (0.9 + rand() * 0.06)
    const len = 0.3 + rand() * 0.7
    const root = kit.cyl(0.012, 0.02, 1, 4, rand() > 0.5 ? '#4f8a52' : '#6b4f3a')
    root.scale.y = len
    root.position.set(Math.cos(a) * d, -0.4 - len / 2, Math.sin(a) * d)
    top.add(root)
  }
  for (let i = 0; i < 4; i++) {
    const a = rand() * Math.PI * 2
    const d = ISLE * (0.35 + rand() * 0.3)
    const c = rand() > 0.5 ? '#7fd8d0' : '#b7a4f0'
    const crystal = own(new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), kit.m(c, { emissive: c, emissiveIntensity: kit.look === 'night' ? 0.22 : 0.6, roughness: 0.2 })))
    crystal.scale.set(0.6, 2.4, 0.6)
    crystal.position.set(Math.cos(a) * d, -0.8 - rand() * 1.2, Math.sin(a) * d)
    crystal.rotation.set(Math.PI + (rand() - 0.5), rand() * 3, rand() - 0.5)
    top.add(crystal)
  }
}

// ── shared pieces ──

let DOT: THREE.Texture | null = null
/** Soft round dot for particles (made once). */
function dot(): THREE.Texture {
  if (DOT) return DOT
  const c = document.createElement('canvas')
  c.width = c.height = 32
  const ctx = c.getContext('2d')!
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.5, 'rgba(255,255,255,0.8)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 32, 32)
  DOT = new THREE.CanvasTexture(c)
  DOT.colorSpace = THREE.SRGBColorSpace
  return DOT
}

/** Particles over the island: `move(i, t, out)` places particle i at time t. */
function particles(c: Ctx, count: number, colour: string, size: number, move: (i: number, t: number, out: THREE.Vector3) => void, glow = false): void {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
  const mat = new THREE.PointsMaterial({
    color: colour,
    size,
    map: dot(),
    transparent: true,
    depthWrite: false,
    blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending,
  })
  const pts = own(new THREE.Points(geo, mat))
  pts.userData.ownMaterial = true
  c.top.add(pts)
  const p = new THREE.Vector3()
  const attr = geo.getAttribute('position') as THREE.BufferAttribute
  c.anims.push((t) => {
    for (let i = 0; i < count; i++) {
      move(i, t, p)
      attr.setXYZ(i, p.x, p.y, p.z)
    }
    attr.needsUpdate = true
  })
}

/** Slow mist drifting round the island. */
function mist(c: Ctx, count: number, y: number, radius: number): void {
  const mat = c.kit.m('#ffffff', { transparent: true, opacity: 0.32, flatShading: false, depthWrite: false }, 'mist')
  const puffs = Array.from({ length: count }, (_, i) => {
    const m = c.kit.ball(0.35, mat, 10)
    m.castShadow = false
    m.receiveShadow = false
    m.scale.set(2.2, 0.35, 1.2)
    m.userData.phase = i / count
    c.top.add(m)
    return m
  })
  c.anims.push((t) =>
    puffs.forEach((m) => {
      const a = (m.userData.phase as number) * Math.PI * 2 + t * 0.05
      m.position.set(Math.cos(a) * radius, y + Math.sin(t * 0.3 + a) * 0.08, Math.sin(a) * radius * 0.8)
      m.rotation.y = -a
    }),
  )
}

/** Birds circling over the island. */
function birds(c: Ctx, count: number, height: number, radius: number, colour = P.white): void {
  const flock = Array.from({ length: count }, (_, i) => {
    const b = new THREE.Group()
    const body = c.kit.ball(0.05, colour, 6)
    body.scale.set(0.7, 0.6, 1.6)
    b.add(body)
    const wings = [-1, 1].map((s) => {
      const w = new THREE.Group()
      const m = c.kit.box(0.2, 0.01, 0.07, colour)
      m.position.x = s * 0.1
      w.add(m)
      b.add(w)
      return { w, s }
    })
    b.userData.wings = wings
    c.top.add(b)
    return b
  })
  c.anims.push((t) =>
    flock.forEach((b, i) => {
      const a = t * 0.35 + i * 0.9
      const r = radius + (i % 2) * 0.3
      b.position.set(Math.cos(a) * r, height + Math.sin(t + i) * 0.15, Math.sin(a) * r)
      b.rotation.y = -a
      for (const { w, s } of b.userData.wings as { w: THREE.Group; s: number }[]) w.rotation.z = s * Math.sin(t * 6 + i) * 0.6
    }),
  )
}

const group = (parent: THREE.Object3D, x: number, y: number, z: number, scale = 1, ry = 0): THREE.Group => {
  const o = new THREE.Group()
  o.position.set(x, y, z)
  o.scale.setScalar(scale)
  o.rotation.y = ry
  parent.add(o)
  return o
}

/** A small person: shirt, head, conical hat (nón lá). */
function farmer(c: Ctx, shirt: string): THREE.Group {
  const f = new THREE.Group()
  c.at(c.kit.cyl(0.04, 0.035, 0.08, 6, P.dark), 0, 0.04, 0, f)
  c.at(c.kit.cyl(0.045, 0.06, 0.16, 7, shirt), 0, 0.16, 0, f)
  c.at(c.kit.ball(0.04, '#e9c4a0', 7), 0, 0.28, 0, f)
  c.at(c.kit.cone(0.1, 0.07, 10, '#efe0b0'), 0, 0.33, 0, f)
  c.top.add(f)
  return f
}

function pine(c: Ctx, x: number, z: number, scale: number, snowy = false): THREE.Group {
  const p = group(c.top, x, 0, z, scale)
  c.at(c.kit.cyl(0.04, 0.06, 0.25, 6, P.brown), 0, 0.12, 0, p)
  for (const [cr, ch, y] of [
    [0.32, 0.5, 0.45],
    [0.25, 0.42, 0.72],
    [0.17, 0.36, 0.96],
  ] as const) {
    c.at(c.kit.cone(cr, ch, 7, P.pine), 0, y, 0, p)
    if (snowy) c.at(c.kit.cone(cr * 0.62, ch * 0.42, 7, '#ffffff'), 0, y + ch * 0.3, 0, p)
  }
  return p
}

function roofHouse(c: Ctx, x: number, z: number, ry: number, wall: string, roof: string, scale = 1, glow = false): THREE.Group {
  const h = group(c.top, x, 0, z, scale, ry)
  c.at(c.kit.box(0.5, 0.42, 0.4, wall), 0, 0.21, 0, h)
  c.at(c.kit.roof(0.64, 0.22, 0.5, roof), 0, 0.42, 0, h).rotation.y = Math.PI / 2
  c.at(c.kit.box(0.14, 0.24, 0.02, P.woodDark), 0, 0.12, 0.21, h)
  const win = glow ? c.kit.m(P.lamp, { emissive: P.lamp, emissiveIntensity: 0.9 }) : P.sky
  for (const wx of [-0.15, 0.15]) c.at(c.kit.box(0.09, 0.09, 0.02, win), wx, 0.3, 0.21, h)
  return h
}

const BUILD: Record<IslandKind, (c: Ctx) => void> = {
  castle(c) {
    const { kit, at, top, anims } = c
    // Moat round the castle, a drawbridge at the front.
    const moat = own(new THREE.Mesh(new THREE.RingGeometry(1.2, 1.5, 48).rotateX(-Math.PI / 2), kit.water()))
    moat.position.y = 0.02
    top.add(moat)
    at(kit.box(0.4, 0.05, 0.42, P.wood), 0, 0.06, 1.35)
    const castle = group(top, 0, 0, 0)
    const ring = 0.95
    const towers = 6
    for (let i = 0; i < towers; i++) {
      const a = (i / towers) * Math.PI * 2 + Math.PI / 6
      const x = Math.cos(a) * ring
      const z = Math.sin(a) * ring
      at(kit.cyl(0.18, 0.2, 1.1, 10, P.cream), x, 0.55, z, castle)
      at(kit.cone(0.25, 0.48, 10, i % 2 ? P.coral : P.blue), x, 1.34, z, castle)
      at(kit.box(0.2, 0.06, 0.2, P.cream), x, 1.1, z, castle)
      const a2 = a + (Math.PI * 2) / towers
      const x2 = Math.cos(a2) * ring
      const z2 = Math.sin(a2) * ring
      const wall = at(kit.box(Math.round(Math.hypot(x2 - x, z2 - z) * 100) / 100, 0.6, 0.14, P.cream), (x + x2) / 2, 0.3, (z + z2) / 2, castle)
      wall.rotation.y = -Math.atan2(z2 - z, x2 - x)
    }
    at(kit.box(0.34, 0.46, 0.06, P.woodDark), 0, 0.23, ring + 0.02, castle)
    // The keep: tall, banners on its walls, a big flag on top.
    at(kit.box(0.8, 1.5, 0.8, P.white), 0, 0.75, 0, castle)
    at(kit.cyl(0.24, 0.27, 0.9, 12, P.white), 0, 1.95, 0, castle)
    at(kit.cone(0.34, 0.75, 12, P.green), 0, 2.78, 0, castle)
    for (const x of [-0.21, 0.21]) at(kit.box(0.16, 0.12, 0.02, P.sky), x, 1.25, 0.41, castle)
    const banners = [-0.22, 0.22].map((x) => at(kit.box(0.14, 0.45, 0.01, x < 0 ? P.coral : P.blue), x, 0.75, 0.41, castle))
    at(kit.cyl(0.01, 0.01, 0.5, 3, P.dark), 0, 3.35, 0, castle)
    const flag = at(kit.box(0.32, 0.18, 0.01, P.coral), 0.16, 3.5, 0, castle)
    for (const [x, z] of [
      [1.6, 0.6],
      [-1.55, -0.7],
      [-1.2, 1.1],
      [1.3, -1.1],
    ])
      pine(c, x, z, 0.8)
    // Rainbow arching over it.
    const bands = [P.coral, P.amber, P.yellow, P.leafLight, P.bluebell, P.lavender]
    const rainbow = group(top, 0, -0.3, -0.4)
    bands.forEach((col, i) => {
      const geo = kit.g(`rainbow2${i}`, () => new THREE.TorusGeometry(2.9 - i * 0.11, 0.06, 6, 48, Math.PI))
      rainbow.add(new THREE.Mesh(geo, kit.m(col, { transparent: true, opacity: 0.5, emissive: col, emissiveIntensity: 0.3 }, 'rainbow')))
    })
    // Magic dust rising round the towers.
    particles(c, 60, '#ffe7a3', 0.09, (i, t, out) => {
      const k = (t * 0.08 + i / 60) % 1
      const a = i * 2.4 + t * 0.3
      const r = 0.6 + (i % 5) * 0.2
      out.set(Math.cos(a) * r, 0.3 + k * 3.2, Math.sin(a) * r)
    }, true)
    anims.push((t) => {
      flag.scale.x = 1 + Math.sin(t * 4) * 0.12
      flag.rotation.y = Math.sin(t * 3) * 0.25
      banners.forEach((b, i) => (b.rotation.x = Math.sin(t * 1.5 + i) * 0.08))
    })
  },

  terraces(c) {
    const { kit, at, top, anims } = c
    // Seven flooded steps up to a stilt house: green rice with a strip of water shining along each edge.
    const steps = 7
    for (let i = 0; i < steps; i++) {
      const rad = Math.round((1.85 - i * 0.22) * 100) / 100
      const y = i * 0.17
      at(kit.cyl(rad, rad + 0.02, 0.17, 28, '#7a6a52'), 0, y + 0.085, 0)
      at(kit.cyl(Math.round((rad - 0.02) * 100) / 100, Math.round((rad - 0.02) * 100) / 100, 0.02, 28, i % 2 ? '#a6dc86' : '#8fd16f'), 0, y + 0.18, 0).castShadow = false
      const wet = own(new THREE.Mesh(new THREE.RingGeometry(rad - 0.12, rad - 0.03, 40).rotateX(-Math.PI / 2), kit.water()))
      wet.position.y = y + 0.195
      top.add(wet)
    }
    const peak = (steps - 1) * 0.17 + 0.2
    const house = group(top, 0, peak, 0)
    for (const x of [-0.14, 0.14]) for (const z of [-0.12, 0.12]) at(kit.cyl(0.015, 0.015, 0.16, 4, P.woodDark), x, 0.08, z, house)
    at(kit.box(0.38, 0.2, 0.3, P.wood), 0, 0.26, 0, house)
    at(kit.cone(0.32, 0.24, 4, '#c9a25e'), 0, 0.48, 0, house).rotation.y = Math.PI / 4
    // Farmers bent over the rice; a buffalo plodding round the bottom step.
    const workers = (
      [
        [1.3, 1, P.blue],
        [0.9, 3, P.coral],
        [0.5, 5, P.green],
      ] as const
    ).map(([r, step, col], i) => {
      const f = farmer(c, col)
      const a = i * 2.1 + 0.6
      f.position.set(Math.cos(a) * r, step * 0.17 + 0.2, Math.sin(a) * r)
      return f
    })
    const buffalo = group(top, 0, 0.19, 0)
    at(kit.ball(0.11, '#4b4f55'), 0, 0.14, 0, buffalo).scale.set(1, 0.85, 1.6)
    const legs = [-1, 1].flatMap((x) => [-1, 1].map((z) => at(kit.cyl(0.02, 0.018, 0.12, 5, '#3c3f44'), x * 0.06, 0.06, z * 0.11, buffalo)))
    const head = group(buffalo, 0, 0.16, 0.19)
    at(kit.ball(0.06, '#4b4f55'), 0, 0, 0.02, head).scale.set(0.9, 0.85, 1.2)
    for (const s of [-1, 1]) at(kit.cone(0.018, 0.13, 5, P.cream), s * 0.07, 0.05, 0, head).rotation.z = -s * 1.25
    mist(c, 6, 0.9, 1.4)
    birds(c, 3, 1.8, 1.3)
    anims.push((t) => {
      workers.forEach((f, i) => (f.rotation.x = Math.max(0, Math.sin(t * 0.9 + i * 1.7)) * 0.5))
      const a = t * 0.08
      buffalo.position.set(Math.cos(a) * 1.72, 0.19, Math.sin(a) * 1.72)
      buffalo.rotation.y = -a
      head.rotation.x = 0.3 + Math.sin(t * 0.7) * 0.25
      legs.forEach((l, i) => (l.rotation.x = Math.sin(t * 4 + (i % 2) * Math.PI) * 0.3))
    })
  },

  halong(c) {
    const { kit, at, top, anims, rand } = c
    const sea = own(new THREE.Mesh(new THREE.CircleGeometry(1.92, 48).rotateX(-Math.PI / 2), kit.water()))
    sea.position.y = 0.012
    top.add(sea)
    // Limestone karsts rising from the water, green on top.
    const peaks = [
      [0.6, -0.5, 1.6, 0.3],
      [-0.5, -0.7, 2.1, 0.34],
      [-1.1, 0.1, 1.2, 0.26],
      [1.2, 0.5, 1.0, 0.22],
      [0.1, -1.3, 1.4, 0.25],
      [-0.9, -1.2, 0.9, 0.2],
      [1.4, -0.6, 1.3, 0.24],
      [-1.4, 0.9, 0.8, 0.2],
      [0.3, 0.1, 0.7, 0.18],
    ] as const
    for (const [x, z, h, w] of peaks) {
      const geo = new THREE.CylinderGeometry(w * 0.7, w * 1.1, h, 8, 4)
      const p = geo.getAttribute('position') as THREE.BufferAttribute
      const v = new THREE.Vector3()
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i)
        const j = 1 + (rand() - 0.5) * 0.3
        p.setXYZ(i, v.x * j, v.y, v.z * j)
      }
      geo.computeVertexNormals()
      const rock = own(new THREE.Mesh(geo, kit.m('#b9b6a8')))
      rock.position.set(x, h / 2, z)
      rock.castShadow = true
      top.add(rock)
      at(kit.ico(Math.round(w * 85) / 100, '#5e9a5c'), x, h + 0.02, z).scale.set(1, 0.6, 1)
      at(kit.ico(Math.round(w * 50) / 100, '#6fae6a'), x + w * 0.4, h * 0.7, z).scale.set(0.8, 0.5, 0.8)
    }
    // Junk boats with red sails, sailing between them; a little floating village.
    const boats = [0, 1].map((i) => {
      const b = group(top, 0, 0.03, 0, i ? 0.8 : 1.1)
      at(kit.box(0.4, 0.09, 0.15, P.woodDark), 0, 0.045, 0, b)
      at(kit.box(0.14, 0.07, 0.14, P.wood), -0.14, 0.12, 0, b)
      for (const [x, h] of [
        [0.08, 0.38],
        [-0.07, 0.3],
      ] as const) {
        at(kit.cyl(0.008, 0.008, h, 4, P.dark), x, 0.09 + h / 2, 0, b)
        at(kit.box(0.17, Math.round(h * 80) / 100, 0.01, '#c0583a'), x, 0.11 + h * 0.45, 0, b).rotation.y = Math.PI / 2
      }
      return b
    })
    for (let i = 0; i < 3; i++) {
      const raft = group(top, 0.9 + i * 0.32, 0.03, 1.0 - i * 0.18, 1, 0.4)
      at(kit.box(0.28, 0.03, 0.24, P.wood), 0, 0.015, 0, raft)
      at(kit.box(0.18, 0.14, 0.15, i % 2 ? '#d9b45a' : P.cream), 0, 0.1, 0, raft)
      at(kit.roof(0.24, 0.08, 0.2, '#3f7da6'), 0, 0.17, 0, raft).rotation.y = Math.PI / 2
    }
    mist(c, 7, 0.35, 1.3)
    birds(c, 4, 2.4, 1.2)
    anims.push((t) =>
      boats.forEach((b, i) => {
        const a = t * (0.1 + i * 0.03) + i * Math.PI
        const r = i ? 1.15 : 0.95
        b.position.set(Math.cos(a) * r, 0.03 + Math.sin(t * 1.5 + i) * 0.015, Math.sin(a) * r * 0.85 + 0.2)
        b.rotation.y = -a
        b.rotation.z = Math.sin(t * 1.2 + i) * 0.06
      }),
    )
  },

  hoian(c) {
    const { kit, at, top, anims, look } = c
    // A canal through the old town, houses on both banks, a covered bridge across.
    const canal = own(new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.5).rotateX(-Math.PI / 2), kit.water()))
    canal.position.y = 0.015
    top.add(canal)
    for (const z of [-0.27, 0.27]) for (let k = 0; k <= 16; k++) at(kit.box(0.2, 0.06, 0.05, P.stone), -1.6 + k * 0.2, 0.03, z)
    const walls = ['#f2c94c', '#f0b93a', '#f4d36b']
    for (const [side, ry] of [
      [-1, 0],
      [1, Math.PI],
    ] as const)
      for (let i = 0; i < 4; i++) {
        const x = -1.2 + i * 0.75 + (side > 0 ? 0.3 : 0)
        if (Math.hypot(x, 0.75) > 1.75) continue
        const h = roofHouse(c, x, side * 0.75, ry, walls[(i + (side > 0 ? 1 : 0)) % 3], '#9c4a2f', 1.15, look === 'night')
        at(kit.box(0.5, 0.03, 0.1, P.woodDark), 0, 0.3, 0.25, h)
      }
    const bridge = group(top, 0.15, 0, 0)
    for (let k = -3; k <= 3; k++) at(kit.box(0.3, 0.03, 0.1, P.wood), 0, 0.12 + Math.cos((k / 3) * (Math.PI / 2)) * 0.1, k * 0.1, bridge)
    for (const x of [-0.14, 0.14]) for (const z of [-0.25, 0.25]) at(kit.cyl(0.015, 0.015, 0.3, 4, '#8b3a2b'), x, 0.3, z, bridge)
    at(kit.roof(0.4, 0.14, 0.7, '#9c4a2f'), 0, 0.45, 0, bridge)
    // Lantern strings over the street.
    const glow = look === 'night' ? 1.3 : 0.45
    const colours = [P.coral, P.amber, '#d93a4a', P.pinkDeep, P.yellow, '#3fa39a']
    const lanterns: THREE.Object3D[] = []
    for (const z of [-0.45, 0.45])
      for (let i = 0; i < 11; i++) {
        const k = (i + 1) / 12
        const col = colours[(i + (z > 0 ? 2 : 0)) % colours.length]
        const l = at(kit.ball(0.045, kit.m(col, { emissive: col, emissiveIntensity: glow }), 8), -1.5 + k * 3, 0.62 - Math.sin(k * Math.PI) * 0.14, z)
        l.scale.set(1, 1.25, 1)
        l.userData.phase = i * 0.6
        lanterns.push(l)
      }
    // Boats with a lantern each drifting down the canal.
    const boats = [0, 1].map(() => {
      const b = group(top, 0, 0.03, 0)
      at(kit.box(0.3, 0.05, 0.11, P.woodDark), 0, 0.02, 0, b)
      at(kit.ball(0.04, kit.m(P.amber, { emissive: P.amber, emissiveIntensity: glow + 0.3 }), 6), 0.1, 0.1, 0, b)
      return b
    })
    // Sky lanterns rising from the canal and drifting off: the island's signature.
    const sky = Array.from({ length: 16 }, (_, i) => {
      const col = [P.amber, P.coral, P.yellow][i % 3]
      const l = at(kit.cyl(0.05, 0.04, 0.09, 8, kit.m(col, { emissive: col, emissiveIntensity: glow + 0.6, transparent: true, opacity: 0.95 }, `sky${i % 3}`)), 0, 0, 0)
      l.castShadow = false
      return l
    })
    anims.push((t) => {
      lanterns.forEach((l) => (l.rotation.z = Math.sin(t * 1.2 + (l.userData.phase as number)) * 0.15))
      boats.forEach((b, i) => {
        const k = ((t * 0.05 + i * 0.5) % 1) * 2 - 1
        b.position.set(k * 1.6, 0.03 + Math.sin(t * 2 + i) * 0.01, i ? 0.1 : -0.1)
      })
      sky.forEach((l, i) => {
        const k = (t * 0.045 + i / sky.length) % 1
        l.position.set(-1.2 + ((i * 0.37) % 1) * 2.4 + Math.sin(t * 0.5 + i) * 0.2 * k, 0.2 + k * 3.6, ((i * 0.61) % 1) * 0.4 - 0.2 - k * 0.6)
        l.scale.setScalar(k < 0.1 ? k * 10 : k > 0.9 ? (1 - k) * 10 : 1)
      })
    })
  },

  lotus(c) {
    const { kit, at, top, anims, rand } = c
    const lake = own(new THREE.Mesh(new THREE.CircleGeometry(1.88, 48).rotateX(-Math.PI / 2), kit.water()))
    lake.position.y = 0.012
    top.add(lake)
    // Pads everywhere; lotuses that open and close slowly.
    const flowers: THREE.Group[] = []
    for (let i = 0; i < 36; i++) {
      const a = i * 2.39996
      const rr = 0.45 + Math.sqrt((i * 0.618) % 1) * 1.3
      const x = Math.cos(a) * rr
      const z = Math.sin(a) * rr
      if (Math.abs(x) < 0.5 && z < 0.4 && z > -1.0) continue // pavilion and bridge
      const pad = at(kit.cyl(Math.round((0.13 + rand() * 0.06) * 100) / 100, 0.13, 0.012, 10, PAD), x, 0.025, z)
      pad.castShadow = false
      if (i % 3 === 0) {
        const f = group(top, x, 0.05, z)
        for (let k = 0; k < 8; k++) {
          const petal = new THREE.Group()
          petal.rotation.y = -(k / 8) * Math.PI * 2
          const m = kit.ball(0.045, k % 2 ? P.pink : P.pinkDeep, 6)
          m.scale.set(0.5, 1.6, 0.9)
          m.position.y = 0.06
          petal.add(m)
          f.add(petal)
        }
        at(kit.ball(0.03, P.yellow, 6), 0, 0.05, 0, f)
        f.userData.phase = i
        flowers.push(f)
      }
    }
    // Pavilion on red pillars, a zigzag bridge to it, red lanterns.
    const pav = group(top, 0, 0, -0.55)
    for (const x of [-0.3, 0.3]) for (const z of [-0.25, 0.25]) at(kit.cyl(0.025, 0.025, 0.55, 6, '#b8382b'), x, 0.28, z, pav)
    at(kit.box(0.72, 0.05, 0.6, P.wood), 0, 0.1, 0, pav)
    at(kit.cone(0.56, 0.3, 4, '#5b3a2a'), 0, 0.68, 0, pav).rotation.y = Math.PI / 4
    for (const x of [-0.3, 0.3]) at(kit.ball(0.045, kit.m('#d93a2b', { emissive: '#d93a2b', emissiveIntensity: 0.7 }), 6), x, 0.47, 0.27, pav)
    for (let k = 0; k < 5; k++) at(kit.box(0.2, 0.03, 0.22, P.wood), k % 2 ? 0.08 : -0.08, 0.06, -0.15 + k * 0.2)
    // Koi below, dragonflies darting above.
    const koi = [P.amber, P.white, P.coral, P.amber, P.white].map((col) => {
      const f = at(kit.ball(0.045, col, 6), 0, 0.02, 0)
      f.scale.set(0.55, 0.45, 1.6)
      return f
    })
    const flies = [0, 1, 2, 3].map(() => {
      const d = new THREE.Group()
      const body = kit.cyl(0.008, 0.008, 0.14, 4, '#3f7da6')
      body.rotation.x = Math.PI / 2
      d.add(body)
      const wings = [-1, 1].map((s) => {
        const w = kit.box(0.1, 0.004, 0.03, kit.m('#ffffff', { transparent: true, opacity: 0.6 }, 'dfwing'))
        w.position.set(s * 0.05, 0.01, 0.02)
        d.add(w)
        return w
      })
      d.userData.wings = wings
      top.add(d)
      return d
    })
    const spot = (n: number, i: number): THREE.Vector3 =>
      new THREE.Vector3(Math.cos(n * 2.3 + i) * 1.2, 0.35 + ((n * 0.37) % 1) * 0.4, Math.sin(n * 1.7 + i) * 1.1)
    anims.push((t) => {
      flowers.forEach((f) => {
        const open = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(t * 0.25 + (f.userData.phase as number)))
        f.children.forEach((p, k) => {
          if (k < 8) p.rotation.x = open
        })
      })
      koi.forEach((f, i) => {
        const a = t * (0.3 + i * 0.05) + i * 1.3
        const r = 0.7 + (i % 3) * 0.35
        f.position.set(Math.cos(a) * r, 0.02, Math.sin(a) * r)
        f.rotation.y = -a
      })
      flies.forEach((d, i) => {
        // Dart, hover, dart.
        const s = t / 1.6 + i * 0.7
        const slot = Math.floor(s)
        const k = s % 1
        const a = spot(slot, i)
        const b = spot(slot + 1, i)
        const e = k < 0.7 ? 0 : (k - 0.7) / 0.3
        d.position.lerpVectors(a, b, e * e * (3 - 2 * e))
        d.position.y += Math.sin(t * 9 + i) * 0.01
        d.rotation.y = Math.atan2(b.x - a.x, b.z - a.z)
        for (const w of d.userData.wings as THREE.Mesh[]) w.rotation.z = Math.sin(t * 60 + i) * 0.5
      })
    })
  },

  bamboo(c) {
    const { kit, at, top, anims, rand } = c
    // A stream with stepping stones and a stone lantern.
    const stream = own(new THREE.Mesh(new THREE.PlaneGeometry(0.4, 3.6).rotateX(-Math.PI / 2), kit.water()))
    stream.position.set(0.6, 0.014, 0)
    stream.rotation.y = 0.3
    top.add(stream)
    for (let k = -2; k <= 2; k++) at(kit.rock(0.07, P.stone), 0.6 + k * 0.05, 0.03, k * 0.12).scale.y = 0.5
    const lantern = group(top, 1.0, 0, 0.7)
    at(kit.cyl(0.08, 0.1, 0.06, 6, P.stone), 0, 0.03, 0, lantern)
    at(kit.cyl(0.03, 0.03, 0.25, 6, P.stone), 0, 0.18, 0, lantern)
    at(kit.box(0.14, 0.12, 0.14, kit.m(P.lamp, { emissive: P.lamp, emissiveIntensity: 0.7 })), 0, 0.36, 0, lantern)
    at(kit.cone(0.15, 0.1, 4, P.stoneDark), 0, 0.47, 0, lantern).rotation.y = Math.PI / 4
    // A dense grove that sways.
    const stalks: THREE.Group[] = []
    for (let i = 0; i < 70; i++) {
      const a = rand() * Math.PI * 2
      const rr = 0.25 + Math.sqrt(rand()) * 1.55
      const x = Math.cos(a) * rr
      const z = Math.sin(a) * rr
      if (Math.abs(x - 0.6 - z * 0.3) < 0.35) continue // the stream
      if (z > 0.3 && Math.abs(x + 0.3) < 0.7) continue // the clearing with the pandas
      const s = group(top, x, 0, z)
      const h = 1.2 + rand() * 1.0
      const col = i % 3 ? '#7cb342' : '#9ccc65'
      const seg = Math.round((h / 5 - 0.01) * 100) / 100
      for (let k = 0; k < 5; k++) {
        at(kit.cyl(0.026, 0.028, seg, 6, col), 0, (k + 0.5) * (h / 5), 0, s)
        at(kit.cyl(0.031, 0.031, 0.012, 6, '#5d8a2e'), 0, (k + 1) * (h / 5), 0, s)
      }
      for (let k = 0; k < 4; k++) {
        const leaf = at(kit.box(0.2, 0.008, 0.04, '#6fa83a'), Math.cos(k * 1.6) * 0.09, h - 0.05 - k * 0.12, Math.sin(k * 1.6) * 0.09, s)
        leaf.rotation.set(0, -k * 1.6, -0.45)
      }
      s.userData.phase = rand() * 6
      stalks.push(s)
    }
    // Pandas in the clearing: one eating, one looking about, one rolling.
    const panda = (x: number, z: number, ry: number): { p: THREE.Group; head: THREE.Group } => {
      const p = group(top, x, 0, z, 1.2, ry)
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
      return { p, head }
    }
    const eating = panda(-0.5, 0.75, 0.4)
    at(kit.cyl(0.01, 0.01, 0.24, 5, '#9ccc65'), 0.06, 0.2, 0.1, eating.p).rotation.z = 0.5
    const sitting = panda(0.05, 0.95, -0.5)
    const roller = panda(-0.2, 0.5, 0)
    particles(c, 40, '#8bc34a', 0.07, (i, t, out) => {
      const k = (t * 0.09 + i / 40) % 1
      const r = 0.4 + (i % 7) * 0.2
      out.set(Math.cos(i * 2.4) * r + Math.sin(t + i) * 0.15, 2.2 - k * 2.2, Math.sin(i * 2.4) * r)
    })
    anims.push((t) => {
      stalks.forEach((s) => (s.rotation.z = Math.sin(t * 0.9 + (s.userData.phase as number)) * 0.05))
      eating.head.rotation.x = Math.max(0, Math.sin(t * 3)) * 0.15
      sitting.head.rotation.y = Math.sin(t * 0.5) * 0.6
      roller.p.rotation.z = Math.sin(t * 0.8) * 0.9
      roller.p.position.x = -0.2 + Math.sin(t * 0.8) * 0.15
    })
  },

  snow(c) {
    const { kit, at, top, anims, look } = c
    at(kit.cone(1.0, 2.0, 8, '#a7a9ad'), -0.35, 1.0, -0.5)
    at(kit.cone(0.5, 0.85, 8, '#ffffff'), -0.35, 1.58, -0.5)
    at(kit.cone(0.6, 1.2, 7, '#b4b6ba'), 0.55, 0.6, -0.9)
    at(kit.cone(0.3, 0.45, 7, '#ffffff'), 0.55, 0.98, -0.9)
    for (const [x, z, s] of [
      [1.2, -0.2, 0.75],
      [-1.3, 0.5, 0.7],
      [0.9, 0.9, 0.6],
      [-0.7, 1.1, 0.65],
      [1.5, 0.5, 0.55],
      [-1.5, -0.4, 0.6],
    ] as const)
      pine(c, x, z, s, true)
    const cabin = group(top, 0.4, 0, 0.35, 1.3, -0.5)
    at(kit.box(0.42, 0.3, 0.34, '#8b5a3c'), 0, 0.15, 0, cabin)
    at(kit.roof(0.52, 0.22, 0.42, '#ffffff'), 0, 0.3, 0, cabin)
    at(kit.box(0.1, 0.17, 0.02, P.woodDark), 0, 0.09, 0.18, cabin)
    at(kit.box(0.08, 0.08, 0.02, kit.m(P.lamp, { emissive: P.lamp, emissiveIntensity: 0.9 })), 0.12, 0.18, 0.18, cabin)
    at(kit.box(0.07, 0.18, 0.07, P.stoneDark), 0.12, 0.42, -0.05, cabin)
    const puffs = Array.from({ length: 3 }, (_, i) =>
      at(kit.ball(0.05, kit.m('#ffffff', { transparent: true, opacity: 0.7 }, `isnow${i}`), 6), 0.12, 0.5, -0.05, cabin),
    )
    const penguins = [0, 1, 2, 3].map(() => {
      const p = group(top, 0, 0, 0, 1.3)
      const body = new THREE.Group()
      p.add(body)
      at(kit.ball(0.06, P.dark), 0, 0.07, 0, body).scale.set(0.9, 1.3, 0.9)
      at(kit.ball(0.045, P.white), 0, 0.065, 0.025, body).scale.set(0.9, 1.3, 0.7)
      at(kit.ball(0.035, P.dark), 0, 0.15, 0, body)
      at(kit.cone(0.012, 0.035, 4, P.amber), 0, 0.15, 0.04, body).rotation.x = Math.PI / 2
      return { p, body }
    })
    // Snow falling over the island, and an aurora rippling above it.
    particles(c, 120, '#ffffff', 0.06, (i, t, out) => {
      const k = (t * 0.12 + ((i * 0.618) % 1)) % 1
      const r = 0.2 + (i % 9) * 0.2
      out.set(Math.cos(i * 2.4) * r + Math.sin(t * 0.7 + i) * 0.1, 3.4 - k * 3.4, Math.sin(i * 2.4) * r)
    })
    const aurora = auroraRibbon(c, look)
    aurora.position.set(0, 3.2, -0.6)
    anims.push((t) => {
      puffs.forEach((pf, i) => {
        const k = (t * 0.25 + i / 3) % 1
        pf.position.set(0.12 + k * 0.1, 0.52 + k * 0.5, -0.05)
        pf.scale.setScalar(0.6 + k)
        ;(pf.material as THREE.MeshStandardMaterial).opacity = 0.6 * (1 - k)
      })
      penguins.forEach(({ p, body }, i) => {
        const a = t * 0.25 + i * 0.4
        p.position.set(Math.cos(a) * 1.35, 0, Math.sin(a) * 1.1 + 0.3)
        p.rotation.y = -a
        const slide = Math.sin(t * 0.5 + i) > 0.3
        body.rotation.x = slide ? 1.3 : 0
        body.rotation.z = slide ? 0 : Math.sin(t * 8 + i) * 0.15
      })
    })
  },

  beach(c) {
    const { kit, at, top, anims, look } = c
    const lagoon = own(new THREE.Mesh(new THREE.CircleGeometry(1.0, 36).rotateX(-Math.PI / 2), kit.water()))
    lagoon.position.set(0.55, 0.012, 0.6)
    top.add(lagoon)
    const foam = own(new THREE.Mesh(new THREE.RingGeometry(0.96, 1.04, 48).rotateX(-Math.PI / 2), kit.m('#ffffff', { transparent: true, opacity: 0.8 }, 'foam')))
    foam.position.set(0.55, 0.02, 0.6)
    top.add(foam)
    const palm = (x: number, z: number, ry: number, s: number): THREE.Group => {
      const p = group(top, x, 0, z, s, ry)
      for (let k = 0; k < 7; k++) at(kit.cyl(0.035, 0.045, 0.16, 6, '#a8794f'), k * 0.035, 0.08 + k * 0.15, 0, p).rotation.z = -0.2
      const crown = group(p, 0.25, 1.1, 0)
      for (let k = 0; k < 8; k++) {
        const frond = at(kit.box(0.42, 0.012, 0.08, '#4caf50'), Math.cos(k * 0.8) * 0.17, -0.04, Math.sin(k * 0.8) * 0.17, crown)
        frond.rotation.set(0, -k * 0.8, -0.45)
      }
      for (let k = 0; k < 3; k++) at(kit.ball(0.04, '#7a5236', 6), Math.cos(k * 2) * 0.04, -0.07, Math.sin(k * 2) * 0.04, crown)
      p.userData.crown = crown
      return p
    }
    const palms = [palm(-0.8, -0.3, 0.2, 1.1), palm(-1.2, 0.4, -0.6, 1.0), palm(-0.1, -1.0, 1.2, 1.2), palm(-1.0, -1.0, 2.2, 0.9)]
    // Umbrella and two loungers.
    const umb = group(top, -0.35, 0, 0.75)
    at(kit.cyl(0.012, 0.012, 0.6, 4, P.white), 0, 0.3, 0, umb)
    for (let k = 0; k < 8; k++) at(kit.cone(0.35, 0.14, 8, k % 2 ? P.coral : P.white), 0, 0.62, 0, umb).rotation.y = (k * Math.PI) / 4
    for (const x of [-0.22, 0.22]) at(kit.box(0.14, 0.03, 0.38, P.blue), -0.35 + x, 0.07, 1.05).rotation.x = -0.15
    // Lighthouse with a sweeping beam.
    const lh = group(top, 1.2, 0, -0.75, 1.3)
    for (let k = 0; k < 6; k++) {
      const r1 = Math.round((0.15 - k * 0.012) * 1000) / 1000
      at(kit.cyl(r1, Math.round((r1 + 0.01) * 1000) / 1000, 0.2, 10, k % 2 ? P.coral : P.white), 0, 0.1 + k * 0.2, 0, lh)
    }
    at(kit.cyl(0.11, 0.11, 0.14, 10, kit.m(P.lamp, { emissive: P.lamp, emissiveIntensity: look === 'night' ? 1.4 : 0.6 })), 0, 1.3, 0, lh)
    at(kit.cone(0.14, 0.16, 10, P.coral), 0, 1.45, 0, lh)
    const beam = group(lh, 0, 1.3, 0)
    const ray = at(kit.cone(0.16, 1.8, 10, kit.m(P.lamp, { transparent: true, opacity: look === 'night' ? 0.35 : 0.12, emissive: P.lamp, emissiveIntensity: 1, depthWrite: false }, 'beam')), 0, 0, 0.9, beam)
    ray.rotation.x = -Math.PI / 2
    ray.castShadow = false
    // Sea turtles, a sailboat on the lagoon, shells on the sand, gulls.
    const turtles = [0, 1].map(() => {
      const tt = group(top, 0, 0, 0, 1.2)
      at(kit.dome(0.08, '#5e8f4e'), 0, 0.02, 0, tt).scale.set(1, 0.7, 1.2)
      at(kit.ball(0.03, '#8bbf7a', 6), 0, 0.03, 0.11, tt)
      return tt
    })
    const sail = group(top, 0.55, 0.03, 0.6, 0.9)
    at(kit.box(0.26, 0.05, 0.1, P.white), 0, 0.03, 0, sail)
    at(kit.cyl(0.006, 0.006, 0.36, 3, P.dark), 0, 0.22, 0, sail)
    at(kit.cone(0.1, 0.3, 3, P.coral), 0.04, 0.22, 0, sail).rotation.y = Math.PI / 2
    for (let i = 0; i < 6; i++) at(kit.ball(0.03, ['#f4b6c8', P.amber, P.white][i % 3], 5), -1.4 + i * 0.3, 0.02, 1.2 - (i % 2) * 0.2).scale.set(1, 0.4, 1)
    birds(c, 3, 2.0, 1.3)
    anims.push((t) => {
      beam.rotation.y = t * 0.9
      palms.forEach((p, i) => ((p.userData.crown as THREE.Group).rotation.z = Math.sin(t * 1.1 + i) * 0.08))
      foam.scale.setScalar(1 + Math.sin(t * 1.2) * 0.03)
      ;(foam.material as THREE.MeshStandardMaterial).opacity = 0.55 + Math.sin(t * 1.2) * 0.25
      turtles.forEach((tt, i) => {
        const a = t * 0.07 + i * Math.PI
        tt.position.set(-0.4 + Math.cos(a) * 0.9, 0, -0.1 + Math.sin(a) * 0.5)
        tt.rotation.y = -a
      })
      const a = t * 0.18
      sail.position.set(0.55 + Math.cos(a) * 0.55, 0.03 + Math.sin(t * 1.5) * 0.01, 0.6 + Math.sin(a) * 0.5)
      sail.rotation.y = -a
    })
  },
}

/** Aurora: curtains of green and violet light rippling over the snowy peak (brighter at night). */
function auroraRibbon(c: Ctx, look: ShownLook): THREE.Group {
  const g = new THREE.Group()
  c.top.add(g)
  const time = { value: 0 }
  const strength = look === 'night' ? 0.32 : 0.3
  ;['#5ef0b0', '#9f7cf0'].forEach((col, i) => {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: time, uColor: { value: new THREE.Color(col) }, uStrength: { value: strength } },
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.z += sin(p.x * 1.6 + uTime * 0.6) * 0.35 + sin(p.x * 3.1 - uTime * 0.4) * 0.12;
          p.y += sin(p.x * 2.0 + uTime * 0.8) * 0.08;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uStrength;
        varying vec2 vUv;
        void main() {
          float band = smoothstep(0.0, 0.35, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y));
          float shimmer = 0.6 + 0.4 * sin(vUv.x * 22.0 + uTime * 1.5);
          gl_FragColor = vec4(uColor, band * shimmer * uStrength);
        }`,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    })
    const ribbon = own(new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.1, 48, 1), mat))
    ribbon.userData.ownMaterial = true
    ribbon.position.set(0, i * 0.35, -i * 0.3)
    g.add(ribbon)
  })
  c.anims.push((t) => (time.value = t))
  return g
}

// The garden's land, three.js part: the island itself and what the worlds do to it (see wordbook/gardenWorld.ts).
// The island grows up with the worlds: a small rough islet first, then layered cliffs below, hanging roots, little
// rocks floating underneath, glowing crystals, and clouds drifting round. On top: the dirt path to the cottage, the
// cobbled road, the paved plaza, the river with its bridge and waterfall, and the town wall with towers.
// Geometries made here belong to one build (userData.own: the scene disposes them); materials come from the kit.
import * as THREE from 'three'
import type { GardenLayout } from '@/wordbook'
import { DecorKit, GROUND, P, type Anim } from './gardenDecor'

/** Seeded random numbers (mulberry32), so a garden looks the same every time. */
function random(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32
  }
}

const own = <T extends THREE.Object3D>(o: T): T => {
  o.userData.own = true
  return o
}

export interface Land {
  group: THREE.Group
  anims: Anim[]
}

/**
 * Build the island for `layout` in world `tier` (inner = edge of the plants' ground). `bridgeAngles` = where island
 * bridges leave the edge (the wall leaves a gap there).
 */
export function buildLand(kit: DecorKit, layout: GardenLayout, tier: number, inner: number, bridgeAngles: readonly number[]): Land {
  const g = new THREE.Group()
  const anims: Anim[] = []
  const R = layout.radius
  const rand = random(7 + tier * 31)

  // ── the island ──
  // Top: a soft, slightly wavy edge (only ever outwards, so nothing on it hangs over).
  const top = new THREE.CylinderGeometry(R, R * 0.985, 0.24, 96, 1)
  const pos = top.getAttribute('position') as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const r = Math.hypot(v.x, v.z)
    if (r < R * 0.9) continue
    const a = Math.atan2(v.z, v.x)
    const k = 1 + 0.025 * (1 + Math.sin(a * 5 + 1.3) * Math.sin(a * 3 - 0.4)) + 0.012 * (1 + Math.sin(a * 17))
    pos.setXYZ(i, v.x * k, v.y, v.z * k)
  }
  top.computeVertexNormals()
  const grass = own(new THREE.Mesh(top, kit.m(GROUND.grass)))
  grass.position.y = -0.12
  grass.receiveShadow = true
  g.add(grass)
  // A band of earth under the grass.
  const earth = own(new THREE.Mesh(new THREE.CylinderGeometry(R * 1.01, R * 0.94, 0.2, 48, 1), kit.m(tier >= 1 ? '#8c6a4c' : GROUND.soil)))
  earth.position.y = -0.33
  g.add(earth)

  // Underside: a jagged rock that grows deeper and rougher world by world, in layers.
  const layers = tier >= 1 ? 3 : 1
  let y = -0.43
  for (let l = 0; l < layers; l++) {
    const rTop = R * (0.94 - l * 0.2)
    const rBot = R * (0.74 - l * 0.22)
    const h = R * (0.2 + Math.min(tier, 8) * 0.02) * (l === layers - 1 ? 1.5 : 1)
    const geo = l === layers - 1 ? new THREE.ConeGeometry(rTop, h, 11 + tier, 3) : new THREE.CylinderGeometry(rTop, Math.max(0.2, rBot), h, 11 + tier, 2)
    if (l === layers - 1) geo.rotateX(Math.PI)
    const p = geo.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i)
      if (Math.abs(v.y) > h / 2 - 1e-3 && l < layers - 1) continue
      const j = 1 + (rand() - 0.5) * 0.18
      p.setXYZ(i, v.x * j, v.y + (rand() - 0.5) * 0.08 * R, v.z * j)
    }
    geo.computeVertexNormals()
    const rock = own(new THREE.Mesh(geo, kit.m(['#8f7c66', '#7a6a59', '#6b5d50'][l % 3])))
    rock.position.y = y - h / 2
    rock.castShadow = true
    g.add(rock)
    y -= h * 0.92
  }
  // Rocks jutting from the cliffs.
  if (tier >= 1)
    for (let i = 0; i < 10 + tier * 3; i++) {
      const a = rand() * Math.PI * 2
      const d = R * (0.82 + rand() * 0.1)
      const rock = kit.rock(0.12 + rand() * 0.18, rand() > 0.5 ? P.stoneDark : '#8f7c66')
      rock.position.set(Math.cos(a) * d, -0.5 - rand() * R * 0.25, Math.sin(a) * d)
      rock.rotation.set(rand() * 3, rand() * 3, rand() * 3)
      g.add(rock)
    }
  // Roots and vines hanging from the edge.
  if (tier >= 2)
    for (let i = 0; i < 14 + tier * 4; i++) {
      const a = rand() * Math.PI * 2
      const d = R * (0.9 + rand() * 0.08)
      const len = 0.25 + rand() * (0.5 + tier * 0.06)
      const vine = rand() > 0.45
      const root = kit.cyl(0.012, 0.02, 1, 4, vine ? '#4f8a52' : '#6b4f3a')
      root.scale.y = len
      root.position.set(Math.cos(a) * d, -0.4 - len / 2, Math.sin(a) * d)
      root.rotation.z = (rand() - 0.5) * 0.3
      g.add(root)
      if (vine) {
        const leaf = kit.ico(0.045, '#5fa35f')
        leaf.position.set(Math.cos(a) * d, -0.4 - len, Math.sin(a) * d)
        g.add(leaf)
      }
    }
  // Little rocks floating underneath, some with grass and a tree, slowly turning.
  if (tier >= 4) {
    const floaters = new THREE.Group()
    g.add(floaters)
    for (let i = 0; i < 3 + (tier - 4) * 2; i++) {
      const f = new THREE.Group()
      const a = (i / (3 + (tier - 4) * 2)) * Math.PI * 2 + rand()
      const d = R * (0.75 + rand() * 0.45)
      const s = 0.25 + rand() * 0.3
      f.position.set(Math.cos(a) * d, -1.4 - rand() * R * 0.35, Math.sin(a) * d)
      const base = own(new THREE.Mesh(new THREE.ConeGeometry(s, s * 1.6, 7), kit.m('#7a6a59')))
      base.rotation.x = Math.PI
      base.position.y = -s * 0.8
      const cap = kit.cyl(s, s * 0.95, 0.08, 8, GROUND.grass)
      f.add(base, cap)
      if (rand() > 0.4) {
        const t = kit.ico(s * 0.45, P.leaf)
        t.position.y = s * 0.55
        const trunk = kit.cyl(0.02, 0.03, s * 0.5, 5, P.brown)
        trunk.position.y = s * 0.25
        f.add(trunk, t)
      }
      f.userData.phase = rand() * 6
      floaters.add(f)
    }
    anims.push((t) => {
      floaters.rotation.y = t * 0.03
      floaters.children.forEach((f) => (f.position.y += Math.sin(t * 0.8 + (f.userData.phase as number)) * 0.0015))
    })
  }
  // Crystals growing out of the rock.
  if (tier >= 6)
    for (let i = 0; i < 6 + (tier - 6) * 4; i++) {
      const a = rand() * Math.PI * 2
      const d = R * (0.45 + rand() * 0.35)
      const c = rand() > 0.5 ? '#7fd8d0' : '#b7a4f0'
      const cluster = new THREE.Group()
      cluster.position.set(Math.cos(a) * d, -0.6 - rand() * R * 0.35, Math.sin(a) * d)
      for (let k = 0; k < 3; k++) {
        const crystal = own(new THREE.Mesh(new THREE.OctahedronGeometry(0.08 + rand() * 0.06, 0), kit.m(c, { emissive: c, emissiveIntensity: 0.6, roughness: 0.2 })))
        crystal.scale.set(0.6, 2.2, 0.6)
        crystal.rotation.set((rand() - 0.5) * 1.2 + Math.PI, rand() * 3, (rand() - 0.5) * 1.2)
        crystal.position.set((rand() - 0.5) * 0.12, 0, (rand() - 0.5) * 0.12)
        cluster.add(crystal)
      }
      g.add(cluster)
    }
  // Clouds drifting round the island (more with every world).
  if (tier >= 1) {
    const clouds = new THREE.Group()
    g.add(clouds)
    const white = kit.m('#ffffff', { transparent: true, opacity: 0.9, roughness: 1, flatShading: false }, 'cloud')
    for (let i = 0; i < 2 + tier; i++) {
      const c = new THREE.Group()
      const a = (i / (2 + tier)) * Math.PI * 2 + rand()
      const d = R * (1.15 + rand() * 0.45)
      c.position.set(Math.cos(a) * d, -1.2 + (rand() - 0.5) * 1.0, Math.sin(a) * d)
      const n = 4 + Math.floor(rand() * 3)
      for (let k = 0; k < n; k++) {
        const puff = kit.ball(Math.round((0.2 + rand() * 0.2) * 100) / 100, white, 12)
        puff.castShadow = false
        puff.receiveShadow = false
        puff.position.set((k - n / 2) * 0.24, rand() * 0.12, (rand() - 0.5) * 0.25)
        c.add(puff)
      }
      c.scale.setScalar(0.8 + rand() * 0.5)
      clouds.add(c)
    }
    anims.push((t) => (clouds.rotation.y = t * 0.02))
  }

  // ── on the island ──
  const flat = (geo: THREE.BufferGeometry, color: string | THREE.Material, y: number): THREE.Mesh => {
    geo.rotateX(-Math.PI / 2)
    const m = own(new THREE.Mesh(geo, typeof color === 'string' ? kit.m(color) : color))
    m.position.y = y
    m.receiveShadow = true
    g.add(m)
    return m
  }

  // Dirt path from the gate to the cottage, with stepping stones.
  if (layout.path) {
    const { angle, from, to } = layout.path
    const dir = new THREE.Vector2(Math.cos(angle), Math.sin(angle))
    for (let d = from; d <= to; d += 0.12) {
      const blob = flat(new THREE.CircleGeometry(0.17 + Math.sin(d * 9) * 0.02, 10), '#c9a87a', 0.006 + (d % 0.24 > 0.12 ? 0.0005 : 0))
      blob.position.x = dir.x * d + Math.sin(d * 5) * 0.03 * -dir.y
      blob.position.z = dir.y * d + Math.sin(d * 5) * 0.03 * dir.x
    }
    for (let d = from + 0.15; d < to - 0.05; d += 0.28) {
      const st = kit.rock(0.07, P.stone)
      st.scale.set(1.3, 0.3, 1)
      st.position.set(dir.x * d, 0.012, dir.y * d)
      st.castShadow = false
      g.add(st)
    }
  }

  // Paved plaza: rows of pale flagstones round the fence.
  if (layout.plaza) {
    const { inner: a, outer: b } = layout.plaza
    flat(new THREE.RingGeometry(a, b, 96), '#ddd4c4', 0.006)
    const stones: THREE.Matrix4[] = []
    const m4 = new THREE.Matrix4()
    for (let r = a + 0.07; r < b - 0.04; r += 0.13) {
      const n = Math.floor((Math.PI * 2 * r) / 0.14)
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + (Math.round(r * 10) % 2) * (Math.PI / n)
        stones.push(m4.clone().compose(new THREE.Vector3(Math.cos(ang) * r, 0.012, Math.sin(ang) * r), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -ang, 0)), new THREE.Vector3(1, 1, 1)))
      }
    }
    const pavers = own(new THREE.InstancedMesh(kit.g('paver', () => new THREE.BoxGeometry(0.12, 0.012, 0.115)), kit.m('#eae3d6'), stones.length))
    stones.forEach((s, i) => pavers.setMatrixAt(i, s))
    pavers.receiveShadow = true
    g.add(pavers)
  }

  // Cobbled road round the garden, with kerbs.
  if (layout.road) {
    const { radius: r, width: w } = layout.road
    flat(new THREE.RingGeometry(r - w / 2, r + w / 2, 128), '#b9b0a2', 0.008)
    for (const e of [r - w / 2, r + w / 2]) flat(new THREE.RingGeometry(e - 0.018, e + 0.018, 128), '#9a9183', 0.012)
    const cobbles: THREE.Matrix4[] = []
    const colours: THREE.Color[] = []
    const greys = ['#cfc7b9', '#c2b9aa', '#d8d0c3', '#bab1a3'].map((c) => new THREE.Color(c))
    for (let ring = -1; ring <= 1; ring++) {
      const rr = r + ring * (w / 3.2)
      const n = Math.floor((Math.PI * 2 * rr) / 0.085)
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + ring * 0.01
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rand() * 3, 0))
        cobbles.push(new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(ang) * rr, 0.013, Math.sin(ang) * rr), q, new THREE.Vector3(1, 0.35, 1)))
        colours.push(greys[Math.floor(rand() * greys.length)])
      }
    }
    const mesh = own(new THREE.InstancedMesh(kit.g('cobble', () => new THREE.DodecahedronGeometry(0.04, 0)), kit.m('#ffffff'), cobbles.length))
    cobbles.forEach((c, i) => {
      mesh.setMatrixAt(i, c)
      mesh.setColorAt(i, colours[i])
    })
    mesh.receiveShadow = true
    g.add(mesh)
  }

  // The river: from the pond to the edge, a bridge where the road crosses, a waterfall off the side.
  if (layout.river) {
    const { angle, from, to, width } = layout.river
    const len = to - from
    const dir = new THREE.Vector2(Math.cos(angle), Math.sin(angle))
    const yaw = -angle + Math.PI / 2
    const bed = flat(new THREE.PlaneGeometry(width + 0.08, len), '#7a6a59', 0.004)
    bed.position.set(dir.x * (from + len / 2), 0.004, dir.y * (from + len / 2))
    bed.rotation.z = 0
    bed.rotation.y = yaw
    const water = flat(new THREE.PlaneGeometry(width, len + 0.02), kit.water(), 0.02)
    water.position.set(dir.x * (from + len / 2), 0.02, dir.y * (from + len / 2))
    water.rotation.y = yaw
    // Stones along the banks.
    for (let d = from; d < to; d += 0.16)
      for (const side of [-1, 1]) {
        const st = kit.rock(0.045 + rand() * 0.03, rand() > 0.5 ? P.stone : P.stoneDark)
        const off = side * (width / 2 + 0.03)
        st.position.set(dir.x * d - dir.y * off, 0.02, dir.y * d + dir.x * off)
        st.scale.y = 0.6
        g.add(st)
      }
    // A wooden bridge where the road crosses.
    if (layout.road && layout.road.radius > from && layout.road.radius < to) {
      const r = layout.road.radius
      const bridge = new THREE.Group()
      bridge.position.set(dir.x * r, 0, dir.y * r)
      bridge.rotation.y = -angle
      g.add(bridge)
      for (let k = -4; k <= 4; k++) {
        const plank = kit.box(layout.road.width + 0.06, 0.03, 0.075, k % 2 ? P.wood : P.woodDark)
        plank.position.set(0, 0.07 + Math.cos((k / 4) * (Math.PI / 2)) * 0.06, k * 0.08)
        bridge.add(plank)
      }
      for (const side of [-1, 1]) {
        const rail = kit.box(0.025, 0.025, 0.72, P.woodDark)
        rail.position.set(side * (layout.road.width / 2 + 0.02), 0.21, 0)
        bridge.add(rail)
        for (const z of [-0.32, 0, 0.32]) {
          const post = kit.box(0.025, 0.14, 0.025, P.woodDark)
          post.position.set(side * (layout.road.width / 2 + 0.02), 0.15 + (z === 0 ? 0.05 : 0), z)
          bridge.add(post)
        }
      }
    }
    // Waterfall: the river pours over the edge and thins out below.
    const fall = new THREE.Group()
    fall.position.set(dir.x * (to + 0.02), 0, dir.y * (to + 0.02))
    fall.rotation.y = yaw
    g.add(fall)
    ;[0.85, 0.55, 0.25].forEach((op, i) => {
      const sheet = own(new THREE.Mesh(new THREE.PlaneGeometry(width * (1 - i * 0.12), 1.1), kit.water({ transparent: true, opacity: op, side: THREE.DoubleSide })))
      sheet.position.set(0, -0.55 - i * 1.05, 0.02 + i * 0.05)
      fall.add(sheet)
    })
    const spray = Array.from({ length: 10 }, () => {
      const d = kit.ball(0.035, kit.m('#ffffff', { transparent: true, opacity: 0.8 }, 'spray'), 5)
      fall.add(d)
      return d
    })
    anims.push((t) =>
      spray.forEach((d, i) => {
        const k = (t * 0.55 + i / spray.length) % 1
        d.position.set(((i % 5) - 2) * width * 0.18, -k * 3.2, 0.06 + k * 0.25)
        d.scale.setScalar(1 - k * 0.6)
      }),
    )
  }

  // Town wall along the edge: stone, battlements, round towers with flags, gaps for the river and the bridges.
  if (layout.wall) {
    const r = layout.wall.radius
    const gaps = [...(layout.river ? [layout.river.angle] : []), ...bridgeAngles]
    const inGap = (a: number): boolean => gaps.some((ga) => Math.abs(Math.atan2(Math.sin(a - ga), Math.cos(a - ga))) < 0.42 / r)
    const segLen = 0.3
    const n = Math.floor((Math.PI * 2 * r) / segLen)
    const flags: THREE.Object3D[] = []
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      if (inGap(a)) continue
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      const wall = kit.box(0.12, 0.34, segLen + 0.01, '#d9cfc0')
      wall.position.set(x, 0.17, z)
      wall.rotation.y = -a
      g.add(wall)
      if (i % 2 === 0) {
        const merlon = kit.box(0.13, 0.08, 0.12, '#d9cfc0')
        merlon.position.set(x, 0.38, z)
        merlon.rotation.y = -a
        g.add(merlon)
      }
      if (i % 9 === 0) {
        const tower = kit.cyl(0.16, 0.18, 0.7, 10, '#e4dccf')
        tower.position.set(x, 0.35, z)
        const roof = kit.cone(0.21, 0.32, 10, i % 18 === 0 ? P.coral : P.green)
        roof.position.set(x, 0.86, z)
        const pole = kit.cyl(0.006, 0.006, 0.22, 3, P.dark)
        pole.position.set(x, 1.1, z)
        const flag = kit.box(0.14, 0.08, 0.008, i % 18 === 0 ? P.amber : P.coral)
        flag.position.set(x + 0.07, 1.16, z)
        flag.userData.phase = i
        g.add(tower, roof, pole, flag)
        flags.push(flag)
      }
    }
    anims.push((t) => flags.forEach((f) => (f.rotation.y = Math.sin(t * 3 + (f.userData.phase as number)) * 0.35)))
  }

  return { group: g, anims }
}

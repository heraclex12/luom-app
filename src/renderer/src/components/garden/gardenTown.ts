// Settlements in the word garden, three.js part (see wordbook/gardenWorld.ts): the hamlet's farm, the village's
// cottages, chapel and watermill along its lane, the town's townhouses, hall and fountain along its high street; the
// lanes, squares, bridges and bunting on the ground; and the people and carts that bring it all to life.
// Models face +z (the lane / street they stand on). Geometries made here are the build's own (userData.own).
import * as THREE from 'three'
import type { DecorItem, GardenLayout } from '@/wordbook'
import { DecorKit, P, type Anim } from './gardenDecor'

type Built = { group: THREE.Group; anim?: Anim }

const own = <T extends THREE.Object3D>(o: T): T => {
  o.userData.own = true
  return o
}

function placer(g: THREE.Group): <T extends THREE.Object3D>(o: T, x: number, y: number, z: number, parent?: THREE.Object3D) => T {
  return (o, x, y, z, parent = g) => {
    o.position.set(x, y, z)
    parent.add(o)
    return o
  }
}

const sub = (parent: THREE.Object3D, x: number, y: number, z: number, ry = 0, scale = 1): THREE.Group => {
  const o = new THREE.Group()
  o.position.set(x, y, z)
  o.rotation.y = ry
  o.scale.setScalar(scale)
  parent.add(o)
  return o
}

const WALLS = ['#f7f5f0', '#efe7da', '#f4d6cc', '#e8dcc4', '#dbe8d4', '#f2e2b8']
// (Plain hex here: this module and gardenDecor import each other, so P is not ready at load time.)
const ROOFS = ['#9c4a2f', '#c9a25e', '#5a5f66', '#2f8a63', '#3f6fa6', '#b8432f']
const FACADES = ['#f2c94c', '#e8a87c', '#f4d6cc', '#a8d5ba', '#9ec5e8', '#f7f1e3', '#e98a6b', '#c9b4e8', '#f6e3a1']

/** Build a settlement thing, or null if `item` is not one. */
export function buildSettlement(kit: DecorKit, item: DecorItem, g: THREE.Group): Built | null {
  const at = placer(g)
  const s = item.seed
  switch (item.kind) {
    case 'farm':
      return farm(kit, g, at)
    case 'villagehouse': {
      // A cottage: thatched or tiled, some with a chimney and a tiny front garden.
      const wall = WALLS[Math.floor(s * WALLS.length) % WALLS.length]
      const roof = ROOFS[Math.floor(s * 7.3) % ROOFS.length]
      const w = 0.5 + (s % 0.3) * 0.3
      const h = 0.34 + ((s * 3.7) % 1) * 0.12
      at(kit.box(w, h, 0.4, wall), 0, h / 2, -0.02)
      if (roof === '#c9a25e') {
        // Thatch: a soft rounded roof.
        const th = at(kit.cyl(0.26, 0.26, w + 0.08, 8, roof), 0, h + 0.05, -0.02)
        th.rotation.z = Math.PI / 2
        th.scale.set(1, 1, 0.9)
      } else at(kit.roof(w + 0.1, 0.24, 0.48, roof), 0, h, -0.02)
      at(kit.box(0.11, 0.2, 0.02, P.woodDark), 0, 0.1, 0.19)
      for (const x of [-w / 3.2, w / 3.2]) at(kit.box(0.09, 0.09, 0.02, P.sky), x, h * 0.62, 0.19)
      if (s > 0.35) at(kit.box(0.06, 0.18, 0.06, P.stoneDark), w * 0.3, h + 0.18, -0.08)
      if (s > 0.55) for (let i = 0; i < 4; i++) at(kit.ball(0.02, [P.coral, P.pink, P.amber, P.white][i], 5), -0.12 + i * 0.08, 0.04, 0.26)
      return { group: g }
    }
    case 'chapel': {
      at(kit.box(0.5, 0.45, 0.75, P.white), 0, 0.225, -0.1)
      at(kit.roof(0.6, 0.35, 0.82, '#5a5f66'), 0, 0.45, -0.1)
      // Bell tower over the door, with a spire; the bell swings.
      at(kit.box(0.24, 0.5, 0.24, P.white), 0, 0.7, 0.2)
      at(kit.cone(0.2, 0.5, 4, '#5a5f66'), 0, 1.2, 0.2).rotation.y = Math.PI / 4
      const bell = sub(g, 0, 0.88, 0.2)
      at(kit.cone(0.06, 0.09, 8, P.amber), 0, -0.06, 0, bell)
      at(kit.box(0.12, 0.1, 0.02, '#3b4252'), 0, 0.8, 0.325)
      at(kit.box(0.14, 0.24, 0.02, P.woodDark), 0, 0.12, 0.33)
      for (const z of [-0.35, -0.05]) for (const x of [-1, 1]) at(kit.box(0.02, 0.16, 0.08, '#9ec5e8'), x * 0.255, 0.26, z)
      return { group: g, anim: (t) => (bell.rotation.z = Math.sin(t * 2.2) * 0.35) }
    }
    case 'watermill': {
      at(kit.box(0.6, 0.48, 0.5, '#e8dcc4'), 0, 0.24, 0)
      at(kit.roof(0.7, 0.3, 0.6, '#9c4a2f'), 0, 0.48, 0)
      at(kit.box(0.14, 0.24, 0.02, P.woodDark), 0, 0.12, 0.26)
      at(kit.box(0.1, 0.1, 0.02, P.sky), 0.18, 0.32, 0.26)
      // The wheel turns on the river's side.
      const side = s > 0.5 ? 1 : -1
      const wheel = sub(g, side * 0.36, 0.28, 0)
      const rim = own(new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.025, 6, 20), kit.m(P.woodDark)))
      rim.rotation.y = Math.PI / 2
      wheel.add(rim)
      for (let i = 0; i < 8; i++) {
        const paddle = at(kit.box(0.06, 0.24, 0.05, P.wood), 0, 0, 0, wheel)
        paddle.rotation.x = (i / 8) * Math.PI * 2
        paddle.translateY(0.14)
      }
      at(kit.cyl(0.03, 0.03, 0.12, 6, P.dark), 0, 0, 0, wheel).rotation.z = Math.PI / 2
      return { group: g, anim: (t) => (wheel.rotation.x = -t * 0.9) }
    }
    case 'townhouse': {
      // Tall and narrow, side by side along the high street: two or three storeys, shops below, balconies above.
      const storeys = s > 0.45 ? 3 : 2
      const h = storeys * 0.27
      const facade = FACADES[Math.floor(s * 97) % FACADES.length]
      at(kit.box(0.5, h, 0.48, facade), 0, h / 2, -0.02)
      const gable = (s * 13) % 1 > 0.4
      if (gable) at(kit.roof(0.56, 0.22, 0.54, ROOFS[Math.floor(s * 31) % ROOFS.length]), 0, h, -0.02).rotation.y = Math.PI / 2
      else {
        at(kit.box(0.54, 0.05, 0.52, '#d8cdb8'), 0, h + 0.025, -0.02)
        at(kit.box(0.54, 0.06, 0.03, '#d8cdb8'), 0, h + 0.07, 0.235)
      }
      const glass = kit.m(P.sky)
      for (let f = 1; f < storeys; f++)
        for (const x of [-0.13, 0.13]) {
          at(kit.box(0.1, 0.13, 0.02, glass), x, f * 0.27 + 0.13, 0.225)
          if ((s * 7 + f) % 1 > 0.6) at(kit.box(0.14, 0.02, 0.06, P.woodDark), x, f * 0.27 + 0.06, 0.255)
        }
      if (s > 0.3) {
        // A shop: big window and a striped awning.
        at(kit.box(0.3, 0.14, 0.02, glass), -0.06, 0.12, 0.225)
        const stripe = [P.coral, P.green, P.blue, P.amber][Math.floor(s * 41) % 4]
        for (let i = 0; i < 4; i++) at(kit.box(0.12, 0.012, 0.16, i % 2 ? P.white : stripe), -0.18 + i * 0.12, 0.26, 0.3).rotation.x = 0.35
      }
      at(kit.box(0.09, 0.18, 0.02, P.woodDark), 0.17, 0.09, 0.225)
      return { group: g }
    }
    case 'townhall': {
      at(kit.box(1.2, 0.08, 0.75, P.stone), 0, 0.04, 0)
      at(kit.box(1.05, 0.62, 0.55, '#f2ead9'), 0, 0.39, -0.05)
      for (let i = 0; i < 6; i++) at(kit.cyl(0.035, 0.04, 0.5, 8, P.white), -0.45 + i * 0.18, 0.33, 0.28)
      at(kit.box(1.1, 0.06, 0.2, P.white), 0, 0.6, 0.27)
      at(kit.roof(1.12, 0.2, 0.22, '#e4dccf'), 0, 0.63, 0.27).rotation.y = Math.PI / 2
      for (let i = 0; i < 3; i++) at(kit.box(0.9 - i * 0.1, 0.03, 0.08, P.stone), 0, 0.015 + i * 0.03, 0.42 - i * 0.05)
      at(kit.cyl(0.22, 0.24, 0.2, 14, '#f2ead9'), 0, 0.8, -0.05)
      at(kit.dome(0.24, '#5f8fa8'), 0, 0.9, -0.05)
      at(kit.cyl(0.008, 0.008, 0.3, 3, P.dark), 0, 1.25, -0.05)
      const flag = at(kit.box(0.18, 0.1, 0.008, P.coral), 0.09, 1.34, -0.05)
      for (const x of [-0.42, 0.42]) at(kit.box(0.12, 0.16, 0.02, P.sky), x, 0.5, 0.235)
      return { group: g, anim: (t) => (flag.rotation.y = Math.sin(t * 3) * 0.3) }
    }
    case 'fountain': {
      at(kit.cyl(0.38, 0.4, 0.12, 20, P.stone), 0, 0.06, 0)
      const pool = at(kit.cyl(0.33, 0.33, 0.02, 20, kit.water()), 0, 0.12, 0)
      pool.castShadow = false
      at(kit.cyl(0.05, 0.07, 0.35, 8, P.stone), 0, 0.28, 0)
      at(kit.cyl(0.16, 0.08, 0.06, 12, P.stone), 0, 0.46, 0)
      at(kit.cyl(0.13, 0.13, 0.015, 12, kit.water()), 0, 0.49, 0).castShadow = false
      const drops = Array.from({ length: 24 }, (_, i) => {
        const d = at(kit.ball(0.018, kit.m('#e8f4ff', { transparent: true, opacity: 0.85, emissive: '#cfe6f7', emissiveIntensity: 0.3 }, 'fountain'), 4), 0, 0, 0)
        d.userData.a = (i / 24) * Math.PI * 2
        d.castShadow = false
        return d
      })
      return {
        group: g,
        anim: (t) =>
          drops.forEach((d, i) => {
            const k = (t * 0.9 + (i % 6) / 6) % 1
            const a = d.userData.a as number
            const r = 0.04 + k * 0.26
            d.position.set(Math.cos(a) * r, 0.56 + Math.sin(k * Math.PI) * 0.22 - k * 0.38, Math.sin(a) * r)
          }),
      }
    }
    default:
      return null
  }
}

/** Farm: red barn and silo, sheep in a fenced paddock, cows grazing, a hen coop, haystacks. */
function farm(kit: DecorKit, g: THREE.Group, at: ReturnType<typeof placer>): Built {
  const barn = sub(g, -0.3, 0, -0.4, 0.15)
  at(kit.box(0.85, 0.55, 0.6, '#b8432f'), 0, 0.275, 0, barn)
  at(kit.roof(0.95, 0.38, 0.68, '#5a5f66'), 0, 0.55, 0, barn).rotation.y = Math.PI / 2
  at(kit.box(0.3, 0.34, 0.02, '#7a2e22'), 0, 0.17, 0.31, barn)
  for (const r of [0.75, -0.75]) {
    const x = at(kit.box(0.42, 0.025, 0.02, P.white), 0, 0.17, 0.32, barn)
    x.rotation.z = r
  }
  at(kit.box(0.14, 0.12, 0.02, P.white), 0, 0.44, 0.31, barn)
  at(kit.cyl(0.17, 0.17, 1.0, 12, '#cfd6dc'), 0.42, 0.5, -0.5)
  at(kit.dome(0.17, '#9aa4ad'), 0.42, 1.0, -0.5)
  // Paddock with sheep.
  const pc = { x: 0.3, z: 0.35 }
  const pr = 0.42
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    at(kit.box(0.025, 0.14, 0.025, P.wood), pc.x + Math.cos(a) * pr, 0.07, pc.z + Math.sin(a) * pr)
    const b = a + Math.PI / 12
    const rail = at(kit.box(0.015, 0.02, 2 * pr * Math.sin(Math.PI / 12) + 0.02, P.wood), pc.x + Math.cos(b) * pr, 0.1, pc.z + Math.sin(b) * pr)
    rail.rotation.y = -b
  }
  const sheep = [0, 1, 2, 3].map((i) => {
    const sh = sub(g, pc.x, 0, pc.z)
    at(kit.ico(0.07, '#f5f2ea'), 0, 0.08, 0, sh).scale.set(1, 0.85, 1.25)
    at(kit.ball(0.032, '#3a3a3a', 6), 0, 0.09, 0.09, sh)
    for (const x of [-0.03, 0.03]) for (const z of [-0.04, 0.04]) at(kit.cyl(0.008, 0.008, 0.05, 4, '#3a3a3a'), x, 0.025, z, sh)
    sh.userData.i = i
    return sh
  })
  // Cows grazing beside it.
  const cows = [0, 1].map((i) => {
    const c = sub(g, -0.55 + i * 0.3, 0, 0.45 - i * 0.15, 1.2 + i * 0.5)
    at(kit.box(0.1, 0.08, 0.2, P.white), 0, 0.1, 0, c)
    at(kit.ball(0.03, '#2b2b2b', 5), 0.03, 0.12, 0.03, c).scale.set(1, 0.6, 1.4)
    at(kit.ball(0.025, '#2b2b2b', 5), -0.04, 0.11, -0.05, c).scale.set(1, 0.6, 1.4)
    for (const x of [-0.035, 0.035]) for (const z of [-0.07, 0.07]) at(kit.cyl(0.01, 0.01, 0.07, 4, P.white), x, 0.035, z, c)
    const head = sub(c, 0, 0.12, 0.11)
    at(kit.box(0.06, 0.05, 0.07, P.white), 0, 0, 0.02, head)
    at(kit.box(0.05, 0.03, 0.02, '#e8b4a8'), 0, -0.01, 0.06, head)
    for (const x of [-0.035, 0.035]) at(kit.cone(0.008, 0.03, 4, P.cream), x, 0.035, 0, head)
    return head
  })
  // Hen coop and hens pecking.
  const coop = sub(g, -0.75, 0, -0.05, 0.4)
  at(kit.box(0.24, 0.16, 0.18, '#d9b45a'), 0, 0.12, 0, coop)
  at(kit.roof(0.3, 0.1, 0.24, '#b8432f'), 0, 0.2, 0, coop)
  for (const x of [-0.1, 0.1]) at(kit.box(0.02, 0.04, 0.02, P.woodDark), x, 0.02, 0, coop)
  const hens = [0, 1, 2].map((i) => {
    const h = sub(g, -0.7 + i * 0.12, 0, 0.12 + (i % 2) * 0.08, i * 1.7)
    at(kit.ball(0.03, i === 1 ? '#a0522d' : P.white, 6), 0, 0.04, 0, h).scale.set(1, 0.9, 1.2)
    const head = sub(h, 0, 0.06, 0.03)
    at(kit.ball(0.017, i === 1 ? '#a0522d' : P.white, 5), 0, 0, 0, head)
    at(kit.cone(0.006, 0.015, 4, P.amber), 0, 0, 0.018, head).rotation.x = Math.PI / 2
    at(kit.ball(0.008, '#d93a2b', 4), 0, 0.016, 0, head)
    return head
  })
  // Haystacks.
  for (const [x, z, s] of [
    [0.75, -0.05, 1],
    [0.85, 0.25, 0.8],
  ] as const) {
    at(kit.cyl(0.12 * s, 0.14 * s, 0.14 * s, 10, '#e2c46a'), x, 0.07 * s, z)
    at(kit.dome(0.12 * s, '#e8cf7a'), x, 0.14 * s, z)
  }
  return {
    group: g,
    anim: (t) => {
      sheep.forEach((sh, i) => {
        const a = t * 0.12 + i * 1.6
        const r = 0.12 + (i % 2) * 0.13
        sh.position.set(pc.x + Math.cos(a) * r, 0, pc.z + Math.sin(a) * r)
        sh.rotation.y = -a + (Math.sin(t * 0.5 + i) > 0 ? 0 : Math.PI / 2)
      })
      cows.forEach((head, i) => (head.rotation.x = 0.2 + Math.max(0, Math.sin(t * 0.4 + i * 2)) * 0.6))
      hens.forEach((head, i) => (head.rotation.x = Math.max(0, Math.sin(t * 5 + i * 2.1)) * 0.9))
    },
  }
}

// ── on the ground ──

/** Lanes, squares, bridges over the river and bunting across the high street. */
export function buildTownLand(kit: DecorKit, layout: GardenLayout): { group: THREE.Group; anims: Anim[] } {
  const g = new THREE.Group()
  const anims: Anim[] = []
  const flat = (geo: THREE.BufferGeometry, color: string, y: number): THREE.Mesh => {
    geo.rotateX(-Math.PI / 2)
    const m = own(new THREE.Mesh(geo, kit.m(color)))
    m.position.y = y
    m.receiveShadow = true
    g.add(m)
    return m
  }
  const S = layout.scale
  if (layout.villageLane) {
    const { radius: r, width: w } = layout.villageLane
    flat(new THREE.RingGeometry(r - w / 2, r + w / 2, 160), '#cdb48a', 0.007)
    for (const e of [r - w / 2, r + w / 2]) flat(new THREE.RingGeometry(e - 0.012 * S, e + 0.012 * S, 160), '#b39a72', 0.009)
  }
  if (layout.townStreet) {
    const { radius: r, width: w } = layout.townStreet
    flat(new THREE.RingGeometry(r - w / 2, r + w / 2, 200), '#b9b0a2', 0.008)
    for (const e of [r - w / 2, r + w / 2]) flat(new THREE.RingGeometry(e - 0.02 * S, e + 0.02 * S, 200), '#e4dccf', 0.012)
    // Cobbles.
    const n = Math.floor((Math.PI * 2 * r) / (0.09 * S)) * 3
    const cob = own(new THREE.InstancedMesh(kit.g('cobble', () => new THREE.DodecahedronGeometry(0.04, 0)), kit.m('#ffffff'), n))
    const greys = ['#cfc7b9', '#c2b9aa', '#d8d0c3', '#bab1a3'].map((c) => new THREE.Color(c))
    const m4 = new THREE.Matrix4()
    for (let i = 0; i < n; i++) {
      const lane = (i % 3) - 1
      const a = (Math.floor(i / 3) / (n / 3)) * Math.PI * 2 + lane * 0.004
      const rr = r + lane * (w / 3.2)
      m4.compose(new THREE.Vector3(Math.cos(a) * rr, 0.013, Math.sin(a) * rr), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, i, 0)), new THREE.Vector3(S, 0.35 * S, S))
      cob.setMatrixAt(i, m4)
      cob.setColorAt(i, greys[i % greys.length])
    }
    g.add(cob)
    // Bunting across the street every so often: little coloured flags on a sagging string.
    const flags: THREE.Matrix4[] = []
    const colours: THREE.Color[] = []
    const palette = [P.coral, P.amber, P.yellow, P.leafLight, P.bluebell, P.pink].map((c) => new THREE.Color(c))
    const strings = Math.floor((Math.PI * 2 * r) / (1.1 * S))
    const span = w + 0.5 * S
    for (let j = 0; j < strings; j++) {
      const a = (j / strings) * Math.PI * 2 + 0.03
      const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a))
      const per = 9
      for (let k = 0; k < per; k++) {
        const u = k / (per - 1) - 0.5
        const p = dir.clone().multiplyScalar(r + u * span)
        p.y = 0.62 * S - (1 - 4 * u * u) * 0.12 * S
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, -a, 0))
        flags.push(new THREE.Matrix4().compose(p, q, new THREE.Vector3(S, S, S)))
        colours.push(palette[(j + k) % palette.length])
      }
    }
    const bunting = own(new THREE.InstancedMesh(kit.g('flag', () => new THREE.ConeGeometry(0.035, 0.08, 3)), kit.m('#ffffff'), flags.length))
    flags.forEach((f, i) => {
      bunting.setMatrixAt(i, f)
      bunting.setColorAt(i, colours[i])
    })
    bunting.castShadow = false
    g.add(bunting)
  }
  // Squares: paved stretches of the lane / street.
  for (const sq of layout.squares) {
    const r = Math.hypot(sq.x, sq.z)
    const da = sq.length / r
    const geo = new THREE.RingGeometry(r - sq.depth, r + sq.depth, 40, 1, -sq.angle - da, da * 2)
    flat(geo, sq.kind === 'town' ? '#e6dfd2' : '#d9ccb2', 0.011)
    if (sq.kind === 'village') {
      // A big old tree, benches round it and a market cart on the village square.
      const along = (d: number, out: number): THREE.Vector3 => {
        const a = sq.angle + d / r
        return new THREE.Vector3(Math.cos(a) * (r + out), 0, Math.sin(a) * (r + out))
      }
      const tree = sub(g, 0, 0, 0, 0, S)
      tree.position.copy(along(sq.length * 0.62, 0))
      const trunk = kit.cyl(0.07, 0.11, 0.7, 7, P.brown)
      trunk.position.y = 0.35
      tree.add(trunk)
      for (const [x, y, z, rad] of [
        [0, 0.95, 0, 0.42],
        [0.25, 0.8, 0.1, 0.3],
        [-0.22, 0.85, -0.1, 0.3],
      ] as const) {
        const c = kit.ico(rad, P.leaf)
        c.position.set(x, y, z)
        tree.add(c)
      }
      for (const side of [-1, 1]) {
        const bench = sub(g, 0, 0, 0, -sq.angle + Math.PI / 2, S)
        bench.position.copy(along(sq.length * 0.62 + side * 0.42 * S, 0))
        const seat = kit.box(0.3, 0.03, 0.1, P.wood)
        seat.position.y = 0.12
        bench.add(seat)
      }
      const stall = sub(g, 0, 0, 0, -sq.angle, S)
      stall.position.copy(along(-sq.length * 0.55, 0))
      const cartBox = kit.box(0.26, 0.1, 0.16, P.wood)
      cartBox.position.y = 0.11
      stall.add(cartBox)
      for (let i = 0; i < 5; i++) {
        const fruit = kit.ball(0.03, [P.coral, P.amber, P.leafLight, P.yellow, P.pink][i], 5)
        fruit.position.set(-0.08 + i * 0.04, 0.18, (i % 2) * 0.04 - 0.02)
        stall.add(fruit)
      }
      for (const x of [-0.12, 0.12]) {
        const w = kit.cyl(0.045, 0.045, 0.02, 10, P.woodDark)
        w.rotation.x = Math.PI / 2
        w.position.set(x, 0.045, 0.09)
        stall.add(w)
      }
    }
    if (sq.kind === 'town') {
      // Flagstones.
      const m4 = new THREE.Matrix4()
      const cells: THREE.Matrix4[] = []
      for (let rr = r - sq.depth + 0.08 * S; rr < r + sq.depth - 0.05 * S; rr += 0.15 * S)
        for (let a = -da; a < da; a += (0.16 * S) / rr) {
          const ang = sq.angle + a
          cells.push(m4.clone().compose(new THREE.Vector3(Math.cos(ang) * rr, 0.016, Math.sin(ang) * rr), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -ang, 0)), new THREE.Vector3(S, 1, S)))
        }
      const pav = own(new THREE.InstancedMesh(kit.g('paver2', () => new THREE.BoxGeometry(0.135, 0.01, 0.145)), kit.m('#f0eadf'), cells.length))
      cells.forEach((c, i) => pav.setMatrixAt(i, c))
      pav.receiveShadow = true
      g.add(pav)
    }
  }
  // Bridges where the river crosses the lane and the street.
  if (layout.river) {
    const dir = new THREE.Vector2(Math.cos(layout.river.angle), Math.sin(layout.river.angle))
    for (const lane of [layout.villageLane, layout.townStreet]) {
      if (!lane) continue
      const b = sub(g, dir.x * lane.radius, 0, dir.y * lane.radius, -layout.river.angle)
      for (let k = -4; k <= 4; k++) {
        const plank = kit.box(lane.width + 0.06 * S, 0.03 * S, 0.075 * S, k % 2 ? P.stone : P.stoneDark)
        plank.position.set(0, (0.07 + Math.cos((k / 4) * (Math.PI / 2)) * 0.07) * S, k * 0.08 * S)
        b.add(plank)
      }
      for (const side of [-1, 1]) {
        const rail = kit.box(0.04 * S, 0.06 * S, 0.74 * S, P.stone)
        rail.position.set(side * (lane.width / 2 + 0.02 * S), 0.18 * S, 0)
        b.add(rail)
      }
    }
  }
  return { group: g, anims }
}

// ── people and carts ──

const SHIRTS = ['#e5533d', '#4a6cf0', '#f2a531', '#2f8a63', '#9b86d6', '#f7f5f0', '#e98a6b', '#3fa39a']

/** A walking person (local +z forward). */
function person(kit: DecorKit, seed: number): { g: THREE.Group; legs: THREE.Object3D[] } {
  const g = new THREE.Group()
  const at = placer(g)
  const legs = [-0.018, 0.018].map((x) => at(kit.cyl(0.012, 0.012, 0.07, 4, P.dark), x, 0.035, 0))
  at(kit.cyl(0.03, 0.04, 0.1, 6, SHIRTS[Math.floor(seed * 97) % SHIRTS.length]), 0, 0.12, 0)
  at(kit.ball(0.03, ['#e9c4a0', '#c99a72', '#f1d3b5', '#8d5b3e'][Math.floor(seed * 13) % 4], 6), 0, 0.2, 0)
  if (seed > 0.6) at(kit.cone(0.06, 0.04, 8, '#efe0b0'), 0, 0.235, 0)
  else at(kit.dome(0.031, ['#3b2b20', '#d9b45a', '#2b2b2b', '#8b5a3c'][Math.floor(seed * 7) % 4]), 0, 0.205, 0)
  return { g, legs }
}

/** A horse pulling a cart (or a carriage). */
function cart(kit: DecorKit, carriage: boolean): { g: THREE.Group; wheels: THREE.Object3D[]; legs: THREE.Object3D[] } {
  const g = new THREE.Group()
  const at = placer(g)
  const horse = sub(g, 0, 0, 0.2)
  at(kit.box(0.07, 0.07, 0.17, '#8b5a3c'), 0, 0.12, 0, horse)
  const legs = [-1, 1].flatMap((x) => [-1, 1].map((z) => at(kit.cyl(0.01, 0.01, 0.09, 4, '#6b4a30'), x * 0.025, 0.045, z * 0.06, horse)))
  const neck = at(kit.box(0.04, 0.09, 0.04, '#8b5a3c'), 0, 0.18, 0.08, horse)
  neck.rotation.x = 0.5
  at(kit.box(0.04, 0.04, 0.08, '#8b5a3c'), 0, 0.22, 0.12, horse)
  const body = carriage ? '#3f6fa6' : P.wood
  at(kit.box(0.14, carriage ? 0.12 : 0.06, 0.18, body), 0, carriage ? 0.13 : 0.09, -0.06)
  if (carriage) at(kit.box(0.15, 0.02, 0.19, P.dark), 0, 0.2, -0.06)
  else for (let i = 0; i < 3; i++) at(kit.ball(0.03, ['#e2c46a', P.coral, P.leafLight][i], 5), -0.04 + i * 0.04, 0.13, -0.06)
  const wheels = [-1, 1].map((x) => {
    const w = at(kit.cyl(0.04, 0.04, 0.015, 10, P.woodDark), x * 0.08, 0.04, -0.08)
    w.rotation.z = Math.PI / 2
    return w
  })
  return { g, wheels, legs }
}

/** People walking the road, lane and street (and milling round the town square), horse carts and carriages. */
export function buildPeople(kit: DecorKit, layout: GardenLayout, tier: number, progress: number): { group: THREE.Group; anim: Anim } {
  const g = new THREE.Group()
  const S = layout.scale
  type Walker = { o: THREE.Group; legs: THREE.Object3D[]; radius: number; speed: number; phase: number; side: number; wheels?: THREE.Object3D[] }
  const walkers: Walker[] = []
  const add = (radius: number, width: number, count: number, kind: 'person' | 'cart' | 'carriage', speed: number): void => {
    for (let i = 0; i < count; i++) {
      const seed = ((i + 1) * 0.618034 + radius) % 1
      const made = kind === 'person' ? { ...person(kit, seed), wheels: undefined } : cart(kit, kind === 'carriage')
      made.g.scale.setScalar(S * (kind === 'person' ? 1.15 : 1.25))
      g.add(made.g)
      const dir = i % 2 ? 1 : -1
      walkers.push({
        o: made.g,
        legs: made.legs,
        wheels: made.wheels,
        radius: radius + (dir > 0 ? 1 : -1) * width * 0.22,
        speed: (dir * speed * (0.8 + seed * 0.4)) / radius,
        phase: (i / Math.max(1, count)) * Math.PI * 2 + seed,
        side: dir,
      })
    }
  }
  const more = (base: number, extra: number): number => base + Math.round(extra * (tier > 7 ? 1 : progress))
  if (layout.road && tier >= 5) add(layout.road.radius, layout.road.width, tier === 5 ? more(3, 5) : 8, 'person', 0.12 * S)
  if (layout.villageLane) {
    add(layout.villageLane.radius, layout.villageLane.width, tier === 6 ? more(8, 10) : 18, 'person', 0.12 * S)
    add(layout.villageLane.radius, layout.villageLane.width, 2, 'cart', 0.2 * S)
  }
  if (layout.townStreet) {
    add(layout.townStreet.radius, layout.townStreet.width, tier === 7 ? more(14, 16) : 30, 'person', 0.13 * S)
    add(layout.townStreet.radius, layout.townStreet.width, 3, 'carriage', 0.24 * S)
  }
  // A crowd milling round the town square's market.
  const square = layout.squares.find((q) => q.kind === 'town')
  const crowd: { o: THREE.Group; legs: THREE.Object3D[]; phase: number; r: number }[] = []
  if (square)
    for (let i = 0; i < (tier === 7 ? more(6, 8) : 14); i++) {
      const p = person(kit, (i * 0.37 + 0.11) % 1)
      p.g.scale.setScalar(S * 1.15)
      g.add(p.g)
      // Between the fountain and the stalls.
      crowd.push({ o: p.g, legs: p.legs, phase: i * 2.39996, r: (0.52 + (i % 2) * 0.08) * S })
    }
  let last = 0
  return {
    group: g,
    anim: (t) => {
      const dt = Math.min(0.1, Math.max(0, t - last))
      last = t
      for (const w of walkers) {
        // Now and then a person stops for a chat.
        const stopped = w.legs.length === 2 && Math.sin(t * 0.3 + w.phase * 3) > 0.85
        if (!stopped) w.phase += w.speed * dt
        const a = w.phase
        w.o.position.set(Math.cos(a) * w.radius, 0, Math.sin(a) * w.radius)
        w.o.rotation.y = -a + (w.side > 0 ? 0 : Math.PI)
        const step = stopped ? 0 : Math.sin(t * 9 + w.phase * 50)
        w.legs.forEach((l, i) => (l.rotation.x = step * 0.5 * (i % 2 ? 1 : -1)))
        w.wheels?.forEach((wh) => (wh.rotation.x = -t * 4))
        if (w.legs.length === 2) w.o.position.y = Math.abs(step) * 0.01 * S
      }
      if (square)
        crowd.forEach((c, i) => {
          const a = c.phase + t * 0.08 * (i % 2 ? 1 : -1)
          c.o.position.set(square.x + Math.cos(a) * c.r, 0, square.z + Math.sin(a) * c.r)
          c.o.rotation.y = -a + (i % 2 ? 0 : Math.PI)
          const step = Math.sin(t * 8 + i)
          c.legs.forEach((l, k) => (l.rotation.x = step * 0.4 * (k % 2 ? 1 : -1)))
        })
    },
  }
}

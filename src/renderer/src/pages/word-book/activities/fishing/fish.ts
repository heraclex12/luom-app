// A cute low-poly fish (Word Fishing pond and the aquarium): round body, big eye, a tail that wiggles. Faces +x.
import * as THREE from 'three'
import { flat } from '@/components/three/Stage'
import type { FishLook } from '@/wordbook'

export const FISH_COLORS = ['#ff9f6b', '#7fc8f8', '#ffd166', '#f497b6', '#8fdc8a', '#c3a6ff']
const GOLD = '#ffcf3f'

export interface FishNode {
  group: THREE.Group
  tail: THREE.Object3D
  body: THREE.Mesh
}

export function makeFish(look: FishLook): FishNode {
  const color = look.golden ? GOLD : FISH_COLORS[look.color % FISH_COLORS.length]
  const skin = flat(color, look.golden ? { emissive: '#a07800', emissiveIntensity: 0.35, metalness: 0.3, roughness: 0.4 } : {})
  const fin = flat(new THREE.Color(color).offsetHSL(0, 0.05, -0.12).getStyle())
  const group = new THREE.Group()
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), skin)
  body.scale.set(1.45, 1, 0.75)
  group.add(body)
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), flat('#fff4e6'))
  belly.scale.set(1.5, 0.6, 0.7)
  belly.position.set(0.05, -0.12, 0)
  group.add(belly)
  const tail = new THREE.Group()
  tail.position.x = -0.4
  const tailFin = new THREE.Mesh(new THREE.ConeGeometry(look.kind === 1 ? 0.26 : 0.2, 0.32, 4), fin)
  tailFin.rotation.z = Math.PI / 2
  tailFin.scale.set(1, 1, 0.3)
  tailFin.position.x = -0.12
  tail.add(tailFin)
  group.add(tail)
  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.12, look.kind === 2 ? 0.32 : 0.2, 3), fin)
  dorsal.scale.z = 0.3
  dorsal.position.set(-0.02, 0.3, 0)
  group.add(dorsal)
  for (const s of [-1, 1]) {
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), flat('#ffffff', { roughness: 0.4 }))
    white.position.set(0.24, 0.07, s * 0.16)
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), flat('#1d1d22', { roughness: 0.3 }))
    pupil.position.set(0.04, 0, s * 0.04)
    white.add(pupil)
    group.add(white)
  }
  group.scale.setScalar(look.size)
  group.traverse((o) => (o.castShadow = true))
  return { group, tail, body }
}

// Cute low-poly characters shared by the 3D activities: round animal customers (Bubble Tea Shop) and the frog
// (Frog Hop). Built from a few spheres and cones, facing +z (the camera). Moods squash the eyes and tilt the head.
import * as THREE from 'three'
import { flat, shared } from './Stage'

export type Mood = 'idle' | 'happy' | 'sad'

export interface Critter {
  group: THREE.Group
  /** Head (tilts with the mood). */
  head: THREE.Group
  setMood(mood: Mood): void
}

export const CRITTER_KINDS = ['cat', 'bunny', 'bear', 'panda', 'chick'] as const
export type CritterKind = (typeof CRITTER_KINDS)[number]

const FUR: Record<CritterKind, { body: string; ear: string; inner: string }> = {
  cat: { body: '#f4a259', ear: '#f4a259', inner: '#ffc9b5' },
  bunny: { body: '#f6f1ee', ear: '#f6f1ee', inner: '#ffb7c5' },
  bear: { body: '#b07d57', ear: '#b07d57', inner: '#e3b98f' },
  panda: { body: '#f7f7f5', ear: '#2b2b2e', inner: '#2b2b2e' },
  chick: { body: '#ffd93d', ear: '#ffb703', inner: '#ffb703' },
}

function face(head: THREE.Group, y: number, z: number, spread: number): THREE.Mesh[] {
  const eyeMat = flat('#1d1d22', { roughness: 0.4 })
  const shine = new THREE.MeshBasicMaterial({ color: '#ffffff' })
  const eyes: THREE.Mesh[] = []
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), eyeMat)
    eye.position.set(s * spread, y, z)
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 4), shine)
    dot.position.set(0.025, 0.03, 0.06)
    eye.add(dot)
    head.add(eye)
    eyes.push(eye)
    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), flat('#ff9eb0', { roughness: 1 }))
    blush.scale.set(1.3, 0.7, 0.4)
    blush.position.set(s * (spread + 0.13), y - 0.13, z - 0.04)
    head.add(blush)
  }
  return eyes
}

function moodSetter(head: THREE.Group, eyes: THREE.Mesh[]): (m: Mood) => void {
  return (m) => {
    for (const e of eyes) e.scale.set(1, m === 'happy' ? 0.35 : m === 'sad' ? 0.7 : 1, 1)
    head.rotation.z = m === 'sad' ? 0.22 : 0
    head.rotation.x = m === 'sad' ? 0.18 : 0
  }
}

/** A round animal about 2 units tall (feet at y = 0). */
export function makeCritter(kind: CritterKind): Critter {
  const c = FUR[kind]
  const group = new THREE.Group()
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), flat(c.body))
  body.scale.set(1, 0.95, 0.9)
  body.position.y = 0.55
  group.add(body)
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), flat(c.body))
    arm.position.set(s * 0.5, 0.65, 0.25)
    group.add(arm)
  }
  const head = new THREE.Group()
  head.position.y = 1.35
  group.add(head)
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), flat(c.body))
  skull.scale.set(1.08, 0.95, 0.95)
  head.add(skull)

  if (kind === 'cat') {
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.32, 4), flat(c.ear))
      ear.position.set(s * 0.3, 0.45, 0)
      ear.rotation.z = -s * 0.35
      head.add(ear)
    }
  } else if (kind === 'bunny') {
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.5, 4, 8), flat(c.ear))
      ear.position.set(s * 0.17, 0.75, -0.05)
      ear.rotation.z = -s * 0.15
      const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.38, 4, 6), flat(c.inner))
      inner.position.z = 0.07
      ear.add(inner)
      head.add(ear)
    }
  } else if (kind === 'bear' || kind === 'panda') {
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), flat(c.ear))
      ear.position.set(s * 0.36, 0.38, 0)
      head.add(ear)
    }
    if (kind === 'panda') {
      for (const s of [-1, 1]) {
        const patch = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), flat('#2b2b2e'))
        patch.scale.set(0.9, 1.15, 0.5)
        patch.position.set(s * 0.17, 0.02, 0.4)
        patch.rotation.z = s * 0.5
        head.add(patch)
      }
    } else {
      const snout = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), flat(c.inner))
      snout.scale.set(1.2, 0.85, 0.7)
      snout.position.set(0, -0.12, 0.42)
      head.add(snout)
    }
  } else {
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 5), flat(c.ear))
    tuft.position.set(0, 0.52, 0)
    head.add(tuft)
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 4), flat('#ff8c42'))
    beak.rotation.x = Math.PI / 2
    beak.position.set(0, -0.07, 0.5)
    head.add(beak)
  }
  const eyes = face(head, kind === 'panda' ? 0.04 : 0.06, 0.44, 0.17)
  group.traverse((o) => (o.castShadow = true))
  return { group, head, setMood: moodSetter(head, eyes) }
}

/** The frog of Frog Hop: a squat green body with big eyes on top (sits at y = 0, about 0.9 tall). */
export function makeFrog(): Critter {
  const group = new THREE.Group()
  const green = flat('#6cc46c')
  const belly = flat('#d9f2b4')
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), green)
  body.scale.set(1.1, 0.7, 1)
  body.position.y = 0.35
  group.add(body)
  const tummy = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 8), belly)
  tummy.scale.set(1.1, 0.7, 0.5)
  tummy.position.set(0, 0.28, 0.3)
  group.add(tummy)
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), green)
    leg.scale.set(1.2, 0.6, 1.5)
    leg.position.set(s * 0.45, 0.12, -0.05)
    group.add(leg)
  }
  const head = new THREE.Group()
  head.position.y = 0.5
  group.add(head)
  for (const s of [-1, 1]) {
    const bump = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), green)
    bump.position.set(s * 0.24, 0.16, 0.12)
    head.add(bump)
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), flat('#ffffff', { roughness: 0.5 }))
    white.position.set(s * 0.24, 0.18, 0.2)
    head.add(white)
  }
  const eyes = face(head, 0.19, 0.3, 0.24)
  for (const e of eyes) e.scale.setScalar(0.85)
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.12, 0.018, 6, 16, Math.PI),
    new THREE.MeshBasicMaterial({ color: '#2f6b35' }),
  )
  smile.rotation.z = Math.PI
  smile.position.set(0, -0.02, 0.43)
  head.add(smile)
  group.traverse((o) => (o.castShadow = true))
  const setMood = moodSetter(head, eyes)
  return {
    group,
    head,
    setMood: (m) => {
      setMood(m)
      for (const e of eyes) e.scale.multiplyScalar(0.85)
      smile.rotation.z = m === 'sad' ? 0 : Math.PI
      smile.position.y = m === 'sad' ? -0.1 : -0.02
    },
  }
}

/** A small round sprite texture (a heart or a sparkle) drawn once on a canvas; shared (the scene frees it). */
export function glyphTexture(kind: 'heart' | 'sparkle', color: string): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = color
  if (kind === 'heart') {
    g.beginPath()
    g.moveTo(32, 54)
    g.bezierCurveTo(4, 36, 6, 10, 22, 10)
    g.bezierCurveTo(28, 10, 32, 15, 32, 20)
    g.bezierCurveTo(32, 15, 36, 10, 42, 10)
    g.bezierCurveTo(58, 10, 60, 36, 32, 54)
    g.fill()
  } else {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, color)
    grad.addColorStop(0.35, color)
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 64, 64)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return shared(tex)
}

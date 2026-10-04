// Base for the 3D activities (Word Bridge, Star Sentences, Echo Cave, Memory Palace): renderer, camera, resize,
// a render loop that pauses when hidden or off screen, reduced motion, and disposal. Subclasses build their scene and
// animate it in update(); events (answers) call their own methods.
import * as THREE from 'three'

export interface StageOptions {
  fov?: number
  /** Scene background colour; null keeps the canvas transparent. */
  background?: string | null
  shadows?: boolean
}

export abstract class Stage {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera: THREE.PerspectiveCamera
  /** prefers-reduced-motion: no idle animation, effects jump to their end. */
  readonly reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  private timer = new THREE.Timer()
  private rafId = 0
  private running = false
  private visible = true
  private disposed = false
  /** Seconds since the stage started (for effect timing). */
  protected t = 0

  constructor(
    readonly canvas: HTMLCanvasElement,
    opts: StageOptions = {},
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: opts.background == null })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    if (opts.shadows) {
      this.renderer.shadowMap.enabled = true
      this.renderer.shadowMap.type = THREE.PCFShadowMap
    }
    if (opts.background) this.scene.background = new THREE.Color(opts.background)
    this.camera = new THREE.PerspectiveCamera(opts.fov ?? 40, 1, 0.1, 400)
  }

  /** Per-frame animation; `t` seconds since start, `dt` since the last frame. */
  protected abstract update(t: number, dt: number): void

  /** Called after a resize (aspect changed) so subclasses can re-frame the camera. */
  protected onResize(): void {}

  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.onResize()
    this.render()
  }

  setVisible(v: boolean): void {
    this.visible = v
    if (v) this.start()
  }

  /** Start the loop (no-op when reduced motion, hidden or already running). Reduced motion renders on demand. */
  start(): void {
    if (this.running || this.disposed || !this.visible) return
    if (this.reduced) {
      this.render()
      return
    }
    this.running = true
    const tick = (): void => {
      if (!this.running || !this.visible || this.disposed) {
        this.running = false
        return
      }
      this.timer.update()
      const dt = Math.min(0.1, this.timer.getDelta())
      this.t += dt
      this.update(this.t, dt)
      this.renderer.render(this.scene, this.camera)
      this.rafId = requestAnimationFrame(tick)
    }
    this.rafId = requestAnimationFrame(tick)
  }

  /** Render one frame now (reduced motion, or after a change while paused). */
  render(): void {
    if (this.disposed) return
    if (this.reduced) this.update(this.t, 0)
    this.renderer.render(this.scene, this.camera)
  }

  /** Window coordinates (relative to the canvas) of a world point, e.g. for an HTML label. */
  toScreen(p: THREE.Vector3): { x: number; y: number } {
    const v = p.clone().project(this.camera)
    const rect = this.canvas.getBoundingClientRect()
    return { x: ((v.x + 1) / 2) * rect.width, y: ((1 - v.y) / 2) * rect.height }
  }

  dispose(): void {
    this.disposed = true
    this.running = false
    cancelAnimationFrame(this.rafId)
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh
      m.geometry?.dispose?.()
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : []
      mats.forEach((x) => x.dispose())
    })
    this.renderer.dispose()
  }
}

/** Flat-shaded standard material (the low-poly look shared with the word garden). */
export const flat = (color: string, extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...extra })

/** 0..1 progress of an effect that started at `start` and lasts `duration` seconds. */
export const progress = (t: number, start: number, duration: number): number =>
  Math.min(1, Math.max(0, (t - start) / duration))

/** Ease-out with a small overshoot (bounce-in). */
export const easeOutBack = (k: number, c = 1.7): number =>
  k <= 0 ? 0 : 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2)

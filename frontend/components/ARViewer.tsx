'use client'

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js'
import {
  ChevronLeft,
  Box,
  Check,
  AlertCircle,
  RotateCcw,
  ImageOff,
  Camera,
  Crosshair,
  X,
} from 'lucide-react'
import type { Product } from '../lib/api'

// orbit: 3D preview. ar: WebXR on the table. camera: the dish drawn over the
// live camera and steered by motion sensors, for phones with no system AR.
type Mode = 'orbit' | 'ar' | 'camera'

// Where the dish sits in the camera view: 60 cm ahead of the phone and 35 cm
// below it, roughly a plate on a table seen from a seated guest's hand.
const CAMERA_VIEW_DISTANCE = 0.6
const CAMERA_VIEW_DROP = 0.35
// Phone rear cameras cover roughly this many degrees across their long side.
const PHONE_CAMERA_LONG_FOV = 63

const noSubscribe = () => () => undefined

/** iPhone and iPad Safari open rel="ar" links in AR Quick Look. */
function supportsQuickLook(): boolean {
  const link = document.createElement('a')
  return Boolean(link.relList?.supports?.('ar'))
}

/** A touch device that can open a camera stream. */
function supportsCameraView(): boolean {
  return (
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    window.matchMedia('(pointer: coarse)').matches
  )
}

function describeCameraFailure(err: unknown): { message: string; detail: string } {
  const name = err instanceof Error ? err.name : 'Error'
  const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
  switch (name) {
    case 'NotAllowedError':
      return {
        message: 'Camera access was declined. Allow the camera for this site, then tap again.',
        detail,
      }
    case 'NotFoundError':
    case 'OverconstrainedError':
      return { message: 'No usable camera was found on this device.', detail }
    case 'NotReadableError':
      return { message: 'Another app is using the camera. Close it, then try again.', detail }
    default:
      return { message: 'The camera view could not start. The 3D preview still works.', detail }
  }
}

interface ARViewerProps {
  product: Product
  slug: string
}

/**
 * Turns a failed AR start into something a guest can act on, plus the raw
 * browser error for whoever is debugging from a screenshot.
 */
function describeArFailure(err: unknown): { message: string; detail: string } {
  const name = err instanceof DOMException || err instanceof Error ? err.name : 'Error'
  const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
  switch (name) {
    case 'NotAllowedError':
      return {
        message: 'Camera access was declined or AR was cancelled. Allow the camera for this site, then tap again.',
        detail,
      }
    case 'NotSupportedError':
      return {
        message:
          'This phone could not start AR. Check that Google Play Services for AR is installed and up to date, then try again.',
        detail,
      }
    case 'SecurityError':
      return { message: 'AR has to start from a tap. Tap View on your table again.', detail }
    case 'InvalidStateError':
      return { message: 'An AR session is already open. Close it, then try again.', detail }
    default:
      return { message: 'AR could not start on this device. The 3D preview still works.', detail }
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Frees every GPU resource a loaded glTF holds. Three does not do this for
 * you, and without it each visit to this route leaks a full model's worth of
 * geometry and textures.
 */
function disposeObject(root: THREE.Object3D): void {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.geometry?.dispose()
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const material of materials) {
      if (!material) continue
      for (const value of Object.values(material)) {
        if (value && (value as THREE.Texture).isTexture) (value as THREE.Texture).dispose()
      }
      material.dispose()
    }
  })
}

export default function ARViewer({ product, slug }: ARViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  // The details sheet over the bottom of the canvas, measured so the dish is
  // framed in the part of the screen the sheet leaves visible.
  const sheetRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Camera view. The render loop is created once, so it reads these refs.
  const modeRef = useRef<Mode>('orbit')
  const streamRef = useRef<MediaStream | null>(null)
  const orientationRef = useRef<{ alpha: number; beta: number; gamma: number } | null>(null)
  const cameraPlacedRef = useRef(false)
  const cameraStartedAtRef = useRef(0)
  const motionTimerRef = useRef<number | undefined>(undefined)
  const savedOrbitRef = useRef<{
    position: THREE.Vector3
    quaternion: THREE.Quaternion
    fov: number
  } | null>(null)
  const placeInFrontRef = useRef<() => void>(() => undefined)
  const quickLookUrlRef = useRef<string | null>(null)

  const quickLook = useSyncExternalStore(noSubscribe, supportsQuickLook, () => false)
  const cameraCapable = useSyncExternalStore(noSubscribe, supportsCameraView, () => false)

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const modelRef = useRef<THREE.Object3D | null>(null)
  const reticleRef = useRef<THREE.Mesh | null>(null)
  const sessionRef = useRef<XRSession | null>(null)
  const hitTestSourceRef = useRef<XRHitTestSource | null>(null)
  // 'full' asks for surface detection; 'basic' starts AR without requiring it.
  // Once a phone refuses 'full', later taps go straight to 'basic'.
  const arConfigRef = useRef<'full' | 'basic'>('full')
  // Set when the session has no surface detection: the dish is placed a fixed
  // distance in front of the camera instead of on a detected table.
  const freePlacementRef = useRef(false)

  /**
   * Model-space size of the model's largest horizontal dimension. Every target
   * size is divided by this to get a scale factor, so it must be applied
   * consistently — the previous build normalised on load but not when the
   * guest changed size, which made the model jump to a nonsense scale.
   */
  // Zero until a model has been measured, so a size picked before loading
  // finishes is not divided by a made-up footprint.
  const baseSizeRef = useRef(0)
  const targetScaleRef = useRef(1)

  const [mode, setMode] = useState<Mode>('orbit')
  const [arSupported, setArSupported] = useState(false)
  const [modelState, setModelState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadProgress, setLoadProgress] = useState(0)
  const [sizeIndex, setSizeIndex] = useState(0)
  // Read by the loader callback, which is created once and would otherwise
  // only ever see the first size.
  const sizeIndexRef = useRef(0)
  const [surfaceFound, setSurfaceFound] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const [placed, setPlaced] = useState(false)
  const [freePlacement, setFreePlacement] = useState(false)
  const [arError, setArError] = useState('')
  const [arErrorDetail, setArErrorDetail] = useState('')
  const [coveredPx, setCoveredPx] = useState(0)
  const [motionAvailable, setMotionAvailable] = useState(true)
  const [quickLookReady, setQuickLookReady] = useState(false)

  const switchMode = useCallback((next: Mode) => {
    modeRef.current = next
    setMode(next)
  }, [])

  // Kept stable so the same function can be added and removed as a listener.
  const onOrientation = useRef((event: DeviceOrientationEvent) => {
    if (event.alpha === null && event.beta === null && event.gamma === null) return
    const rad = THREE.MathUtils.degToRad
    orientationRef.current = {
      alpha: rad(event.alpha ?? 0),
      beta: rad(event.beta ?? 0),
      gamma: rad(event.gamma ?? 0),
    }
  }).current

  const sizes = product.sizes
  const selected = sizes[sizeIndex]

  /** Metres of real-world width the current selection represents. */
  const targetMetres = useCallback(
    (index: number) => {
      const cm = sizes[index]?.cm ?? product.diameter_cm ?? 20
      return cm / 100
    },
    [sizes, product.diameter_cm]
  )

  // ── WebXR capability probe ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    const xr = (navigator as Navigator & { xr?: XRSystem }).xr
    if (!xr) return
    void xr
      .isSessionSupported('immersive-ar')
      .then((supported) => {
        if (!cancelled) setArSupported(supported)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  // ── Scene setup: runs once, tears down fully on unmount ────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !product.model_url) return

    const reduceMotion = prefersReducedMotion()

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.xr.enabled = true
    rendererRef.current = renderer

    const scene = new THREE.Scene()
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(
      55,
      canvas.clientWidth / Math.max(canvas.clientHeight, 1),
      0.01,
      100
    )
    camera.position.set(0, 0.25, 0.7)
    cameraRef.current = camera

    scene.add(new THREE.AmbientLight(0xffffff, 1.4))
    const key = new THREE.DirectionalLight(0xfff5e0, 2.4)
    key.position.set(2, 4, 2)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xcfd9ff, 0.6)
    fill.position.set(-2, 1, -2)
    scene.add(fill)

    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 0.15
    controls.maxDistance = 4
    controls.enablePan = false
    // Auto-rotation is decorative; honour the OS reduced-motion setting.
    controls.autoRotate = !reduceMotion
    controls.autoRotateSpeed = 1.1
    controlsRef.current = controls

    // Placement reticle, only shown during an AR session.
    const reticleGeometry = new THREE.RingGeometry(0.07, 0.09, 32)
    reticleGeometry.rotateX(-Math.PI / 2)
    const reticle = new THREE.Mesh(
      reticleGeometry,
      new THREE.MeshBasicMaterial({
        color: 0xd4820a,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      })
    )
    reticle.visible = false
    reticle.matrixAutoUpdate = false
    scene.add(reticle)
    reticleRef.current = reticle

    let disposed = false

    const loader = new GLTFLoader()
    loader.load(
      product.model_url,
      (gltf) => {
        if (disposed) {
          disposeObject(gltf.scene)
          return
        }
        const model = gltf.scene

        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3())
        const centre = box.getCenter(new THREE.Vector3())

        // Recentre on the origin so it rotates about itself and sits on the
        // reticle rather than floating relative to it.
        model.position.sub(centre)
        model.position.y += size.y / 2

        // A dish is described by how wide it is on the table, so normalise on
        // the horizontal footprint rather than overall height.
        const horizontal = Math.max(size.x, size.z) || Math.max(size.x, size.y, size.z) || 1
        baseSizeRef.current = horizontal

        const scale = targetMetres(sizeIndexRef.current) / horizontal
        targetScaleRef.current = scale

        // Scale lives on the pivot and nowhere else. The recentring offset
        // above is in the model's own units, so it has to sit inside the scaled
        // group to shrink with the geometry. Scaling the model as well, as this
        // used to, squared the factor: a 22 cm pizza authored in centimetres
        // rendered at a third of a millimetre and the viewer looked empty.
        const pivot = new THREE.Group()
        pivot.add(model)
        pivot.scale.setScalar(scale)
        scene.add(pivot)
        modelRef.current = pivot

        controls.autoRotate = !reduceMotion
        setModelState('ready')
      },
      (event) => {
        if (event.total > 0) setLoadProgress(Math.round((event.loaded / event.total) * 100))
      },
      () => {
        if (!disposed) setModelState('error')
      }
    )

    // Reused every frame for free placement rather than allocated per frame.
    const viewerMatrix = new THREE.Matrix4()
    const aheadPoint = new THREE.Vector3()

    // Device orientation to camera rotation: the standard mapping from the W3C
    // DeviceOrientation frame to three.js. Objects are reused, not reallocated.
    const zee = new THREE.Vector3(0, 0, 1)
    const euler = new THREE.Euler()
    const screenTwist = new THREE.Quaternion()
    const worldToCamera = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5))
    const deviceQuaternion = new THREE.Quaternion()
    const forward = new THREE.Vector3()

    placeInFrontRef.current = () => {
      const pivot = modelRef.current
      if (!pivot) return
      camera.getWorldDirection(forward)
      forward.y = 0
      if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1)
      forward.normalize()
      pivot.position.set(
        forward.x * CAMERA_VIEW_DISTANCE,
        -CAMERA_VIEW_DROP,
        forward.z * CAMERA_VIEW_DISTANCE
      )
      // Turn the dish to face the guest.
      pivot.rotation.set(0, Math.atan2(forward.x, forward.z) + Math.PI, 0)
      cameraPlacedRef.current = true
    }

    renderer.setAnimationLoop((_time, frame) => {
      const model = modelRef.current

      // Ease toward the selected size instead of snapping.
      if (model) {
        const current = model.scale.x
        const target = targetScaleRef.current
        if (Math.abs(current - target) > 1e-5) {
          model.scale.setScalar(
            reduceMotion ? target : current + (target - current) * 0.12
          )
        }
      }

      if (frame && sessionRef.current) {
        const source = hitTestSourceRef.current
        const referenceSpace = renderer.xr.getReferenceSpace()
        if (source && referenceSpace && reticleRef.current) {
          const hits = frame.getHitTestResults(source)
          if (hits.length > 0) {
            const pose = hits[0].getPose(referenceSpace)
            if (pose) {
              reticleRef.current.visible = true
              reticleRef.current.matrix.fromArray(pose.transform.matrix)
              setSurfaceFound(true)
            }
          } else {
            reticleRef.current.visible = false
          }
        } else if (freePlacementRef.current && referenceSpace && reticleRef.current) {
          // No surface detection on this phone. Hold the ring 60 cm ahead of
          // and 25 cm below the camera, level with the ground, so the guest can
          // still put the dish in the room by holding the phone over the table.
          const viewer = frame.getViewerPose(referenceSpace)
          if (viewer) {
            viewerMatrix.fromArray(viewer.transform.matrix)
            aheadPoint.set(0, -0.25, -0.6).applyMatrix4(viewerMatrix)
            reticleRef.current.matrix.makeTranslation(aheadPoint.x, aheadPoint.y, aheadPoint.z)
            reticleRef.current.visible = true
            setSurfaceFound(true)
          }
        }
      } else if (modeRef.current === 'camera') {
        const o = orientationRef.current
        if (o) {
          const screenAngle = THREE.MathUtils.degToRad(window.screen.orientation?.angle ?? 0)
          euler.set(o.beta, o.alpha, -o.gamma, 'YXZ')
          deviceQuaternion.setFromEuler(euler)
          deviceQuaternion.multiply(worldToCamera)
          deviceQuaternion.multiply(screenTwist.setFromAxisAngle(zee, -screenAngle))
          // Smooth out sensor jitter.
          camera.quaternion.slerp(deviceQuaternion, 0.3)
        }
        // Place the dish once the first reading has turned the camera, or after
        // a short wait on phones that never send one.
        if (
          !cameraPlacedRef.current &&
          (o || performance.now() - cameraStartedAtRef.current > 1200)
        ) {
          placeInFrontRef.current()
        }
      } else {
        controls.update()
      }

      renderer.render(scene, camera)
    })

    const resize = new ResizeObserver(() => {
      if (renderer.xr.isPresenting) return
      const width = canvas.clientWidth
      const height = Math.max(canvas.clientHeight, 1)
      camera.aspect = width / height
      // The details sheet covers the bottom of the canvas and grows with size
      // buttons, long descriptions and error messages. Drawn at the centre of
      // the full canvas, the dish ended up hidden behind it on phones. Shift
      // the view down by half the covered height so the dish sits in the middle
      // of what is still visible. Capped so a very tall sheet cannot push the
      // dish off the top.
      const covered = Math.min(sheetRef.current?.offsetHeight ?? 0, height * 0.6)
      camera.setViewOffset(width, height, 0, covered / 2, width, height)
      // The camera feed shifts by the same amount so the dish stays aligned
      // with the room behind it.
      setCoveredPx(covered)
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    })
    resize.observe(canvas)
    if (sheetRef.current) resize.observe(sheetRef.current)

    return () => {
      disposed = true
      resize.disconnect()
      renderer.setAnimationLoop(null)

      hitTestSourceRef.current?.cancel?.()
      hitTestSourceRef.current = null
      void sessionRef.current?.end().catch(() => undefined)
      sessionRef.current = null

      window.removeEventListener('deviceorientation', onOrientation)
      window.clearTimeout(motionTimerRef.current)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      if (quickLookUrlRef.current) URL.revokeObjectURL(quickLookUrlRef.current)
      quickLookUrlRef.current = null

      controls.dispose()
      if (modelRef.current) {
        disposeObject(modelRef.current)
        scene.remove(modelRef.current)
        modelRef.current = null
      }
      reticleGeometry.dispose()
      ;(reticle.material as THREE.Material).dispose()
      renderer.dispose()

      rendererRef.current = null
      sceneRef.current = null
      cameraRef.current = null
      controlsRef.current = null
      reticleRef.current = null
    }
    // Re-running this would rebuild the whole scene; the model URL is the only
    // input that could change and it is fixed for the lifetime of the route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.model_url])

  // Size changes only adjust the target scale; the loop eases toward it.
  useEffect(() => {
    sizeIndexRef.current = sizeIndex
    if (!baseSizeRef.current) return
    targetScaleRef.current = targetMetres(sizeIndex) / baseSizeRef.current
  }, [sizeIndex, targetMetres])

  // ── AR session ─────────────────────────────────────────────────────────────
  const startAR = useCallback(async () => {
    const renderer = rendererRef.current
    const xr = (navigator as Navigator & { xr?: XRSystem }).xr
    if (!renderer || !xr || !overlayRef.current) return

    setArError('')
    setArErrorDetail('')
    let session: XRSession | null = null
    try {
      const root = overlayRef.current
      const request = (config: 'full' | 'basic') =>
        xr.requestSession('immersive-ar', {
          ...(config === 'full'
            ? { requiredFeatures: ['hit-test'], optionalFeatures: ['dom-overlay'] }
            : { optionalFeatures: ['hit-test', 'dom-overlay'] }),
          // Without a domOverlay root the whole control panel (price, sizes,
          // exit button) is invisible for the entire AR session.
          domOverlay: { root },
        })

      let active: XRSession
      try {
        active = await request(arConfigRef.current)
      } catch (err) {
        // Some phones run AR but refuse a session that requires surface
        // detection. Try once more without requiring it.
        if (arConfigRef.current !== 'full' || !(err instanceof DOMException) || err.name !== 'NotSupportedError') {
          throw err
        }
        arConfigRef.current = 'basic'
        active = await request('basic')
      }
      session = active

      sessionRef.current = active
      setMode('ar')
      setSurfaceFound(false)
      setPlaced(false)

      // three.js asks for a 'local-floor' reference space by default, and a
      // phone only grants that when it was requested with the session. It was
      // not, so on phones that enforce this the session opened and then failed
      // straight away with a generic error. 'local' comes with every immersive
      // session, and hit-test poses in it are all a table needs.
      renderer.xr.setReferenceSpaceType('local')
      await renderer.xr.setSession(active)

      let source: XRHitTestSource | null = null
      const enabled = (active as XRSession & { enabledFeatures?: readonly string[] }).enabledFeatures
      if (!enabled || enabled.includes('hit-test')) {
        try {
          const viewerSpace = await active.requestReferenceSpace('viewer')
          source = (await active.requestHitTestSource?.({ space: viewerSpace })) ?? null
        } catch {
          // Surface detection was not granted; fall back to free placement.
          source = null
        }
      }
      hitTestSourceRef.current = source
      freePlacementRef.current = !source
      setFreePlacement(!source)

      if (modelRef.current) modelRef.current.visible = false

      const onSelect = () => {
        const model = modelRef.current
        const reticle = reticleRef.current
        if (!model || !reticle?.visible) return
        // Decompose the reticle's pose so the dish lands flat on the detected
        // surface, facing the guest.
        const position = new THREE.Vector3()
        const quaternion = new THREE.Quaternion()
        const scale = new THREE.Vector3()
        reticle.matrix.decompose(position, quaternion, scale)
        model.position.copy(position)
        model.quaternion.copy(quaternion)
        model.visible = true
        setPlaced(true)
      }

      const onEnd = () => {
        hitTestSourceRef.current?.cancel?.()
        hitTestSourceRef.current = null
        sessionRef.current = null
        if (reticleRef.current) reticleRef.current.visible = false
        if (modelRef.current) {
          modelRef.current.visible = true
          modelRef.current.position.set(0, 0, 0)
          modelRef.current.quaternion.identity()
        }
        freePlacementRef.current = false
        setFreePlacement(false)
        setMode('orbit')
        setPlaced(false)
        setSurfaceFound(false)
        active.removeEventListener('select', onSelect)
        active.removeEventListener('end', onEnd)
      }

      active.addEventListener('select', onSelect)
      active.addEventListener('end', onEnd)
    } catch (err) {
      // If the session opened but a later step failed, close it. A session
      // left running blocks the next attempt with InvalidStateError.
      if (session) await session.end().catch(() => undefined)
      setMode('orbit')
      sessionRef.current = null
      const { message, detail } = describeArFailure(err)
      console.error('AR start failed:', detail)
      const unsupported =
        arConfigRef.current === 'basic' && err instanceof DOMException && err.name === 'NotSupportedError'
      if (unsupported) {
        // Refused even without surface detection: this browser on this phone
        // cannot run AR at all. Stop offering a button that cannot work.
        setArSupported(false)
        setArError(
          "This phone's browser can't lock the dish to your table, which needs Google Play Services for AR. You can still see it through your camera."
        )
      } else {
        setArError(message)
      }
      setArErrorDetail(detail)
    }
  }, [])

  const exitCameraView = useCallback(() => {
    window.removeEventListener('deviceorientation', onOrientation)
    window.clearTimeout(motionTimerRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null

    const camera = cameraRef.current
    const controls = controlsRef.current
    const pivot = modelRef.current
    const saved = savedOrbitRef.current
    if (camera && saved) {
      camera.position.copy(saved.position)
      camera.quaternion.copy(saved.quaternion)
      camera.fov = saved.fov
      camera.updateProjectionMatrix()
    }
    if (pivot) {
      pivot.position.set(0, 0, 0)
      pivot.rotation.set(0, 0, 0)
    }
    if (controls) {
      controls.enabled = true
      controls.autoRotate = !prefersReducedMotion()
      controls.update()
    }
    switchMode('orbit')
  }, [onOrientation, switchMode])

  const startCameraView = useCallback(async () => {
    const video = videoRef.current
    const camera = cameraRef.current
    const controls = controlsRef.current
    const canvas = canvasRef.current
    if (!video || !camera || !controls || !canvas || !modelRef.current) return

    setArError('')
    setArErrorDetail('')
    try {
      // iOS gates motion sensors behind a prompt; Android does not.
      const orientationEvent = window.DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<string>
      }
      if (typeof orientationEvent?.requestPermission === 'function') {
        await orientationEvent.requestPermission().catch(() => 'denied')
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      video.srcObject = stream
      await video.play()
    } catch (err) {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      const { message, detail } = describeCameraFailure(err)
      console.error('Camera view failed:', detail)
      setArError(message)
      setArErrorDetail(detail)
      return
    }

    savedOrbitRef.current = {
      position: camera.position.clone(),
      quaternion: camera.quaternion.clone(),
      fov: camera.fov,
    }
    controls.enabled = false
    controls.autoRotate = false
    camera.position.set(0, 0, 0)
    camera.quaternion.identity()

    // Match the virtual camera to the part of the feed that is on screen, so
    // the dish is drawn at roughly the size the real lens would show it.
    const vw = video.videoWidth || 720
    const vh = video.videoHeight || 1280
    const sw = canvas.clientWidth
    const sh = Math.max(canvas.clientHeight, 1)
    const tanHalf = (deg: number) => Math.tan(THREE.MathUtils.degToRad(deg) / 2)
    const videoVerticalFov =
      vh >= vw
        ? PHONE_CAMERA_LONG_FOV
        : THREE.MathUtils.radToDeg(2 * Math.atan(tanHalf(PHONE_CAMERA_LONG_FOV) * (vh / vw)))
    const coverScale = Math.max(sw / vw, sh / vh)
    const visibleFraction = sh / (vh * coverScale)
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(tanHalf(videoVerticalFov) * visibleFraction))
    camera.updateProjectionMatrix()

    orientationRef.current = null
    cameraPlacedRef.current = false
    cameraStartedAtRef.current = performance.now()
    window.addEventListener('deviceorientation', onOrientation)
    setMotionAvailable(true)
    motionTimerRef.current = window.setTimeout(() => {
      if (!orientationRef.current) setMotionAvailable(false)
    }, 1500)
    switchMode('camera')
  }, [onOrientation, switchMode])

  // iPhone: export the dish at the selected size as USDZ for AR Quick Look.
  // Done ahead of the tap, because Safari only opens Quick Look straight from a
  // tap, not from one that first waited on an export.
  useEffect(() => {
    if (!quickLook || modelState !== 'ready') return
    const pivot = modelRef.current
    if (!pivot) return
    let cancelled = false
    const build = async () => {
      setQuickLookReady(false)
      const shown = pivot.scale.x
      pivot.scale.setScalar(targetScaleRef.current)
      pivot.updateMatrixWorld(true)
      try {
        const data = await new USDZExporter().parseAsync(pivot, {
          quickLookCompatible: true,
          ar: { anchoring: { type: 'plane' }, planeAnchoring: { alignment: 'horizontal' } },
        })
        if (cancelled) return
        if (quickLookUrlRef.current) URL.revokeObjectURL(quickLookUrlRef.current)
        quickLookUrlRef.current = URL.createObjectURL(
          new Blob([data as unknown as BlobPart], { type: 'model/vnd.usdz+zip' })
        )
        setQuickLookReady(true)
      } catch (err) {
        if (!cancelled) {
          console.error('USDZ export failed:', err)
          setArError('This dish could not be prepared for AR on iPhone. The 3D preview still works.')
          setArErrorDetail(err instanceof Error ? `${err.name}: ${err.message}` : String(err))
        }
      } finally {
        pivot.scale.setScalar(shown)
      }
    }
    void build()
    return () => {
      cancelled = true
    }
  }, [quickLook, modelState, sizeIndex])

  function openQuickLook() {
    const url = quickLookUrlRef.current
    if (!url) return
    const link = document.createElement('a')
    link.setAttribute('rel', 'ar')
    // Fixed scale: the point is to see the dish at its real size.
    link.href = `${url}#allowsContentScaling=0`
    // Quick Look only recognises the link when it wraps an image.
    link.appendChild(document.createElement('img'))
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  function exitAR() {
    void sessionRef.current?.end().catch(() => undefined)
  }

  // ── No model ───────────────────────────────────────────────────────────────
  if (!product.model_url) {
    return (
      <main id="main" tabIndex={-1} className="on-dark fixed inset-0 flex flex-col bg-menu-bg">
        <Link
          href={`/r/${slug}`}
          className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-2 text-sm text-menu-ink backdrop-blur"
        >
          <ChevronLeft size={16} aria-hidden />
          Menu
        </Link>

        <div className="relative flex-1">
          {product.image_url && !imageFailed ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-contain p-8"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <ImageOff size={64} className="text-menu-ink-subtle" aria-hidden />
            </span>
          )}
        </div>

        <div className="rounded-t-3xl bg-menu-surface/95 p-6 backdrop-blur">
          <h1 className="font-display text-2xl font-bold text-menu-ink">{product.name}</h1>
          {product.description && (
            <p className="mt-1 text-sm text-menu-ink-muted">{product.description}</p>
          )}
          <p className="mt-4 rounded-full bg-white/[0.06] py-2.5 text-center text-sm text-menu-ink-muted">
            No 3D model for this dish yet
          </p>
        </div>
      </main>
    )
  }

  return (
    <main id="main" tabIndex={-1} className="on-dark fixed inset-0 overflow-hidden bg-menu-bg">
      <video
        ref={videoRef}
        playsInline
        muted
        aria-hidden
        className={`absolute inset-0 h-full w-full object-cover ${mode === 'camera' ? '' : 'hidden'}`}
        style={{ transform: `translateY(${-coveredPx / 2}px)` }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ background: mode === 'orbit' ? '#0E0C0A' : 'transparent' }}
      />

      {/* This subtree is handed to WebXR as the DOM overlay, so it stays
          visible and interactive during the AR session. Touches pass through it
          to the canvas except on its own controls: covering the canvas outright
          meant "Drag to rotate" never reached the 3D controls. */}
      <div
        ref={overlayRef}
        className="pointer-events-none absolute inset-0 [&_a]:pointer-events-auto [&_button]:pointer-events-auto"
      >
        {mode === 'camera' ? (
          <button
            type="button"
            onClick={exitCameraView}
            className="absolute left-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-2 text-sm text-menu-ink backdrop-blur"
          >
            <X size={16} aria-hidden />
            Close camera
          </button>
        ) : mode === 'ar' ? (
          <button
            type="button"
            onClick={exitAR}
            className="absolute left-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-2 text-sm text-menu-ink backdrop-blur"
          >
            <ChevronLeft size={16} aria-hidden />
            Exit AR
          </button>
        ) : (
          <Link
            href={`/r/${slug}`}
            className="absolute left-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-2 text-sm text-menu-ink backdrop-blur"
          >
            <ChevronLeft size={16} aria-hidden />
            Menu
          </Link>
        )}

        <p
          className="absolute right-4 top-4 z-20 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold backdrop-blur"
          style={{ color: mode === 'orbit' ? undefined : 'var(--accent)' }}
        >
          <span className={mode === 'orbit' ? 'text-menu-ink-muted' : ''}>
            {mode === 'ar' ? 'AR' : mode === 'camera' ? 'Camera view' : '3D preview'}
          </span>
        </p>

        {mode === 'camera' && (
          <p
            role="status"
            className="absolute inset-x-4 top-16 z-20 rounded-2xl bg-black/60 px-4 py-2.5 text-center text-sm text-menu-ink backdrop-blur"
          >
            {motionAvailable
              ? "Point your phone down at the table. The dish follows your phone's movement, so its size is approximate."
              : "This phone's motion sensors aren't available, so the dish stays in the middle of the view. Its size is approximate."}
          </p>
        )}

        {modelState === 'loading' && (
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
            <span className="spinner spinner-lg" style={{ color: '#D4820A' }} aria-hidden />
            <p role="status" className="text-sm text-menu-ink-muted">
              Loading model{loadProgress > 0 ? ` ${loadProgress}%` : '…'}
            </p>
          </div>
        )}

        {modelState === 'error' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <AlertCircle size={32} className="text-critical-on" aria-hidden />
            <p className="font-display text-lg font-bold text-menu-ink">
              This model wouldn&apos;t load
            </p>
            <p className="max-w-xs text-sm text-menu-ink-muted">
              It may still be uploading, or your connection dropped.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn btn-accent-dark mt-2"
            >
              <RotateCcw size={16} aria-hidden />
              Try again
            </button>
          </div>
        )}

        {mode === 'ar' && !surfaceFound && (
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-4">
            <div className="relative flex items-center justify-center">
              <span
                className="pulse-ring absolute h-24 w-24 rounded-full border-2"
                style={{ borderColor: 'var(--accent)' }}
              />
              <span
                className="pulse-ring-delay absolute h-24 w-24 rounded-full border-2"
                style={{ borderColor: 'var(--accent)' }}
              />
              <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/30">
                <Box size={24} style={{ color: 'var(--accent)' }} aria-hidden />
              </span>
            </div>
            <p role="status" className="text-sm text-menu-ink-muted">
              Point your phone at the table
            </p>
          </div>
        )}

        {mode === 'ar' && surfaceFound && !placed && (
          <p
            role="status"
            className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/60 px-4 py-2 text-sm text-menu-ink backdrop-blur"
          >
            <Check size={14} className="mr-1.5 inline" aria-hidden />
            {freePlacement ? 'Hold your phone over the table, then tap to place' : 'Surface found. Tap to place'}
          </p>
        )}

        <div
          ref={sheetRef}
          className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 rounded-t-3xl border-t border-menu-border bg-menu-bg/92 px-6 pb-8 pt-5 backdrop-blur-xl"
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" aria-hidden />

          <h1 className="font-display text-xl font-bold text-menu-ink">{product.name}</h1>
          {product.description && (
            <p className="mt-1 line-clamp-2 text-sm text-menu-ink-muted">{product.description}</p>
          )}

          {sizes.length > 1 && (
            <fieldset className="mt-4">
              <legend className="sr-only">Choose a size</legend>
              <div className="scrollbar-hide flex gap-2 overflow-x-auto">
                {sizes.map((size, index) => {
                  const active = index === sizeIndex
                  return (
                    <button
                      key={size.label}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSizeIndex(index)}
                      className={`flex min-w-[72px] shrink-0 flex-col items-center rounded-xl px-4 py-2.5 transition-colors ${
                        active ? '' : 'border border-menu-border bg-white/[0.06]'
                      }`}
                      style={
                        active
                          ? { background: 'var(--accent)', color: 'var(--accent-on)' }
                          : undefined
                      }
                    >
                      <span className="text-sm font-semibold">{size.label}</span>
                      <span className={`text-xs ${active ? 'opacity-80' : 'text-menu-ink-muted'}`}>
                        {size.cm} cm
                      </span>
                    </button>
                  )
                })}
              </div>
            </fieldset>
          )}

          {arError && (
            <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm text-critical-on">
              <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden />
              <span>
                {arError}
                {arErrorDetail && (
                  <span className="mt-1 block font-mono text-2xs text-menu-ink-subtle">
                    {arErrorDetail}
                  </span>
                )}
              </span>
            </p>
          )}

          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="font-mono text-2xl font-bold" style={{ color: 'var(--accent)' }}>
              {selected ? `$${selected.price.toFixed(2)}` : ''}
            </p>

            {mode === 'camera' && (
              <button
                type="button"
                onClick={() => placeInFrontRef.current()}
                className="btn btn-accent-dark"
              >
                <Crosshair size={16} aria-hidden />
                Re-centre dish
              </button>
            )}

            {mode === 'orbit' && modelState === 'ready' && (
              quickLook ? (
                <button
                  type="button"
                  onClick={openQuickLook}
                  disabled={!quickLookReady}
                  className="btn btn-accent-dark"
                >
                  <Box size={16} aria-hidden />
                  {quickLookReady ? 'View on your table' : 'Preparing AR…'}
                </button>
              ) : arSupported ? (
                <button type="button" onClick={() => void startAR()} className="btn btn-accent-dark">
                  <Box size={16} aria-hidden />
                  View on your table
                </button>
              ) : cameraCapable ? (
                <button
                  type="button"
                  onClick={() => void startCameraView()}
                  className="btn btn-accent-dark"
                >
                  <Camera size={16} aria-hidden />
                  View through camera
                </button>
              ) : (
                <p className="max-w-[55%] text-right text-xs text-menu-ink-muted">
                  Drag to rotate. This browser can&apos;t show the dish through a camera.{' '}
                  <Link
                    href="/help#ar-devices"
                    className="rounded-sm text-menu-ink underline underline-offset-2 hover:decoration-2"
                  >
                    Why?
                  </Link>
                </p>
              )
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

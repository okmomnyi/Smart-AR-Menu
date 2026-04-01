'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { getMenu, Product, SizeEntry } from '../../../../../lib/api'

export default function ARViewerPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const productId = params.productId as string

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<unknown>(null)
  const sceneRef = useRef<unknown>(null)
  const modelRef = useRef<unknown>(null)
  const frameRef = useRef<number>(0)
  const xrSessionRef = useRef<XRSession | null>(null)
  const hitTestSourceRef = useRef<XRHitTestSource | null>(null)
  const ringRef = useRef<unknown>(null)
  const targetScaleRef = useRef<number>(1)

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [arSupported, setArSupported] = useState(false)
  const [surfaceDetected, setSurfaceDetected] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastFading, setToastFading] = useState(false)
  const [selectedSizeIndex, setSelectedSizeIndex] = useState(0)
  const [mode, setMode] = useState<'checking' | 'ar-ready' | 'ar' | 'fallback' | 'no-model'>('checking')
  const [modelPlaced, setModelPlaced] = useState(false)

  // Fetch product + check WebXR support
  useEffect(() => {
    async function load() {
      try {
        const data = await getMenu(slug)
        const found = data.categories.flatMap((c) => c.products).find((p) => p.id === productId)
        if (!found) throw new Error('Product not found')
        setProduct(found)
        if (!found.model_url) {
          setMode('no-model')
          setLoading(false)
          return
        }
        if (typeof navigator !== 'undefined' && 'xr' in navigator) {
          try {
            const supported = await (navigator.xr as XRSystem).isSessionSupported('immersive-ar')
            setArSupported(supported)
          } catch {
            // AR not supported
          }
        }
        // Always start in 3D fallback — no camera permission asked upfront
        setMode('fallback')
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product')
        setLoading(false)
      }
    }
    load()
  }, [slug, productId])

  function computeScale(prod: Product, sizeIndex: number): number {
    const sizes: SizeEntry[] = prod.sizes
    const targetCm = sizes[sizeIndex]?.cm ?? prod.diameter_cm ?? 20
    return targetCm / 100
  }

  function showSurfaceToast() {
    setShowToast(true)
    setToastFading(false)
    setTimeout(() => setToastFading(true), 2000)
    setTimeout(() => setShowToast(false), 2700)
  }

  const initFallback3D = useCallback(async (prod: Product) => {
    if (!canvasRef.current) return

    const THREE = await import('three')
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
    const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')

    const canvas = canvasRef.current
    const w = canvas.clientWidth
    const h = canvas.clientHeight

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    rendererRef.current = renderer

    const scene = new THREE.Scene()
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(60, w / h, 0.01, 100)
    camera.position.set(0, 0.3, 0.8)

    const ambient = new THREE.AmbientLight(0xffffff, 1.2)
    scene.add(ambient)
    const dirLight = new THREE.DirectionalLight(0xfff5e0, 2)
    dirLight.position.set(2, 4, 2)
    scene.add(dirLight)

    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 0.1
    controls.maxDistance = 5
    controls.autoRotate = true
    controls.autoRotateSpeed = 1.2

    const loader = new GLTFLoader()
    loader.load(prod.model_url!, (gltf) => {
      const model = gltf.scene
      const bbox = new THREE.Box3().setFromObject(model)
      const size = bbox.getSize(new THREE.Vector3())
      const center = bbox.getCenter(new THREE.Vector3())
      model.position.sub(center)

      const maxDim = Math.max(size.x, size.y, size.z)
      const targetSize = computeScale(prod, selectedSizeIndex)
      const scale = targetSize / maxDim
      model.scale.setScalar(scale)
      targetScaleRef.current = scale

      scene.add(model)
      modelRef.current = model
      controls.autoRotate = false
    })

    function animate() {
      frameRef.current = requestAnimationFrame(animate)
      controls.update()
      if (modelRef.current) {
        const m = modelRef.current as THREE.Object3D
        const current = m.scale.x
        const target = targetScaleRef.current
        if (Math.abs(current - target) > 0.0001) {
          m.scale.setScalar(current + (target - current) * 0.08)
        }
      }
      renderer.render(scene as THREE.Scene, camera)
    }
    animate()

    const resizeObserver = new ResizeObserver(() => {
      const w2 = canvas.clientWidth
      const h2 = canvas.clientHeight
      camera.aspect = w2 / h2
      camera.updateProjectionMatrix()
      renderer.setSize(w2, h2)
    })
    if (containerRef.current) resizeObserver.observe(containerRef.current)
  }, [selectedSizeIndex])

  const initWebXR = useCallback(async (prod: Product) => {
    if (!canvasRef.current) return

    const THREE = await import('three')
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.xr.enabled = true
    renderer.outputColorSpace = THREE.SRGBColorSpace
    rendererRef.current = renderer

    const scene = new THREE.Scene()
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20)

    const ambient = new THREE.AmbientLight(0xffffff, 1)
    scene.add(ambient)
    const dirLight = new THREE.DirectionalLight(0xfff5e0, 2)
    dirLight.position.set(1, 3, 1)
    scene.add(dirLight)

    const ringGeo = new THREE.RingGeometry(0.08, 0.1, 32)
    ringGeo.rotateX(-Math.PI / 2)
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xd4820a, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.visible = false
    scene.add(ring)
    ringRef.current = ring

    const loader = new GLTFLoader()
    let loadedModel: THREE.Object3D | null = null
    let modelScale = computeScale(prod, selectedSizeIndex)

    loader.load(prod.model_url!, (gltf) => {
      const model = gltf.scene
      const bbox = new THREE.Box3().setFromObject(model)
      const size = bbox.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      modelScale = computeScale(prod, selectedSizeIndex) / maxDim
      model.scale.setScalar(modelScale)
      model.visible = false
      scene.add(model)
      loadedModel = model
      modelRef.current = model
      targetScaleRef.current = modelScale
    })

    const xr = navigator.xr as XRSystem
    const session = await xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay'],
    })
    xrSessionRef.current = session
    renderer.xr.setReferenceSpaceType('local')
    await renderer.xr.setSession(session)

    const referenceSpace = await session.requestReferenceSpace('local')
    const viewerSpace = await session.requestReferenceSpace('viewer')
    const hitTestSource = await session.requestHitTestSource!({ space: viewerSpace })
    hitTestSourceRef.current = hitTestSource

    let firstHit = false

    renderer.setAnimationLoop((_time: number, frame?: XRFrame) => {
      if (!frame) return
      const hitTestResults = frame.getHitTestResults(hitTestSource!)
      const ring_ = ring as THREE.Mesh

      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0]
        const pose = hit.getPose(referenceSpace)
        if (pose) {
          ring_.visible = true
          ring_.matrix.fromArray(pose.transform.matrix)
          ring_.matrix.decompose(ring_.position, ring_.quaternion, ring_.scale)
          if (!firstHit) {
            firstHit = true
            setSurfaceDetected(true)
            showSurfaceToast()
          }
        }
      } else {
        ring_.visible = false
      }
      renderer.render(scene as THREE.Scene, camera)
    })

    session.addEventListener('select', () => {
      if (!loadedModel || !ring.visible) return
      const r = ring as THREE.Mesh
      loadedModel.position.copy(r.position)
      loadedModel.quaternion.copy(r.quaternion)
      loadedModel.visible = true
      setModelPlaced(true)
    })

    session.addEventListener('end', () => {
      xrSessionRef.current = null
      renderer.setAnimationLoop(null)
      // Fall back to 3D preview after AR session ends
      setMode('fallback')
    })
  }, [selectedSizeIndex])

  // Auto-start fallback 3D immediately when mode is fallback
  useEffect(() => {
    if (!product || loading) return
    if (mode === 'fallback') initFallback3D(product)
    return () => {
      cancelAnimationFrame(frameRef.current)
    }
  }, [mode, product, loading]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update model scale when size changes
  useEffect(() => {
    if (!product || !modelRef.current) return
    const sizes: SizeEntry[] = product.sizes
    const targetCm = sizes[selectedSizeIndex]?.cm ?? product.diameter_cm ?? 20
    targetScaleRef.current = targetCm / 100
  }, [selectedSizeIndex, product])

  // Called by the single-tap "Enter AR" button — needs user gesture
  const startARSession = useCallback(async () => {
    if (!product) return
    setMode('ar')
    try {
      await initWebXR(product)
    } catch {
      // requestSession failed (user denied camera, etc) — fall back to 3D
      setMode('fallback')
    }
  }, [product, initWebXR])

  const selectedSize = product?.sizes?.[selectedSizeIndex]
  const selectedPrice = selectedSize?.price

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#0E0C0A' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 animate-spin" style={{ borderColor: '#D4820A', borderTopColor: 'transparent' }} />
          <p style={{ color: '#8A7D70', fontFamily: 'DM Sans, sans-serif' }}>Loading…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center px-4" style={{ background: '#0E0C0A' }}>
        <div className="text-center">
          <p className="text-xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#F5F0E8' }}>Error</p>
          <p style={{ color: '#8A7D70', fontFamily: 'DM Sans, sans-serif' }}>{error}</p>
          <button onClick={() => router.back()} className="btn-amber mt-6 px-6 py-2.5 text-sm">Go Back</button>
        </div>
      </div>
    )
  }

  // ── No model ─────────────────────────────────────────────────────────────────
  if (mode === 'no-model' && product) {
    return (
      <div className="fixed inset-0 flex flex-col" style={{ background: '#0E0C0A' }}>
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm"
          style={{ background: 'rgba(0,0,0,0.5)', color: '#F5F0E8', fontFamily: 'DM Sans, sans-serif', backdropFilter: 'blur(8px)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          Menu
        </button>
        <div className="flex-1 relative">
          {product.image_url
            ? <Image src={product.image_url} alt={product.name} fill className="object-contain p-8" />
            : <div className="flex-1 flex items-center justify-center"><svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg></div>
          }
        </div>
        <div className="p-6 rounded-t-3xl" style={{ background: 'rgba(20,18,16,0.95)', backdropFilter: 'blur(20px)' }}>
          <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Playfair Display, serif', color: '#F5F0E8' }}>{product.name}</h2>
          {product.description && <p className="text-sm mb-3 line-clamp-2" style={{ color: '#8A7D70', fontFamily: 'DM Sans, sans-serif' }}>{product.description}</p>}
          <div className="text-center py-2.5 rounded-full text-sm" style={{ background: 'rgba(255,255,255,0.06)', color: '#8A7D70', fontFamily: 'DM Sans, sans-serif' }}>
            No 3D model available for this item
          </div>
        </div>
      </div>
    )
  }

  // ── 3D fallback + active AR ───────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 0, background: mode === 'fallback' ? '#0E0C0A' : 'transparent' }}
      />

      {/* Back */}
      <button
        onClick={() => {
          if (xrSessionRef.current) xrSessionRef.current.end().catch(() => {})
          router.back()
        }}
        className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm"
        style={{ background: 'rgba(0,0,0,0.55)', color: '#F5F0E8', fontFamily: 'DM Sans, sans-serif', backdropFilter: 'blur(10px)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
        Menu
      </button>

      {/* Mode badge */}
      <div
        className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-full text-xs font-semibold"
        style={{ background: 'rgba(0,0,0,0.55)', color: mode === 'ar' ? '#D4820A' : '#8A7D70', fontFamily: 'DM Sans, sans-serif', backdropFilter: 'blur(10px)' }}
      >
        {mode === 'ar' ? 'AR Mode' : '3D Preview'}
      </div>

      {/* AR: scanning ring */}
      {mode === 'ar' && !surfaceDetected && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none gap-4">
          <div className="relative flex items-center justify-center">
            <div className="pulse-ring absolute w-24 h-24 rounded-full border-2" style={{ borderColor: '#D4820A' }} />
            <div className="pulse-ring-delay absolute w-24 h-24 rounded-full border-2" style={{ borderColor: '#D4820A' }} />
            <div className="w-16 h-16 rounded-full border-2 flex items-center justify-center" style={{ borderColor: 'rgba(212,130,10,0.5)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4820A" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
          </div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'DM Sans, sans-serif' }}>
            Move your phone to detect a surface
          </p>
        </div>
      )}

      {/* AR: tap to place */}
      {mode === 'ar' && surfaceDetected && !modelPlaced && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <p className="text-sm px-4 py-2 rounded-full" style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.8)', fontFamily: 'DM Sans, sans-serif', backdropFilter: 'blur(8px)' }}>
            Tap to place
          </p>
        </div>
      )}

      {/* Surface toast */}
      {showToast && (
        <div
          className={`absolute bottom-56 left-1/2 -translate-x-1/2 z-30 px-4 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 ${toastFading ? 'fade-out' : 'fade-in-up'}`}
          style={{ background: 'rgba(212,130,10,0.9)', color: 'white', fontFamily: 'DM Sans, sans-serif', backdropFilter: 'blur(10px)', whiteSpace: 'nowrap' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
          Surface detected
        </div>
      )}

      {/* Bottom product panel */}
      {product && (
        <div
          className="absolute bottom-0 left-0 right-0 z-20 rounded-t-3xl px-6 pt-5 pb-8"
          style={{ background: 'rgba(14,12,10,0.92)', backdropFilter: 'blur(24px)', borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.2)' }} />
          <h2 className="text-xl font-bold mb-1" style={{ fontFamily: 'Playfair Display, serif', color: '#F5F0E8' }}>{product.name}</h2>
          {product.description && (
            <p className="text-sm mb-4 line-clamp-2" style={{ color: '#8A7D70', fontFamily: 'DM Sans, sans-serif' }}>{product.description}</p>
          )}

          {product.sizes.length > 0 && (
            <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
              {product.sizes.map((size, i) => {
                const active = i === selectedSizeIndex
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedSizeIndex(i)}
                    className="flex-shrink-0 flex flex-col items-center px-4 py-2.5 rounded-xl transition-all duration-200"
                    style={{
                      background: active ? 'linear-gradient(135deg, #D4820A, #F0A830)' : 'rgba(255,255,255,0.06)',
                      border: active ? 'none' : '1px solid rgba(255,255,255,0.1)',
                      minWidth: '72px',
                    }}
                  >
                    <span className="text-sm font-semibold" style={{ color: active ? 'white' : '#F5F0E8', fontFamily: 'DM Sans, sans-serif' }}>{size.label}</span>
                    <span className="text-xs" style={{ color: active ? 'rgba(255,255,255,0.8)' : '#8A7D70', fontFamily: 'DM Sans, sans-serif' }}>{size.cm}cm</span>
                  </button>
                )
              })}
            </div>
          )}

          <div className="flex items-center justify-between">
            {selectedPrice !== undefined && (
              <span className="text-2xl font-bold" style={{ fontFamily: 'Space Mono, monospace', color: '#D4820A' }}>
                ${selectedPrice.toFixed(2)}
              </span>
            )}
            {/* Switch to AR if supported but currently in fallback */}
            {mode === 'fallback' && arSupported && (
              <button onClick={startARSession} className="btn-amber px-6 py-2.5 text-sm">
                Enter AR
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader'

/**
 * Continuous barcode scanning.
 *
 * Safari on iOS has no `BarcodeDetector`, so decoding runs in WebAssembly.
 * The wasm binary is served from our own origin (see `scripts/copy_wasm.js`)
 * rather than the default CDN, so the scanner keeps working offline and
 * nothing leaks to a third party.
 */
prepareZXingModule({
  overrides: {
    locateFile: (path: string, prefix: string) =>
      path.endsWith('.wasm') ? '/zxing_reader.wasm' : `${prefix}${path}`,
  },
})

/** Retail symbologies only: fewer formats to try means a faster loop. */
const FORMATS = ['EAN-13', 'EAN-8', 'UPC-A', 'UPC-E'] as const

/** ~12 decode attempts a second is plenty and keeps the phone cool. */
const DECODE_INTERVAL_MS = 80

/** A barcode stays in frame for a while; ignore re-reads of the same code. */
const DUPLICATE_WINDOW_MS = 2500

/**
 * Barcodes get held in the middle of the frame. Decoding only that band is
 * both faster and less prone to picking up a neighbouring package.
 */
const CROP_HEIGHT_RATIO = 0.42
const MAX_DECODE_WIDTH = 900

export type ScannerState = 'idle' | 'starting' | 'scanning' | 'paused' | 'error'

type Options = {
  onDetected: (barcode: string) => void
}

export function useBarcodeScanner({ onDetected }: Options) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)

  const pausedRef = useRef(false)
  const decodingRef = useRef(false)
  const lastHitRef = useRef<{ code: string; at: number } | null>(null)
  const lastAttemptRef = useRef(0)

  /** Kept in a ref so restarting the loop is not tied to render cycles. */
  const onDetectedRef = useRef(onDetected)
  onDetectedRef.current = onDetected

  const [state, setState] = useState<ScannerState>('idle')
  const [error, setError] = useState<string | null>(null)

  const decodeFrame = useCallback(async () => {
    const video = videoRef.current
    if (!video || video.readyState < 2) return

    if (!canvasRef.current) canvasRef.current = document.createElement('canvas')
    const canvas = canvasRef.current
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return

    const sourceWidth = video.videoWidth
    const sourceHeight = video.videoHeight
    if (!sourceWidth || !sourceHeight) return

    const scale = Math.min(1, MAX_DECODE_WIDTH / sourceWidth)
    const cropHeight = sourceHeight * CROP_HEIGHT_RATIO
    const cropTop = (sourceHeight - cropHeight) / 2

    canvas.width = Math.round(sourceWidth * scale)
    canvas.height = Math.round(cropHeight * scale)

    context.drawImage(video, 0, cropTop, sourceWidth, cropHeight, 0, 0, canvas.width, canvas.height)

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

    const results = await readBarcodes(imageData, {
      formats: [...FORMATS],
      /**
       * tryHarder off: on a live stream the next frame arrives in 80ms, so
       * spending 300ms rescuing a blurry one is a bad trade.
       */
      tryHarder: false,
      tryRotate: false,
      tryInvert: false,
      maxNumberOfSymbols: 1,
    })

    const hit = results.find((result) => result.isValid && result.text)
    if (!hit) return

    const now = Date.now()
    const previous = lastHitRef.current
    if (previous && previous.code === hit.text && now - previous.at < DUPLICATE_WINDOW_MS) {
      return
    }

    lastHitRef.current = { code: hit.text, at: now }
    onDetectedRef.current(hit.text)
  }, [])

  const loop = useCallback(() => {
    rafRef.current = requestAnimationFrame(loop)

    if (pausedRef.current || decodingRef.current) return

    const now = performance.now()
    if (now - lastAttemptRef.current < DECODE_INTERVAL_MS) return
    lastAttemptRef.current = now

    decodingRef.current = true
    decodeFrame()
      .catch(() => {
        /* A single unreadable frame is not worth surfacing. */
      })
      .finally(() => {
        decodingRef.current = false
      })
  }, [decodeFrame])

  const start = useCallback(async () => {
    if (streamRef.current) return

    setState('starting')
    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          /** `ideal` rather than `exact`: a laptop webcam should still work. */
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })

      streamRef.current = stream
      const video = videoRef.current
      if (!video) {
        stream.getTracks().forEach((track) => track.stop())
        setError("Impossible d'ouvrir la caméra.")
        return setState('error')
      }

      video.srcObject = stream
      /** Required on iOS, or the video takes over the screen full-screen. */
      video.setAttribute('playsinline', 'true')
      video.muted = true

      /**
       * Deliberately not awaited. Safari can leave this promise pending
       * indefinitely, and hanging the whole scanner on it means the camera
       * never starts at all. The decode loop already skips frames until
       * `readyState` says there is an image to read.
       */
      void video.play().catch(() => {})

      pausedRef.current = false
      setState('scanning')
      rafRef.current = requestAnimationFrame(loop)
    } catch (cause) {
      const name = cause instanceof DOMException ? cause.name : ''
      setError(
        name === 'NotAllowedError'
          ? 'Accès à la caméra refusé. Autorise-le dans les réglages de Safari.'
          : name === 'NotFoundError'
            ? 'Aucune caméra détectée.'
            : window.isSecureContext
              ? "Impossible d'ouvrir la caméra."
              : 'La caméra exige HTTPS.'
      )
      setState('error')
    }
  }, [loop])

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setState('idle')
  }, [])

  /**
   * Pausing stops the decoding, never the stream. Tearing the camera down
   * between two items would cost a second of black screen on every scan — and
   * on iOS, sometimes a fresh permission prompt.
   */
  const pause = useCallback(() => {
    pausedRef.current = true
    setState((current) => (current === 'scanning' ? 'paused' : current))
  }, [])

  const resume = useCallback(() => {
    pausedRef.current = false
    /**
     * The code just dealt with is usually still under the lens, so restart its
     * suppression window from now. Buying the same product twice is handled by
     * the quantity stepper in the dialog, not by scanning it twice.
     */
    if (lastHitRef.current) {
      lastHitRef.current = { ...lastHitRef.current, at: Date.now() }
    }
    setState((current) => (current === 'paused' ? 'scanning' : current))
  }, [])

  useEffect(() => stop, [stop])

  return { videoRef, state, error, start, stop, pause, resume }
}

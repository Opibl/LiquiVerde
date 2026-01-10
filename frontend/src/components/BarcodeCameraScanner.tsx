import { useEffect, useRef } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

interface Props {
  onDetected: (code: string) => void
  onClose: () => void
}

const BarcodeCameraScanner: React.FC<Props> = ({
  onDetected,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!videoRef.current) return

    const reader = new BrowserMultiFormatReader()
    let controls: any

    reader
      .decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result) => {
          if (result) {
            onDetected(result.getText())
            controls?.stop()
            onClose()
          }
        }
      )
      .then(c => {
        controls = c
      })

    return () => {
      controls?.stop()
    }
  }, [onDetected, onClose])

  return (
    <div className="scanner-overlay">
      <div className="scanner-box">
        <video ref={videoRef} />

        <button
          className="scanner-close"
          onClick={onClose}
        >
          ✖ Cerrar
        </button>
      </div>
    </div>
  )
}

export default BarcodeCameraScanner

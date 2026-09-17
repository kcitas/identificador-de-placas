import { useState } from 'react'
import type { BoundingBox } from '../api/types'

export function BBoxImage({
  src,
  bbox,
  alt,
  className = '',
}: {
  src: string
  bbox?: BoundingBox | null
  alt: string
  className?: string
}) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)

  return (
    <div className={`relative overflow-hidden rounded-xl bg-(--color-surface-2) ${className}`}>
      <img
        src={src}
        alt={alt}
        className="block w-full"
        onLoad={(e) => {
          const img = e.currentTarget
          setNatural({ w: img.naturalWidth, h: img.naturalHeight })
        }}
      />
      {bbox && natural && (
        <div
          className="pointer-events-none absolute rounded-md border-2 border-(--color-accent) shadow-[0_0_0_2000px_rgba(0,0,0,0.15)]"
          style={{
            left: `${(bbox.x / natural.w) * 100}%`,
            top: `${(bbox.y / natural.h) * 100}%`,
            width: `${(bbox.width / natural.w) * 100}%`,
            height: `${(bbox.height / natural.h) * 100}%`,
          }}
        />
      )}
    </div>
  )
}

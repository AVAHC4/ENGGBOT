"use client"

/* eslint-disable @next/next/no-img-element */
// Native <img> is required here so we can access naturalWidth/Height and attach refs for custom cropping logic.
import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"

interface ImageCropDialogProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  onCropComplete: (croppedImageUrl: string) => void
}

export function ImageCropDialog({ isOpen, onClose, imageUrl, onCropComplete }: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0, size: 200 })
  const [scale, setScale] = useState([1])
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 })
  const [containerSize, setContainerSize] = useState({ width: 320, height: 320 })
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (imageRef.current && imageRef.current.complete) {
      const img = imageRef.current
      setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })

      // Center the crop area
      const centerX = (containerSize.width - crop.size) / 2
      const centerY = (containerSize.height - crop.size) / 2
      setCrop((prev) => ({ ...prev, x: centerX, y: centerY }))
    }
  }, [imageUrl, containerSize.width, containerSize.height, crop.size])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true)
      setDragStart({ x: e.clientX - crop.x, y: e.clientY - crop.y })
    },
    [crop],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const newX = Math.max(0, Math.min(e.clientX - dragStart.x, containerSize.width - crop.size))
      const newY = Math.max(0, Math.min(e.clientY - dragStart.y, containerSize.height - crop.size))

      setCrop((prev) => ({ ...prev, x: newX, y: newY }))
    },
    [isDragging, dragStart, crop.size, containerSize],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleCropComplete = useCallback(() => {
    if (!imageRef.current || !imageNaturalSize.width) return

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Use high resolution for better quality
    const outputSize = 512
    canvas.width = outputSize
    canvas.height = outputSize

    const img = imageRef.current
    const scaleValue = scale[0]

    // Calculate the actual image display size in the container
    const containerAspect = containerSize.width / containerSize.height
    const imageAspect = imageNaturalSize.width / imageNaturalSize.height

    let displayWidth,
      displayHeight,
      offsetX = 0,
      offsetY = 0

    if (imageAspect > containerAspect) {
      // Image is wider - fit to height
      displayHeight = containerSize.height * scaleValue
      displayWidth = displayHeight * imageAspect
      offsetX = (containerSize.width - displayWidth) / 2
    } else {
      // Image is taller - fit to width
      displayWidth = containerSize.width * scaleValue
      displayHeight = displayWidth / imageAspect
      offsetY = (containerSize.height - displayHeight) / 2
    }

    // Calculate source coordinates in the original image
    const sourceX = ((crop.x - offsetX) / displayWidth) * imageNaturalSize.width
    const sourceY = ((crop.y - offsetY) / displayHeight) * imageNaturalSize.height
    const sourceSize = (crop.size / displayWidth) * imageNaturalSize.width

    // Ensure we don't go outside image bounds
    const clampedSourceX = Math.max(0, Math.min(sourceX, imageNaturalSize.width - sourceSize))
    const clampedSourceY = Math.max(0, Math.min(sourceY, imageNaturalSize.height - sourceSize))
    const clampedSourceSize = Math.min(
      sourceSize,
      imageNaturalSize.width - clampedSourceX,
      imageNaturalSize.height - clampedSourceY,
    )

    // Enable image smoothing for better quality
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"

    // Draw the cropped image
    ctx.drawImage(
      img,
      clampedSourceX,
      clampedSourceY,
      clampedSourceSize,
      clampedSourceSize,
      0,
      0,
      outputSize,
      outputSize,
    )

    const croppedImageUrl = canvas.toDataURL("image/jpeg", 0.95)
    onCropComplete(croppedImageUrl)
    onClose()
  }, [crop, scale, imageNaturalSize, containerSize, onCropComplete, onClose])

  const getPreviewStyle = useCallback(() => {
    if (!imageNaturalSize.width) return {}

    const scaleValue = scale[0]
    const containerAspect = containerSize.width / containerSize.height
    const imageAspect = imageNaturalSize.width / imageNaturalSize.height

    let displayWidth,
      displayHeight,
      offsetX = 0,
      offsetY = 0

    if (imageAspect > containerAspect) {
      displayHeight = containerSize.height * scaleValue
      displayWidth = displayHeight * imageAspect
      offsetX = (containerSize.width - displayWidth) / 2
    } else {
      displayWidth = containerSize.width * scaleValue
      displayHeight = displayWidth / imageAspect
      offsetY = (containerSize.height - displayHeight) / 2
    }

    const backgroundX = -((crop.x - offsetX) / displayWidth) * 100
    const backgroundY = -((crop.y - offsetY) / displayHeight) * 100
    const backgroundSize = (displayWidth / crop.size) * 100

    return {
      backgroundImage: `url(${imageUrl})`,
      backgroundPosition: `${backgroundX}% ${backgroundY}%`,
      backgroundSize: `${backgroundSize}%`,
    }
  }, [crop, scale, imageNaturalSize, containerSize, imageUrl])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crop Profile Picture</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            ref={containerRef}
            className="relative bg-gray-100 rounded-lg overflow-hidden cursor-move mx-auto"
            style={{ width: containerSize.width, height: containerSize.height }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img
              ref={imageRef}
              src={imageUrl || "/placeholder.svg"}
              alt="Crop preview"
              className="w-full h-full object-contain"
              style={{ transform: `scale(${scale[0]})` }}
              draggable={false}
              onLoad={(e) => {
                const img = e.target as HTMLImageElement
                setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
              }}
            />

            {/* Crop overlay */}
            <div
              className="absolute border-2 border-white shadow-lg cursor-move"
              style={{
                left: crop.x,
                top: crop.y,
                width: crop.size,
                height: crop.size,
                borderRadius: "50%",
                boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
              }}
              onMouseDown={handleMouseDown}
            >
              <div className="w-full h-full border-2 border-dashed border-white rounded-full" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Zoom</label>
            <Slider value={scale} onValueChange={setScale} min={0.5} max={3} step={0.1} className="w-full" />
          </div>

          <div className="flex items-center justify-center">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-300">
              <div className="w-full h-full bg-cover bg-center" style={getPreviewStyle()} />
            </div>
            <span className="ml-2 text-sm text-gray-600">Preview</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCropComplete}>Apply Crop</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

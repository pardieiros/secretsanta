import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface LocationPickerProps {
  latitude: number | null
  longitude: number | null
  onLocationChange: (lat: number, lng: number) => void
  height?: string
}

function MapClickHandler({ onLocationChange }: { onLocationChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng
      onLocationChange(lat, lng)
    },
  })
  return null
}

export default function LocationPicker({
  latitude,
  longitude,
  onLocationChange,
  height = '400px',
}: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(null)

  useEffect(() => {
    if (latitude && longitude) {
      setPosition([latitude, longitude])
    } else {
      // Default to Portugal center if no location is set
      setPosition([39.5, -8.0])
    }
  }, [latitude, longitude])

  const handleLocationChange = (lat: number, lng: number) => {
    setPosition([lat, lng])
    onLocationChange(lat, lng)
  }

  if (!position) {
    return (
      <div className="w-full bg-surface rounded-lg flex items-center justify-center" style={{ height }}>
        <p className="text-text-secondary">Loading map...</p>
      </div>
    )
  }

  return (
    <div className="w-full rounded-lg overflow-hidden border border-border-soft" style={{ height, maxWidth: '100%' }}>
      <MapContainer
        center={position}
        zoom={latitude && longitude ? 13 : 7}
        style={{ height: '100%', width: '100%', maxWidth: '100%' }}
        className="z-0"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onLocationChange={handleLocationChange} />
        {position && <Marker position={position} />}
      </MapContainer>
    </div>
  )
}


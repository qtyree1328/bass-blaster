import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'

export const Route = createFileRoute('/timelapse/')({
  component: TimelapsePage,
})

// NASA GIBS imagery layers
const GIBS_LAYERS = [
  {
    id: 'MODIS_Terra_CorrectedReflectance_TrueColor',
    name: 'MODIS Terra True Color',
    description: 'Daily, 250m resolution, Terra satellite',
    startDate: '2000-02-24',
    format: 'jpg',
  },
  {
    id: 'MODIS_Aqua_CorrectedReflectance_TrueColor', 
    name: 'MODIS Aqua True Color',
    description: 'Daily, 250m resolution, Aqua satellite',
    startDate: '2002-07-04',
    format: 'jpg',
  },
  {
    id: 'VIIRS_SNPP_CorrectedReflectance_TrueColor',
    name: 'VIIRS True Color',
    description: 'Daily, 375m resolution, Suomi NPP',
    startDate: '2015-11-24',
    format: 'jpg',
  },
  {
    id: 'MODIS_Terra_NDVI_8Day',
    name: 'MODIS NDVI (8-Day)',
    description: '8-day composite vegetation index',
    startDate: '2000-02-18',
    format: 'png',
  },
  {
    id: 'MODIS_Terra_Land_Surface_Temp_Day',
    name: 'Land Surface Temperature (Day)',
    description: 'Daily daytime surface temp',
    startDate: '2000-02-24',
    format: 'png',
  },
  {
    id: 'MODIS_Aqua_Chlorophyll_A',
    name: 'Chlorophyll-a (Ocean)',
    description: 'Ocean color/productivity',
    startDate: '2002-07-04',
    format: 'png',
  },
  {
    id: 'VIIRS_NOAA20_Thermal_Anomalies_375m_All',
    name: 'Active Fires (VIIRS)',
    description: 'Thermal anomalies / fire detections',
    startDate: '2020-01-01',
    format: 'png',
  },
]

const PRESETS = [
  { name: 'Amazon Deforestation', lat: -5.5, lng: -60.0, zoom: 7, layer: 'MODIS_Terra_CorrectedReflectance_TrueColor' },
  { name: 'California Wildfires', lat: 38.5, lng: -121.5, zoom: 8, layer: 'VIIRS_NOAA20_Thermal_Anomalies_375m_All' },
  { name: 'Greenland Ice Sheet', lat: 72.0, lng: -40.0, zoom: 5, layer: 'MODIS_Terra_CorrectedReflectance_TrueColor' },
  { name: 'Aral Sea Shrinkage', lat: 45.0, lng: 59.0, zoom: 7, layer: 'MODIS_Terra_CorrectedReflectance_TrueColor' },
  { name: 'Great Barrier Reef', lat: -18.3, lng: 147.7, zoom: 7, layer: 'MODIS_Aqua_Chlorophyll_A' },
  { name: 'Midwest Agriculture', lat: 41.5, lng: -93.0, zoom: 7, layer: 'MODIS_Terra_NDVI_8Day' },
  { name: 'Sahara Dust Plumes', lat: 20.0, lng: -15.0, zoom: 5, layer: 'MODIS_Terra_CorrectedReflectance_TrueColor' },
  { name: 'Antarctic Peninsula', lat: -65.0, lng: -60.0, zoom: 5, layer: 'MODIS_Terra_CorrectedReflectance_TrueColor' },
]

interface FrameData {
  date: string
  loaded: boolean
  error?: string
  imageData?: string
}

function TimelapsePage() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const tileLayerRef = useRef<any>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  const [selectedLayer, setSelectedLayer] = useState(GIBS_LAYERS[0])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [interval, setInterval] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 })
  const [mapZoom, setMapZoom] = useState(4)
  const [mapReady, setMapReady] = useState(false)
  
  const [frames, setFrames] = useState<FrameData[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  
  const [playing, setPlaying] = useState(false)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(500) // ms per frame
  const playingRef = useRef(false)
  
  const [exportStatus, setExportStatus] = useState('')

  // Set default dates
  useEffect(() => {
    const end = new Date()
    const start = new Date()
    start.setMonth(start.getMonth() - 6)
    setEndDate(end.toISOString().split('T')[0])
    setStartDate(start.toISOString().split('T')[0])
  }, [])

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const initMap = async () => {
      const L = (await import('leaflet')).default
      
      const map = L.map(mapRef.current!, {
        center: [20, 0],
        zoom: 3,
      })

      // Base layer (for reference)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 19,
      }).addTo(map)

      // GIBS layer (initially with today's date)
      const today = new Date().toISOString().split('T')[0]
      const gibsUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${selectedLayer.id}/default/${today}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.${selectedLayer.format}`
      
      const gibsLayer = L.tileLayer(gibsUrl, {
        maxZoom: 9,
        opacity: 1,
        attribution: 'NASA GIBS',
      }).addTo(map)

      tileLayerRef.current = gibsLayer
      mapInstanceRef.current = map
      
      map.on('moveend', () => {
        const center = map.getCenter()
        setMapCenter({ lat: center.lat, lng: center.lng })
        setMapZoom(map.getZoom())
      })

      setMapCenter({ lat: 20, lng: 0 })
      setMapZoom(3)
      setMapReady(true)
    }

    initMap()
  }, [])

  // Update GIBS layer when layer or date changes
  const updateGibsLayer = useCallback((date: string, layerId: string, format: string) => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return
    
    const gibsUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layerId}/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.${format}`
    tileLayerRef.current.setUrl(gibsUrl)
  }, [])

  // Generate date array based on interval
  const generateDates = useCallback(() => {
    if (!startDate || !endDate) return []
    
    const dates: string[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    let current = new Date(start)
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0])
      
      if (interval === 'daily') {
        current.setDate(current.getDate() + 1)
      } else if (interval === 'weekly') {
        current.setDate(current.getDate() + 7)
      } else {
        current.setMonth(current.getMonth() + 1)
      }
    }
    
    return dates
  }, [startDate, endDate, interval])

  // Generate timelapse frames
  const generateTimelapse = async () => {
    const dates = generateDates()
    if (dates.length === 0) {
      setError('Please select valid date range')
      return
    }
    if (dates.length > 100) {
      setError('Too many frames (max 100). Use weekly or monthly interval.')
      return
    }
    
    setGenerating(true)
    setError('')
    setFrames([])
    setProgress(0)
    setCurrentFrame(0)
    setPlaying(false)
    playingRef.current = false
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const map = mapInstanceRef.current
    if (!map) return
    
    const bounds = map.getBounds()
    const zoom = Math.min(map.getZoom(), 9) // GIBS max zoom is 9
    
    // Calculate tile coordinates for current view
    const nw = bounds.getNorthWest()
    const se = bounds.getSouthEast()
    
    // Convert to tile coordinates
    const tileSize = 256
    const scale = Math.pow(2, zoom)
    
    const nwTileX = Math.floor((nw.lng + 180) / 360 * scale)
    const nwTileY = Math.floor((1 - Math.log(Math.tan(nw.lat * Math.PI / 180) + 1 / Math.cos(nw.lat * Math.PI / 180)) / Math.PI) / 2 * scale)
    const seTileX = Math.floor((se.lng + 180) / 360 * scale)
    const seTileY = Math.floor((1 - Math.log(Math.tan(se.lat * Math.PI / 180) + 1 / Math.cos(se.lat * Math.PI / 180)) / Math.PI) / 2 * scale)
    
    const tilesX = Math.min(seTileX - nwTileX + 1, 8) // Limit tiles
    const tilesY = Math.min(seTileY - nwTileY + 1, 8)
    
    canvas.width = tilesX * tileSize
    canvas.height = tilesY * tileSize
    
    const newFrames: FrameData[] = []
    
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i]
      setProgress(Math.round((i / dates.length) * 100))
      
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      let success = true
      
      // Fetch tiles for this date
      for (let tx = 0; tx < tilesX; tx++) {
        for (let ty = 0; ty < tilesY; ty++) {
          const tileX = nwTileX + tx
          const tileY = nwTileY + ty
          
          const url = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${selectedLayer.id}/default/${date}/GoogleMapsCompatible_Level9/${zoom}/${tileY}/${tileX}.${selectedLayer.format}`
          
          try {
            const img = await loadImage(url)
            ctx.drawImage(img, tx * tileSize, ty * tileSize)
          } catch (e) {
            // Draw placeholder for missing tile
            ctx.fillStyle = '#333'
            ctx.fillRect(tx * tileSize, ty * tileSize, tileSize, tileSize)
          }
        }
      }
      
      // Add date label
      ctx.fillStyle = 'rgba(0,0,0,0.7)'
      ctx.fillRect(10, canvas.height - 40, 150, 30)
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 16px monospace'
      ctx.fillText(date, 20, canvas.height - 18)
      
      // Store frame data
      const imageData = canvas.toDataURL('image/jpeg', 0.85)
      newFrames.push({
        date,
        loaded: true,
        imageData,
      })
      
      // Update frames state incrementally
      setFrames([...newFrames])
    }
    
    setProgress(100)
    setGenerating(false)
    setFrames(newFrames)
  }

  // Load image helper
  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })
  }

  // Playback controls
  useEffect(() => {
    if (!playing || frames.length === 0) return
    
    playingRef.current = true
    
    const playLoop = () => {
      if (!playingRef.current) return
      
      setCurrentFrame(prev => {
        const next = (prev + 1) % frames.length
        return next
      })
      
      setTimeout(playLoop, playbackSpeed)
    }
    
    playLoop()
    
    return () => {
      playingRef.current = false
    }
  }, [playing, frames.length, playbackSpeed])

  // Update map when current frame changes
  useEffect(() => {
    if (frames.length > 0 && frames[currentFrame]) {
      updateGibsLayer(frames[currentFrame].date, selectedLayer.id, selectedLayer.format)
    }
  }, [currentFrame, frames, selectedLayer, updateGibsLayer])

  // Load preset
  const loadPreset = (preset: typeof PRESETS[0]) => {
    if (!mapInstanceRef.current) return
    
    mapInstanceRef.current.setView([preset.lat, preset.lng], preset.zoom)
    
    const layer = GIBS_LAYERS.find(l => l.id === preset.layer)
    if (layer) setSelectedLayer(layer)
  }

  // Export as GIF (simplified - creates downloadable frames)
  const exportFrames = async () => {
    if (frames.length === 0) return
    
    setExportStatus('Preparing download...')
    
    // Create a zip-like bundle or single animated image
    // For now, download current frame
    const link = document.createElement('a')
    link.download = `timelapse_${selectedLayer.id}_${startDate}_${endDate}.jpg`
    link.href = frames[currentFrame].imageData || ''
    link.click()
    
    setExportStatus('Frame downloaded! (Full GIF export coming soon)')
    setTimeout(() => setExportStatus(''), 3000)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-slate-400 hover:text-white">
              ← Hub
            </Link>
            <h1 className="text-xl font-bold">🛰️ Satellite Timelapse</h1>
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
              NASA GIBS
            </span>
          </div>
          <a 
            href="https://worldview.earthdata.nasa.gov" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-slate-400 hover:text-white"
          >
            Open NASA Worldview →
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Controls Panel */}
          <div className="lg:col-span-1 space-y-4">
            {/* Layer Selection */}
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
              <h3 className="font-semibold mb-3 text-slate-300">📡 Imagery Layer</h3>
              <select
                value={selectedLayer.id}
                onChange={(e) => {
                  const layer = GIBS_LAYERS.find(l => l.id === e.target.value)
                  if (layer) {
                    setSelectedLayer(layer)
                    if (frames.length === 0) {
                      updateGibsLayer(endDate || new Date().toISOString().split('T')[0], layer.id, layer.format)
                    }
                  }
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
              >
                {GIBS_LAYERS.map(layer => (
                  <option key={layer.id} value={layer.id}>{layer.name}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-2">{selectedLayer.description}</p>
            </div>

            {/* Date Range */}
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
              <h3 className="font-semibold mb-3 text-slate-300">📅 Date Range</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500">Start</label>
                  <input
                    type="date"
                    value={startDate}
                    min={selectedLayer.startDate}
                    max={endDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">End</label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Interval</label>
                  <select
                    value={interval}
                    onChange={(e) => setInterval(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <p className="text-xs text-slate-500">
                  {generateDates().length} frames
                </p>
              </div>
            </div>

            {/* Presets */}
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
              <h3 className="font-semibold mb-3 text-slate-300">🌍 Presets</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {PRESETS.map(preset => (
                  <button
                    key={preset.name}
                    onClick={() => loadPreset(preset)}
                    className="w-full text-left px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm transition-colors"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={generateTimelapse}
              disabled={generating || !mapReady}
              className="w-full py-3 rounded-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {generating ? (
                <span>Generating... {progress}%</span>
              ) : (
                <span>🎬 Generate Timelapse</span>
              )}
            </button>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}
          </div>

          {/* Map & Preview */}
          <div className="lg:col-span-3 space-y-4">
            {/* Map */}
            <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
              <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  Pan and zoom to select area
                </span>
                <span className="text-xs text-slate-500">
                  {mapCenter.lat.toFixed(2)}, {mapCenter.lng.toFixed(2)} | z{mapZoom}
                </span>
              </div>
              <div ref={mapRef} className="h-[400px]" />
            </div>

            {/* Animation Preview */}
            {frames.length > 0 && (
              <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <span className="font-semibold">Preview</span>
                  <span className="text-sm text-slate-400">
                    Frame {currentFrame + 1} / {frames.length}
                    {frames[currentFrame] && ` • ${frames[currentFrame].date}`}
                  </span>
                </div>
                
                {/* Frame display */}
                <div className="relative bg-slate-950">
                  {frames[currentFrame]?.imageData && (
                    <img 
                      src={frames[currentFrame].imageData} 
                      alt={`Frame ${currentFrame + 1}`}
                      className="w-full"
                    />
                  )}
                </div>
                
                {/* Controls */}
                <div className="p-4 border-t border-slate-800">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        setPlaying(!playing)
                        playingRef.current = !playing
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded font-semibold"
                    >
                      {playing ? '⏸ Pause' : '▶️ Play'}
                    </button>
                    
                    <button
                      onClick={() => setCurrentFrame(prev => Math.max(0, prev - 1))}
                      disabled={playing}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded disabled:opacity-50"
                    >
                      ⏮
                    </button>
                    
                    <input
                      type="range"
                      min={0}
                      max={frames.length - 1}
                      value={currentFrame}
                      onChange={(e) => {
                        if (!playing) setCurrentFrame(parseInt(e.target.value))
                      }}
                      className="flex-1"
                    />
                    
                    <button
                      onClick={() => setCurrentFrame(prev => Math.min(frames.length - 1, prev + 1))}
                      disabled={playing}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded disabled:opacity-50"
                    >
                      ⏭
                    </button>
                    
                    <select
                      value={playbackSpeed}
                      onChange={(e) => setPlaybackSpeed(parseInt(e.target.value))}
                      className="bg-slate-800 border border-slate-700 rounded px-2 py-2 text-sm"
                    >
                      <option value={200}>Fast</option>
                      <option value={500}>Normal</option>
                      <option value={1000}>Slow</option>
                    </select>
                    
                    <button
                      onClick={exportFrames}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded font-semibold"
                    >
                      💾 Export
                    </button>
                  </div>
                  
                  {exportStatus && (
                    <p className="mt-2 text-sm text-emerald-400">{exportStatus}</p>
                  )}
                </div>
              </div>
            )}

            {/* Hidden canvas for frame generation */}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>

        {/* Info section */}
        <div className="mt-8 bg-slate-900/50 rounded-lg p-6 border border-slate-800">
          <h2 className="text-lg font-semibold mb-4">About This Tool</h2>
          <div className="grid md:grid-cols-3 gap-6 text-sm text-slate-400">
            <div>
              <h3 className="font-semibold text-white mb-2">📡 Data Source</h3>
              <p>
                Imagery comes from NASA's Global Imagery Browse Services (GIBS), 
                providing near-real-time satellite data from MODIS, VIIRS, and other sensors.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">🛰️ Sensors</h3>
              <p>
                <strong>MODIS:</strong> 250m-1km resolution, daily coverage since 2000.<br/>
                <strong>VIIRS:</strong> 375m resolution, daily coverage since 2015.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">💡 Tips</h3>
              <p>
                Use presets for interesting locations. Weekly interval works best for 
                seasonal changes. NDVI shows vegetation health over time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

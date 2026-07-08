import { useState, useEffect } from 'react'
import { isVehicleActive, getVehicleFuel } from '../Vehicles/HoverVehicle'
import { glassPanelStrong, labelStyle, valueStyle } from '../../utils/uiStyles'

let _vehicleSpeed = 0
export function getVehicleSpeedForUI(): number { return _vehicleSpeed }
export function setVehicleSpeedForUI(speed: number) { _vehicleSpeed = speed }

export const FuelGauge = () => {
  const [fuel, setFuel] = useState(100)
  const [speed, setSpeed] = useState(0)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setFuel(getVehicleFuel())
      setSpeed(getVehicleSpeedForUI())
      setActive(isVehicleActive())
    }, 200)
    return () => clearInterval(interval)
  }, [])

  if (!active) return null

  const fuelPct = fuel / 100
  const fuelColor = fuelPct > 0.5 ? '#44ddff' : fuelPct > 0.25 ? '#ffaa44' : '#ff4444'
  const speedKmh = Math.round(speed * 8)

  return (
    <div className="fixed bottom-6 left-[210px] z-50 pointer-events-auto select-none">
      <div className={glassPanelStrong} style={{ minWidth: 180, padding: 16 }}>
        {/* Speed */}
        <div className="flex items-center justify-between mb-2">
          <span className={labelStyle} style={{ color: '#667' }}>Speed</span>
          <span className={valueStyle} style={{ color: '#44ffcc', fontSize: 13 }}>
            {speedKmh}
            <span style={{ fontSize: 8, color: '#445', marginLeft: 4 }}>km/h</span>
          </span>
        </div>
        <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden mb-3">
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{
              width: `${Math.min(100, speed * 6)}%`,
              background: `linear-gradient(90deg, #4488ff, ${speed > 0.7 ? '#ff8844' : '#44ffcc'})`,
              boxShadow: `0 0 6px ${speed > 0.7 ? '#ff884444' : '#44ffcc44'}`,
            }}
          />
        </div>

        {/* Fuel */}
        <div className="flex items-center justify-between mb-1">
          <span className={labelStyle} style={{ color: '#667' }}>Fuel</span>
          <span className={valueStyle} style={{ color: fuelColor, fontSize: 12 }}>
            {Math.ceil(fuel)}
          </span>
        </div>
        <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden mb-1">
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{
              width: `${fuelPct * 100}%`,
              background: `linear-gradient(90deg, ${fuelColor}, ${fuelPct > 0.5 ? '#66eeff' : '#ffcc44'})`,
              boxShadow: `0 0 8px ${fuelColor}44`,
            }}
          />
        </div>

        {/* Controls */}
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: 7, color: '#445', lineHeight: 1.6 }}>
          <div>WASD Drive | Shift Boost | Space Brake</div>
          <div>Q Jump | A/D Drift | V Exit</div>
          <div style={{ color: '#334', fontStyle: 'italic', marginTop: 2 }}>Refuels when stationary</div>
        </div>
      </div>
    </div>
  )
}

export const DEFAULT_SEA_CONSUMPTION_MT_DAY = 50
export const DEFAULT_PORT_CONSUMPTION_MT_DAY = 5
export const DEFAULT_SPEED_KNOTS = 12
export const DEFAULT_TANK_CAPACITY_MT = 500

export const LEG_TYPE_LABELS: Record<string, string> = {
  sea: 'Sea Passage',
  port: 'Port Stay',
  anchorage: 'Anchorage',
  canal: 'Canal Transit',
  drifting: 'Drifting / Slow Steaming',
}

export const LEG_TYPE_ICONS: Record<string, string> = {
  sea: '⚓',
  port: '🏭',
  anchorage: '⛵',
  canal: '🔁',
  drifting: '🌊',
}

export const APP_VERSION = '1.0.0'
export const STORAGE_KEY_VESSELS = 'voyagefuel_vessels'
export const STORAGE_KEY_ACTIVE_VESSEL = 'voyagefuel_active_vessel'
export const STORAGE_KEY_VOYAGE = 'voyagefuel_voyage'
export const STORAGE_KEY_FUEL_GRADES = 'voyagefuel_fuel_grades'

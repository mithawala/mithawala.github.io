export const EXPEDITION_KEY = 'asif:nexus-expedition:v1'

export const NEXUS_SIGNALS = [
  {
    id: 'origin',
    label: 'Origin signal',
    color: '#ffd38a',
    hint: 'Find the warm amber beacon between the worlds.',
  },
  {
    id: 'perspective',
    label: 'Perspective signal',
    color: '#7dffcf',
    hint: 'Follow the mint-green light in the portal field.',
  },
  {
    id: 'possibility',
    label: 'Possibility signal',
    color: '#adbaff',
    hint: 'Look for the pale violet beacon drifting through the nexus.',
  },
]

export function emptyExpedition() {
  return { scanned: [], signals: [], compared: false }
}

export function parseExpedition(raw, worldIds) {
  if (raw === null) return { progress: emptyExpedition(), notice: '' }
  let value
  try {
    value = JSON.parse(raw)
  } catch {
    return {
      progress: emptyExpedition(),
      notice:
        'Saved expedition progress could not be read. A fresh expedition is ready.',
    }
  }
  if (
    !value ||
    Array.isArray(value) ||
    value.schema !== 1 ||
    !Array.isArray(value.scanned) ||
    !value.scanned.every((id) => typeof id === 'string') ||
    !Array.isArray(value.signals) ||
    !value.signals.every((id) => typeof id === 'string') ||
    typeof value.compared !== 'boolean'
  )
    return {
      progress: emptyExpedition(),
      notice:
        'Saved expedition progress is incompatible. A fresh expedition is ready.',
    }
  const signalIds = NEXUS_SIGNALS.map((signal) => signal.id)
  const scanned = [...new Set(value.scanned)].filter((id) =>
    worldIds.includes(id),
  )
  const signals = [...new Set(value.signals)].filter((id) =>
    signalIds.includes(id),
  )
  return {
    progress: { scanned, signals, compared: value.compared },
    notice:
      scanned.length !== value.scanned.length ||
      signals.length !== value.signals.length
        ? 'Saved progress was updated to match the current collection.'
        : '',
  }
}

export function loadExpedition(read, worldIds) {
  let raw
  try {
    raw = read()
  } catch {
    return {
      progress: emptyExpedition(),
      persistent: false,
      notice:
        'Local storage is unavailable. Progress will last for this session only.',
    }
  }
  return { ...parseExpedition(raw, worldIds), persistent: true }
}

export function saveExpedition(progress, write) {
  try {
    write(JSON.stringify({ schema: 1, ...progress }))
    return { ok: true, notice: '' }
  } catch {
    return {
      ok: false,
      notice:
        'Progress could not be saved. Your expedition still works for this session.',
    }
  }
}

export function updateExpedition(progress, action, worldIds) {
  switch (action.type) {
    case 'scan':
      if (!worldIds.includes(action.id))
        throw new Error('Unknown expedition world')
      return progress.scanned.includes(action.id)
        ? progress
        : { ...progress, scanned: [...progress.scanned, action.id] }
    case 'signal':
      if (!NEXUS_SIGNALS.some((signal) => signal.id === action.id))
        throw new Error('Unknown expedition signal')
      return progress.signals.includes(action.id)
        ? progress
        : { ...progress, signals: [...progress.signals, action.id] }
    case 'compare':
      return progress.compared ? progress : { ...progress, compared: true }
    case 'reset':
      return emptyExpedition()
    default:
      throw new Error('Unknown expedition action')
  }
}

export function expeditionStats(progress, worldIds) {
  const scanned = new Set(
    progress.scanned.filter((id) => worldIds.includes(id)),
  ).size
  const recovered = new Set(
    progress.signals.filter((id) =>
      NEXUS_SIGNALS.some((signal) => signal.id === id),
    ),
  ).size
  const totalWorlds = worldIds.length
  const totalSignals = NEXUS_SIGNALS.length
  const worldsComplete = totalWorlds > 0 && scanned === totalWorlds
  const signalsComplete = recovered === totalSignals
  const comparisonAvailable = totalWorlds > 1
  const objectivesTotal = 2 + Number(comparisonAvailable)
  const objectivesComplete =
    Number(worldsComplete) +
    Number(signalsComplete) +
    Number(comparisonAvailable && progress.compared)
  return {
    scanned,
    recovered,
    totalWorlds,
    totalSignals,
    worldsComplete,
    signalsComplete,
    comparisonAvailable,
    objectivesTotal,
    objectivesComplete,
    percent: Math.round(
      ((scanned +
        recovered +
        Number(comparisonAvailable && progress.compared)) /
        (totalWorlds + totalSignals + Number(comparisonAvailable))) *
        100,
    ),
    complete: objectivesComplete === objectivesTotal,
  }
}

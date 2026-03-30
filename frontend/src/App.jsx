import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

function normalizeOcrPlateInput(text) {
  return String(text || '')
    .toUpperCase()
    .replace(/[|¡]/g, 'I')
    .replace(/\s+/g, ' ')
    .replace(/[^A-Z0-9\s,-]/g, ' ')
    .trim()
}

function extractPlateFromOcrText(text) {
  if (!text || !String(text).trim()) return null

  const variants = [
    normalizeOcrPlateInput(text),
    normalizeOcrPlateInput(text).replace(/\s/g, ''),
  ].filter((v, i, a) => v && a.indexOf(v) === i)

  for (const upper of variants) {
    // Common Indian-style plate: KA-01-MK-4421 (region-district-series-number)
    const indian = upper.match(/\b([A-Z]{1,3})\s*[-]?\s*(\d{1,2})\s*[-]?\s*([A-Z]{0,3})\s*[-]?\s*(\d{3,5})\b/)
    if (indian) {
      const region = indian[1]
      const district = indian[2].padStart(2, '0')
      const middle = (indian[3] || '').trim()
      const seriesAndNumber = indian[4]
      if (middle) return `${region}-${district}-${middle}-${seriesAndNumber}`
      return `${region}-${district}-${seriesAndNumber}`
    }

    // US-style: US-1234 (allow 3–6 digits)
    const us = upper.match(/\b([A-Z]{1,3})\s*[-]?\s*(\d{3,6})\b/)
    if (us) return `${us[1]}-${us[2]}`

    // UK-style: AB12 CDE / AB12CDE
    const uk = upper.match(/\b([A-Z]{2})\s*[-]?\s*(\d{2})\s*[-]?\s*([A-Z]{3})\b/)
    if (uk) return `${uk[1]}-${uk[2]}-${uk[3]}`

    // Compact form like KA01MK4421
    const compact = upper.match(/\b([A-Z]{1,3})(\d{2})([A-Z]{1,3})(\d{3,5})\b/)
    if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}-${compact[4]}`

    // Fallback: longest token that has both letters and digits.
    const tokens = upper
      .replace(/[^A-Z0-9-]/g, ' ')
      .split(/\s+/)
      .filter((t) => t && /[A-Z]/.test(t) && /\d/.test(t))
      .sort((a, b) => b.length - a.length)

    if (tokens.length) return tokens[0].replace(/-+/g, '-')
  }

  return null
}

async function detectTextWithBrowserTextDetector(imageEl) {
  if (typeof window === 'undefined' || !window.TextDetector) {
    throw new Error('TextDetectorNotSupported')
  }

  let detector
  try {
    detector = new window.TextDetector({ languages: ['en'] })
  } catch (e) {
    detector = new window.TextDetector()
  }

  const results = await detector.detect(imageEl)
  return (results || [])
    .map((r) => r && (r.rawValue || r.text || ''))
    .filter(Boolean)
    .join(' ')
    .trim()
}

function enhanceImageForPlateOcr(img) {
  const w0 = img.naturalWidth || img.width
  const h0 = img.naturalHeight || img.height
  if (!w0 || !h0) return null

  const minSide = Math.min(w0, h0)
  const targetMin = 1400
  const scale = minSide < targetMin ? targetMin / minSide : 1
  const w = Math.round(w0 * scale)
  const h = Math.round(h0 * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, w, h)

  const imageData = ctx.getImageData(0, 0, w, h)
  const d = imageData.data
  const gray = new Float32Array(w * h)
  let min = 255
  let max = 0
  for (let i = 0, p = 0; i < d.length; i += 4, p += 1) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    gray[p] = g
    if (g < min) min = g
    if (g > max) max = g
  }
  const range = max - min || 1
  for (let i = 0, p = 0; i < d.length; i += 4, p += 1) {
    let v = ((gray[p] - min) / range) * 255
    v = v < 115 ? Math.max(0, v - 40) : Math.min(255, v + 28)
    const n = Math.round(v)
    d[i] = n
    d[i + 1] = n
    d[i + 2] = n
  }
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

function looksLikePlateOcrText(t) {
  const s = String(t || '').trim()
  if (s.length < 4) return false
  return /[A-Za-z]/.test(s) && /\d/.test(s)
}

async function detectTextWithTesseract(imageEl) {
  const tesseract = await import('tesseract.js')
  const { createWorker, PSM } = tesseract

  const worker = await createWorker('eng')
  const psms = [PSM.SINGLE_LINE, PSM.SINGLE_BLOCK, PSM.AUTO, PSM.SPARSE_TEXT]

  try {
    const enhanced = enhanceImageForPlateOcr(imageEl)
    const sources = enhanced ? [enhanced, imageEl] : [imageEl]
    let bestText = ''
    let bestScore = -1

    for (const src of sources) {
      for (const psm of psms) {
        await worker.setParameters({ tessedit_pageseg_mode: psm })
        const { data } = await worker.recognize(src)
        const text = (data && data.text ? String(data.text) : '').trim()
        const conf = data && typeof data.confidence === 'number' ? data.confidence : 0
        const score = text.length * 8 + conf
        if (text.length > bestText.length || (text.length === bestText.length && score > bestScore)) {
          bestText = text
          bestScore = score
        }
        if (looksLikePlateOcrText(text) && text.length >= 5) return text
      }
    }

    return bestText.trim()
  } finally {
    await worker.terminate()
  }
}

const roles = [
  'Gate Keeper',
  'Supervisor',
  'Senior Tech',
  'Manager',
  'Owner (Client)',
]

const HISTORY_PAGE_SIZE = 20

const ORDER_MANAGEMENT_ITEMS = [
  'Work-Order Entry',
  'Work-Order Search',
  'Work-Order History',
  'Invoices',
  'Payment Received',
]

const STAFF_MANAGEMENT_ITEMS = [
  { id: 'Staff Management', label: 'All Staff' },
  { id: 'Supervisor Management' },
  { id: 'Technical Staff Management' },
  { id: 'Manager Management' },
  { id: 'Gate Keeper Management' },
]

const NAV_CONFIG = [
  { kind: 'link', id: 'Dashboard' },
  {
    kind: 'group',
    label: 'Order Management',
    items: ORDER_MANAGEMENT_ITEMS,
  },
  {
    kind: 'group',
    label: 'Staff Management',
    items: STAFF_MANAGEMENT_ITEMS,
  },
  { kind: 'link', id: 'Activity Log' },
]

function navGroupItemId(item) {
  return typeof item === 'string' ? item : item.id
}

function navGroupItemLabel(item) {
  return typeof item === 'string' ? item : item.label || item.id
}

const navIconSvgProps = {
  className: 'menu-icon',
  viewBox: '0 0 24 24',
  width: 22,
  height: 22,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

/** variant: 'link' | 'group' | 'sub' — disambiguates e.g. Staff group vs “All Staff” item */
function NavIcon({ menuId, variant = 'link' }) {
  const p = navIconSvgProps
  if (variant === 'group') {
    if (menuId === 'Order Management') {
      return (
        <svg {...p} aria-hidden>
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" />
          <path d="M9 12h6M9 16h6" />
        </svg>
      )
    }
    if (menuId === 'Staff Management') {
      return (
        <svg {...p} aria-hidden>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    }
  }
  if (variant === 'sub' && menuId === 'Staff Management') {
    return (
      <svg {...p} aria-hidden>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    )
  }

  switch (menuId) {
    case 'Dashboard':
      return (
        <svg {...p} aria-hidden>
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      )
    case 'Work-Order Entry':
      return (
        <svg {...p} aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      )
    case 'Work-Order Search':
      return (
        <svg {...p} aria-hidden>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      )
    case 'Work-Order History':
      return (
        <svg {...p} aria-hidden>
          <polyline points="12 8 12 12 14 14" />
          <circle cx="12" cy="12" r="10" />
        </svg>
      )
    case 'Invoices':
      return (
        <svg {...p} aria-hidden>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      )
    case 'Payment Received':
      return (
        <svg {...p} aria-hidden>
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )
    case 'Supervisor Management':
      return (
        <svg {...p} aria-hidden>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
          <path d="M17 11l2 2 4-4" />
        </svg>
      )
    case 'Technical Staff Management':
      return (
        <svg {...p} aria-hidden>
          <path d="M14.7 5.08A10 10 0 1 1 8.32 3.5" />
          <polyline points="14 1 14 5 18 5" />
        </svg>
      )
    case 'Manager Management':
      return (
        <svg {...p} aria-hidden>
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      )
    case 'Gate Keeper Management':
      return (
        <svg {...p} aria-hidden>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )
    case 'Activity Log':
      return (
        <svg {...p} aria-hidden>
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      )
    case 'MenuCollapse':
      return (
        <svg {...p} aria-hidden>
          <polyline points="11 17 6 12 11 7" />
          <polyline points="18 17 13 12 18 7" />
        </svg>
      )
    case 'MenuExpand':
      return (
        <svg {...p} aria-hidden>
          <polyline points="13 17 18 12 13 7" />
          <polyline points="6 17 11 12 6 7" />
        </svg>
      )
    default:
      return (
        <svg {...p} aria-hidden>
          <circle cx="12" cy="12" r="4" />
        </svg>
      )
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateHistoricalServicedWorkOrders() {
  const vehicleModels = [
    'Toyota Corolla',
    'Honda Civic',
    'Ford Focus',
    'Nissan Altima',
    'Hyundai Elantra',
    'Kia Sportage',
    'Mazda 3',
    'Chevrolet Malibu',
    'Subaru Forester',
    'Volkswagen Jetta',
  ]
  const supervisors = ['Anita', 'Pooja']
  const techs = ['Raj', 'Vikram', 'Arjun', 'Kiran']
  const gateKeepers = ['Ramesh', 'Suman']
  const seeded = []
  const now = new Date()
  let sequence = 1

  // Last 11 months only (exclude current month), 20-100 serviced vehicles each month.
  for (let monthOffset = 11; monthOffset >= 1; monthOffset -= 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1)
    const monthVolume = randomInt(20, 100)
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const monthKey = `${year}${String(month + 1).padStart(2, '0')}`
    const monthMaxDay = new Date(year, month + 1, 0).getDate()

    for (let i = 0; i < monthVolume; i += 1) {
      const day = randomInt(1, monthMaxDay)
      const model = vehicleModels[randomInt(0, vehicleModels.length - 1)]
      const serviceCharge = randomInt(120, 450)
      const lineItemCost = randomInt(180, 900)
      const discount = randomInt(0, 120)

      const createdAtStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const checkInAt = new Date(year, month, day, randomInt(7, 10), randomInt(0, 59), 0, 0).toISOString()
      const checkOutAt = new Date(year, month, day, randomInt(15, 18), randomInt(0, 59), 0, 0).toISOString()

      seeded.push({
        id: `HIST-${monthKey}-${String(sequence).padStart(4, '0')}`,
        plateNo: `US-${randomInt(1000, 9999)}`,
        model,
        isTestVehicle: false,
        stage: 'Closed',
        createdAt: createdAtStr,
        checkInAt,
        checkOutAt,
        supervisor: supervisors[randomInt(0, supervisors.length - 1)],
        tech: techs[randomInt(0, techs.length - 1)],
        gateKeeper: gateKeepers[randomInt(0, gateKeepers.length - 1)],
        gatePassVerified: true,
        serviceCharge,
        discount,
        paid: true,
        diagnosisSubmitted: true,
        qcDone: true,
        ownerOrderConfirmed: true,
        supervisorOrderApproved: true,
        items: [
          {
            id: `HI-${sequence}`,
            description: 'Routine service package',
            cost: lineItemCost,
            approved: true,
          },
        ],
        timeline: ['Work-Order opened by Supervisor', 'Payment captured and ticket closed'],
      })
      sequence += 1
    }
  }

  return seeded
}

function generateHistoricalCancelledWorkOrders(servicedWorkOrders) {
  const cancelled = []
  const cancelledByOptions = ['Owner', 'Supervisor']
  const groupedByMonth = servicedWorkOrders.reduce((acc, order) => {
    const monthKey = (order.createdAt || '').slice(0, 7)
    if (!monthKey) return acc
    if (!acc[monthKey]) acc[monthKey] = []
    acc[monthKey].push(order)
    return acc
  }, {})

  Object.keys(groupedByMonth).forEach((monthKey) => {
    const monthOrders = groupedByMonth[monthKey]
    const maxCancelledForMonth = Math.max(1, Math.floor(monthOrders.length * 0.1))
    const cancelledCount = randomInt(1, maxCancelledForMonth)
    const [year, month] = monthKey.split('-').map((value) => Number(value))
    const monthMaxDay = new Date(year, month, 0).getDate()

    for (let index = 0; index < cancelledCount; index += 1) {
      const baseOrder = monthOrders[randomInt(0, monthOrders.length - 1)]
      const cancelledBy = cancelledByOptions[randomInt(0, cancelledByOptions.length - 1)]
      const day = randomInt(1, monthMaxDay)

      const cancelDay = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const cancelCheckIn = new Date(year, month - 1, day, randomInt(8, 11), randomInt(0, 59), 0, 0).toISOString()
      const cancelCheckOut = new Date(year, month - 1, day, randomInt(13, 16), randomInt(0, 59), 0, 0).toISOString()

      cancelled.push({
        ...baseOrder,
        id: `CANCEL-${monthKey.replace('-', '')}-${String(index + 1).padStart(3, '0')}-${randomInt(10, 99)}`,
        createdAt: cancelDay,
        checkInAt: cancelCheckIn,
        checkOutAt: cancelCheckOut,
        stage: 'Cancelled',
        ownerOrderConfirmed: false,
        supervisorOrderApproved: false,
        paid: false,
        qcDone: false,
        diagnosisSubmitted: randomInt(0, 1) === 1,
        cancelledBy,
        timeline: [
          'Work-Order opened by Supervisor',
          `Work-Order cancelled by ${cancelledBy}`,
        ],
      })
    }
  })

  return cancelled
}

const baseTickets = [
  {
    id: 'TKT-24001',
    plateNo: 'KA-01-MK-4421',
    model: 'Honda City 2020',
    isTestVehicle: false,
    stage: 'Diagnosis',
    createdAt: '2026-03-28',
    checkInAt: new Date(2026, 2, 28, 9, 15, 0, 0).toISOString(),
    checkOutAt: null,
    ownerOrderConfirmed: true,
    supervisorOrderApproved: true,
    supervisor: 'Anita',
    tech: 'Raj',
    gateKeeper: 'Ramesh',
    gatePassVerified: true,
    serviceCharge: 900,
    discount: 0,
    paid: false,
    diagnosisSubmitted: false,
    qcDone: false,
    items: [
      { id: 'I-1', description: 'Engine oil + filter', cost: 2200, approved: true },
      { id: 'I-2', description: 'Front brake pad replacement', cost: 3800, approved: true },
      { id: 'I-3', description: 'Wiper blades', cost: 700, approved: true },
    ],
    timeline: ['Work-Order opened by Supervisor'],
  },
  {
    id: 'TEST-991',
    plateNo: null,
    model: 'Test Vehicle',
    isTestVehicle: true,
    stage: 'Intake',
    createdAt: '2026-03-29',
    checkInAt: new Date(2026, 2, 29, 10, 45, 0, 0).toISOString(),
    checkOutAt: null,
    ownerOrderConfirmed: false,
    supervisorOrderApproved: false,
    supervisor: 'Anita',
    tech: '',
    gateKeeper: 'Suman',
    gatePassVerified: false,
    serviceCharge: 500,
    discount: 0,
    paid: false,
    diagnosisSubmitted: false,
    qcDone: false,
    items: [
      { id: 'I-4', description: 'General inspection', cost: 1200, approved: true },
    ],
    timeline: ['No plate detected from OCR, temporary ID issued'],
  },
]
const historicalServicedTickets = generateHistoricalServicedWorkOrders()
const historicalCancelledTickets = generateHistoricalCancelledWorkOrders(historicalServicedTickets)
const initialTickets = [...baseTickets, ...historicalServicedTickets, ...historicalCancelledTickets]

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function parseYearMonthParts(ymKey) {
  if (!ymKey || ymKey.length < 7) return { year: '—', monthName: '—' }
  const [y, m] = ymKey.split('-').map(Number)
  if (!y || !m) return { year: '—', monthName: '—' }
  const monthName = new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long' })
  return { year: String(y), monthName }
}

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })
}

const WORK_ORDER_FLOW_STEPS = [
  { key: 'intake', title: 'Intake', caption: 'Vehicle received' },
  { key: 'owner', title: 'Owner confirm', caption: 'Order acknowledged' },
  { key: 'supervisor', title: 'Supervisor', caption: 'Approve to start work' },
  { key: 'diagnosis', title: 'Diagnosis', caption: 'Inspection & repairs' },
  { key: 'qc', title: 'QC', caption: 'Quality check' },
  { key: 'closure', title: 'Closure', caption: 'Payment & complete' },
]

function getWorkOrderFlowCells(ticket) {
  const cancelled = ticket.stage === 'Cancelled'
  const closed = ticket.stage === 'Closed'

  const completed = [
    true,
    !!ticket.ownerOrderConfirmed,
    !!ticket.supervisorOrderApproved,
    !!(ticket.diagnosisSubmitted || closed),
    !!(ticket.qcDone || closed),
    !!(closed && ticket.paid),
  ]

  if (closed) {
    return WORK_ORDER_FLOW_STEPS.map((step) => ({ ...step, status: 'done' }))
  }

  if (cancelled) {
    let breakAt = completed.findIndex((ok, idx) => idx > 0 && !ok)
    if (breakAt === -1) breakAt = WORK_ORDER_FLOW_STEPS.length - 1
    return WORK_ORDER_FLOW_STEPS.map((step, i) => {
      if (i < breakAt) return { ...step, status: 'done' }
      if (i === breakAt) return { ...step, status: 'cancelled' }
      return { ...step, status: 'skipped' }
    })
  }

  const nextIdx = completed.findIndex((ok) => !ok)
  const currentIdx = nextIdx === -1 ? WORK_ORDER_FLOW_STEPS.length - 1 : nextIdx

  return WORK_ORDER_FLOW_STEPS.map((step, i) => {
    if (completed[i]) return { ...step, status: 'done' }
    if (i === currentIdx) return { ...step, status: 'current' }
    return { ...step, status: 'pending' }
  })
}

function calculateTotals(ticket) {
  const approvedItems = ticket.items.filter((item) => item.approved)
  const partsCost = approvedItems.reduce((sum, item) => sum + item.cost, 0)
  const totalBeforeDiscount = partsCost + ticket.serviceCharge
  const totalAfterDiscount = Math.max(totalBeforeDiscount - ticket.discount, 0)

  return { partsCost, totalBeforeDiscount, totalAfterDiscount }
}

function getLast12MonthsSeries(workOrders) {
  const now = new Date()
  const stageBuckets = ['Closed', 'Cancelled', 'Owner Approval', 'Active']
  const months = []
  for (let index = 11; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = date.toLocaleString('en-US', { month: 'short' })
    months.push({
      key,
      label,
      total: 0,
      counts: {
        Closed: 0,
        Cancelled: 0,
        'Owner Approval': 0,
        Active: 0,
      },
    })
  }

  workOrders.forEach((order) => {
    if (!order.createdAt) return
    const orderDate = new Date(order.createdAt)
    if (Number.isNaN(orderDate.getTime())) return
    const key = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`
    const month = months.find((item) => item.key === key)
    if (!month) return
    const stageKey = stageBuckets.includes(order.stage) ? order.stage : 'Active'
    month.counts[stageKey] += 1
    month.total += 1
  })

  return months
}

function App() {
  const [activeRole, setActiveRole] = useState('Supervisor')
  const [activeMenu, setActiveMenu] = useState('Dashboard')
  const [menuGroupsOpen, setMenuGroupsOpen] = useState({
    'Order Management': true,
    'Staff Management': true,
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [tickets, setTickets] = useState(initialTickets)
  const [staff, setStaff] = useState([
    { id: 'S-1', name: 'Anita', role: 'Supervisor', phone: '9000001111', active: true },
    { id: 'S-2', name: 'Raj', role: 'Senior Tech', phone: '9000002222', active: true },
    { id: 'S-3', name: 'Vikram', role: 'Senior Tech', phone: '9000003333', active: true },
    { id: 'S-4', name: 'Neha', role: 'Manager', phone: '9000004444', active: true },
    { id: 'S-5', name: 'Ramesh', role: 'Gate Keeper', phone: '9000005555', active: true },
    { id: 'S-6', name: 'Suman', role: 'Gate Keeper', phone: '9000006666', active: true },
    { id: 'S-7', name: 'Arjun', role: 'Senior Tech', phone: '9000007777', active: true },
    { id: 'S-8', name: 'Kiran', role: 'Senior Tech', phone: '9000008888', active: true },
    { id: 'S-9', name: 'Pooja', role: 'Supervisor', phone: '9000009999', active: true },
  ])
  const [newStaff, setNewStaff] = useState({ name: '', role: 'Supervisor', phone: '' })
  const [newTicketForm, setNewTicketForm] = useState({
    plateNo: '',
    model: '',
    ownerName: '',
    supervisor: 'Anita',
    tech: '',
    gateKeeper: 'Ramesh',
    serviceCharge: 500,
    gatePassVerified: false,
    noPlateDetected: false,
  })
  const [plateOcr, setPlateOcr] = useState({
    status: 'idle', // idle|ready|scanning|done|error
    previewUrl: null,
    rawText: '',
    extractedPlate: '',
    error: '',
  })
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const videoRef = useRef(null)

  const closedTickets = tickets.filter((ticket) => ticket.stage === 'Closed')
  const activeWorkOrdersCount = tickets.filter(
    (ticket) => ticket.stage !== 'Closed' && ticket.stage !== 'Cancelled'
  ).length
  const completedWorkOrdersCount = tickets.filter((ticket) => ticket.stage === 'Closed').length
  const pendingApprovalCount = tickets.filter((ticket) => ticket.stage === 'Owner Approval').length
  const servicedVehiclesCount = tickets.filter((ticket) => ticket.paid || ticket.stage === 'Closed').length
  const supervisorStaff = staff.filter((person) => person.role === 'Supervisor')
  const technicalStaff = staff.filter((person) => person.role === 'Senior Tech')
  const technicalStaffCount = technicalStaff.length
  const monthlySeries = getLast12MonthsSeries(tickets)
  const maxMonthlyCount = Math.max(...monthlySeries.map((item) => item.total), 1)
  const chartWidth = 720
  const chartHeight = 260
  const chartPadding = 30
  const slotWidth = (chartWidth - chartPadding * 2) / monthlySeries.length
  const barWidth = Math.max(slotWidth * 0.6, 10)
  const statusChartConfig = [
    { key: 'Closed', color: '#2e8b57', label: 'Completed' },
    { key: 'Cancelled', color: '#d9534f', label: 'Cancelled' },
    { key: 'Owner Approval', color: '#f0ad4e', label: 'Pending Approval' },
    { key: 'Active', color: '#3366ff', label: 'Active' },
  ]
  const statusTotals = statusChartConfig.map((status) => ({
    ...status,
    total: monthlySeries.reduce((sum, month) => sum + month.counts[status.key], 0),
  }))
  const managerStaff = staff.filter((person) => person.role === 'Manager')
  const gateKeeperStaff = staff.filter((person) => person.role === 'Gate Keeper')
  const activityLogRowsBase = useMemo(
    () =>
      tickets.flatMap((ticket) =>
        ticket.timeline.map((event, index) => ({
          id: `${ticket.id}-${index}`,
          ticketId: ticket.id,
          event,
          supervisor: ticket.supervisor || '',
          tech: ticket.tech || '',
          logDate: ticket.createdAt || '',
        }))
      ),
    [tickets]
  )
  const [workOrderSearch, setWorkOrderSearch] = useState({
    startDate: '',
    endDate: '',
    tech: '',
    supervisor: '',
    gateKeeper: '',
    vehicleName: '',
  })
  const [activityLogFilters, setActivityLogFilters] = useState({
    workOrderId: '',
    supervisor: '',
    tech: '',
    startDate: '',
    endDate: '',
  })
  const [historyFilters, setHistoryFilters] = useState({
    workOrderId: '',
    supervisor: '',
    tech: '',
    startDate: '',
    endDate: '',
    plateNo: '',
  })
  const filteredActivityLogRows = useMemo(() => {
    const q = activityLogFilters.workOrderId.trim().toLowerCase()
    return activityLogRowsBase.filter((row) => {
      const byWorkOrder = !q || row.ticketId.toLowerCase().includes(q)
      const bySupervisor = !activityLogFilters.supervisor || row.supervisor === activityLogFilters.supervisor
      const byTech = !activityLogFilters.tech || row.tech === activityLogFilters.tech
      const byStart = !activityLogFilters.startDate || (row.logDate && row.logDate >= activityLogFilters.startDate)
      const byEnd = !activityLogFilters.endDate || (row.logDate && row.logDate <= activityLogFilters.endDate)
      return byWorkOrder && bySupervisor && byTech && byStart && byEnd
    })
  }, [activityLogRowsBase, activityLogFilters])
  const [historyPage, setHistoryPage] = useState(1)
  const [workOrderSearchPage, setWorkOrderSearchPage] = useState(1)
  const [historyDetailModalId, setHistoryDetailModalId] = useState(null)
  const [paymentMonthDetailYm, setPaymentMonthDetailYm] = useState(null)
  const historyModalTicket = useMemo(
    () => (historyDetailModalId ? tickets.find((t) => t.id === historyDetailModalId) : null),
    [tickets, historyDetailModalId]
  )
  const historyModalTotals = historyModalTicket ? calculateTotals(historyModalTicket) : null

  const historyRowsSorted = useMemo(() => {
    const closed = tickets.filter((ticket) => ticket.stage === 'Closed')
    const rows = closed.length ? [...closed] : [...tickets]
    rows.sort((a, b) => {
      const da = a.createdAt || ''
      const db = b.createdAt || ''
      if (db !== da) return db.localeCompare(da)
      return String(b.id).localeCompare(String(a.id))
    })
    return rows
  }, [tickets])

  const filteredHistoryRows = useMemo(() => {
    const qId = historyFilters.workOrderId.trim().toLowerCase()
    const qPlate = historyFilters.plateNo.trim().toLowerCase()
    return historyRowsSorted.filter((ticket) => {
      const byId = !qId || String(ticket.id).toLowerCase().includes(qId)
      const bySupervisor = !historyFilters.supervisor || ticket.supervisor === historyFilters.supervisor
      const byTech = !historyFilters.tech || ticket.tech === historyFilters.tech
      const byStart = !historyFilters.startDate || (ticket.createdAt && ticket.createdAt >= historyFilters.startDate)
      const byEnd = !historyFilters.endDate || (ticket.createdAt && ticket.createdAt <= historyFilters.endDate)
      const plateHaystack = (ticket.plateNo || '').toLowerCase()
      const byPlate = !qPlate || plateHaystack.includes(qPlate)
      return byId && bySupervisor && byTech && byStart && byEnd && byPlate
    })
  }, [historyRowsSorted, historyFilters])

  const historyTotalPages = Math.max(1, Math.ceil(filteredHistoryRows.length / HISTORY_PAGE_SIZE))

  useEffect(() => {
    setHistoryPage((page) => Math.min(page, historyTotalPages))
  }, [historyTotalPages])

  useEffect(() => {
    setHistoryPage(1)
  }, [
    historyFilters.workOrderId,
    historyFilters.supervisor,
    historyFilters.tech,
    historyFilters.startDate,
    historyFilters.endDate,
    historyFilters.plateNo,
  ])

  useEffect(() => {
    setWorkOrderSearchPage(1)
  }, [
    workOrderSearch.startDate,
    workOrderSearch.endDate,
    workOrderSearch.tech,
    workOrderSearch.supervisor,
    workOrderSearch.gateKeeper,
    workOrderSearch.vehicleName,
  ])

  useEffect(() => {
    if (!historyDetailModalId && !paymentMonthDetailYm) return undefined
    function onKeyDown(e) {
      if (e.key !== 'Escape') return
      if (paymentMonthDetailYm) setPaymentMonthDetailYm(null)
      else if (historyDetailModalId) setHistoryDetailModalId(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [historyDetailModalId, paymentMonthDetailYm])

  useEffect(
    () => () => {
      stopCameraStream()
    },
    []
  )

  const historyPageClamped = Math.min(Math.max(1, historyPage), historyTotalPages)
  const historyPageSlice = filteredHistoryRows.slice(
    (historyPageClamped - 1) * HISTORY_PAGE_SIZE,
    historyPageClamped * HISTORY_PAGE_SIZE
  )
  const filteredWorkOrders = tickets.filter((ticket) => {
    const byStartDate = !workOrderSearch.startDate || ticket.createdAt >= workOrderSearch.startDate
    const byEndDate = !workOrderSearch.endDate || ticket.createdAt <= workOrderSearch.endDate
    const byTech = !workOrderSearch.tech || ticket.tech === workOrderSearch.tech
    const bySupervisor = !workOrderSearch.supervisor || ticket.supervisor === workOrderSearch.supervisor
    const byGateKeeper = !workOrderSearch.gateKeeper || ticket.gateKeeper === workOrderSearch.gateKeeper
    const byVehicle = !workOrderSearch.vehicleName
      || ticket.model.toLowerCase().includes(workOrderSearch.vehicleName.toLowerCase())
    return byStartDate && byEndDate && byTech && bySupervisor && byGateKeeper && byVehicle
  })

  const workOrderSearchTotalPages = Math.max(1, Math.ceil(filteredWorkOrders.length / HISTORY_PAGE_SIZE))

  useEffect(() => {
    setWorkOrderSearchPage((page) => Math.min(page, workOrderSearchTotalPages))
  }, [workOrderSearchTotalPages])

  const workOrderSearchPageClamped = Math.min(Math.max(1, workOrderSearchPage), workOrderSearchTotalPages)
  const workOrderSearchPageSlice = filteredWorkOrders.slice(
    (workOrderSearchPageClamped - 1) * HISTORY_PAGE_SIZE,
    workOrderSearchPageClamped * HISTORY_PAGE_SIZE
  )

  const newAndActiveInvoiceRows = useMemo(() => {
    const open = tickets.filter((t) => t.stage !== 'Closed' && t.stage !== 'Cancelled')
    const rows = open.map((ticket) => ({
      ticket,
      invoiceKind: ticket.stage === 'Intake' ? 'New' : 'Active',
      totals: calculateTotals(ticket),
    }))
    rows.sort((a, b) => {
      if (a.invoiceKind !== b.invoiceKind) return a.invoiceKind === 'New' ? -1 : 1
      const da = a.ticket.createdAt || ''
      const db = b.ticket.createdAt || ''
      return db.localeCompare(da)
    })
    return rows
  }, [tickets])

  const paymentReceivedByMonth = useMemo(() => {
    const map = new Map()
    tickets
      .filter((t) => t.paid)
      .forEach((ticket) => {
        const ym = (ticket.createdAt || '').slice(0, 7)
        if (!ym || ym.length < 7) return
        const totals = calculateTotals(ticket)
        const paidAmount = totals.totalAfterDiscount
        const discount = Number(ticket.discount) || 0
        if (!map.has(ym)) {
          map.set(ym, {
            ymKey: ym,
            paidOrderCount: 0,
            paymentReceived: 0,
            discountsGiven: 0,
          })
        }
        const row = map.get(ym)
        row.paidOrderCount += 1
        row.paymentReceived += paidAmount
        row.discountsGiven += discount
      })
    const list = Array.from(map.values())
    list.sort((a, b) => b.ymKey.localeCompare(a.ymKey))
    return list
  }, [tickets])

  const paymentReceivedTotals = useMemo(
    () =>
      paymentReceivedByMonth.reduce(
        (acc, row) => ({
          paidOrderCount: acc.paidOrderCount + row.paidOrderCount,
          paymentReceived: acc.paymentReceived + row.paymentReceived,
          discountsGiven: acc.discountsGiven + row.discountsGiven,
        }),
        { paidOrderCount: 0, paymentReceived: 0, discountsGiven: 0 }
      ),
    [paymentReceivedByMonth]
  )

  const paidOrderDetailsByMonth = useMemo(() => {
    const map = new Map()
    tickets
      .filter((t) => t.paid)
      .forEach((ticket) => {
        const ym = (ticket.createdAt || '').slice(0, 7)
        if (!ym || ym.length < 7) return
        const amount = calculateTotals(ticket).totalAfterDiscount
        if (!map.has(ym)) map.set(ym, [])
        map.get(ym).push({ workOrderId: ticket.id, amount })
      })
    map.forEach((list) => list.sort((a, b) => String(a.workOrderId).localeCompare(String(b.workOrderId))))
    return map
  }, [tickets])

  const paymentMonthDetailLines = paymentMonthDetailYm
    ? paidOrderDetailsByMonth.get(paymentMonthDetailYm) || []
    : []
  const paymentMonthModalTitle = useMemo(() => {
    if (!paymentMonthDetailYm) return ''
    const { year, monthName } = parseYearMonthParts(paymentMonthDetailYm)
    return `${monthName} ${year}`
  }, [paymentMonthDetailYm])

  function createTicket(event) {
    event.preventDefault()
    const nowTicketCount = tickets.length + 1
    const isTestVehicle = newTicketForm.noPlateDetected || !newTicketForm.plateNo.trim()
    const createdId = isTestVehicle
      ? `TEST-${String(900 + nowTicketCount)}`
      : `TKT-${String(24000 + nowTicketCount)}`

    const nowIso = new Date().toISOString()
    const createdTicket = {
      id: createdId,
      plateNo: isTestVehicle ? null : newTicketForm.plateNo.trim().toUpperCase(),
      model: newTicketForm.model.trim() || 'Unknown Model',
      isTestVehicle,
      stage: 'Intake',
      createdAt: nowIso.slice(0, 10),
      checkInAt: nowIso,
      checkOutAt: null,
      supervisor: newTicketForm.supervisor.trim() || 'Unassigned',
      tech: newTicketForm.tech.trim(),
      gateKeeper: newTicketForm.gateKeeper.trim() || 'Unassigned',
      gatePassVerified: newTicketForm.gatePassVerified,
      serviceCharge: Number(newTicketForm.serviceCharge) || 0,
      discount: 0,
      paid: false,
      diagnosisSubmitted: false,
      qcDone: false,
      ownerOrderConfirmed: false,
      supervisorOrderApproved: false,
      items: [{ id: `I-${Date.now()}`, description: 'Initial inspection', cost: 0, approved: true }],
      timeline: [
        isTestVehicle
          ? 'No plate detected from OCR, temporary tracking ID created'
          : `Work-Order created for plate ${newTicketForm.plateNo.trim().toUpperCase()}`,
      ],
    }

    setTickets((current) => [createdTicket, ...current])
    setNewTicketForm({
      plateNo: '',
      model: '',
      ownerName: '',
      supervisor: 'Anita',
      tech: '',
      gateKeeper: 'Ramesh',
      serviceCharge: 500,
      gatePassVerified: false,
      noPlateDetected: false,
    })
    closeDeviceCamera()
    // Avoid leaking object URLs from the OCR preview image.
    if (plateOcr.previewUrl) URL.revokeObjectURL(plateOcr.previewUrl)
    setPlateOcr({
      status: 'idle',
      previewUrl: null,
      rawText: '',
      extractedPlate: '',
      error: '',
    })
  }

  function recordVehicleCheckout(ticketId) {
    const ts = new Date().toISOString()
    setTickets((current) =>
      current.map((ticket) => {
        if (ticket.id !== ticketId) return ticket
        if (ticket.checkOutAt) return ticket
        return {
          ...ticket,
          checkOutAt: ts,
          timeline: [...ticket.timeline, 'Vehicle checkout time recorded'],
        }
      })
    )
  }

  function confirmOrderByOwner(ticketId) {
    setTickets((current) =>
      current.map((ticket) => {
        if (ticket.id !== ticketId) return ticket
        if (ticket.stage === 'Closed' || ticket.stage === 'Cancelled') return ticket
        if (ticket.ownerOrderConfirmed) return ticket
        if (ticket.stage !== 'Intake') return ticket
        return {
          ...ticket,
          ownerOrderConfirmed: true,
          stage: 'Owner Approval',
          timeline: [...ticket.timeline, 'Order confirmed by vehicle owner'],
        }
      })
    )
  }

  function approveOrderBySupervisor(ticketId) {
    setTickets((current) =>
      current.map((ticket) => {
        if (ticket.id !== ticketId) return ticket
        if (ticket.stage === 'Closed' || ticket.stage === 'Cancelled') return ticket
        if (!ticket.ownerOrderConfirmed || ticket.supervisorOrderApproved) return ticket
        return {
          ...ticket,
          supervisorOrderApproved: true,
          stage: 'Diagnosis',
          timeline: [...ticket.timeline, 'Order approved by Supervisor — technical work may begin'],
        }
      })
    )
  }

  function clearPlateOcr() {
    closeDeviceCamera()
    if (plateOcr.previewUrl) URL.revokeObjectURL(plateOcr.previewUrl)
    setPlateOcr({
      status: 'idle',
      previewUrl: null,
      rawText: '',
      extractedPlate: '',
      error: '',
    })
    // Keep existing form values; user can still type manually.
  }

  function setPlateImagePreviewFromBlob(blob) {
    const nextUrl = URL.createObjectURL(blob)
    setPlateOcr((prev) => {
      if (prev.previewUrl) URL.revokeObjectURL(prev.previewUrl)
      return {
        status: 'ready',
        previewUrl: nextUrl,
        rawText: '',
        extractedPlate: '',
        error: '',
      }
    })
    return nextUrl
  }

  function stopCameraStream() {
    const stream = videoRef.current && videoRef.current.srcObject
    if (stream && typeof stream.getTracks === 'function') {
      stream.getTracks().forEach((track) => track.stop())
    }
    if (videoRef.current) videoRef.current.srcObject = null
  }

  async function openDeviceCamera() {
    setCameraError('')
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not available in this browser.')
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      setCameraOpen(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      }, 0)
    } catch (err) {
      const reason = err && err.message ? String(err.message) : 'Could not access camera.'
      setCameraError(reason)
    }
  }

  function closeDeviceCamera() {
    stopCameraStream()
    setCameraOpen(false)
  }

  async function captureFromCameraAndScan() {
    const video = videoRef.current
    if (!video || !video.videoWidth || !video.videoHeight) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92)
    )
    if (!blob) return

    const previewUrl = setPlateImagePreviewFromBlob(blob)
    closeDeviceCamera()
    scanPlateFromPreviewImage(previewUrl)
  }

  async function scanPlateFromPreviewImage(previewUrlArg) {
    const previewUrl = previewUrlArg || plateOcr.previewUrl
    if (!previewUrl) return

    setPlateOcr((prev) => ({
      ...prev,
      status: 'scanning',
      error: '',
      rawText: '',
      extractedPlate: '',
    }))

    try {
      const img = new Image()
      img.src = previewUrl

      await new Promise((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Failed to load image for OCR'))
      })

      let rawText = ''
      try {
        rawText = (await detectTextWithBrowserTextDetector(img)) || ''
      } catch (err) {
        const isUnsupported =
          String(err && err.message) === 'TextDetectorNotSupported' ||
          String(err && err.message).includes('TextDetectorNotSupported')

        if (!isUnsupported) throw err
      }

      if (!rawText.trim()) {
        rawText = await detectTextWithTesseract(img)
      } else {
        let extractedTry = extractPlateFromOcrText(rawText)
        if (!extractedTry) {
          const tess = await detectTextWithTesseract(img)
          rawText = [rawText, tess].filter(Boolean).join('\n')
        }
      }

      const extracted = extractPlateFromOcrText(rawText)

      setPlateOcr((prev) => ({
        ...prev,
        status: extracted ? 'done' : 'error',
        rawText,
        extractedPlate: extracted || '',
        error: extracted
          ? ''
          : 'No plate-like text detected in the image. Please enter the plate manually or mark as test (No plate detected).',
      }))

      setNewTicketForm((prev) => ({
        ...prev,
        plateNo: extracted ? extracted.toUpperCase() : '',
        noPlateDetected: !extracted,
      }))
    } catch (err) {
      const detail = err && err.message ? String(err.message) : ''
      setPlateOcr({
        status: 'error',
        previewUrl,
        rawText: '',
        extractedPlate: '',
        error: detail
          ? `OCR failed (${detail}). Try a sharper photo, better lighting, or enter the plate manually.`
          : 'OCR failed. Try a sharper photo, better lighting, or enter the plate manually.',
      })
    }
  }

  function addStaff(event) {
    event.preventDefault()
    if (!newStaff.name.trim()) return
    const person = {
      id: `S-${Date.now()}`,
      name: newStaff.name.trim(),
      role: newStaff.role,
      phone: newStaff.phone.trim(),
      active: true,
    }
    setStaff((current) => [person, ...current])
    setNewStaff({ name: '', role: 'Supervisor', phone: '' })
  }

  function toggleStaffStatus(staffId) {
    setStaff((current) =>
      current.map((person) =>
        person.id === staffId ? { ...person, active: !person.active } : person
      )
    )
  }

  function downloadInvoice(ticket) {
    if (!ticket) return
    const invoiceTotals = calculateTotals(ticket)
    const invoiceLines = [
      `Invoice for Work-Order ${ticket.id}`,
      '----------------------------------------',
      `Date: ${ticket.createdAt || '-'}`,
      `Check-in: ${formatDateTime(ticket.checkInAt)}`,
      `Check-out: ${ticket.checkOutAt ? formatDateTime(ticket.checkOutAt) : '—'}`,
      `Owner order confirmed: ${ticket.ownerOrderConfirmed ? 'Yes' : 'No'}`,
      `Supervisor order approved: ${ticket.supervisorOrderApproved ? 'Yes' : 'No'}`,
      `Vehicle: ${ticket.model}`,
      `Plate: ${ticket.plateNo || 'NO-PLATE / TEST'}`,
      `Supervisor: ${ticket.supervisor || '-'}`,
      `Technical Staff: ${ticket.tech || '-'}`,
      `Gate Keeper: ${ticket.gateKeeper || '-'}`,
      '',
      'Line Items:',
      ...ticket.items.map(
        (item, index) =>
          `${index + 1}. ${item.description} - ${formatCurrency(item.cost)} (${item.approved ? 'Approved' : 'Rejected'})`
      ),
      '',
      `Parts Total: ${formatCurrency(invoiceTotals.partsCost)}`,
      `Service Charge: ${formatCurrency(ticket.serviceCharge)}`,
      `Discount: ${formatCurrency(ticket.discount)}`,
      `Final Total: ${formatCurrency(invoiceTotals.totalAfterDiscount)}`,
      `Payment Status: ${ticket.paid ? 'Paid' : 'Unpaid'}`,
    ]

    const blob = new Blob([invoiceLines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${ticket.id}-invoice.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>Garage Management System</h1>
          <p className="muted">Role based modules for intake, operations, and audit trail.</p>
        </div>
        <div className="topbar-actions">
          <label className="role-picker">
            User
            <select value={activeRole} onChange={(e) => setActiveRole(e.target.value)}>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="header-guide-btn"
            onClick={() => setActiveMenu('User Guide')}
          >
            User Guide
          </button>
        </div>
      </header>

      <main className={`layout-with-menu${sidebarCollapsed ? ' layout-with-menu--sidebar-collapsed' : ''}`}>
        <aside className={`panel sidebar${sidebarCollapsed ? ' sidebar--collapsed' : ''}`}>
          <div className="sidebar-head">
            <h2 className={`sidebar-title ${sidebarCollapsed ? 'sidebar-title--collapsed' : ''}`}>Menu</h2>
            <button
              type="button"
              className="sidebar-collapse-toggle"
              onClick={() => setSidebarCollapsed((c) => !c)}
              title={sidebarCollapsed ? 'Expand menu' : 'Minimize menu'}
              aria-label={sidebarCollapsed ? 'Expand main menu' : 'Minimize main menu'}
              aria-expanded={!sidebarCollapsed}
            >
              {sidebarCollapsed ? (
                <NavIcon menuId="MenuExpand" />
              ) : (
                <NavIcon menuId="MenuCollapse" />
              )}
            </button>
          </div>
          {NAV_CONFIG.map((entry) => {
            if (entry.kind === 'link') {
              return (
                <button
                  type="button"
                  key={entry.id}
                  className={`menu-btn ${activeMenu === entry.id ? 'active' : ''}`}
                  onClick={() => setActiveMenu(entry.id)}
                  title={entry.id}
                >
                  <span className="menu-btn-icon-wrap" aria-hidden>
                    <NavIcon menuId={entry.id} />
                  </span>
                  <span className="menu-btn-label">{entry.id}</span>
                </button>
              )
            }
            const childActive = entry.items.some((item) => navGroupItemId(item) === activeMenu)
            const groupOpen = menuGroupsOpen[entry.label] !== false
            return (
              <div key={entry.label} className="menu-group">
                <button
                  type="button"
                  className={`menu-group-toggle ${childActive ? 'menu-group-active' : ''}`}
                  onClick={() =>
                    setMenuGroupsOpen((prev) => ({
                      ...prev,
                      [entry.label]: !prev[entry.label],
                    }))
                  }
                  aria-expanded={groupOpen}
                  title={entry.label}
                >
                  <span className="menu-group-icon-wrap" aria-hidden>
                    <NavIcon menuId={entry.label} variant="group" />
                  </span>
                  <span className="menu-group-label">{entry.label}</span>
                  <span className="menu-chevron" aria-hidden>
                    {groupOpen ? '▾' : '▸'}
                  </span>
                </button>
                {groupOpen && (
                  <div className="menu-sublist">
                    {entry.items.map((item) => {
                      const itemId = navGroupItemId(item)
                      const itemLabel = navGroupItemLabel(item)
                      return (
                        <button
                          type="button"
                          key={itemId}
                          className={`menu-btn menu-sub ${activeMenu === itemId ? 'active' : ''}`}
                          onClick={() => setActiveMenu(itemId)}
                          title={itemLabel}
                        >
                          <span className="menu-btn-icon-wrap" aria-hidden>
                            <NavIcon menuId={itemId} variant="sub" />
                          </span>
                          <span className="menu-btn-label">{itemLabel}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </aside>

        <section className="panel content-page">
          {activeMenu === 'Dashboard' && (
            <div>
              <h2>Dashboard</h2>
              <div className="kpi-grid">
                <div className="kpi-card">
                  <p>Vehicles Serviced</p>
                  <strong>{servicedVehiclesCount}</strong>
                </div>
                <div className="kpi-card">
                  <p>Active Work-Orders</p>
                  <strong>{activeWorkOrdersCount}</strong>
                </div>
                <div className="kpi-card">
                  <p>Completed Work-Orders</p>
                  <strong>{completedWorkOrdersCount}</strong>
                </div>
                <div className="kpi-card">
                  <p>Pending Approval</p>
                  <strong>{pendingApprovalCount}</strong>
                </div>
                <div className="kpi-card">
                  <p>Technical Staffs</p>
                  <strong>{technicalStaffCount}</strong>
                </div>
              </div>
              <div className="panel chart-panel">
                <h3>Work-Orders Received (Last 12 Months)</h3>
                <div className="chart-legend">
                  {statusTotals.map((status) => (
                    <p key={status.key} className="legend-item">
                      <span className="legend-swatch" style={{ backgroundColor: status.color }} />
                      {status.label}: {status.total}
                    </p>
                  ))}
                </div>
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="bar-chart"
                  role="img"
                  aria-label="Stacked bar chart for monthly work-order counts by status"
                >
                  <line
                    x1={chartPadding}
                    y1={chartHeight - chartPadding}
                    x2={chartWidth - chartPadding}
                    y2={chartHeight - chartPadding}
                    stroke="#aeb9d1"
                    strokeWidth="1"
                  />
                  <line
                    x1={chartPadding}
                    y1={chartPadding}
                    x2={chartPadding}
                    y2={chartHeight - chartPadding}
                    stroke="#aeb9d1"
                    strokeWidth="1"
                  />
                  {monthlySeries.map((item, index) => {
                    const x = chartPadding + index * slotWidth + (slotWidth - barWidth) / 2
                    const labelX = x + barWidth / 2
                    let currentY = chartHeight - chartPadding
                    return (
                      <g key={item.key}>
                        {statusChartConfig.map((status) => {
                          const value = item.counts[status.key]
                          if (!value) return null
                          const segmentHeight = (value / maxMonthlyCount) * (chartHeight - chartPadding * 2)
                          const y = currentY - segmentHeight
                          currentY = y
                          return (
                            <rect
                              key={`${item.key}-${status.key}`}
                              x={x}
                              y={y}
                              width={barWidth}
                              height={segmentHeight}
                              fill={status.color}
                            />
                          )
                        })}
                        <text x={labelX} y={chartHeight - 10} textAnchor="middle" className="chart-label">
                          {item.label}
                        </text>
                        <text x={labelX} y={currentY - 8} textAnchor="middle" className="chart-value">
                          {item.total}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>
            </div>
          )}

          {activeMenu === 'User Guide' && (
            <div>
              <h2>User Guide</h2>
              <div className="guide-section">
                <h3>1) Dashboard</h3>
                <p>View overall KPIs, monthly work-order trends, and status-wise performance in the stacked bar chart.</p>
              </div>
              <div className="guide-section">
                <h3>2) Order Management</h3>
                <p>
                  Use the Order Management section in the menu to open Work-Order Entry, Work-Order Search, Work-Order History, Invoices, and Payment Received.
                  Click the group header to expand or collapse these items.
                </p>
              </div>
              <div className="guide-section">
                <h3>3) Work-Order Entry</h3>
                <p>
                  Create new work-orders when vehicles arrive. Check-in time is saved automatically when the work-order is created.
                  Use Record checkout in the work-order detail popup when the vehicle leaves. Use the no-plate option for test vehicles and record gate verification.
                </p>
              </div>
              <div className="guide-section">
                <h3>4) Work-Order Search</h3>
                <p>Use start/end date, technical staff, supervisor, gate keeper, and vehicle name filters to locate records quickly.</p>
              </div>
              <div className="guide-section">
                <h3>5) Work-Order History & Details</h3>
                <p>Click a Work-Order ID in history to open invoice details. Download invoice to share or archive billing information.</p>
              </div>
              <div className="guide-section">
                <h3>6) Invoices</h3>
                <p>
                  View all new and active invoices: new means intake stage, active means any other open work-order before closure or cancellation.
                  Click a Work-Order ID to open the invoice popup.
                </p>
              </div>
              <div className="guide-section">
                <h3>7) Payment Received</h3>
                <p>
                  See payment collected and discounts given by calendar month and year for all paid work-orders (grouped by work-order created date).
                  Click a paid work-order count to open a list of work-order IDs and amounts; from there you can open the full invoice popup for a row.
                </p>
              </div>
              <div className="guide-section">
                <h3>8) Staff Management</h3>
                <p>
                  Open the Staff Management section in the menu for All staff (add and list), plus Supervisor, Technical staff,
                  Manager, and Gate keeper role views. Use the group header to expand or collapse these items.
                </p>
              </div>
              <div className="guide-section">
                <h3>9) Activity Log</h3>
                <p>Track timeline events for each work-order to support audit and operational transparency.</p>
              </div>
            </div>
          )}

          {activeMenu === 'Work-Order Entry' && (
            <div>
              <h2>Work-Order Entry</h2>
              <form className="intake-form wide" onSubmit={createTicket}>
                <h3>Vehicle Arrival Intake</h3>
                <input
                  type="text"
                  placeholder="Plate No (OCR/manual)"
                  value={newTicketForm.plateNo}
                  onChange={(e) => setNewTicketForm((prev) => ({ ...prev, plateNo: e.target.value }))}
                  disabled={newTicketForm.noPlateDetected}
                />
                <div className="plate-ocr">
                  <div className="plate-ocr-controls">
                    <input
                      type="file"
                      accept="image/*"
                      aria-label="Upload vehicle plate image"
                      onChange={(e) => {
                        const file = e.target.files && e.target.files[0]
                        if (!file) return
                        setPlateImagePreviewFromBlob(file)
                      }}
                    />
                    <button
                      type="button"
                      onClick={openDeviceCamera}
                      disabled={plateOcr.status === 'scanning'}
                      title="Open live camera to capture the plate"
                    >
                      Use Camera
                    </button>
                    <button
                      type="button"
                      onClick={scanPlateFromPreviewImage}
                      disabled={!plateOcr.previewUrl || plateOcr.status === 'scanning'}
                      title={!plateOcr.previewUrl ? 'Upload an image first' : 'Scan plate from uploaded image'}
                    >
                      {plateOcr.status === 'scanning' ? 'Scanning…' : 'Scan Plate'}
                    </button>
                    <button type="button" onClick={clearPlateOcr} disabled={plateOcr.status === 'scanning'}>
                      Clear
                    </button>
                  </div>

                  {cameraError && <p className="ocr-error">{cameraError}</p>}

                  {cameraOpen && (
                    <div className="camera-capture-panel">
                      <video ref={videoRef} className="camera-live-preview" autoPlay playsInline muted />
                      <div className="camera-actions">
                        <button type="button" onClick={captureFromCameraAndScan}>
                          Capture & Scan
                        </button>
                        <button type="button" onClick={closeDeviceCamera}>
                          Close Camera
                        </button>
                      </div>
                    </div>
                  )}

                  {plateOcr.previewUrl && (
                    <img
                      src={plateOcr.previewUrl}
                      alt="Vehicle plate preview"
                      className="plate-ocr-preview"
                    />
                  )}

                  {plateOcr.error && <p className="ocr-error">{plateOcr.error}</p>}

                  {plateOcr.extractedPlate && (
                    <p className="ocr-status">
                      Detected plate: <strong>{plateOcr.extractedPlate}</strong>
                    </p>
                  )}

                  {plateOcr.rawText && (
                    <details className="ocr-raw">
                      <summary>OCR text</summary>
                      <pre>{plateOcr.rawText}</pre>
                    </details>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Vehicle model"
                  value={newTicketForm.model}
                  onChange={(e) => setNewTicketForm((prev) => ({ ...prev, model: e.target.value }))}
                  required
                />
                <input
                  type="text"
                  placeholder="Owner name"
                  value={newTicketForm.ownerName}
                  onChange={(e) => setNewTicketForm((prev) => ({ ...prev, ownerName: e.target.value }))}
                />
                <input
                  type="text"
                  placeholder="Supervisor"
                  value={newTicketForm.supervisor}
                  onChange={(e) => setNewTicketForm((prev) => ({ ...prev, supervisor: e.target.value }))}
                />
                <input
                  type="text"
                  placeholder="Assign tech (optional)"
                  value={newTicketForm.tech}
                  onChange={(e) => setNewTicketForm((prev) => ({ ...prev, tech: e.target.value }))}
                />
                <input
                  type="text"
                  placeholder="Gate keeper"
                  value={newTicketForm.gateKeeper}
                  onChange={(e) => setNewTicketForm((prev) => ({ ...prev, gateKeeper: e.target.value }))}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Service charge"
                  value={newTicketForm.serviceCharge}
                  onChange={(e) => setNewTicketForm((prev) => ({ ...prev, serviceCharge: e.target.value }))}
                />
                <label>
                  <input
                    type="checkbox"
                    checked={newTicketForm.noPlateDetected}
                    onChange={(e) =>
                      setNewTicketForm((prev) => ({
                        ...prev,
                        noPlateDetected: e.target.checked,
                        plateNo: e.target.checked ? '' : prev.plateNo,
                      }))
                    }
                  />
                  No plate detected (On Test)
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={newTicketForm.gatePassVerified}
                    onChange={(e) => setNewTicketForm((prev) => ({ ...prev, gatePassVerified: e.target.checked }))}
                  />
                  Gate pass already verified
                </label>
                <button type="submit" disabled={activeRole !== 'Gate Keeper' && activeRole !== 'Supervisor'}>
                  Create Work-Order
                </button>
              </form>
            </div>
          )}

          {activeMenu === 'Work-Order History' && (
            <div>
              <h2>Work-Order History</h2>
              <div className="search-filters activity-log-filters">
                <input
                  type="text"
                  placeholder="Search Work-Order ID"
                  value={historyFilters.workOrderId}
                  onChange={(e) => setHistoryFilters((prev) => ({ ...prev, workOrderId: e.target.value }))}
                  aria-label="Search by Work-Order ID"
                />
                <select
                  value={historyFilters.supervisor}
                  onChange={(e) => setHistoryFilters((prev) => ({ ...prev, supervisor: e.target.value }))}
                  aria-label="Filter by supervisor"
                >
                  <option value="">All Supervisors</option>
                  {supervisorStaff.map((person) => (
                    <option key={person.id} value={person.name}>{person.name}</option>
                  ))}
                </select>
                <select
                  value={historyFilters.tech}
                  onChange={(e) => setHistoryFilters((prev) => ({ ...prev, tech: e.target.value }))}
                  aria-label="Filter by technical staff"
                >
                  <option value="">All Technical Staff</option>
                  {technicalStaff.map((person) => (
                    <option key={person.id} value={person.name}>{person.name}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={historyFilters.startDate}
                  onChange={(e) => setHistoryFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                  aria-label="Start date"
                  title="Start date"
                />
                <input
                  type="date"
                  value={historyFilters.endDate}
                  onChange={(e) => setHistoryFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                  aria-label="End date"
                  title="End date"
                />
                <input
                  type="text"
                  placeholder="Vehicle plate no."
                  value={historyFilters.plateNo}
                  onChange={(e) => setHistoryFilters((prev) => ({ ...prev, plateNo: e.target.value }))}
                  aria-label="Search by vehicle plate number"
                />
                <button
                  type="button"
                  onClick={() =>
                    setHistoryFilters({
                      workOrderId: '',
                      supervisor: '',
                      tech: '',
                      startDate: '',
                      endDate: '',
                      plateNo: '',
                    })
                  }
                >
                  Reset filters
                </button>
              </div>
              <p className="history-meta">
                {historyRowsSorted.length === 0 ? (
                  <>No work-orders in history.</>
                ) : filteredHistoryRows.length === 0 ? (
                  <>No work-orders match the current filters.</>
                ) : (
                  <>
                    Showing {(historyPageClamped - 1) * HISTORY_PAGE_SIZE + 1}
                    –
                    {Math.min(historyPageClamped * HISTORY_PAGE_SIZE, filteredHistoryRows.length)} of {filteredHistoryRows.length}
                    {' '}
                    ({HISTORY_PAGE_SIZE} per page; filtered from {historyRowsSorted.length} in history)
                  </>
                )}
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Work-Order ID</th>
                    <th>Plate</th>
                    <th>Model</th>
                    <th>Stage</th>
                    <th>Date</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {historyPageSlice.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => setHistoryDetailModalId(ticket.id)}
                        >
                          {ticket.id}
                        </button>
                      </td>
                      <td>{ticket.plateNo || 'NO-PLATE / TEST'}</td>
                      <td>{ticket.model}</td>
                      <td>{ticket.stage}</td>
                      <td>{ticket.createdAt || '-'}</td>
                      <td>{formatDateTime(ticket.checkInAt)}</td>
                      <td>{formatDateTime(ticket.checkOutAt)}</td>
                      <td>{ticket.paid ? 'Paid' : 'Unpaid'}</td>
                    </tr>
                  ))}
                  {historyRowsSorted.length > 0 && filteredHistoryRows.length === 0 && (
                    <tr>
                      <td colSpan="8">No work-orders match the current filters.</td>
                    </tr>
                  )}
                  {historyRowsSorted.length === 0 && (
                    <tr>
                      <td colSpan="8">No work-orders in history.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              {filteredHistoryRows.length > 0 && (
                <div className="pagination">
                  <button
                    type="button"
                    disabled={historyPageClamped <= 1}
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span className="pagination-info">
                    Page {historyPageClamped} of {historyTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={historyPageClamped >= historyTotalPages}
                    onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {activeMenu === 'Work-Order Search' && (
            <div>
              <h2>Work-Order Search</h2>
              <div className="search-filters">
                <input
                  type="date"
                  value={workOrderSearch.startDate}
                  onChange={(e) => setWorkOrderSearch((prev) => ({ ...prev, startDate: e.target.value }))}
                  aria-label="Start date"
                  title="Start date"
                />
                <input
                  type="date"
                  value={workOrderSearch.endDate}
                  onChange={(e) => setWorkOrderSearch((prev) => ({ ...prev, endDate: e.target.value }))}
                  aria-label="End date"
                  title="End date"
                />
                <select
                  value={workOrderSearch.tech}
                  onChange={(e) => setWorkOrderSearch((prev) => ({ ...prev, tech: e.target.value }))}
                >
                  <option value="">All Technical Staff</option>
                  {technicalStaff.map((person) => (
                    <option key={person.id} value={person.name}>{person.name}</option>
                  ))}
                </select>
                <select
                  value={workOrderSearch.supervisor}
                  onChange={(e) => setWorkOrderSearch((prev) => ({ ...prev, supervisor: e.target.value }))}
                >
                  <option value="">All Supervisors</option>
                  {supervisorStaff.map((person) => (
                    <option key={person.id} value={person.name}>{person.name}</option>
                  ))}
                </select>
                <select
                  value={workOrderSearch.gateKeeper}
                  onChange={(e) => setWorkOrderSearch((prev) => ({ ...prev, gateKeeper: e.target.value }))}
                >
                  <option value="">All Gate Keepers</option>
                  {gateKeeperStaff.map((person) => (
                    <option key={person.id} value={person.name}>{person.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Search vehicle name"
                  value={workOrderSearch.vehicleName}
                  onChange={(e) => setWorkOrderSearch((prev) => ({ ...prev, vehicleName: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() =>
                    setWorkOrderSearch({
                      startDate: '',
                      endDate: '',
                      tech: '',
                      supervisor: '',
                      gateKeeper: '',
                      vehicleName: '',
                    })
                  }
                >
                  Reset Filters
                </button>
              </div>
              <p className="history-meta">
                {filteredWorkOrders.length === 0 ? (
                  <>No work-orders match the current filters.</>
                ) : (
                  <>
                    Showing {(workOrderSearchPageClamped - 1) * HISTORY_PAGE_SIZE + 1}
                    –
                    {Math.min(workOrderSearchPageClamped * HISTORY_PAGE_SIZE, filteredWorkOrders.length)} of{' '}
                    {filteredWorkOrders.length}
                    {' '}
                    ({HISTORY_PAGE_SIZE} per page)
                  </>
                )}
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Work-Order ID</th>
                    <th>Vehicle Name</th>
                    <th>Date</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Technical Staff</th>
                    <th>Supervisor</th>
                    <th>Gate Keeper</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrderSearchPageSlice.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => setHistoryDetailModalId(ticket.id)}
                        >
                          {ticket.id}
                        </button>
                      </td>
                      <td>{ticket.model}</td>
                      <td>{ticket.createdAt || '-'}</td>
                      <td>{formatDateTime(ticket.checkInAt)}</td>
                      <td>{formatDateTime(ticket.checkOutAt)}</td>
                      <td>{ticket.tech || '-'}</td>
                      <td>{ticket.supervisor || '-'}</td>
                      <td>{ticket.gateKeeper || '-'}</td>
                      <td>{ticket.stage}</td>
                    </tr>
                  ))}
                  {filteredWorkOrders.length === 0 && (
                    <tr>
                      <td colSpan="9">No matching work-orders found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              {filteredWorkOrders.length > 0 && (
                <div className="pagination">
                  <button
                    type="button"
                    disabled={workOrderSearchPageClamped <= 1}
                    onClick={() => setWorkOrderSearchPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span className="pagination-info">
                    Page {workOrderSearchPageClamped} of {workOrderSearchTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={workOrderSearchPageClamped >= workOrderSearchTotalPages}
                    onClick={() => setWorkOrderSearchPage((p) => Math.min(workOrderSearchTotalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {activeMenu === 'Invoices' && (
            <div>
              <h2>Invoices</h2>
              <p className="history-meta">
                New invoices are work-orders in <strong>Intake</strong>. Active invoices are all other open work-orders (not closed or cancelled).
                {' '}
                Showing {newAndActiveInvoiceRows.length} invoice{newAndActiveInvoiceRows.length === 1 ? '' : 's'}.
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Work-Order ID</th>
                    <th>Vehicle</th>
                    <th>Plate</th>
                    <th>Stage</th>
                    <th>Date</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Total</th>
                    <th>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {newAndActiveInvoiceRows.map(({ ticket, invoiceKind, totals }) => (
                    <tr key={ticket.id}>
                      <td>
                        <span className={`invoice-badge invoice-badge-${invoiceKind.toLowerCase()}`}>
                          {invoiceKind}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => setHistoryDetailModalId(ticket.id)}
                        >
                          {ticket.id}
                        </button>
                      </td>
                      <td>{ticket.model}</td>
                      <td>{ticket.plateNo || '—'}</td>
                      <td>{ticket.stage}</td>
                      <td>{ticket.createdAt || '—'}</td>
                      <td>{formatDateTime(ticket.checkInAt)}</td>
                      <td>{formatDateTime(ticket.checkOutAt)}</td>
                      <td>{formatCurrency(totals.totalAfterDiscount)}</td>
                      <td>{ticket.paid ? 'Paid' : 'Unpaid'}</td>
                    </tr>
                  ))}
                  {newAndActiveInvoiceRows.length === 0 && (
                    <tr>
                      <td colSpan="10">No new or active invoices.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeMenu === 'Payment Received' && (
            <div>
              <h2>Payment Received</h2>
                <p className="history-meta">
                Totals include every work-order marked <strong>paid</strong>, grouped by <strong>year and month</strong> of the work-order
                <strong> created date</strong> (YYYY-MM). Payment received is the final invoice total after discounts; discounts given is the sum of
                discount amounts in that month. Click a <strong>Paid work-orders</strong> count to see each work-order ID and amount for that month.
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Month</th>
                    <th>Paid work-orders</th>
                    <th>Payment received</th>
                    <th>Discounts given</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentReceivedByMonth.map((row) => {
                    const { year, monthName } = parseYearMonthParts(row.ymKey)
                    return (
                      <tr key={row.ymKey}>
                        <td>{year}</td>
                        <td>{monthName}</td>
                        <td>
                          <button
                            type="button"
                            className="link-btn"
                            onClick={() => setPaymentMonthDetailYm(row.ymKey)}
                          >
                            {row.paidOrderCount}
                          </button>
                        </td>
                        <td>{formatCurrency(row.paymentReceived)}</td>
                        <td>{formatCurrency(row.discountsGiven)}</td>
                      </tr>
                    )
                  })}
                  {paymentReceivedByMonth.length > 0 && (
                    <tr className="payment-totals-row">
                      <td colSpan="2"><strong>All periods</strong></td>
                      <td><strong>{paymentReceivedTotals.paidOrderCount}</strong></td>
                      <td><strong>{formatCurrency(paymentReceivedTotals.paymentReceived)}</strong></td>
                      <td><strong>{formatCurrency(paymentReceivedTotals.discountsGiven)}</strong></td>
                    </tr>
                  )}
                  {paymentReceivedByMonth.length === 0 && (
                    <tr>
                      <td colSpan="5">No paid work-orders to show.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeMenu === 'Staff Management' && (
            <div>
              <h2>Staff Management</h2>
              <form className="staff-form" onSubmit={addStaff}>
                <input
                  type="text"
                  placeholder="Staff name"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
                <select
                  value={newStaff.role}
                  onChange={(e) => setNewStaff((prev) => ({ ...prev, role: e.target.value }))}
                >
                  <option value="Supervisor">Supervisor</option>
                  <option value="Senior Tech">Senior Tech</option>
                  <option value="Manager">Manager</option>
                  <option value="Gate Keeper">Gate Keeper</option>
                </select>
                <input
                  type="text"
                  placeholder="Phone"
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff((prev) => ({ ...prev, phone: e.target.value }))}
                />
                <button type="submit">Add Staff</button>
              </form>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((person) => (
                    <tr key={person.id}>
                      <td>{person.name}</td>
                      <td>{person.role}</td>
                      <td>{person.phone || '-'}</td>
                      <td>{person.active ? 'Active' : 'Inactive'}</td>
                      <td>
                        <button type="button" onClick={() => toggleStaffStatus(person.id)}>
                          {person.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeMenu === 'Supervisor Management' && (
            <div>
              <h2>Supervisor Management</h2>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {supervisorStaff.map((person) => (
                    <tr key={person.id}>
                      <td>{person.name}</td>
                      <td>{person.phone || '-'}</td>
                      <td>{person.active ? 'Active' : 'Inactive'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeMenu === 'Technical Staff Management' && (
            <div>
              <h2>Technical Staff Management</h2>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Assigned Work-Orders</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {technicalStaff.map((person) => (
                    <tr key={person.id}>
                      <td>{person.name}</td>
                      <td>{person.phone || '-'}</td>
                      <td>{tickets.filter((ticket) => ticket.tech === person.name).length}</td>
                      <td>{person.active ? 'Active' : 'Inactive'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeMenu === 'Manager Management' && (
            <div>
              <h2>Manager Management</h2>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {managerStaff.map((person) => (
                    <tr key={person.id}>
                      <td>{person.name}</td>
                      <td>{person.phone || '-'}</td>
                      <td>{person.active ? 'Active' : 'Inactive'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeMenu === 'Gate Keeper Management' && (
            <div>
              <h2>Gate Keeper Management</h2>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {gateKeeperStaff.map((person) => (
                    <tr key={person.id}>
                      <td>{person.name}</td>
                      <td>{person.phone || '-'}</td>
                      <td>{person.active ? 'Active' : 'Inactive'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeMenu === 'Activity Log' && (
            <div>
              <h2>Activity Log</h2>
              <div className="search-filters activity-log-filters">
                <input
                  type="text"
                  placeholder="Search Work-Order ID"
                  value={activityLogFilters.workOrderId}
                  onChange={(e) => setActivityLogFilters((prev) => ({ ...prev, workOrderId: e.target.value }))}
                  aria-label="Search by Work-Order ID"
                />
                <select
                  value={activityLogFilters.supervisor}
                  onChange={(e) => setActivityLogFilters((prev) => ({ ...prev, supervisor: e.target.value }))}
                  aria-label="Filter by supervisor"
                >
                  <option value="">All supervisors</option>
                  {supervisorStaff.map((person) => (
                    <option key={person.id} value={person.name}>{person.name}</option>
                  ))}
                </select>
                <select
                  value={activityLogFilters.tech}
                  onChange={(e) => setActivityLogFilters((prev) => ({ ...prev, tech: e.target.value }))}
                  aria-label="Filter by technical staff"
                >
                  <option value="">All technical staff</option>
                  {technicalStaff.map((person) => (
                    <option key={person.id} value={person.name}>{person.name}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={activityLogFilters.startDate}
                  onChange={(e) => setActivityLogFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                  aria-label="Start date"
                  title="Start date"
                />
                <input
                  type="date"
                  value={activityLogFilters.endDate}
                  onChange={(e) => setActivityLogFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                  aria-label="End date"
                  title="End date"
                />
                <button
                  type="button"
                  onClick={() =>
                    setActivityLogFilters({
                      workOrderId: '',
                      supervisor: '',
                      tech: '',
                      startDate: '',
                      endDate: '',
                    })
                  }
                >
                  Reset filters
                </button>
              </div>
              <p className="history-meta">
                Showing {filteredActivityLogRows.length} of {activityLogRowsBase.length} entries
                {activityLogFilters.startDate || activityLogFilters.endDate
                  ? ' (dates use work-order created date)'
                  : ''}
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Work-Order ID</th>
                    <th>Supervisor</th>
                    <th>Technical Staff</th>
                    <th>Work-order date</th>
                    <th>Event</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActivityLogRows.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.ticketId}</td>
                      <td>{entry.supervisor || '-'}</td>
                      <td>{entry.tech || '-'}</td>
                      <td>{entry.logDate || '-'}</td>
                      <td>{entry.event}</td>
                    </tr>
                  ))}
                  {filteredActivityLogRows.length === 0 && (
                    <tr>
                      <td colSpan="5">No activity matches the current filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {historyDetailModalId && historyModalTicket && historyModalTotals && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setHistoryDetailModalId(null)}
        >
          <div
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <h3 id="history-modal-title">Work-Order {historyModalTicket.id}</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setHistoryDetailModalId(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="invoice-card modal-invoice">
              <div className="invoice-head">
                <h4>Invoice</h4>
                <div className="invoice-head-actions">
                  {!historyModalTicket.checkOutAt && (
                    <button
                      type="button"
                      onClick={() => recordVehicleCheckout(historyModalTicket.id)}
                    >
                      Record checkout
                    </button>
                  )}
                  <button type="button" onClick={() => downloadInvoice(historyModalTicket)}>
                    Download Invoice
                  </button>
                </div>
              </div>
              <div className="grid">
                <div>
                  <p><strong>Date:</strong> {historyModalTicket.createdAt || '-'}</p>
                  <p><strong>Check-in:</strong> {formatDateTime(historyModalTicket.checkInAt)}</p>
                  <p><strong>Check-out:</strong> {formatDateTime(historyModalTicket.checkOutAt)}</p>
                  <p><strong>Vehicle:</strong> {historyModalTicket.model}</p>
                  <p><strong>Plate:</strong> {historyModalTicket.plateNo || 'NO-PLATE / TEST'}</p>
                  <p><strong>Supervisor:</strong> {historyModalTicket.supervisor || '-'}</p>
                  <p><strong>Technical Staff:</strong> {historyModalTicket.tech || '-'}</p>
                  <p><strong>Gate Keeper:</strong> {historyModalTicket.gateKeeper || '-'}</p>
                  <p><strong>Stage:</strong> {historyModalTicket.stage}</p>
                  <div className="modal-order-actions">
                    <p>
                      <strong>Owner order confirmed:</strong>{' '}
                      {historyModalTicket.ownerOrderConfirmed ? 'Yes' : 'No'}
                    </p>
                    <p>
                      <strong>Supervisor order approved:</strong>{' '}
                      {historyModalTicket.supervisorOrderApproved ? 'Yes' : 'No'}
                    </p>
                    {historyModalTicket.stage !== 'Closed' && historyModalTicket.stage !== 'Cancelled' && (
                      <div className="modal-order-action-buttons">
                        {activeRole === 'Owner (Client)' && !historyModalTicket.ownerOrderConfirmed
                          && historyModalTicket.stage === 'Intake' && (
                          <button
                            type="button"
                            className="btn-order-confirmed"
                            onClick={() => confirmOrderByOwner(historyModalTicket.id)}
                          >
                            Order Confirmed
                          </button>
                        )}
                        {activeRole === 'Supervisor'
                          && historyModalTicket.ownerOrderConfirmed
                          && !historyModalTicket.supervisorOrderApproved && (
                          <button
                            type="button"
                            className="btn-order-approved"
                            onClick={() => approveOrderBySupervisor(historyModalTicket.id)}
                          >
                            Order Approved
                          </button>
                        )}
                        {activeRole === 'Supervisor'
                          && !historyModalTicket.ownerOrderConfirmed
                          && (historyModalTicket.stage === 'Intake' || historyModalTicket.stage === 'Owner Approval') && (
                          <p className="modal-order-hint">
                            Vehicle owner must use <strong>Order Confirmed</strong> before you can approve this order.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="totals">
                  <p><strong>Parts Total:</strong> {formatCurrency(historyModalTotals.partsCost)}</p>
                  <p><strong>Service Charge:</strong> {formatCurrency(historyModalTicket.serviceCharge)}</p>
                  <p><strong>Discount:</strong> {formatCurrency(historyModalTicket.discount)}</p>
                  <p className="grand"><strong>Invoice Total:</strong> {formatCurrency(historyModalTotals.totalAfterDiscount)}</p>
                  <p><strong>Payment Status:</strong> {historyModalTicket.paid ? 'Paid' : 'Unpaid'}</p>
                </div>
              </div>
              <section className="wo-activity-flow" aria-labelledby="wo-activity-flow-title">
                <h3 id="wo-activity-flow-title">Activity tracking flow</h3>
                <p className="wo-activity-flow-intro">
                  Progress through the standard work-order lifecycle. The highlighted step is where this
                  work-order is today (or where it stopped if cancelled).
                </p>
                <div className="wo-flowchart-row" role="list">
                  {getWorkOrderFlowCells(historyModalTicket).map((cell, idx) => (
                    <Fragment key={cell.key}>
                      {idx > 0 && (
                        <span className="wo-flowchart-arrow" aria-hidden>
                          →
                        </span>
                      )}
                      <div
                        role="listitem"
                        className={`wo-flowchart-step wo-flowchart-step--${cell.status}`}
                        title={`${cell.title}: ${cell.caption}`}
                      >
                        <span className="wo-flowchart-step-index">{idx + 1}</span>
                        <span className="wo-flowchart-step-title">{cell.title}</span>
                        <span className="wo-flowchart-step-caption">{cell.caption}</span>
                      </div>
                    </Fragment>
                  ))}
                </div>
                <div className="wo-flow-event-log">
                  <h4>Event log</h4>
                  <ul className="wo-flow-event-list">
                    {(historyModalTicket.timeline || []).map((event, i) => (
                      <li key={`${historyModalTicket.id}-tl-${i}`}>{event}</li>
                    ))}
                  </ul>
                </div>
              </section>
              <h3>Invoice Items</h3>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Approval</th>
                  </tr>
                </thead>
                <tbody>
                  {historyModalTicket.items.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td>{item.description}</td>
                      <td>{formatCurrency(item.cost)}</td>
                      <td>{item.approved ? 'Approved' : 'Rejected'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {paymentMonthDetailYm && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setPaymentMonthDetailYm(null)}
        >
          <div
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-month-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <h3 id="payment-month-modal-title">
                Paid work-orders — {paymentMonthModalTitle}
              </h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setPaymentMonthDetailYm(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="modal-payment-list">
              <table>
                <thead>
                  <tr>
                    <th>Work-Order ID</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentMonthDetailLines.map((line) => (
                    <tr key={line.workOrderId}>
                      <td>
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => {
                            setPaymentMonthDetailYm(null)
                            setHistoryDetailModalId(line.workOrderId)
                          }}
                        >
                          {line.workOrderId}
                        </button>
                      </td>
                      <td>{formatCurrency(line.amount)}</td>
                    </tr>
                  ))}
                  {paymentMonthDetailLines.length === 0 && (
                    <tr>
                      <td colSpan="2">No paid orders for this month.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

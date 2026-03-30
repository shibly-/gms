import { useEffect, useMemo, useState } from 'react'
import './App.css'

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

      seeded.push({
        id: `HIST-${monthKey}-${String(sequence).padStart(4, '0')}`,
        plateNo: `US-${randomInt(1000, 9999)}`,
        model,
        isTestVehicle: false,
        stage: 'Closed',
        createdAt: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        supervisor: supervisors[randomInt(0, supervisors.length - 1)],
        tech: techs[randomInt(0, techs.length - 1)],
        gateKeeper: gateKeepers[randomInt(0, gateKeepers.length - 1)],
        gatePassVerified: true,
        serviceCharge,
        discount,
        paid: true,
        diagnosisSubmitted: true,
        qcDone: true,
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

      cancelled.push({
        ...baseOrder,
        id: `CANCEL-${monthKey.replace('-', '')}-${String(index + 1).padStart(3, '0')}-${randomInt(10, 99)}`,
        createdAt: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        stage: 'Cancelled',
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
  const historyTotalPages = Math.max(1, Math.ceil(historyRowsSorted.length / HISTORY_PAGE_SIZE))

  useEffect(() => {
    setHistoryPage((page) => Math.min(page, historyTotalPages))
  }, [historyTotalPages])

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

  const historyPageClamped = Math.min(Math.max(1, historyPage), historyTotalPages)
  const historyPageSlice = historyRowsSorted.slice(
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

    const createdTicket = {
      id: createdId,
      plateNo: isTestVehicle ? null : newTicketForm.plateNo.trim().toUpperCase(),
      model: newTicketForm.model.trim() || 'Unknown Model',
      isTestVehicle,
      stage: 'Intake',
      createdAt: new Date().toISOString().slice(0, 10),
      supervisor: newTicketForm.supervisor.trim() || 'Unassigned',
      tech: newTicketForm.tech.trim(),
      gateKeeper: newTicketForm.gateKeeper.trim() || 'Unassigned',
      gatePassVerified: newTicketForm.gatePassVerified,
      serviceCharge: Number(newTicketForm.serviceCharge) || 0,
      discount: 0,
      paid: false,
      diagnosisSubmitted: false,
      qcDone: false,
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

      <main className="layout-with-menu">
        <aside className="panel sidebar">
          <h2>Menu</h2>
          {NAV_CONFIG.map((entry) => {
            if (entry.kind === 'link') {
              return (
                <button
                  type="button"
                  key={entry.id}
                  className={`menu-btn ${activeMenu === entry.id ? 'active' : ''}`}
                  onClick={() => setActiveMenu(entry.id)}
                >
                  {entry.id}
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
                >
                  <span>{entry.label}</span>
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
                        >
                          {itemLabel}
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
                <p>Create new work-orders when vehicles arrive. Use the no-plate option for test vehicles and record gate verification.</p>
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
              <p className="history-meta">
                {historyRowsSorted.length === 0 ? (
                  <>No work-orders in history.</>
                ) : (
                  <>
                    Showing {(historyPageClamped - 1) * HISTORY_PAGE_SIZE + 1}
                    –
                    {Math.min(historyPageClamped * HISTORY_PAGE_SIZE, historyRowsSorted.length)} of {historyRowsSorted.length}
                    {' '}
                    ({HISTORY_PAGE_SIZE} per page)
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
                      <td>{ticket.paid ? 'Paid' : 'Unpaid'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
              <table>
                <thead>
                  <tr>
                    <th>Work-Order ID</th>
                    <th>Vehicle Name</th>
                    <th>Date</th>
                    <th>Technical Staff</th>
                    <th>Supervisor</th>
                    <th>Gate Keeper</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkOrders.map((ticket) => (
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
                      <td>{ticket.tech || '-'}</td>
                      <td>{ticket.supervisor || '-'}</td>
                      <td>{ticket.gateKeeper || '-'}</td>
                      <td>{ticket.stage}</td>
                    </tr>
                  ))}
                  {filteredWorkOrders.length === 0 && (
                    <tr>
                      <td colSpan="7">No matching work-orders found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
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
                      <td>{formatCurrency(totals.totalAfterDiscount)}</td>
                      <td>{ticket.paid ? 'Paid' : 'Unpaid'}</td>
                    </tr>
                  ))}
                  {newAndActiveInvoiceRows.length === 0 && (
                    <tr>
                      <td colSpan="8">No new or active invoices.</td>
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
                <button type="button" onClick={() => downloadInvoice(historyModalTicket)}>
                  Download Invoice
                </button>
              </div>
              <div className="grid">
                <div>
                  <p><strong>Date:</strong> {historyModalTicket.createdAt || '-'}</p>
                  <p><strong>Vehicle:</strong> {historyModalTicket.model}</p>
                  <p><strong>Plate:</strong> {historyModalTicket.plateNo || 'NO-PLATE / TEST'}</p>
                  <p><strong>Supervisor:</strong> {historyModalTicket.supervisor || '-'}</p>
                  <p><strong>Technical Staff:</strong> {historyModalTicket.tech || '-'}</p>
                  <p><strong>Gate Keeper:</strong> {historyModalTicket.gateKeeper || '-'}</p>
                  <p><strong>Stage:</strong> {historyModalTicket.stage}</p>
                </div>
                <div className="totals">
                  <p><strong>Parts Total:</strong> {formatCurrency(historyModalTotals.partsCost)}</p>
                  <p><strong>Service Charge:</strong> {formatCurrency(historyModalTicket.serviceCharge)}</p>
                  <p><strong>Discount:</strong> {formatCurrency(historyModalTicket.discount)}</p>
                  <p className="grand"><strong>Invoice Total:</strong> {formatCurrency(historyModalTotals.totalAfterDiscount)}</p>
                  <p><strong>Payment Status:</strong> {historyModalTicket.paid ? 'Paid' : 'Unpaid'}</p>
                </div>
              </div>
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

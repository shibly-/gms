import { useMemo, useState } from 'react'
import './App.css'

const roles = [
  'Gate Keeper',
  'Supervisor',
  'Senior Tech',
  'Manager',
  'Owner (Client)',
]

const menus = [
  'Dashboard',
  'Work-Order Creation',
  'Work-Order Management',
  'Work-Order History',
  'Work-Order Search',
  'Work-Order Details',
  'Staff Management',
  'Supervisor Management',
  'Technical Staff Management',
  'Manager Management',
  'Gate Keeper Management',
  'Activity Log',
]

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
  const [tickets, setTickets] = useState(initialTickets)
  const [selectedTicketId, setSelectedTicketId] = useState(initialTickets[0].id)
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

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) || tickets[0],
    [selectedTicketId, tickets]
  )

  const totals = selectedTicket ? calculateTotals(selectedTicket) : null
  const selectedWorkOrderInvoice = selectedTicket ? calculateTotals(selectedTicket) : null
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
  const activityLogRows = tickets.flatMap((ticket) =>
    ticket.timeline.map((event, index) => ({
      id: `${ticket.id}-${index}`,
      ticketId: ticket.id,
      event,
    }))
  )
  const [workOrderSearch, setWorkOrderSearch] = useState({
    startDate: '',
    endDate: '',
    tech: '',
    supervisor: '',
    gateKeeper: '',
    vehicleName: '',
  })
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

  function updateTicket(ticketId, updater) {
    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === ticketId ? updater(ticket) : ticket
      )
    )
  }

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
    setSelectedTicketId(createdId)
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

  function markTestVehicle() {
    if (!selectedTicket) return
    updateTicket(selectedTicket.id, (ticket) => ({
      ...ticket,
      isTestVehicle: true,
      plateNo: null,
      timeline: [...ticket.timeline, 'Vehicle tagged as On Test at gate'],
    }))
  }

  function verifyGatePass() {
    if (!selectedTicket) return
    updateTicket(selectedTicket.id, (ticket) => ({
      ...ticket,
      gatePassVerified: true,
      stage: ticket.stage === 'Intake' ? 'Diagnosis' : ticket.stage,
      timeline: [...ticket.timeline, 'Gate pass verified'],
    }))
  }

  function submitDiagnosis() {
    if (!selectedTicket) return
    updateTicket(selectedTicket.id, (ticket) => ({
      ...ticket,
      diagnosisSubmitted: true,
      stage: 'Owner Approval',
      timeline: [
        ...ticket.timeline,
        'Diagnosis submitted, owner + manager notified via API',
      ],
    }))
  }

  function toggleLineItem(itemId) {
    if (!selectedTicket) return
    updateTicket(selectedTicket.id, (ticket) => ({
      ...ticket,
      items: ticket.items.map((item) =>
        item.id === itemId ? { ...item, approved: !item.approved } : item
      ),
    }))
  }

  function requestDiscount() {
    if (!selectedTicket) return
    updateTicket(selectedTicket.id, (ticket) => ({
      ...ticket,
      timeline: [...ticket.timeline, 'Owner requested discount, pending manager action'],
    }))
  }

  function approveDiscount() {
    if (!selectedTicket) return
    const recommendedDiscount = Math.round(calculateTotals(selectedTicket).totalBeforeDiscount * 0.1)
    updateTicket(selectedTicket.id, (ticket) => ({
      ...ticket,
      discount: recommendedDiscount,
      stage: 'Repair In Progress',
      timeline: [...ticket.timeline, `Manager approved discount ${formatCurrency(recommendedDiscount)}`],
    }))
  }

  function completeQc() {
    if (!selectedTicket) return
    updateTicket(selectedTicket.id, (ticket) => ({
      ...ticket,
      qcDone: true,
      stage: 'Ready for Delivery',
      timeline: [...ticket.timeline, 'QC passed, IVR call triggered to owner'],
    }))
  }

  function markPaid() {
    if (!selectedTicket) return
    updateTicket(selectedTicket.id, (ticket) => ({
      ...ticket,
      paid: true,
      stage: 'Closed',
      timeline: [...ticket.timeline, 'Payment captured and ticket closed'],
    }))
  }

  function openWorkOrderDetails(workOrderId) {
    setSelectedTicketId(workOrderId)
    setActiveMenu('Work-Order Details')
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
          {menus.map((menu) => (
            <button
              type="button"
              key={menu}
              className={`menu-btn ${activeMenu === menu ? 'active' : ''}`}
              onClick={() => setActiveMenu(menu)}
            >
              {menu}
            </button>
          ))}
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
                <h3>2) Work-Order Creation</h3>
                <p>Create new work-orders when vehicles arrive. Use the no-plate option for test vehicles and record gate verification.</p>
              </div>
              <div className="guide-section">
                <h3>3) Work-Order Management</h3>
                <p>Open any work-order to update diagnosis, owner approvals, discounts, QC completion, and payment closure by role.</p>
              </div>
              <div className="guide-section">
                <h3>4) Work-Order History & Details</h3>
                <p>Click a Work-Order ID in history to open invoice details. Download invoice to share or archive billing information.</p>
              </div>
              <div className="guide-section">
                <h3>5) Work-Order Search</h3>
                <p>Use start/end date, technical staff, supervisor, gate keeper, and vehicle name filters to locate records quickly.</p>
              </div>
              <div className="guide-section">
                <h3>6) Staff Modules</h3>
                <p>Manage all staff and view role-specific lists for supervisors, technical staff, managers, and gate keepers.</p>
              </div>
              <div className="guide-section">
                <h3>7) Activity Log</h3>
                <p>Track timeline events for each work-order to support audit and operational transparency.</p>
              </div>
            </div>
          )}

          {activeMenu === 'Work-Order Creation' && (
            <div>
              <h2>Work-Order Creation</h2>
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

          {activeMenu === 'Work-Order Management' && (
            <div className="ticket-management-layout">
              <div className="ticket-list-mini">
                <h2>Work-Order Management</h2>
                {tickets.map((ticket) => {
                  const ticketTotals = calculateTotals(ticket)
                  return (
                    <button
                      key={ticket.id}
                      className={`ticket-card ${ticket.id === selectedTicket?.id ? 'active' : ''}`}
                      onClick={() => setSelectedTicketId(ticket.id)}
                      type="button"
                    >
                      <div className="ticket-header">
                        <strong>{ticket.id}</strong>
                        <span className="status">{ticket.stage}</span>
                      </div>
                      <p>{ticket.plateNo || 'NO-PLATE / TEST'}</p>
                      <small>{formatCurrency(ticketTotals.totalAfterDiscount)}</small>
                    </button>
                  )
                })}
              </div>

              {selectedTicket && (
                <div>
                  <h3>Work-Order {selectedTicket.id}</h3>
                  <div className="grid">
                    <div>
                      <p><strong>Plate:</strong> {selectedTicket.plateNo || 'Not detected'}</p>
                      <p><strong>Model:</strong> {selectedTicket.model}</p>
                      <p><strong>Supervisor:</strong> {selectedTicket.supervisor}</p>
                      <p><strong>Tech:</strong> {selectedTicket.tech || 'Unassigned'}</p>
                      <p><strong>Gate keeper:</strong> {selectedTicket.gateKeeper || 'Unassigned'}</p>
                      <p><strong>Date:</strong> {selectedTicket.createdAt || '-'}</p>
                      <p><strong>Gate pass:</strong> {selectedTicket.gatePassVerified ? 'Verified' : 'Pending'}</p>
                    </div>
                    <div className="totals">
                      <p><strong>Parts:</strong> {formatCurrency(totals.partsCost)}</p>
                      <p><strong>Service charge:</strong> {formatCurrency(selectedTicket.serviceCharge)}</p>
                      <p><strong>Discount:</strong> {formatCurrency(selectedTicket.discount)}</p>
                      <p className="grand"><strong>Total:</strong> {formatCurrency(totals.totalAfterDiscount)}</p>
                    </div>
                  </div>

                  <h3>Diagnosis and Owner Approval</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Approve</th>
                        <th>Issue</th>
                        <th>Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTicket.items.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={item.approved}
                              onChange={() => toggleLineItem(item.id)}
                              disabled={activeRole !== 'Owner (Client)'}
                            />
                          </td>
                          <td>{item.description}</td>
                          <td>{formatCurrency(item.cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="actions">
                    <button type="button" onClick={markTestVehicle} disabled={activeRole !== 'Gate Keeper'}>
                      Tag On Test
                    </button>
                    <button type="button" onClick={verifyGatePass} disabled={activeRole !== 'Gate Keeper'}>
                      Verify Gate Pass
                    </button>
                    <button type="button" onClick={submitDiagnosis} disabled={activeRole !== 'Senior Tech'}>
                      Submit Diagnosis
                    </button>
                    <button type="button" onClick={requestDiscount} disabled={activeRole !== 'Owner (Client)'}>
                      Request Discount
                    </button>
                    <button type="button" onClick={approveDiscount} disabled={activeRole !== 'Manager'}>
                      Approve Discount
                    </button>
                    <button type="button" onClick={completeQc} disabled={activeRole !== 'Supervisor'}>
                      Complete QC + Trigger IVR
                    </button>
                    <button type="button" onClick={markPaid} disabled={activeRole !== 'Owner (Client)'}>
                      Pay and Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeMenu === 'Work-Order History' && (
            <div>
              <h2>Work-Order History</h2>
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
                  {(closedTickets.length ? closedTickets : tickets).map((ticket) => (
                    <tr key={ticket.id}>
                      <td>
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => openWorkOrderDetails(ticket.id)}
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
            </div>
          )}

          {activeMenu === 'Work-Order Details' && selectedTicket && (
            <div>
              <h2>Work-Order Details</h2>
              <div className="invoice-card">
                <div className="invoice-head">
                  <h3>Invoice - {selectedTicket.id}</h3>
                  <button type="button" onClick={() => downloadInvoice(selectedTicket)}>
                    Download Invoice
                  </button>
                </div>
                <div className="grid">
                  <div>
                    <p><strong>Date:</strong> {selectedTicket.createdAt || '-'}</p>
                    <p><strong>Vehicle:</strong> {selectedTicket.model}</p>
                    <p><strong>Plate:</strong> {selectedTicket.plateNo || 'NO-PLATE / TEST'}</p>
                    <p><strong>Supervisor:</strong> {selectedTicket.supervisor || '-'}</p>
                    <p><strong>Technical Staff:</strong> {selectedTicket.tech || '-'}</p>
                    <p><strong>Gate Keeper:</strong> {selectedTicket.gateKeeper || '-'}</p>
                  </div>
                  <div className="totals">
                    <p><strong>Parts Total:</strong> {formatCurrency(selectedWorkOrderInvoice.partsCost)}</p>
                    <p><strong>Service Charge:</strong> {formatCurrency(selectedTicket.serviceCharge)}</p>
                    <p><strong>Discount:</strong> {formatCurrency(selectedTicket.discount)}</p>
                    <p className="grand"><strong>Invoice Total:</strong> {formatCurrency(selectedWorkOrderInvoice.totalAfterDiscount)}</p>
                    <p><strong>Payment Status:</strong> {selectedTicket.paid ? 'Paid' : 'Unpaid'}</p>
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
                    {selectedTicket.items.map((item, index) => (
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
                      <td>{ticket.id}</td>
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
              <table>
                <thead>
                  <tr>
                    <th>Work-Order ID</th>
                    <th>Event</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLogRows.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.ticketId}</td>
                      <td>{entry.event}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App

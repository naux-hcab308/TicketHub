'use client'

import React, { useEffect, useState } from 'react'
import {
  Plus, Trash2, Copy, Check, X, Loader2, UserPlus,
  CalendarDays, ChevronDown, ChevronUp, Save,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getStaffWithAssignments, addStaff, updateStaffStatus, deleteStaff,
  updateStaffAssignments, getSellerPublishedEvents,
} from '../actions'

interface SellerEvent {
  event_id: string
  event_name: string
  start_time: string
  status: string
}

export default function StaffPage() {
  const [staffList, setStaffList] = useState<any[]>([])
  const [events, setEvents] = useState<SellerEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Add-form event selection
  const [addSelectedEvents, setAddSelectedEvents] = useState<string[]>([])

  // Inline assignment editor per existing staff
  const [assigningStaffId, setAssigningStaffId] = useState<string | null>(null)
  const [assignEditing, setAssignEditing] = useState<string[]>([])
  const [assignSaving, setAssignSaving] = useState(false)

  async function reload() {
    const [staffRes, eventsRes] = await Promise.all([
      getStaffWithAssignments(),
      getSellerPublishedEvents(),
    ])
    setStaffList(staffRes.data)
    setEvents(eventsRes.data)
  }

  useEffect(() => {
    reload().then(() => setLoading(false))
  }, [])

  async function handleAdd(formData: FormData) {
    setFormLoading(true)
    const result = await addStaff(formData)
    if (result.success && result.staffId && addSelectedEvents.length > 0) {
      await updateStaffAssignments(result.staffId, addSelectedEvents)
    }
    if (result.success) {
      setShowForm(false)
      setAddSelectedEvents([])
      await reload()
    }
    setFormLoading(false)
  }

  async function handleDelete(staffId: string) {
    if (!confirm('Xóa nhân viên này?')) return
    await deleteStaff(staffId)
    await reload()
  }

  async function handleStatusToggle(staffId: string, current: string) {
    const next = current === 'inactive' ? 'active' : 'inactive'
    await updateStaffStatus(staffId, next)
    await reload()
  }

  function copyCode(code: string, staffId: string) {
    navigator.clipboard.writeText(code)
    setCopiedId(staffId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function openAssign(staff: any) {
    const currentIds = (staff.event_staff_assignments ?? []).map((a: any) => a.event_id)
    setAssignEditing(currentIds)
    setAssigningStaffId(staff.staff_id)
  }

  function closeAssign() {
    setAssigningStaffId(null)
    setAssignEditing([])
  }

  async function saveAssignments(staffId: string) {
    setAssignSaving(true)
    await updateStaffAssignments(staffId, assignEditing)
    await reload()
    closeAssign()
    setAssignSaving(false)
  }

  function toggleEvent(eventId: string, selected: string[], setSelected: (v: string[]) => void) {
    setSelected(
      selected.includes(eventId) ? selected.filter((e) => e !== eventId) : [...selected, eventId],
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Quản lý nhân viên check-in</h1>
          <p className="text-muted-foreground mt-1">Thêm nhân viên và phân công sự kiện soát vé</p>
        </div>
        <Button onClick={() => { setShowForm(true); setAddSelectedEvents([]) }}>
          <UserPlus className="w-4 h-4 mr-1.5" />
          Thêm nhân viên
        </Button>
      </div>

      {/* Add Staff Form */}
      {showForm && (
        <div className="bg-card rounded-xl border border-border p-6 mb-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Thêm nhân viên mới</h2>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4" /></button>
          </div>
          <form action={handleAdd} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tên nhân viên *</label>
                <input name="name" required
                  className="w-full px-3 py-2 bg-secondary text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  placeholder="Nguyễn Văn A" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Số nhân viên</label>
                <input name="staff_number"
                  className="w-full px-3 py-2 bg-secondary text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  placeholder="NV001" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Trạng thái</label>
                <select name="shift_id"
                  className="w-full px-3 py-2 bg-secondary text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm">
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Ngừng hoạt động</option>
                </select>
              </div>
            </div>

            {/* Event assignment */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Phân công sự kiện
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  (chọn các sự kiện nhân viên được phép check-in)
                </span>
              </label>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3 px-3 bg-secondary/50 rounded-lg">
                  Chưa có sự kiện đang hoạt động. Hãy tạo và duyệt sự kiện trước.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {events.map((ev) => (
                    <label
                      key={ev.event_id}
                      className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                        addSelectedEvents.includes(ev.event_id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-secondary/40 hover:bg-secondary/70'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={addSelectedEvents.includes(ev.event_id)}
                        onChange={() => toggleEvent(ev.event_id, addSelectedEvents, setAddSelectedEvents)}
                        className="mt-0.5 accent-primary"
                      />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{ev.event_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(ev.start_time).toLocaleDateString('vi-VN', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                          })}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {addSelectedEvents.length > 0 && (
                <p className="text-xs text-primary mt-1.5">Đã chọn {addSelectedEvents.length} sự kiện</p>
              )}
            </div>

            <Button type="submit" size="sm" disabled={formLoading}>
              {formLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
              Thêm nhân viên
            </Button>
          </form>
        </div>
      )}

      {/* Staff Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tên</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mã nhân viên</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Số NV</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Sự kiện</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Trạng thái</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ngày thêm</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-secondary rounded animate-pulse w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    Chưa có nhân viên nào
                  </td>
                </tr>
              ) : (
                staffList.map((s) => {
                  const assignedCount = (s.event_staff_assignments ?? []).length
                  const isAssigning = assigningStaffId === s.staff_id
                  return (
                    <React.Fragment key={s.staff_id}>
                      <tr className="border-b border-border hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{s.name}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-secondary px-2 py-0.5 rounded">{s.employee_code}</code>
                            <button
                              onClick={() => copyCode(s.employee_code, s.staff_id)}
                              className="p-1 hover:bg-secondary rounded transition-colors"
                              title="Copy mã truy cập"
                            >
                              {copiedId === s.staff_id
                                ? <Check className="w-3.5 h-3.5 text-green-500" />
                                : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{s.staff_number || '—'}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => isAssigning ? closeAssign() : openAssign(s)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                              assignedCount > 0
                                ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                                : 'bg-secondary text-muted-foreground border-border hover:bg-secondary/70'
                            }`}
                          >
                            <CalendarDays className="w-3.5 h-3.5" />
                            {assignedCount > 0 ? `${assignedCount} sự kiện` : 'Chưa phân công'}
                            {isAssigning ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleStatusToggle(s.staff_id, s.shift_id || 'active')}
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                              s.shift_id === 'inactive'
                                ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                            }`}
                          >
                            {s.shift_id === 'inactive' ? 'Ngừng' : 'Hoạt động'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(s.created_at).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDelete(s.staff_id)}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        </td>
                      </tr>

                      {/* Inline assignment editor */}
                      {isAssigning && (
                        <tr className="border-b border-border bg-secondary/20">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="max-w-2xl">
                              <p className="text-sm font-medium mb-3">
                                Phân công sự kiện cho <span className="text-primary">{s.name}</span>
                              </p>
                              {events.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  Chưa có sự kiện đang hoạt động để phân công.
                                </p>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 max-h-48 overflow-y-auto pr-1">
                                  {events.map((ev) => (
                                    <label
                                      key={ev.event_id}
                                      className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                                        assignEditing.includes(ev.event_id)
                                          ? 'border-primary bg-primary/5'
                                          : 'border-border bg-card hover:bg-secondary/60'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={assignEditing.includes(ev.event_id)}
                                        onChange={() => toggleEvent(ev.event_id, assignEditing, setAssignEditing)}
                                        className="mt-0.5 accent-primary"
                                      />
                                      <div className="min-w-0">
                                        <p className="font-medium truncate">{ev.event_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {new Date(ev.start_time).toLocaleDateString('vi-VN', {
                                            day: '2-digit', month: '2-digit', year: 'numeric',
                                          })}
                                        </p>
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => saveAssignments(s.staff_id)}
                                  disabled={assignSaving}
                                >
                                  {assignSaving
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                    : <Save className="w-3.5 h-3.5 mr-1.5" />}
                                  Lưu phân công
                                </Button>
                                <Button size="sm" variant="outline" onClick={closeAssign}>
                                  Hủy
                                </Button>
                                {assignEditing.length > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    Đã chọn {assignEditing.length} sự kiện
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && staffList.length > 0 && (
          <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
            Tổng: {staffList.length} nhân viên
          </div>
        )}
      </div>
    </div>
  )
}

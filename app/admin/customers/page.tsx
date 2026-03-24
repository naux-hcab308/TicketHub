'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { Search, Eye, UserCheck, Loader2 } from 'lucide-react'
import { getCustomers, promoteToSeller } from '../actions'

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  banned: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  seller: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  customer: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [promoteEmail, setPromoteEmail] = useState('')
  const [promoteResult, setPromoteResult] = useState<{ success?: boolean; error?: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const loadCustomers = () => {
    getCustomers().then(({ data }) => {
      setCustomers(data)
      setLoading(false)
    })
  }

  useEffect(() => {
    loadCustomers()
  }, [])

  const handlePromote = () => {
    if (!promoteEmail.trim()) return
    setPromoteResult(null)
    startTransition(async () => {
      const result = await promoteToSeller(promoteEmail)
      setPromoteResult(result)
      if (result.success) {
        setPromoteEmail('')
        setLoading(true)
        loadCustomers()
      }
    })
  }

  const filtered = customers.filter((c) => {
    const term = search.toLowerCase()
    return (
      c.full_name?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.phone_number?.includes(term)
    )
  })

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Quản lý Users</h1>
        <p className="text-muted-foreground mt-1">Danh sách tất cả người dùng trong hệ thống</p>
      </div>

      {/* Promote to Seller */}
      <div className="mb-6 bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <UserCheck className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-semibold">Nâng cấp quyền Seller</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Nhập email của người dùng (customer) để chuyển thành seller.</p>
        <div className="flex items-center gap-2">
          <input
            type="email"
            placeholder="Nhập email người dùng..."
            value={promoteEmail}
            onChange={(e) => { setPromoteEmail(e.target.value); setPromoteResult(null) }}
            onKeyDown={(e) => e.key === 'Enter' && handlePromote()}
            className="flex-1 max-w-sm px-3 py-2 bg-background text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            onClick={handlePromote}
            disabled={isPending || !promoteEmail.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
            Xác nhận
          </button>
        </div>
        {promoteResult && (
          <p className={`mt-2 text-xs font-medium ${promoteResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {promoteResult.success ? '✓ Đã nâng cấp thành công lên Seller.' : `✗ ${promoteResult.error}`}
          </p>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm theo tên, email, SĐT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-card text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Người dùng</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Số điện thoại</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vai trò</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Trạng thái</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ngày đăng ký</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-secondary rounded animate-pulse w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    Không tìm thấy người dùng nào
                  </td>
                </tr>
              ) : (
                filtered.map((user) => {
                  const roleName = user.roles?.role_name || 'customer'
                  return (
                    <tr key={user.user_id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {user.images ? (
                            <img src={user.images} alt="" className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                              {(user.full_name || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium">{user.full_name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{user.email || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{user.phone_number || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${ROLE_BADGE[roleName] || ROLE_BADGE.customer}`}>
                          {roleName}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[user.status] || STATUS_BADGE.active}`}>
                          {user.status || 'active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/customers/${user.user_id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Chi tiết
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {!loading && (
          <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
            Hiển thị {filtered.length} / {customers.length} người dùng
          </div>
        )}
      </div>
    </div>
  )
}

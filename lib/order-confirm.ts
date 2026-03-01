import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Xác nhận đơn hàng đã thanh toán: cập nhật trạng thái, tạo bản ghi payment, tạo vé và cập nhật quantity_sold.
 * Dùng chung cho IPN VNPay và (nếu cần) xử lý return.
 */
export async function confirmOrderAndGenerateTickets(
  supabase: SupabaseClient,
  orderId: string,
  paymentMeta: { provider: string; txnRef: string; paymentMethod?: string }
): Promise<{ success: boolean; error?: string }> {
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('order_id, total_amount, status')
    .eq('order_id', orderId)
    .single()

  if (orderErr || !order) return { success: false, error: 'Order not found' }
  if (order.status === 'confirmed') return { success: true } // Idempotent

  await supabase.from('payments').insert({
    order_id: orderId,
    amount: order.total_amount,
    provider: paymentMeta.provider,
    payment_method: paymentMeta.paymentMethod || 'vnpay',
    txn_ref: paymentMeta.txnRef,
  })

  await supabase
    .from('orders')
    .update({ status: 'confirmed', paid_at: new Date().toISOString() })
    .eq('order_id', orderId)

  const { data: orderItems } = await supabase
    .from('order_items')
    .select('order_item_id, event_id, ticket_type_id, quantity')
    .eq('order_id', orderId)

  if (orderItems) {
    for (const item of orderItems) {
      for (let i = 0; i < item.quantity; i++) {
        const code = `TKT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
        await supabase.from('tickets').insert({
          order_item_id: item.order_item_id,
          event_id: item.event_id,
          code,
          status: 'valid',
        })
      }

      const { data: tt } = await supabase
        .from('ticket_types')
        .select('quantity_sold')
        .eq('ticket_type_id', item.ticket_type_id)
        .single()

      if (tt) {
        await supabase
          .from('ticket_types')
          .update({ quantity_sold: (tt.quantity_sold ?? 0) + item.quantity })
          .eq('ticket_type_id', item.ticket_type_id)
      }
    }
  }

  return { success: true }
}

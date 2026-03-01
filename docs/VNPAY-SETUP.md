# Cấu hình thanh toán VNPay

## Biến môi trường

Tạo hoặc chỉnh file `.env.local` (không commit file này):

```env
# Bắt buộc cho VNPay
VNPAY_TMN_CODE=T1STOCTJ
VNPAY_HASH_SECRET=7EAKDRG2CKECYTMQRUV1WXQCPY8YWOAY
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html

# URL gốc của website (dùng cho Return URL và IPN URL)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- **Môi trường production**: Đổi `VNPAY_URL` sang cổng production và dùng TMN Code / Hash Secret do VNPay cấp cho production.
- **Deploy (Vercel, etc.)**: Đặt `NEXT_PUBLIC_SITE_URL` = `https://yourdomain.com` để Return URL và IPN URL đúng.

## Đăng ký IPN với VNPay

Trên Merchant Admin (sandbox: https://sandbox.vnpayment.vn/merchantv2/), đăng ký **IPN URL** (server call server) để VNPay gửi kết quả thanh toán về:

- **IPN URL**: `https://yourdomain.com/api/vnpay/ipn`  
  (Ví dụ local test dùng ngrok: `https://xxxx.ngrok.io/api/vnpay/ipn`)

Return URL (redirect khách sau khi thanh toán) được tạo tự động: `{NEXT_PUBLIC_SITE_URL}/checkout/vnpay/return`.

## Thẻ test (Sandbox)

| Ngân hàng | NCB |
|-----------|-----|
| Số thẻ    | 9704198526191432198 |
| Tên chủ thẻ | NGUYEN VAN A |
| Ngày phát hành | 07/15 |
| Mật khẩu OTP | 123456 |

## Luồng thanh toán

1. Khách chọn **Thanh toán** tại Checkout → tạo đơn (pending) → redirect sang cổng VNPay.
2. Khách thanh toán trên VNPay (QR/ATM/thẻ).
3. VNPay gọi **IPN** (`POST` hoặc `GET /api/vnpay/ipn`) → server cập nhật đơn, tạo vé.
4. VNPay redirect khách về **Return URL** (`/checkout/vnpay/return`) → trang tự xác nhận đơn (nếu IPN chưa kịp gọi) và hiển thị kết quả.

## Lỗi "Có lỗi xảy ra... 1900 55 55 77" trên trang VNPay

Thông báo này thường xuất hiện khi **VNPay không gọi được IPN** (server của bạn không truy cập được từ internet):

- **Chạy local** (`localhost`): VNPay sandbox không thể gọi `http://localhost:3000/api/vnpay/ipn` → VNPay báo lỗi chung.
- **Cách xử lý khi test local**: Dùng [ngrok](https://ngrok.com) (hoặc tunnel tương tự) để expose máy local, ví dụ `https://abc123.ngrok.io`. Trong `.env.local` đặt `NEXT_PUBLIC_SITE_URL=https://abc123.ngrok.io` và trên Merchant Admin đăng ký IPN URL = `https://abc123.ngrok.io/api/vnpay/ipn`. Chạy app với `npm run dev`, truy cập qua URL ngrok để thanh toán.
- **Fallback**: Khi khách vẫn được redirect về Return URL (có thể sau khi thấy lỗi trên VNPay), trang `/checkout/vnpay/return` sẽ **tự xác nhận đơn** nếu `vnp_ResponseCode=00`, nên vé vẫn có thể được tạo khi khách quay lại trang của bạn.

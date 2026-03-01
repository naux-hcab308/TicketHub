import crypto from 'crypto'

const VNPAY_TMN_CODE = process.env.VNPAY_TMN_CODE!
const VNPAY_HASH_SECRET = process.env.VNPAY_HASH_SECRET!
const VNPAY_URL = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'

export function getVnpayConfig() {
  return {
    tmnCode: VNPAY_TMN_CODE,
    hashSecret: VNPAY_HASH_SECRET,
    url: VNPAY_URL,
  }
}

export function isVnpayConfigured(): boolean {
  return Boolean(VNPAY_TMN_CODE && VNPAY_HASH_SECRET)
}

/**
 * Encode giá trị theo PHP urlencode: khoảng trắng → '+', ký tự đặc biệt → %XX.
 * VNPay tính checksum theo chuẩn này (demo PHP chính thức của VNPay).
 */
function phpUrlencode(str: string): string {
  return encodeURIComponent(str).replace(/%20/g, '+')
}

/**
 * Tạo chuỗi checksum HMAC SHA512 theo tài liệu VNPay.
 * Sắp xếp tham số theo key, encode giá trị kiểu PHP urlencode, nối key=value bằng &.
 */
function makeSecureHash(params: Record<string, string>): string {
  const sortedKeys = Object.keys(params)
    .filter((k) => k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType' && params[k] !== '' && params[k] !== undefined)
    .sort()
  const signData = sortedKeys.map((k) => `${k}=${phpUrlencode(params[k])}`).join('&')
  const hmac = crypto.createHmac('sha512', VNPAY_HASH_SECRET)
  hmac.update(Buffer.from(signData, 'utf-8'))
  return hmac.digest('hex')
}

export interface BuildPaymentUrlParams {
  amount: number // VND
  txnRef: string
  orderInfo: string
  returnUrl: string
  ipnUrl?: string
  locale?: 'vn' | 'en'
  ipAddr?: string
}

/**
 * Định dạng ngày VNPay: yyyyMMddHHmmss theo giờ Việt Nam (UTC+7).
 */
function formatVnpayDate(date: Date): string {
  const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000)
  return vn.toISOString().replace(/[-:T]/g, '').replace(/\..+/, '').slice(0, 14)
}

/**
 * Tạo URL thanh toán VNPay (môi trường sandbox hoặc production).
 */
export function buildPaymentUrl(params: BuildPaymentUrlParams): string {
  const { tmnCode, url } = getVnpayConfig()
  const now = new Date()
  const createDate = formatVnpayDate(now)

  const vnpParams: Record<string, string> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    // VNPay yêu cầu amount * 100 (đơn vị: đồng nhân 100)
    vnp_Amount: String(Math.round(params.amount) * 100),
    vnp_CurrCode: 'VND',
    vnp_TxnRef: params.txnRef,
    vnp_OrderInfo: params.orderInfo,
    vnp_OrderType: 'other',
    vnp_Locale: params.locale || 'vn',
    vnp_ReturnUrl: params.returnUrl,
    vnp_CreateDate: createDate,
    // vnp_IpAddr là bắt buộc theo tài liệu VNPay
    vnp_IpAddr: params.ipAddr || '127.0.0.1',
  }

  if (params.ipnUrl) vnpParams.vnp_IpnUrl = params.ipnUrl

  const secureHash = makeSecureHash(vnpParams)
  vnpParams.vnp_SecureHash = secureHash

  const query = Object.keys(vnpParams)
    .sort()
    .map((k) => `${k}=${encodeURIComponent(vnpParams[k])}`)
    .join('&')

  return `${url}?${query}`
}

/**
 * Xác thực checksum từ callback VNPay (return URL hoặc IPN).
 * Next.js đã URL-decode các tham số; makeSecureHash sẽ re-encode theo PHP urlencode khi tính hash.
 */
export function verifyReturnUrl(query: Record<string, string | string[] | undefined>): boolean {
  const flat: Record<string, string> = {}
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined) continue
    flat[k] = Array.isArray(v) ? v[0]! : v
  }
  const receivedHash = flat.vnp_SecureHash
  if (!receivedHash) return false
  const expectedHash = makeSecureHash(flat)
  return receivedHash.toLowerCase() === expectedHash.toLowerCase()
}

/**
 * Response code từ VNPay: '00' = thành công.
 */
export function isVnpaySuccess(responseCode: string | undefined): boolean {
  return responseCode === '00'
}

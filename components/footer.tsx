'use client'

import Link from 'next/link'
import { Facebook, Twitter, Instagram, Linkedin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground mt-12 sm:mt-20">
      <div className="container mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-2xl font-bold mb-3">TicketHub</h3>
            <p className="text-sm opacity-80 max-w-xs">
              Cổng vào thế giới sự kiện tuyệt vời – âm nhạc, thể thao, hội nghị và hơn thế nữa.
            </p>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold mb-3 sm:mb-4">Công ty</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#" className="opacity-80 hover:opacity-100 transition">
                  Giới thiệu
                </Link>
              </li>
              <li>
                <Link href="#" className="opacity-80 hover:opacity-100 transition">
                  Tuyển dụng
                </Link>
              </li>
              <li>
                <Link href="#" className="opacity-80 hover:opacity-100 transition">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="#" className="opacity-80 hover:opacity-100 transition">
                  Liên hệ
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-semibold mb-3 sm:mb-4">Hỗ trợ</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#" className="opacity-80 hover:opacity-100 transition">
                  Trung tâm trợ giúp
                </Link>
              </li>
              <li>
                <Link href="#" className="opacity-80 hover:opacity-100 transition">
                  Câu hỏi thường gặp
                </Link>
              </li>
              <li>
                <Link href="#" className="opacity-80 hover:opacity-100 transition">
                  Điều khoản dịch vụ
                </Link>
              </li>
              <li>
                <Link href="#" className="opacity-80 hover:opacity-100 transition">
                  Chính sách bảo mật
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="font-semibold mb-3 sm:mb-4">Theo dõi chúng tôi</h4>
            <div className="flex flex-wrap gap-3">
              <Link
                href="#"
                aria-label="Facebook"
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition"
              >
                <Facebook className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
              <Link
                href="#"
                aria-label="Twitter"
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition"
              >
                <Twitter className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
              <Link
                href="#"
                aria-label="Instagram"
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition"
              >
                <Instagram className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
              <Link
                href="#"
                aria-label="LinkedIn"
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition"
              >
                <Linkedin className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/20 pt-6 sm:pt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs sm:text-sm opacity-80">
            <p>&copy; 2025 TicketHub. Bảo lưu mọi quyền.</p>
            <p>Được tạo ra với tình yêu dành cho những người yêu sự kiện</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

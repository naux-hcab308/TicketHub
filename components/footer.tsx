'use client'

import Link from 'next/link'
import { Facebook, Twitter, Instagram, Linkedin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <h3 className="text-2xl font-bold mb-4">TicketHub</h3>
            <p className="text-sm opacity-80">
              Your gateway to unforgettable events and experiences.
            </p>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#" className="opacity-80 hover:opacity-100 transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="#" className="opacity-80 hover:opacity-100 transition">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="#" className="opacity-80 hover:opacity-100 transition">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="#" className="opacity-80 hover:opacity-100 transition">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#" className="opacity-80 hover:opacity-100 transition">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="#" className="opacity-80 hover:opacity-100 transition">
                  FAQs
                </Link>
              </li>
              <li>
                <Link href="#" className="opacity-80 hover:opacity-100 transition">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="#" className="opacity-80 hover:opacity-100 transition">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="font-semibold mb-4">Follow Us</h4>
            <div className="flex gap-4">
              <Link
                href="#"
                aria-label="Facebook"
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition"
              >
                <Facebook className="w-5 h-5" />
              </Link>
              <Link
                href="#"
                aria-label="Twitter"
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition"
              >
                <Twitter className="w-5 h-5" />
              </Link>
              <Link
                href="#"
                aria-label="Instagram"
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition"
              >
                <Instagram className="w-5 h-5" />
              </Link>
              <Link
                href="#"
                aria-label="LinkedIn"
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition"
              >
                <Linkedin className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/20 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm opacity-80">
            <p>&copy; 2024 TicketHub. All rights reserved.</p>
            <p>Made with ❤️ for event lovers</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

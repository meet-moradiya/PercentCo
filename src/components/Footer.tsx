import Link from "next/link";
import Logo from "@/components/Logo";

const footerLinks = {
  navigation: [
    { label: "About", href: "#about" },
    { label: "Menu", href: "#menu" },
    { label: "Gallery", href: "#gallery" },
    { label: "Reviews", href: "#testimonials" },
    { label: "Contact", href: "#contact" },
  ],
  legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-gold/20 bg-surface">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-8">
          {/* Brand */}
          <div className="md:col-span-1 space-y-4">
            <Link href="/" className="inline-block hover:opacity-80 transition-opacity duration-300">
              <Logo size={52} />
            </Link>
            <p className="text-foreground/40 text-sm leading-relaxed">
              Where culinary artistry meets intimate elegance. Experience fine dining at its most refined.
            </p>
            {/* Social Icons */}
            <div className="flex gap-4 pt-2">
              {["Instagram", "Facebook", "Twitter"].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="w-10 h-10 border border-surface-border flex items-center justify-center text-foreground/40 hover:border-gold hover:text-gold transition-all duration-300"
                  aria-label={social}
                >
                  {social === "Instagram" && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                    </svg>
                  )}
                  {social === "Facebook" && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  )}
                  {social === "Twitter" && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  )}
                </a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm tracking-widest uppercase text-foreground/60 mb-4">Navigate</h3>
            <ul className="space-y-3">
              {footerLinks.navigation.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-foreground/40 hover:text-gold transition-colors duration-300 text-sm">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h3 className="text-sm tracking-widest uppercase text-foreground/60 mb-4">Hours</h3>
            <div className="space-y-3 text-sm text-foreground/40">
              <div>
                <p className="text-foreground/60">Mon — Thu</p>
                <p>5:30 PM – 10:30 PM</p>
              </div>
              <div>
                <p className="text-foreground/60">Fri — Sat</p>
                <p>5:00 PM – 11:30 PM</p>
              </div>
              <div>
                <p className="text-foreground/60">Sunday</p>
                <p>5:00 PM – 10:00 PM</p>
              </div>
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-sm tracking-widest uppercase text-foreground/60 mb-4">Stay Connected</h3>
            <p className="text-foreground/40 text-sm mb-4">Join our list for exclusive events and seasonal menus.</p>
            <div className="flex">
              <input
                type="email"
                placeholder="Your email"
                className="w-full bg-background border border-surface-border px-4 py-2.5 text-sm text-foreground placeholder-foreground/30 focus:border-gold focus:outline-none transition-colors duration-300"
              />
              <button className="px-4 py-2.5 bg-gold text-background text-sm tracking-wider uppercase hover:bg-gold-light transition-colors duration-300 shrink-0">
                Join
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-surface-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-foreground/30 text-xs tracking-wide">© {new Date().getFullYear()} Percentco. All rights reserved.</p>
          <div className="flex gap-6">
            {footerLinks.legal.map((link) => (
              <a key={link.label} href={link.href} className="text-foreground/30 hover:text-foreground/60 text-xs transition-colors duration-300">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

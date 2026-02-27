"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = { href: string; label: string };
type NavGroup = { title: string; links: NavLink[] };

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function RoleSidebarNav({
  primaryLinks,
  navGroups
}: {
  primaryLinks: NavLink[];
  navGroups: NavGroup[];
}) {
  const pathname = usePathname();

  return (
    <nav className="role-side-nav">
      <div className="role-side-section">
        <div className="role-side-section-title">核心功能</div>
        <div className="role-side-links">
          {primaryLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`role-side-link${isActive(pathname, item.href) ? " active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {navGroups.map((group, index) => (
        <div key={group.title} className="role-side-section">
          <div className="role-side-section-title">
            <span className="role-side-step">{index + 1}</span>
            {group.title}
          </div>
          <div className="role-side-links">
            {group.links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`role-side-link${isActive(pathname, item.href) ? " active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

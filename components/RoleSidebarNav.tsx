"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type NavLink = { href: string; label: string };
type NavGroup = { title: string; links: NavLink[] };
const RECENT_LINKS_KEY = "hk_aiedu_recent_links_v1";
const GROUP_STATE_KEY = "hk_aiedu_nav_group_state_v1";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function pickMatchedLink(pathname: string, links: NavLink[]) {
  const matches = links.filter((item) => isActive(pathname, item.href));
  if (!matches.length) return null;
  return [...matches].sort((a, b) => b.href.length - a.href.length)[0];
}

export default function RoleSidebarNav({
  primaryLinks,
  navGroups
}: {
  primaryLinks: NavLink[];
  navGroups: NavGroup[];
}) {
  const pathname = usePathname();
  const [groupOpenState, setGroupOpenState] = useState<Record<string, boolean>>({});
  const [recentHrefs, setRecentHrefs] = useState<string[]>([]);
  const allLinks = useMemo(() => {
    const seen = new Set<string>();
    const merged: NavLink[] = [];
    [...primaryLinks, ...navGroups.flatMap((group) => group.links)].forEach((item) => {
      if (seen.has(item.href)) return;
      seen.add(item.href);
      merged.push(item);
    });
    return merged;
  }, [primaryLinks, navGroups]);

  useEffect(() => {
    const defaults = navGroups.reduce<Record<string, boolean>>((acc, group) => {
      acc[group.title] = true;
      return acc;
    }, {});
    try {
      const raw = window.localStorage.getItem(GROUP_STATE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
      setGroupOpenState({ ...defaults, ...parsed });
    } catch {
      setGroupOpenState(defaults);
    }
  }, [navGroups]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECENT_LINKS_KEY);
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      const validHrefSet = new Set(allLinks.map((item) => item.href));
      const next = parsed.filter((href) => validHrefSet.has(href)).slice(0, 6);
      setRecentHrefs(next);
    } catch {
      setRecentHrefs([]);
    }
  }, [allLinks]);

  useEffect(() => {
    const matched = pickMatchedLink(pathname, allLinks);
    if (!matched) return;
    setRecentHrefs((prev) => {
      const next = [matched.href, ...prev.filter((href) => href !== matched.href)].slice(0, 6);
      try {
        window.localStorage.setItem(RECENT_LINKS_KEY, JSON.stringify(next));
      } catch {
        // ignore storage exceptions
      }
      return next;
    });
  }, [pathname, allLinks]);

  const recentLinks = useMemo(() => {
    const hrefMap = new Map(allLinks.map((item) => [item.href, item]));
    return recentHrefs.map((href) => hrefMap.get(href)).filter(Boolean) as NavLink[];
  }, [allLinks, recentHrefs]);

  function toggleGroup(title: string) {
    setGroupOpenState((prev) => {
      const next = { ...prev, [title]: !(prev[title] ?? true) };
      try {
        window.localStorage.setItem(GROUP_STATE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage exceptions
      }
      return next;
    });
  }

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

      {recentLinks.length ? (
        <div className="role-side-section">
          <div className="role-side-section-title">最近访问</div>
          <div className="role-side-links">
            {recentLinks.map((item) => (
              <Link
                key={`recent-${item.href}`}
                href={item.href}
                className={`role-side-link${isActive(pathname, item.href) ? " active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {navGroups.map((group, index) => (
        <div key={group.title} className="role-side-section">
          <div className="role-side-section-head">
            <div className="role-side-section-title">
              <span className="role-side-step">{index + 1}</span>
              {group.title}
            </div>
            <button
              type="button"
              className="role-side-group-toggle"
              onClick={() => toggleGroup(group.title)}
              aria-expanded={groupOpenState[group.title] ?? true}
            >
              {(groupOpenState[group.title] ?? true) ? "收起" : "展开"}
            </button>
          </div>
          {(groupOpenState[group.title] ?? true) ? (
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
          ) : null}
        </div>
      ))}
    </nav>
  );
}

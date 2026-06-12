import { useState } from "react";

const LANGUAGES = [
  { code: "en",    label: "English",  region: "" },
  { code: "th",    label: "ภาษาไทย",  region: "" },
  { code: "zh-CN", label: "简体中文",  region: "CN" },
  { code: "zh-HK", label: "繁體中文",  region: "HK" },
  { code: "zh-SG", label: "繁體中文",  region: "SG" },
  { code: "ja",    label: "日本語",    region: "" },
  { code: "ko",    label: "한국어",    region: "" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(LANGUAGES[0]);

  return (
    <div style={{ background: "#f5f2ee", minHeight: "100vh" }}>
      <div style={{ background: "#fff", boxShadow: "0 1px 0 #ebebeb", position: "relative" }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 20px", height: 56,
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3d5a4a" strokeWidth="1.5">
              <path d="M12 2C12 2 7 7 7 12a5 5 0 0010 0C17 7 12 2 12 2z"/>
              <path d="M12 12v10M9 9c-2-1-5 0-5 0s1 3 4 4M15 9c2-1 5 0 5 0s-1 3-4 4"/>
            </svg>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 18, fontWeight: 500, color: "#2c3e35", letterSpacing: "0.02em" }}>
              Lanna Bloom
            </span>
          </div>

          {/* Right icons */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>

            {/* Globe + active language label */}
            <button
              onClick={() => setOpen(!open)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 4,
                color: "#3d5a4a", padding: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
              </svg>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#7a6e65" }}>
                {active.label}{active.region ? ` (${active.region})` : ""}
              </span>
            </button>

            {/* Search */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3d5a4a" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>

            {/* Bag */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3d5a4a" strokeWidth="1.5">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>

            {/* Hamburger */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3d5a4a" strokeWidth="1.5">
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </div>
        </div>

        {/* Dropdown panel */}
        {open && (
          <>
            {/* Backdrop to close on outside click */}
            <div
              onClick={() => setOpen(false)}
              style={{ position: "fixed", inset: 0, zIndex: 100 }}
            />
            <div style={{
              position: "absolute", top: 56, right: 20,
              background: "#fff", border: "1px solid #ede8e2",
              borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
              zIndex: 200, minWidth: 170, overflow: "hidden",
            }}>
              {LANGUAGES.map(lang => {
                const isActive = active.code === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => { setActive(lang); setOpen(false); }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      width: "100%", padding: "11px 16px",
                      background: isActive ? "#f0f5f2" : "#fff",
                      border: "none",
                      borderLeft: isActive ? "2px solid #3d5a4a" : "2px solid transparent",
                      color: isActive ? "#3d5a4a" : "#7a6e65",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13, cursor: "pointer", textAlign: "left",
                      gap: 10, transition: "background 0.12s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#f5f1ec"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isActive ? "#f0f5f2" : "#fff"; }}
                  >
                    <span>{lang.label}</span>
                    {lang.region && (
                      <span style={{ fontSize: 10, background: "#ede8e2", borderRadius: 3, padding: "1px 5px", color: "#aaa" }}>
                        {lang.region}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

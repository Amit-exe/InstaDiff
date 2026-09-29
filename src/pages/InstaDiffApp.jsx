import React, { useState, useMemo, useRef } from "react";

function getAvatarGradient(name = "") {
  const palettes = [
    ["#ff0844", "#ff6b6b"], ["#00f2fe", "#4facfe"], ["#fa709a", "#fee140"],
    ["#30cfd0", "#7367f0"], ["#f093fb", "#f5576c"], ["#43e97b", "#38f9d7"],
    ["#f857a6", "#ff5858"], ["#6a11cb", "#2575fc"], ["#ff9a9e", "#fad0c4"],
    ["#a18cd1", "#fbc2eb"],
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const [c1, c2] = palettes[Math.abs(h) % palettes.length];
  return `linear-gradient(135deg, ${c1}, ${c2})`;
}

const SAMPLE_FOLLOWERS = [
  "alex_rivers","tech_lead_dan","sarah_codes","cyber_samurai","neon_dreamer",
  "pixel_artist","web_wizard","stellar_voyager","quantum_leap","design_guru",
  "coffee_addict","luna_sky","matrix_agent","synth_wave","crypto_kaiju",
  "retro_gamer","astro_nova","code_ninja","urban_explorer","sound_architect",
  "daily_dev","minimal_vibes","hyper_focus","space_cadet","alpha_centauri",
];
const SAMPLE_FOLLOWING = [
  "alex_rivers","tech_lead_dan","sarah_codes","celebrity_star","brand_official",
  "elon_musk_fan","ghost_account","cyber_samurai","inactive_user_99","neon_dreamer",
  "viral_meme_page","pixel_artist","top_influencer","web_wizard","gordon_ramsay_official",
  "stellar_voyager","news_daily","coffee_addict","super_car_hub","luna_sky",
  "crypto_whale","code_ninja","billionaire_club","synth_wave","trendy_fits",
  "daily_dev","hype_beast","alpha_centauri","travel_bug_world","zen_master",
];

export default function InstaDiffApp() {
  const [followers, setFollowers] = useState(null);
  const [following, setFollowing]   = useState(null);
  const [followersFileName, setFollowersFileName] = useState("");
  const [followingFileName, setFollowingFileName] = useState("");
  const [isDragOver, setIsDragOver] = useState({ followers: false, following: false });
  const [isScanning, setIsScanning] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [activeTab, setActiveTab]   = useState("unfollowers");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder]   = useState("az");
  const [copiedId, setCopiedId]     = useState(null);
  const [showGuide, setShowGuide]   = useState(false);
  const [toast, setToast]           = useState("");

  const followersRef = useRef(null);
  const followingRef = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const parseUserData = (raw, type) => {
    try {
      const parsed = JSON.parse(raw);
      const extract = (arr) => {
        if (!Array.isArray(arr)) return [];
        return arr.flatMap((item) => {
          if (typeof item === "string") return item;
          if (item?.string_list_data?.[0]?.value) return item.string_list_data[0].value;
          if (item?.value) return item.value;
          if (item?.title) return item.title;
          return [];
        }).filter(Boolean);
      };
      if (type === "followers") {
        if (Array.isArray(parsed)) return extract(parsed);
        if (parsed.relationships_followers) return extract(parsed.relationships_followers);
        if (parsed.followers) return extract(parsed.followers);
      }
      if (type === "following") {
        if (parsed.relationships_following) return extract(parsed.relationships_following);
        if (parsed.following) return extract(parsed.following);
        if (Array.isArray(parsed)) return extract(parsed);
      }
      const col = [];
      const scan = (o) => {
        if (!o || typeof o !== "object") return;
        if (Array.isArray(o)) o.forEach((el) => {
          if (el?.string_list_data?.[0]?.value) col.push(el.string_list_data[0].value);
          else if (typeof el === "string" && el.length < 50 && !el.includes(" ")) col.push(el);
          else scan(el);
        });
        else Object.values(o).forEach(scan);
      };
      scan(parsed);
      return [...new Set(col)];
    } catch {
      return raw.split(/[\r\n,]+/).map((s) => s.trim().replace(/^@/, "")).filter((s) => s && !s.includes(" "));
    }
  };

  const processFile = (file, type) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content !== "string") return;
      const usernames = parseUserData(content, type);
      if (usernames?.length) {
        if (type === "followers") { setFollowers([...new Set(usernames)]); setFollowersFileName(file.name); }
        else { setFollowing([...new Set(usernames)]); setFollowingFileName(file.name); }
      } else {
        alert(`Could not detect valid usernames in ${file.name}.`);
      }
    };
    reader.readAsText(file);
  };

  const { unfollowersList, mutualsList, fansList } = useMemo(() => {
    if (!followers || !following) return { unfollowersList: [], mutualsList: [], fansList: [] };
    const fs = new Set(followers), fgS = new Set(following);
    return {
      unfollowersList: following.filter((u) => !fs.has(u)),
      mutualsList:     following.filter((u) =>  fs.has(u)),
      fansList:        followers.filter((u) => !fgS.has(u)),
    };
  }, [followers, following]);

  const displayedList = useMemo(() => {
    let list = activeTab === "unfollowers" ? [...unfollowersList]
      : activeTab === "fans" ? [...fansList] : [...mutualsList];
    if (searchTerm.trim()) list = list.filter((u) => u.toLowerCase().includes(searchTerm.toLowerCase()));
    if (sortOrder === "az") list.sort((a, b) => a.localeCompare(b));
    else if (sortOrder === "za") list.sort((a, b) => b.localeCompare(a));
    return list;
  }, [activeTab, unfollowersList, fansList, mutualsList, searchTerm, sortOrder]);

  const download = (content, filename, mime = "text/plain") => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type: mime }));
    a.download = filename; document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(a.href);
  };

  const handleDownloadCsv = () => {
    const data = activeTab === "unfollowers" ? unfollowersList : activeTab === "fans" ? fansList : mutualsList;
    if (!data.length) return;
    download("Username,Profile URL\n" + data.map((u) => `${u},https://instagram.com/${u}/`).join("\n"), `insta_${activeTab}.csv`, "text/csv");
    showToast("CSV downloaded! 📥");
  };
  const handleDownloadTxt = () => {
    const data = activeTab === "unfollowers" ? unfollowersList : activeTab === "fans" ? fansList : mutualsList;
    if (!data.length) return;
    download(data.join("\n"), `insta_${activeTab}.txt`);
    showToast("TXT downloaded! 📄");
  };
  const handleCopyAll = () => {
    if (!displayedList.length) return;
    navigator.clipboard.writeText(displayedList.join("\n"));
    showToast(`Copied ${displayedList.length} handles! 📋`);
  };
  const handleCopyUser = (u) => {
    navigator.clipboard.writeText(u); setCopiedId(u);
    setTimeout(() => setCopiedId(null), 1500);
  };
  const handleReset = () => {
    setFollowers(null); setFollowing(null); setFollowersFileName(""); setFollowingFileName("");
    setIsRevealed(false); setIsScanning(false); setSearchTerm(""); setActiveTab("unfollowers");
  };
  const handleReveal = () => {
    setIsScanning(true);
    setTimeout(() => { setIsScanning(false); setIsRevealed(true); }, 700);
  };
  const handleLoadSample = () => {
    setFollowers(SAMPLE_FOLLOWERS); setFollowersFileName("sample_followers.json");
    setFollowing(SAMPLE_FOLLOWING); setFollowingFileName("sample_following.json");
    showToast("Sample data loaded! 🚀");
  };

  const bothReady = followers && following;

  const TABS = [
    { key: "unfollowers", icon: "🚫", count: unfollowersList.length, label: "Don't Follow Back",  color: "#ff0844", bg: "rgba(255,8,68,0.15)",   border: "rgba(255,8,68,0.5)" },
    { key: "mutuals",     icon: "🤝", count: mutualsList.length,     label: "Mutuals",             color: "#10b981", bg: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.5)" },
    { key: "fans",        icon: "🌟", count: fansList.length,        label: "Fans (You Don't Follow)", color: "#00f2fe", bg: "rgba(0,242,254,0.15)",  border: "rgba(0,242,254,0.5)" },
  ];

  return (
    <div style={{ minHeight: "100dvh", background: "#07090e", color: "#f8fafc", fontFamily: "'Plus Jakarta Sans', sans-serif", display: "flex", flexDirection: "column" }}>

      {/* ── Google Fonts ── */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&family=Syne:wght@700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet" />

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "rgba(15,23,42,0.97)", color: "#00f2fe",
          padding: "12px 28px", borderRadius: 999, border: "1px solid rgba(0,242,254,0.4)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.8)", zIndex: 9999,
          fontWeight: 700, fontSize: 14, backdropFilter: "blur(12px)", whiteSpace: "nowrap",
        }}>
          {toast}
        </div>
      )}

      {/* ── Header ── */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        height: 64, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", background: "rgba(7,9,14,0.8)",
        backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22, filter: "drop-shadow(0 0 10px rgba(0,242,254,0.9))", animation: "pulse-icon 3s ease-in-out infinite" }}>⚡</span>
          <span style={{
            fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 900, letterSpacing: 1,
            textTransform: "uppercase",
            background: "linear-gradient(135deg,#00f2fe,#ff0844,#ffaa00)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>InstaDiff</span>
        </div>

        {/* Center privacy badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700,
          color: "#10b981", background: "rgba(16,185,129,0.1)",
          border: "1px solid rgba(16,185,129,0.25)", padding: "5px 14px",
          borderRadius: 999, textTransform: "uppercase", letterSpacing: 1,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981", display: "inline-block", animation: "blink 2s infinite" }} />
          100% Private
        </div>

        {/* Right actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowGuide(true)} style={btnGhost}>❓ How To Export</button>
          {!bothReady && !isRevealed && <button onClick={handleLoadSample} style={btnSample}>🚀 Try Demo</button>}
          {isRevealed && <button onClick={handleReset} style={btnGhost}>🔄 Reset</button>}
        </div>
      </header>

      {/* ── Hidden file inputs ── */}
      <input type="file" ref={followersRef} accept=".json,.txt,.csv" style={{ display: "none" }}
        onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], "followers")} />
      <input type="file" ref={followingRef} accept=".json,.txt,.csv" style={{ display: "none" }}
        onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], "following")} />

      {/* ══════════════════════════════════════════
          UPLOAD SCREEN
         ══════════════════════════════════════════ */}
      {!isRevealed ? (
        <main style={{
          flex: 1, paddingTop: 64, display: "flex", flexDirection: "column",
          minHeight: "100dvh",
          /* On md+ switch to row via media query below */
        }}
          className="upload-main"
        >
          {/* LEFT zone */}
          <DropZone
            side="followers"
            accentColor="#00f2fe"
            partLabel="PART 1 · INBOUND"
            title="Followers File"
            hint={<>Drop your <strong>followers_1.json</strong> or <strong>followers_1.json</strong> here</>}
            uploadLabel="⚡ Click or Drop File"
            isDragOver={isDragOver.followers}
            isLoaded={!!followers}
            count={followers?.length}
            countLabel="Followers Loaded"
            chips={followers?.slice(0, 4)}
            totalCount={followers?.length}
            fileName={followersFileName}
            onZoneClick={() => followersRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(p => ({ ...p, followers: true })); }}
            onDragLeave={() => setIsDragOver(p => ({ ...p, followers: false }))}
            onDrop={(e) => { e.preventDefault(); setIsDragOver(p => ({ ...p, followers: false })); e.dataTransfer.files?.[0] && processFile(e.dataTransfer.files[0], "followers"); }}
            onReplace={() => followersRef.current?.click()}
          />

          {/* RIGHT zone */}
          <DropZone
            side="following"
            accentColor="#ff0844"
            partLabel="PART 2 · OUTBOUND"
            title="Following File"
            hint={<>Drop your <strong>following.json</strong> here</>}
            uploadLabel="🔥 Click or Drop File"
            isDragOver={isDragOver.following}
            isLoaded={!!following}
            count={following?.length}
            countLabel="Following Loaded"
            chips={following?.slice(0, 4)}
            totalCount={following?.length}
            fileName={followingFileName}
            onZoneClick={() => followingRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(p => ({ ...p, following: true })); }}
            onDragLeave={() => setIsDragOver(p => ({ ...p, following: false }))}
            onDrop={(e) => { e.preventDefault(); setIsDragOver(p => ({ ...p, following: false })); e.dataTransfer.files?.[0] && processFile(e.dataTransfer.files[0], "following"); }}
            onReplace={() => followingRef.current?.click()}
          />

          {/* Reveal button — below both zones */}
          {bothReady && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "32px 20px", background: "#07090e" }}>
              <button onClick={handleReveal} style={{
                position: "relative", border: "none", background: "transparent",
                padding: 0, cursor: "pointer", outline: "none",
                animation: "float-and-scale 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards, btn-ambient-glow 3s infinite ease-in-out",
              }}>
                <div style={{
                  position: "absolute", inset: -12, borderRadius: 32,
                  background: "linear-gradient(135deg,#00f2fe,#ff0844,#ffaa00,#00ff88)",
                  backgroundSize: "300% 300%", filter: "blur(18px)", opacity: 0.9,
                  animation: "gradient-flow 4s ease infinite", zIndex: 1,
                }} />
                <div style={{
                  position: "relative", zIndex: 2,
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "20px 40px", borderRadius: 24,
                  background: "linear-gradient(135deg,#0f1422,#1a0f24)",
                  border: "2px solid rgba(255,255,255,0.4)",
                  boxShadow: "0 15px 40px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.4)",
                }}>
                  <span style={{ fontSize: 28, animation: "pulse-quick 1.2s infinite" }}>⚡</span>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                    <span style={{
                      fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 900,
                      letterSpacing: 2, textTransform: "uppercase",
                      background: "linear-gradient(135deg,#fff,#ffe600,#ff5277)",
                      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    }}>REVEAL UNFOLLOWERS</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#38bdf8", letterSpacing: 2, textTransform: "uppercase", marginTop: 3 }}>
                      CLICK TO DETECT NON-MUTUALS
                    </span>
                  </div>
                  <span style={{ fontSize: 28, transform: "rotate(180deg)", animation: "pulse-quick 1.2s infinite" }}>⚡</span>
                </div>
              </button>
            </div>
          )}
        </main>
      ) : (
        /* ══════════════════════════════════════════
            RESULTS DASHBOARD
           ══════════════════════════════════════════ */
        <main style={{
          flex: 1, maxWidth: 1100, width: "100%", margin: "0 auto",
          padding: "88px 16px 60px", display: "flex", flexDirection: "column", gap: 24,
          animation: "fadeIn 0.4s ease",
        }}>

          {/* ── Hero card ── */}
          <div style={{
            position: "relative", borderRadius: 24,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "linear-gradient(135deg,rgba(20,25,40,0.9),rgba(12,16,28,0.97))",
            padding: "28px 24px", display: "flex", flexDirection: "column", gap: 20,
            boxShadow: "0 20px 50px rgba(0,0,0,0.6)", overflow: "hidden",
          }}>
            {/* Top accent */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,#ff0844,#ffaa00,#00f2fe)" }} />

            {/* Title row */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
              <div>
                <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: "clamp(22px,4vw,32px)", fontWeight: 900, marginBottom: 6 }}>
                  ⚡ Analysis Matrix
                </h1>
                <p style={{ color: "#94a3b8", fontSize: 14 }}>
                  Comparing <strong style={{ color: "#fff" }}>{following?.length.toLocaleString()}</strong> following vs <strong style={{ color: "#fff" }}>{followers?.length.toLocaleString()}</strong> followers
                </p>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {[
                  { label: `📥 CSV (${displayedList.length})`, action: handleDownloadCsv, style: btnPrimary },
                  { label: "📄 TXT", action: handleDownloadTxt, style: btnSecondary },
                  { label: "📋 Copy All", action: handleCopyAll, style: btnSecondary },
                  { label: "🔄 Reset", action: handleReset, style: btnDanger },
                ].map(({ label, action, style: s }) => (
                  <button key={label} onClick={action} style={s}>{label}</button>
                ))}
              </div>
            </div>

            {/* Stat tabs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              {TABS.map(({ key, icon, count, label, color, bg, border }) => (
                <button key={key} onClick={() => setActiveTab(key)} style={{
                  border: `1px solid ${activeTab === key ? border : "rgba(255,255,255,0.08)"}`,
                  background: activeTab === key ? bg : "rgba(10,15,26,0.6)",
                  borderRadius: 18, padding: "16px 12px",
                  display: "flex", alignItems: "center", gap: 14,
                  cursor: "pointer", transition: "all 0.2s",
                  boxShadow: activeTab === key ? `0 0 20px ${bg}` : "none",
                  textAlign: "left",
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                    background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                  }}>{icon}</div>
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "clamp(20px,3vw,26px)", fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>{count}</span>
                    <span style={{ fontSize: "clamp(9px,1.2vw,12px)", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Toolbar ── */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: 16 }}>🔍</span>
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search @username in ${activeTab}…`}
                style={{
                  width: "100%", padding: "13px 16px 13px 44px",
                  background: "rgba(15,20,32,0.75)", border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 16, color: "#fff", fontSize: 14, outline: "none",
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                }}
              />
            </div>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{
              padding: "13px 16px", background: "rgba(15,20,32,0.75)",
              border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16,
              color: "#fff", fontSize: 13, fontWeight: 600, outline: "none", cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans',sans-serif",
            }}>
              <option value="az">A → Z</option>
              <option value="za">Z → A</option>
              <option value="default">File Order</option>
            </select>
          </div>

          {/* ── User grid ── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 12,
          }}>
            {displayedList.length > 0 ? displayedList.map((user, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 12, padding: "14px 16px", borderRadius: 18,
                background: "rgba(15,20,32,0.65)", border: "1px solid rgba(255,255,255,0.08)",
                transition: "all 0.2s",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                    background: getAvatarGradient(user),
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 17, color: "#fff",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
                  }}>
                    {user[0].toUpperCase()}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{user}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#64748b", marginTop: 1 }}>
                      {activeTab === "unfollowers" ? "Does not follow back" : activeTab === "fans" ? "Follows you" : "Mutual connection"}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => handleCopyUser(user)} style={{
                    ...iconBtn,
                    background: copiedId === user ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.06)",
                    borderColor: copiedId === user ? "#10b981" : "rgba(255,255,255,0.1)",
                    color: copiedId === user ? "#34d399" : "#94a3b8",
                  }}>{copiedId === user ? "✓" : "📋"}</button>
                  <a href={`https://instagram.com/${user}/`} target="_blank" rel="noopener noreferrer" style={{ ...iconBtn, textDecoration: "none" }}>↗</a>
                </div>
              </div>
            )) : (
              <div style={{
                gridColumn: "1/-1", display: "flex", flexDirection: "column", alignItems: "center",
                padding: "64px 24px", borderRadius: 24,
                background: "rgba(15,20,32,0.5)", border: "2px dashed rgba(255,255,255,0.1)",
              }}>
                <span style={{ fontSize: 52, marginBottom: 16 }}>{searchTerm ? "🔍" : activeTab === "unfollowers" ? "🎉" : "✨"}</span>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
                  {searchTerm ? "No matches found" : activeTab === "unfollowers" ? "Everyone follows you back!" : "Nothing here yet"}
                </h3>
                <p style={{ color: "#94a3b8", fontSize: 14, textAlign: "center", maxWidth: 360 }}>
                  {searchTerm ? `Try a different search for "${searchTerm}"` : activeTab === "unfollowers" ? "Your follow ratio is immaculate 💚" : "Switch tabs or upload different data."}
                </p>
              </div>
            )}
          </div>
        </main>
      )}

      {/* ── Scanning overlay ── */}
      {isScanning && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(5,8,15,0.93)", backdropFilter: "blur(24px)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          animation: "fadeIn 0.3s ease",
        }}>
          <div style={{ position: "relative", width: 160, height: 160, borderRadius: "50%", border: "2px solid rgba(0,242,254,0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28 }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "conic-gradient(from 0deg,rgba(0,242,254,0.8) 0deg,transparent 90deg)", animation: "radar-sweep 1.2s linear infinite" }} />
            <div style={{ position: "absolute", inset: -18, borderRadius: "50%", border: "1px dashed rgba(255,8,68,0.5)", animation: "rotate-slow 10s linear infinite reverse" }} />
            <span style={{ fontSize: 44, filter: "drop-shadow(0 0 15px #00f2fe)" }}>⚡</span>
          </div>
          <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, marginBottom: 8, letterSpacing: 1 }}>DIFFING FOLLOW GRAPH</h3>
          <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#38bdf8", letterSpacing: 2, textTransform: "uppercase" }}>CROSS-REFERENCING NODES...</p>
        </div>
      )}

      {/* ── Guide modal ── */}
      {showGuide && (
        <div onClick={() => setShowGuide(false)} style={{
          position: "fixed", inset: 0, zIndex: 120,
          background: "rgba(0,0,0,0.82)", backdropFilter: "blur(14px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20, animation: "fadeIn 0.2s ease",
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "#0f1422", border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 24, maxWidth: 540, width: "100%", padding: "28px 28px",
            boxShadow: "0 30px 60px rgba(0,0,0,0.9)", maxHeight: "90dvh", overflowY: "auto",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800 }}>📦 How to Get Your Instagram Data</h3>
              <button onClick={() => setShowGuide(false)} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {[
                { n: 1, t: "Open Instagram Accounts Center", d: "Settings & Privacy → Accounts Center → Your information and permissions" },
                { n: 2, t: "Request Download", d: "Download your information → Download or transfer information → Some of your information" },
                { n: 3, t: "Select Followers & Following", d: "Scroll and check only Followers and Following" },
                { n: 4, t: "Choose JSON Format", d: "Download to device → Format: JSON → Date range: All time" },
                { n: 5, t: "Extract & Drop Files", d: "Unzip the email ZIP. Drop followers_1.json in the left zone and following.json in the right zone!" },
              ].map(({ n, t, d }) => (
                <div key={n} style={{ display: "flex", gap: 14 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#00f2fe,#ff0844)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{n}</div>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{t}</h4>
                    <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>{d}</p>
                  </div>
                </div>
              ))}
              <button onClick={() => setShowGuide(false)} style={{ ...btnPrimary, width: "100%", justifyContent: "center", marginTop: 4 }}>
                Got It! Let's Diff ⚡
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Responsive styles & animations ── */}
      <style>{`
        @keyframes pulse-icon { 0%,100%{transform:scale(1);filter:drop-shadow(0 0 10px rgba(0,242,254,0.8))} 50%{transform:scale(1.15) rotate(5deg);filter:drop-shadow(0 0 20px rgba(255,8,68,0.9))} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes rotate-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes gradient-flow { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes float-and-scale { 0%{transform:scale(0.7);opacity:0} 100%{transform:scale(1);opacity:1} }
        @keyframes btn-ambient-glow { 0%,100%{filter:drop-shadow(0 0 25px rgba(255,8,68,0.5)) drop-shadow(0 0 50px rgba(0,242,254,0.3))} 50%{filter:drop-shadow(0 0 45px rgba(255,170,0,0.7))} }
        @keyframes pulse-quick { 0%,100%{transform:scale(1)} 50%{transform:scale(1.25)} }
        @keyframes radar-sweep { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes seam-pulse { 0%{opacity:0.7;filter:drop-shadow(0 0 15px #00f2fe)} 100%{opacity:1;filter:drop-shadow(0 0 35px #ff0844)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin-ring { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

        /* Upload layout: stack on mobile, side-by-side on desktop */
        .upload-main { flex-direction: column !important; }
        @media(min-width:768px) { .upload-main { flex-direction: row !important; } }

        /* Hover on user cards */
        .user-card-hover:hover {
          border-color: rgba(255,8,68,0.4) !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
      `}</style>
    </div>
  );
}

/* ── DropZone component ── */
function DropZone({ side, accentColor, partLabel, title, hint, uploadLabel, isDragOver, isLoaded,
  count, countLabel, chips, totalCount, fileName, onZoneClick, onDragOver, onDragLeave, onDrop, onReplace }) {

  const isCyan = accentColor === "#00f2fe";

  return (
    <div
      onClick={onZoneClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        cursor: "pointer",
        userSelect: "none",
        transition: "background 0.3s ease",
        background: isDragOver
          ? `radial-gradient(circle at 50% 50%, ${accentColor}22, rgba(7,9,14,0.97) 75%)`
          : isLoaded
          ? isCyan
            ? "radial-gradient(circle at 30% 30%, rgba(0,242,254,0.14), rgba(6,32,44,0.97) 75%)"
            : "radial-gradient(circle at 70% 30%, rgba(255,8,68,0.14), rgba(42,10,24,0.97) 75%)"
          : isCyan
          ? "radial-gradient(circle at 20% 30%, rgba(0,242,254,0.07), rgba(9,14,26,0.97) 72%)"
          : "radial-gradient(circle at 80% 30%, rgba(255,8,68,0.07), rgba(18,10,24,0.97) 72%)",
        boxShadow: isDragOver ? `inset 0 0 80px ${accentColor}33` : "none",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        /* On desktop, show a side border instead */
        minHeight: "calc(50dvh - 32px)",
      }}
    >
      {/* Card */}
      <div style={{
        position: "relative",
        display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
        maxWidth: 420, width: "100%",
        padding: "36px 28px",
        borderRadius: 28,
        background: "rgba(12,17,28,0.7)",
        backdropFilter: "blur(20px)",
        border: `1px solid rgba(255,255,255,0.09)`,
        borderTop: `2px solid ${accentColor}99`,
        boxShadow: `0 20px 50px rgba(0,0,0,0.55), 0 0 0 0 transparent`,
        transition: "transform 0.3s ease, box-shadow 0.3s ease",
      }}>
        {/* Animated icon ring */}
        <div style={{ position: "relative", width: 88, height: 88, marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            border: `2px dashed ${accentColor}66`,
            animation: "spin-ring 18s linear infinite",
          }} />
          <div style={{
            width: 68, height: 68, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28,
            background: isLoaded
              ? "linear-gradient(135deg,#10b981,#059669)"
              : `linear-gradient(135deg,${accentColor}22,${accentColor}11)`,
            border: `1px solid ${isLoaded ? "#34d399" : accentColor + "55"}`,
            boxShadow: `0 0 ${isLoaded ? 30 : 20}px ${isLoaded ? "rgba(16,185,129,0.5)" : accentColor + "44"}`,
            transition: "all 0.4s ease",
          }}>
            {isLoaded ? "✓" : isCyan ? "📥" : "📤"}
          </div>
        </div>

        {/* Tag */}
        <span style={{
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase",
          padding: "4px 14px", borderRadius: 999, marginBottom: 10,
          background: `${accentColor}18`, color: accentColor,
          border: `1px solid ${accentColor}44`,
        }}>{partLabel}</span>

        <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color: "#fff", marginBottom: 6 }}>{title}</h2>
        <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.55, marginBottom: 20 }}>{hint}</p>

        {isLoaded ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: "100%" }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
              background: `${accentColor}18`, border: `1px solid ${accentColor}44`,
              borderRadius: 16, padding: "12px 24px", width: "100%",
            }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 26, fontWeight: 800, color: accentColor }}>{count?.toLocaleString()}</span>
              <span style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600 }}>{countLabel}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6 }}>
              {chips?.map((u, i) => (
                <span key={i} style={{
                  fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
                  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                  color: "#94a3b8", padding: "3px 10px", borderRadius: 8,
                }}>@{u}</span>
              ))}
              {totalCount > 4 && (
                <span style={{
                  fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
                  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                  color: "#94a3b8", padding: "3px 10px", borderRadius: 8,
                }}>+{totalCount - 4} more</span>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onReplace(); }}
              style={{ fontSize: 12, color: "#64748b", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", marginTop: 2 }}
            >
              Click to replace ({fileName || "file"})
            </button>
          </div>
        ) : (
          <>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
              borderRadius: 12, background: "rgba(255,255,255,0.06)",
              border: "1px dashed rgba(255,255,255,0.18)", color: "#fff",
              fontSize: 13, fontWeight: 600, transition: "all 0.2s",
            }}>{uploadLabel}</div>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#475569", marginTop: 10 }}>Accepts .json .txt .csv</span>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Shared button styles ── */
const btnGhost = {
  background: "rgba(255,255,255,0.07)", color: "#f8fafc",
  border: "1px solid rgba(255,255,255,0.13)", padding: "8px 16px",
  borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer",
  display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s",
  fontFamily: "'Plus Jakarta Sans',sans-serif",
};
const btnSample = {
  background: "linear-gradient(135deg,rgba(0,242,254,0.18),rgba(255,8,68,0.18))",
  border: "1px solid rgba(255,255,255,0.22)", color: "#fff",
  padding: "8px 18px", borderRadius: 12, fontSize: 13, fontWeight: 700,
  cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
  fontFamily: "'Plus Jakarta Sans',sans-serif",
};
const btnPrimary = {
  background: "linear-gradient(135deg,#ff0844,#ff5e3a)",
  color: "#fff", border: "none", fontSize: 14, fontWeight: 700,
  padding: "11px 20px", borderRadius: 14, cursor: "pointer",
  display: "flex", alignItems: "center", gap: 8,
  boxShadow: "0 8px 20px rgba(255,8,68,0.4)", transition: "all 0.2s",
  fontFamily: "'Plus Jakarta Sans',sans-serif",
};
const btnSecondary = {
  background: "rgba(255,255,255,0.08)", color: "#fff",
  border: "1px solid rgba(255,255,255,0.16)", fontSize: 14, fontWeight: 600,
  padding: "11px 18px", borderRadius: 14, cursor: "pointer",
  display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s",
  fontFamily: "'Plus Jakarta Sans',sans-serif",
};
const btnDanger = {
  background: "rgba(239,68,68,0.12)", color: "#fca5a5",
  border: "1px solid rgba(239,68,68,0.28)", fontSize: 14, fontWeight: 600,
  padding: "11px 18px", borderRadius: 14, cursor: "pointer",
  display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s",
  fontFamily: "'Plus Jakarta Sans',sans-serif",
};
const iconBtn = {
  width: 34, height: 34, borderRadius: 10,
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 14, cursor: "pointer", border: "1px solid",
  transition: "all 0.2s", background: "rgba(255,255,255,0.06)",
  borderColor: "rgba(255,255,255,0.1)", color: "#94a3b8",
};

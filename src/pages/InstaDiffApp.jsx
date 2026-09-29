import React, { useState, useMemo, useRef } from "react";

// Helper to generate a consistent vibrant gradient based on username
function getAvatarGradient(name = "") {
  const colors = [
    ["#ff0844", "#ffb199"],
    ["#00f2fe", "#4facfe"],
    ["#fa709a", "#fee140"],
    ["#30cfd0", "#330867"],
    ["#f093fb", "#f5576c"],
    ["#43e97b", "#38f9d7"],
    ["#f857a6", "#ff5858"],
    ["#6a11cb", "#2575fc"],
    ["#ff9a9e", "#fecfef"],
    ["#a18cd1", "#fbc2eb"],
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  const [c1, c2] = colors[index];
  return `linear-gradient(135deg, ${c1}, ${c2})`;
}

// Sample mock data for instant testing
const SAMPLE_FOLLOWERS = [
  "alex_rivers", "tech_lead_dan", "sarah_codes", "cyber_samurai", "neon_dreamer",
  "pixel_artist", "web_wizard", "stellar_voyager", "quantum_leap", "design_guru",
  "coffee_addict", "luna_sky", "matrix_agent", "synth_wave", "crypto_kaiju",
  "retro_gamer", "astro_nova", "code_ninja", "urban_explorer", "sound_architect",
  "daily_dev", "minimal_vibes", "hyper_focus", "space_cadet", "alpha_centauri"
];

const SAMPLE_FOLLOWING = [
  "alex_rivers", "tech_lead_dan", "sarah_codes", "celebrity_star", "brand_official",
  "elon_musk_fan", "ghost_account", "cyber_samurai", "inactive_user_99", "neon_dreamer",
  "viral_meme_page", "pixel_artist", "top_influencer", "web_wizard", "gordon_ramsay_official",
  "stellar_voyager", "news_daily", "coffee_addict", "super_car_hub", "luna_sky",
  "crypto_whale", "code_ninja", "billionaire_club", "synth_wave", "trendy_fits",
  "daily_dev", "hype_beast", "alpha_centauri", "travel_bug_world", "zen_master"
];

export default function InstaDiffApp() {
  const [followers, setFollowers] = useState(null);
  const [following, setFollowing] = useState(null);
  const [followersFileName, setFollowersFileName] = useState("");
  const [followingFileName, setFollowingFileName] = useState("");
  const [isFollowersDragOver, setIsFollowersDragOver] = useState(false);
  const [isFollowingDragOver, setIsFollowingDragOver] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [activeTab, setActiveTab] = useState("unfollowers");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("az");
  const [copiedId, setCopiedId] = useState(null);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [toastText, setToastText] = useState("");

  const followersInputRef = useRef(null);
  const followingInputRef = useRef(null);

  const showToast = (msg) => {
    setToastText(msg);
    setTimeout(() => setToastText(""), 3000);
  };

  // Safe Instagram JSON / Text extraction engine
  const parseUserData = (rawContent, type) => {
    try {
      const parsed = JSON.parse(rawContent);
      const extractHandles = (arr) => {
        if (!Array.isArray(arr)) return [];
        const result = [];
        for (const item of arr) {
          if (typeof item === "string") {
            result.push(item);
          } else if (item?.string_list_data?.[0]?.value) {
            result.push(item.string_list_data[0].value);
          } else if (item?.value) {
            result.push(item.value);
          } else if (item?.title) {
            result.push(item.title);
          }
        }
        return result.filter(Boolean);
      };

      if (type === "followers") {
        if (Array.isArray(parsed)) return extractHandles(parsed);
        if (parsed.relationships_followers) return extractHandles(parsed.relationships_followers);
        if (parsed.followers) return extractHandles(parsed.followers);
      }
      if (type === "following") {
        if (parsed.relationships_following) return extractHandles(parsed.relationships_following);
        if (parsed.following) return extractHandles(parsed.following);
        if (Array.isArray(parsed)) return extractHandles(parsed);
      }

      const collected = [];
      const scan = (obj) => {
        if (!obj || typeof obj !== "object") return;
        if (Array.isArray(obj)) {
          for (const el of obj) {
            if (el?.string_list_data?.[0]?.value) collected.push(el.string_list_data[0].value);
            else if (typeof el === "string" && el.length < 50 && !el.includes(" ")) collected.push(el);
            else scan(el);
          }
        } else {
          for (const key in obj) scan(obj[key]);
        }
      };
      scan(parsed);
      if (collected.length > 0) return [...new Set(collected)];
      return [];
    } catch {
      const lines = rawContent
        .split(/[\r\n,]+/)
        .map((s) => s.trim().replace(/^@/, ""))
        .filter((s) => s.length > 0 && !s.includes(" "));
      return lines;
    }
  };

  const processFile = (file, type) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content !== "string") return;
      const usernames = parseUserData(content, type);
      if (usernames && usernames.length > 0) {
        if (type === "followers") {
          setFollowers([...new Set(usernames)]);
          setFollowersFileName(file.name);
        } else {
          setFollowing([...new Set(usernames)]);
          setFollowingFileName(file.name);
        }
      } else {
        alert(`Could not detect valid usernames in ${file.name}. Please ensure it's a valid Instagram JSON/export file.`);
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e, type) => {
    e.preventDefault();
    if (type === "followers") setIsFollowersDragOver(true);
    if (type === "following") setIsFollowingDragOver(true);
  };
  const handleDragLeave = (type) => {
    if (type === "followers") setIsFollowersDragOver(false);
    if (type === "following") setIsFollowingDragOver(false);
  };
  const handleDrop = (e, type) => {
    e.preventDefault();
    if (type === "followers") setIsFollowersDragOver(false);
    if (type === "following") setIsFollowingDragOver(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0], type);
  };

  const handleLoadSample = () => {
    setFollowers(SAMPLE_FOLLOWERS);
    setFollowersFileName("sample_followers.json");
    setFollowing(SAMPLE_FOLLOWING);
    setFollowingFileName("sample_following.json");
    showToast("Loaded sample test dataset! 🚀");
  };

  const { unfollowersList, mutualsList, fansList } = useMemo(() => {
    if (!followers || !following) return { unfollowersList: [], mutualsList: [], fansList: [] };
    const followerSet = new Set(followers);
    const followingSet = new Set(following);
    return {
      unfollowersList: following.filter((u) => !followerSet.has(u)),
      mutualsList: following.filter((u) => followerSet.has(u)),
      fansList: followers.filter((u) => !followingSet.has(u)),
    };
  }, [followers, following]);

  const handleRevealClick = () => {
    setIsScanning(true);
    setTimeout(() => { setIsScanning(false); setIsRevealed(true); }, 700);
  };

  const displayedList = useMemo(() => {
    let list = activeTab === "unfollowers" ? [...unfollowersList]
      : activeTab === "fans" ? [...fansList]
      : [...mutualsList];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((u) => u.toLowerCase().includes(q));
    }
    if (sortOrder === "az") list.sort((a, b) => a.localeCompare(b));
    else if (sortOrder === "za") list.sort((a, b) => b.localeCompare(a));
    return list;
  }, [activeTab, unfollowersList, fansList, mutualsList, searchTerm, sortOrder]);

  const handleDownloadCsv = () => {
    const activeData = activeTab === "unfollowers" ? unfollowersList : activeTab === "fans" ? fansList : mutualsList;
    if (!activeData?.length) return;
    const title = activeTab === "unfollowers" ? "instagram_not_following_back" : activeTab === "fans" ? "instagram_fans" : "instagram_mutuals";
    const csvContent = "data:text/csv;charset=utf-8,Username,Instagram Profile URL\n" + activeData.map((u) => `${u},https://www.instagram.com/${u}/`).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `${title}_${Date.now()}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    showToast("CSV file downloaded! 📥");
  };

  const handleDownloadTxt = () => {
    const activeData = activeTab === "unfollowers" ? unfollowersList : activeTab === "fans" ? fansList : mutualsList;
    if (!activeData?.length) return;
    const title = activeTab === "unfollowers" ? "unfollowers" : activeTab === "fans" ? "fans" : "mutuals";
    const blob = new Blob([activeData.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `instagram_${title}_list.txt`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("TXT list downloaded! 📄");
  };

  const handleCopyUser = (username) => {
    navigator.clipboard.writeText(username);
    setCopiedId(username);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleCopyAll = () => {
    if (!displayedList.length) return;
    navigator.clipboard.writeText(displayedList.join("\n"));
    showToast(`Copied ${displayedList.length} handles to clipboard! 📋`);
  };

  const handleReset = () => {
    setFollowers(null); setFollowing(null);
    setFollowersFileName(""); setFollowingFileName("");
    setIsRevealed(false); setIsScanning(false);
    setSearchTerm(""); setActiveTab("unfollowers");
  };

  const bothReady = followers && following;

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#07090e] text-white flex flex-col font-[var(--font-sans)]">

      {/* ── Toast ── */}
      {toastText && (
        <div style={{ backdropFilter: "blur(10px)" }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-2 px-5 py-3 rounded-full border border-[rgba(0,242,254,0.4)] bg-[rgba(15,23,42,0.95)] text-[#00f2fe] font-bold text-sm shadow-2xl whitespace-nowrap">
          {toastText}
        </div>
      )}

      {/* ── Header ── */}
      <header style={{ backdropFilter: "blur(16px)" }}
        className="fixed top-0 left-0 right-0 z-50 h-14 sm:h-[68px] flex items-center justify-between px-3 sm:px-7 bg-[rgba(7,9,14,0.75)] border-b border-white/[0.08]">

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xl sm:text-2xl" style={{ filter: "drop-shadow(0 0 10px rgba(0,242,254,0.8))", animation: "pulse-icon 3s ease-in-out infinite" }}>⚡</span>
          <span className="text-base sm:text-xl font-black tracking-wide uppercase"
            style={{ fontFamily: "var(--font-display)", background: "linear-gradient(135deg,#00f2fe 0%,#ff0844 50%,#ffaa00 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            InstaDiff
          </span>
        </div>

        {/* Privacy badge — hidden on very small screens */}
        <div className="hidden xs:flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/25 px-3 py-1.5 rounded-full uppercase tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" style={{ animation: "blink 2s infinite ease-in-out" }} />
          100% Private
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <button type="button" onClick={() => setShowGuideModal(true)}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-white/[0.06] border border-white/[0.12] hover:bg-white/[0.12] transition-all">
            ❓ <span className="hidden sm:inline">How To Export</span>
          </button>
          {!bothReady && !isRevealed && (
            <button type="button" onClick={handleLoadSample}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-bold px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-white/20 bg-gradient-to-r from-cyan-500/15 to-pink-600/15 hover:from-cyan-500/30 hover:to-pink-600/30 transition-all">
              🚀 <span className="hidden sm:inline">Try Demo</span>
            </button>
          )}
          {isRevealed && (
            <button type="button" onClick={handleReset}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-white/[0.06] border border-white/[0.12] hover:bg-white/[0.12] transition-all">
              🔄 <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Hidden file inputs ── */}
      <input type="file" ref={followersInputRef} accept=".json,.txt,.csv" className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) processFile(e.target.files[0], "followers"); }} />
      <input type="file" ref={followingInputRef} accept=".json,.txt,.csv" className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) processFile(e.target.files[0], "following"); }} />

      {/* ── Upload Split Screen ── */}
      {!isRevealed ? (
        <main className="flex flex-col md:flex-row flex-1 pt-14 sm:pt-[68px] relative overflow-hidden">

          {/* LEFT — Followers */}
          <div
            onClick={() => followersInputRef.current?.click()}
            onDragOver={(e) => handleDragOver(e, "followers")}
            onDragLeave={() => handleDragLeave("followers")}
            onDrop={(e) => handleDrop(e, "followers")}
            className={`relative flex-1 flex flex-col items-center justify-center px-4 py-8 sm:p-10 cursor-pointer transition-all duration-300 select-none min-h-[45dvh] md:min-h-0 border-b md:border-b-0 md:border-r border-white/10
              ${isFollowersDragOver ? "bg-[rgba(0,242,254,0.08)] shadow-[inset_0_0_60px_rgba(0,242,254,0.25)]" : ""}
              ${followers ? "bg-[radial-gradient(circle_at_30%_30%,rgba(0,242,254,0.15),rgba(6,32,44,0.95)_75%)]" : "bg-[radial-gradient(circle_at_20%_30%,rgba(0,242,254,0.08),rgba(9,14,26,0.95)_70%)]"}
            `}
          >
            <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full p-6 sm:p-8 rounded-3xl bg-[rgba(15,20,32,0.55)] border border-white/[0.08] border-t-2 border-t-[rgba(0,242,254,0.6)] shadow-2xl hover:-translate-y-1 transition-transform duration-300"
              style={{ backdropFilter: "blur(20px)" }}>

              {/* Icon */}
              <div className="relative w-16 h-16 sm:w-24 sm:h-24 flex items-center justify-center mb-4 sm:mb-5">
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-[rgba(0,242,254,0.4)]" style={{ animation: "rotate-slow 20s linear infinite" }} />
                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-xl sm:text-3xl transition-all
                  ${followers ? "bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-[0_0_30px_rgba(16,185,129,0.6)]" : "bg-[rgba(0,242,254,0.15)] border border-[rgba(0,242,254,0.4)] shadow-[0_0_25px_rgba(0,242,254,0.3)]"}`}>
                  {followers ? "✓" : "📥"}
                </div>
              </div>

              <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-2 bg-[rgba(0,242,254,0.15)] text-[#00f2fe] border border-[rgba(0,242,254,0.3)]" style={{ fontFamily: "var(--font-mono)" }}>
                PART 1 • INBOUND
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold mb-1" style={{ fontFamily: "var(--font-display)" }}>Followers File</h2>
              <p className="text-xs sm:text-sm text-slate-400 mb-4">Drop <strong>followers_1.json</strong> here</p>

              {followers ? (
                <div className="flex flex-col items-center gap-2 w-full">
                  <div className="flex items-center gap-3 bg-emerald-500/15 border border-emerald-500/35 rounded-2xl px-4 py-2.5 w-full justify-center">
                    <span className="text-xl sm:text-2xl font-extrabold text-emerald-400" style={{ fontFamily: "var(--font-mono)" }}>{followers.length.toLocaleString()}</span>
                    <span className="text-xs text-slate-300 font-semibold">Followers Loaded</span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {followers.slice(0, 3).map((u, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-white/[0.08] border border-white/10 text-slate-400" style={{ fontFamily: "var(--font-mono)" }}>@{u}</span>
                    ))}
                    {followers.length > 3 && <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.08] border border-white/10 text-slate-400">+{followers.length - 3} more</span>}
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); followersInputRef.current?.click(); }}
                    className="text-xs text-slate-500 underline hover:text-white transition-colors mt-1">
                    Tap to replace ({followersFileName || "file"})
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] border border-dashed border-white/20 text-white text-xs sm:text-sm font-semibold hover:bg-white/[0.12] transition-colors">
                    ⚡ Tap or Drop File Here
                  </div>
                  <span className="text-[11px] text-slate-500 mt-2" style={{ fontFamily: "var(--font-mono)" }}>Accepts .json .txt .csv</span>
                </>
              )}
            </div>
          </div>

          {/* Center seam */}
          <div className={`hidden md:block absolute top-[68px] bottom-0 left-1/2 -translate-x-1/2 w-0.5 pointer-events-none z-20
            ${bothReady ? "w-1 shadow-[0_0_20px_rgba(255,170,0,0.8),0_0_40px_rgba(255,8,68,0.5)]" : ""}
          `} style={{
            background: bothReady
              ? "linear-gradient(180deg, #00f2fe, #ff0844, #ffaa00)"
              : "linear-gradient(180deg, transparent, rgba(0,242,254,0.4) 30%, rgba(255,8,68,0.4) 70%, transparent)",
            animation: bothReady ? "seam-pulse 2s infinite alternate" : "none"
          }} />

          {/* Epic reveal button (desktop center, mobile bottom) */}
          {bothReady && (
            <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 items-center justify-center">
              <button type="button" onClick={handleRevealClick} className="relative border-none bg-transparent p-0 cursor-pointer outline-none"
                style={{ animation: "float-and-scale 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards, btn-ambient-glow 3s infinite ease-in-out" }}>
                <div className="absolute -inset-3 rounded-[36px] blur-2xl opacity-85" style={{ background: "linear-gradient(135deg,#00f2fe,#ff0844,#ffaa00,#00ff88)", backgroundSize: "300% 300%", animation: "gradient-flow 4s ease infinite" }} />
                <div className="relative z-10 flex items-center gap-4 px-8 py-5 rounded-[28px] bg-gradient-to-br from-[#0f1422] to-[#1a0f24] border-2 border-white/40 shadow-[0_15px_35px_rgba(0,0,0,0.8)] hover:scale-105 hover:-translate-y-1 active:scale-95 transition-all duration-200">
                  <span className="text-3xl" style={{ animation: "pulse-quick 1.2s infinite ease-in-out" }}>⚡</span>
                  <div className="flex flex-col items-start">
                    <span className="text-xl font-black tracking-widest uppercase" style={{ fontFamily: "var(--font-display)", background: "linear-gradient(135deg,#fff 0%,#ffe600 50%,#ff5277 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      REVEAL UNFOLLOWERS
                    </span>
                    <span className="text-[11px] font-bold text-sky-400 tracking-[2px] uppercase mt-0.5" style={{ fontFamily: "var(--font-mono)" }}>CLICK TO DETECT NON-MUTUALS</span>
                  </div>
                  <span className="text-3xl rotate-180" style={{ animation: "pulse-quick 1.2s infinite ease-in-out" }}>⚡</span>
                </div>
              </button>
            </div>
          )}

          {/* RIGHT — Following */}
          <div
            onClick={() => followingInputRef.current?.click()}
            onDragOver={(e) => handleDragOver(e, "following")}
            onDragLeave={() => handleDragLeave("following")}
            onDrop={(e) => handleDrop(e, "following")}
            className={`relative flex-1 flex flex-col items-center justify-center px-4 py-8 sm:p-10 cursor-pointer transition-all duration-300 select-none min-h-[45dvh] md:min-h-0
              ${isFollowingDragOver ? "bg-[rgba(255,8,68,0.08)] shadow-[inset_0_0_60px_rgba(255,8,68,0.25)]" : ""}
              ${following ? "bg-[radial-gradient(circle_at_70%_30%,rgba(255,8,68,0.15),rgba(42,10,24,0.95)_75%)]" : "bg-[radial-gradient(circle_at_80%_30%,rgba(255,8,68,0.08),rgba(18,10,24,0.95)_70%)]"}
            `}
          >
            <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full p-6 sm:p-8 rounded-3xl bg-[rgba(15,20,32,0.55)] border border-white/[0.08] border-t-2 border-t-[rgba(255,8,68,0.6)] shadow-2xl hover:-translate-y-1 transition-transform duration-300"
              style={{ backdropFilter: "blur(20px)" }}>

              <div className="relative w-16 h-16 sm:w-24 sm:h-24 flex items-center justify-center mb-4 sm:mb-5">
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-[rgba(255,8,68,0.4)]" style={{ animation: "rotate-slow 20s linear infinite" }} />
                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-xl sm:text-3xl transition-all
                  ${following ? "bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-[0_0_30px_rgba(16,185,129,0.6)]" : "bg-[rgba(255,8,68,0.15)] border border-[rgba(255,8,68,0.4)] shadow-[0_0_25px_rgba(255,8,68,0.3)]"}`}>
                  {following ? "✓" : "📤"}
                </div>
              </div>

              <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-2 bg-[rgba(255,8,68,0.15)] text-[#ff5277] border border-[rgba(255,8,68,0.3)]" style={{ fontFamily: "var(--font-mono)" }}>
                PART 2 • OUTBOUND
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold mb-1" style={{ fontFamily: "var(--font-display)" }}>Following File</h2>
              <p className="text-xs sm:text-sm text-slate-400 mb-4">Drop <strong>following.json</strong> here</p>

              {following ? (
                <div className="flex flex-col items-center gap-2 w-full">
                  <div className="flex items-center gap-3 bg-pink-600/15 border border-pink-600/35 rounded-2xl px-4 py-2.5 w-full justify-center">
                    <span className="text-xl sm:text-2xl font-extrabold text-pink-400" style={{ fontFamily: "var(--font-mono)" }}>{following.length.toLocaleString()}</span>
                    <span className="text-xs text-slate-300 font-semibold">Following Loaded</span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {following.slice(0, 3).map((u, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-white/[0.08] border border-white/10 text-slate-400" style={{ fontFamily: "var(--font-mono)" }}>@{u}</span>
                    ))}
                    {following.length > 3 && <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.08] border border-white/10 text-slate-400">+{following.length - 3} more</span>}
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); followingInputRef.current?.click(); }}
                    className="text-xs text-slate-500 underline hover:text-white transition-colors mt-1">
                    Tap to replace ({followingFileName || "file"})
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] border border-dashed border-white/20 text-white text-xs sm:text-sm font-semibold hover:bg-white/[0.12] transition-colors">
                    🔥 Tap or Drop File Here
                  </div>
                  <span className="text-[11px] text-slate-500 mt-2" style={{ fontFamily: "var(--font-mono)" }}>Accepts .json .txt .csv</span>
                </>
              )}
            </div>
          </div>

          {/* Mobile reveal button (shows below both zones) */}
          {bothReady && (
            <div className="md:hidden flex justify-center py-5 bg-[#07090e]">
              <button type="button" onClick={handleRevealClick} className="relative border-none bg-transparent p-0 cursor-pointer outline-none">
                <div className="absolute -inset-2 rounded-[24px] blur-xl opacity-80" style={{ background: "linear-gradient(135deg,#00f2fe,#ff0844,#ffaa00)", backgroundSize: "300% 300%", animation: "gradient-flow 4s ease infinite" }} />
                <div className="relative z-10 flex items-center gap-3 px-6 py-4 rounded-[20px] bg-gradient-to-br from-[#0f1422] to-[#1a0f24] border-2 border-white/40">
                  <span className="text-2xl" style={{ animation: "pulse-quick 1.2s infinite ease-in-out" }}>⚡</span>
                  <div className="flex flex-col items-start">
                    <span className="text-base font-black tracking-wider uppercase" style={{ fontFamily: "var(--font-display)", background: "linear-gradient(135deg,#fff 0%,#ffe600 50%,#ff5277 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      REVEAL UNFOLLOWERS
                    </span>
                    <span className="text-[10px] font-bold text-sky-400 tracking-widest uppercase" style={{ fontFamily: "var(--font-mono)" }}>TAP TO DETECT</span>
                  </div>
                </div>
              </button>
            </div>
          )}
        </main>
      ) : (
        /* ── Results Dashboard ── */
        <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 pb-12 pt-16 sm:pt-24 flex flex-col gap-5 sm:gap-7" style={{ animation: "fadeIn 0.4s ease" }}>

          {/* Hero Card */}
          <div className="relative rounded-2xl sm:rounded-3xl border border-white/[0.12] overflow-hidden flex flex-col gap-5 p-4 sm:p-8 shadow-2xl"
            style={{ background: "linear-gradient(135deg,rgba(20,25,40,0.85),rgba(12,16,28,0.95))" }}>
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: "linear-gradient(90deg,#ff0844,#ffaa00,#00f2fe)" }} />

            {/* Title + Action buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-3xl font-black tracking-tight flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
                  ⚡ Analysis Matrix
                </h1>
                <p className="text-slate-400 text-xs sm:text-sm mt-1">
                  Comparing <strong className="text-white">{following?.length.toLocaleString()}</strong> following vs <strong className="text-white">{followers?.length.toLocaleString()}</strong> followers
                </p>
              </div>

              {/* Action buttons — 2×2 on mobile */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                <button type="button" onClick={handleDownloadCsv}
                  className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold px-3 py-2.5 rounded-xl bg-gradient-to-br from-pink-600 to-rose-500 text-white shadow-lg hover:-translate-y-0.5 transition-all">
                  📥 CSV ({displayedList.length})
                </button>
                <button type="button" onClick={handleDownloadTxt}
                  className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold px-3 py-2.5 rounded-xl bg-white/[0.08] border border-white/15 hover:bg-white/15 hover:-translate-y-0.5 transition-all">
                  📄 TXT
                </button>
                <button type="button" onClick={handleCopyAll}
                  className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold px-3 py-2.5 rounded-xl bg-white/[0.08] border border-white/15 hover:bg-white/15 hover:-translate-y-0.5 transition-all">
                  📋 Copy
                </button>
                <button type="button" onClick={handleReset}
                  className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 hover:bg-red-500/25 hover:-translate-y-0.5 transition-all">
                  🔄 Reset
                </button>
              </div>
            </div>

            {/* Stat tabs */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {[
                { key: "unfollowers", icon: "🚫", count: unfollowersList.length, label: "Don't Follow Back", color: "pink", activeClass: "border-pink-500 bg-pink-500/[0.12] shadow-[0_0_20px_rgba(255,8,68,0.25)]" },
                { key: "mutuals", icon: "🤝", count: mutualsList.length, label: "Mutuals", color: "emerald", activeClass: "border-emerald-400 bg-emerald-400/[0.12] shadow-[0_0_20px_rgba(16,185,129,0.25)]" },
                { key: "fans", icon: "🌟", count: fansList.length, label: "Fans", color: "cyan", activeClass: "border-cyan-400 bg-cyan-400/[0.12] shadow-[0_0_20px_rgba(0,242,254,0.25)]" },
              ].map(({ key, icon, count, label, activeClass }) => (
                <div key={key} onClick={() => setActiveTab(key)}
                  className={`flex flex-col sm:flex-row items-center sm:gap-3 gap-1.5 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border cursor-pointer transition-all hover:-translate-y-0.5
                    ${activeTab === key ? activeClass : "border-white/[0.08] bg-[rgba(10,15,26,0.6)] hover:border-white/20"}`}>
                  <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-base sm:text-xl flex-shrink-0
                    ${key === "unfollowers" ? "bg-pink-500/20" : key === "mutuals" ? "bg-emerald-400/20" : "bg-cyan-400/20"}`}>
                    {icon}
                  </div>
                  <div className="flex flex-col items-center sm:items-start">
                    <span className="text-lg sm:text-2xl font-extrabold leading-none" style={{ fontFamily: "var(--font-mono)" }}>{count}</span>
                    <span className="text-[9px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wide mt-0.5 text-center sm:text-left">{label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Search + Sort toolbar */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-base pointer-events-none">🔍</span>
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search @username in ${activeTab}...`}
                className="w-full pl-10 pr-4 py-3 sm:py-3.5 bg-[rgba(15,20,32,0.7)] border border-white/[0.12] rounded-xl sm:rounded-2xl text-white text-sm outline-none focus:border-[#00f2fe] focus:shadow-[0_0_15px_rgba(0,242,254,0.25)] transition-all placeholder:text-slate-600"
              />
            </div>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}
              className="px-4 py-3 bg-[rgba(15,20,32,0.7)] border border-white/[0.12] rounded-xl sm:rounded-2xl text-white text-sm font-semibold outline-none cursor-pointer">
              <option value="az">A → Z</option>
              <option value="za">Z → A</option>
              <option value="default">File Order</option>
            </select>
          </div>

          {/* User grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayedList.length > 0 ? displayedList.map((user, idx) => (
              <div key={idx}
                className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[rgba(15,20,32,0.6)] border border-white/[0.08] hover:border-pink-500/40 hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-extrabold text-base text-white flex-shrink-0 shadow-md"
                    style={{ background: getAvatarGradient(user), fontFamily: "var(--font-display)" }}>
                    {user.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-slate-100 truncate">@{user}</span>
                    <span className="text-[10px] text-slate-500" style={{ fontFamily: "var(--font-mono)" }}>
                      {activeTab === "unfollowers" ? "Does not follow back" : activeTab === "fans" ? "Follows you" : "Mutual"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button type="button" onClick={() => handleCopyUser(user)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs border transition-all
                      ${copiedId === user ? "bg-emerald-500/25 border-emerald-400 text-emerald-300" : "bg-white/[0.06] border-white/10 text-slate-400 hover:bg-pink-500/20 hover:border-pink-400/50 hover:text-white hover:scale-105"}`}>
                    {copiedId === user ? "✓" : "📋"}
                  </button>
                  <a href={`https://www.instagram.com/${user}/`} target="_blank" rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm border bg-white/[0.06] border-white/10 text-slate-400 hover:bg-pink-500/20 hover:border-pink-400/50 hover:text-white hover:scale-105 transition-all no-underline">
                    ↗
                  </a>
                </div>
              </div>
            )) : (
              <div className="col-span-full flex flex-col items-center justify-center py-16 rounded-2xl bg-[rgba(15,20,32,0.5)] border-2 border-dashed border-white/10">
                <span className="text-5xl mb-4">{searchTerm ? "🔍" : activeTab === "unfollowers" ? "🎉" : "✨"}</span>
                <h3 className="text-lg sm:text-2xl font-extrabold mb-2" style={{ fontFamily: "var(--font-display)" }}>
                  {searchTerm ? "No usernames matched" : activeTab === "unfollowers" ? "Zero Non-Followers!" : "Nothing here yet"}
                </h3>
                <p className="text-slate-400 text-sm text-center max-w-xs">
                  {searchTerm ? `Try refining "${searchTerm}"` : activeTab === "unfollowers" ? "Everyone follows you back 💚" : "Check another tab"}
                </p>
              </div>
            )}
          </div>
        </main>
      )}

      {/* ── Scanning Overlay ── */}
      {isScanning && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[rgba(5,8,15,0.92)]" style={{ backdropFilter: "blur(24px)", animation: "fadeIn 0.3s ease" }}>
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full border-2 border-[rgba(0,242,254,0.3)] flex items-center justify-center mb-7">
            <div className="absolute inset-0 rounded-full" style={{ background: "conic-gradient(from 0deg, rgba(0,242,254,0.8) 0deg, transparent 90deg)", animation: "radar-sweep 1.2s linear infinite" }} />
            <div className="absolute -inset-5 rounded-full border border-dashed border-[rgba(255,8,68,0.5)]" style={{ animation: "rotate-slow 10s linear infinite reverse" }} />
            <span className="text-4xl sm:text-5xl" style={{ filter: "drop-shadow(0 0 15px #00f2fe)" }}>⚡</span>
          </div>
          <h3 className="text-xl sm:text-3xl font-extrabold tracking-wide mb-2" style={{ fontFamily: "var(--font-display)" }}>DIFFING FOLLOW GRAPH</h3>
          <p className="text-sky-400 text-xs sm:text-sm font-bold tracking-widest uppercase" style={{ fontFamily: "var(--font-mono)" }}>CROSS-REFERENCING NODES...</p>
        </div>
      )}

      {/* ── Guide Modal ── */}
      {showGuideModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)", animation: "fadeIn 0.2s ease" }}
          onClick={() => setShowGuideModal(false)}>
          <div className="bg-[#0f1422] border border-white/15 rounded-2xl sm:rounded-3xl w-full max-w-lg p-5 sm:p-8 shadow-2xl max-h-[90dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base sm:text-xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>📦 How to Get Your Instagram Data</h3>
              <button type="button" onClick={() => setShowGuideModal(false)} className="w-8 h-8 rounded-lg bg-white/[0.08] border-none text-white cursor-pointer hover:bg-white/15 transition-colors text-base">✕</button>
            </div>
            <div className="flex flex-col gap-4">
              {[
                { n: 1, title: "Open Instagram Settings", desc: "Settings & Privacy → Accounts Center → Your information and permissions" },
                { n: 2, title: "Request Download", desc: "Download your information → Download or transfer information → Some of your information" },
                { n: 3, title: "Select Followers & Following", desc: "Scroll and check only Followers and Following" },
                { n: 4, title: "Choose JSON Format", desc: "Download to device → Format: JSON → Date range: All time" },
                { n: 5, title: "Extract & Drop", desc: "Unzip the email file. Drop followers_1.json in left zone and following.json in right zone!" },
              ].map(({ n, title, desc }) => (
                <div key={n} className="flex gap-3.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold text-white flex-shrink-0" style={{ background: "linear-gradient(135deg,#00f2fe,#ff0844)" }}>{n}</div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-0.5">{title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setShowGuideModal(false)}
                className="w-full flex items-center justify-center gap-2 mt-2 py-3 rounded-xl bg-gradient-to-br from-pink-600 to-rose-500 text-white font-bold text-sm hover:-translate-y-0.5 transition-all shadow-lg">
                Got It! Let's Diff ⚡
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

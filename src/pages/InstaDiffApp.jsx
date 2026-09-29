import React, { useState, useMemo, useRef } from "react";
import "./InstaDiffApp.css";

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

  const [activeTab, setActiveTab] = useState("unfollowers"); // 'unfollowers' | 'fans' | 'mutuals'
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("az"); // 'az' | 'za' | 'default'

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
      // 1. Try parsing JSON
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
            // Instagram exports often use title as the username handle
            // (string_list_data may exist but only contain href/timestamp, no value)
            result.push(item.title);
          }
        }
        return result.filter(Boolean);
      };

      if (type === "followers") {
        if (Array.isArray(parsed)) {
          return extractHandles(parsed);
        }
        if (parsed.relationships_followers) {
          return extractHandles(parsed.relationships_followers);
        }
        if (parsed.followers) {
          return extractHandles(parsed.followers);
        }
      }

      if (type === "following") {
        if (parsed.relationships_following) {
          return extractHandles(parsed.relationships_following);
        }
        if (parsed.following) {
          return extractHandles(parsed.following);
        }
        if (Array.isArray(parsed)) {
          return extractHandles(parsed);
        }
      }

      // Fallback recursive search for array of string_list_data or usernames
      const collected = [];
      const scan = (obj) => {
        if (!obj || typeof obj !== "object") return;
        if (Array.isArray(obj)) {
          for (const el of obj) {
            if (el?.string_list_data?.[0]?.value) {
              collected.push(el.string_list_data[0].value);
            } else if (typeof el === "string" && el.length < 50 && !el.includes(" ")) {
              collected.push(el);
            } else {
              scan(el);
            }
          }
        } else {
          for (const key in obj) {
            scan(obj[key]);
          }
        }
      };
      scan(parsed);
      if (collected.length > 0) return [...new Set(collected)];

      return [];
    } catch {
      // 2. Fallback for raw text/CSV files (one handle per line or comma-separated)
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
        alert(
          `Could not detect valid usernames in ${file.name}. Please ensure it's a valid Instagram JSON/export file.`
        );
      }
    };
    reader.readAsText(file);
  };

  // Drag & Drop Handlers
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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0], type);
    }
  };

  // Load Mock Sample Data
  const handleLoadSample = () => {
    setFollowers(SAMPLE_FOLLOWERS);
    setFollowersFileName("sample_followers.json");
    setFollowing(SAMPLE_FOLLOWING);
    setFollowingFileName("sample_following.json");
    showToast("Loaded sample test dataset! 🚀");
  };

  // Perform Diff calculations
  const { unfollowersList, mutualsList, fansList } = useMemo(() => {
    if (!followers || !following) {
      return { unfollowersList: [], mutualsList: [], fansList: [] };
    }

    const followerSet = new Set(followers);
    const followingSet = new Set(following);

    // People you follow who do NOT follow back
    const notFollowingBack = following.filter((u) => !followerSet.has(u));
    // Mutuals
    const mutuals = following.filter((u) => followerSet.has(u));
    // Fans (They follow you, but you don't follow them back)
    const fans = followers.filter((u) => !followingSet.has(u));

    return {
      unfollowersList: notFollowingBack,
      mutualsList: mutuals,
      fansList: fans,
    };
  }, [followers, following]);

  // Trigger Scanner & Reveal
  const handleRevealClick = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setIsRevealed(true);
    }, 700);
  };

  // Active list based on active tab
  const displayedList = useMemo(() => {
    let list = [];
    if (activeTab === "unfollowers") list = [...unfollowersList];
    else if (activeTab === "fans") list = [...fansList];
    else if (activeTab === "mutuals") list = [...mutualsList];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((u) => u.toLowerCase().includes(q));
    }

    if (sortOrder === "az") {
      list.sort((a, b) => a.localeCompare(b));
    } else if (sortOrder === "za") {
      list.sort((a, b) => b.localeCompare(a));
    }

    return list;
  }, [activeTab, unfollowersList, fansList, mutualsList, searchTerm, sortOrder]);

  // Download CSV
  const handleDownloadCsv = () => {
    const activeData =
      activeTab === "unfollowers"
        ? unfollowersList
        : activeTab === "fans"
        ? fansList
        : mutualsList;

    if (!activeData || activeData.length === 0) return;

    const title =
      activeTab === "unfollowers"
        ? "instagram_not_following_back"
        : activeTab === "fans"
        ? "instagram_fans"
        : "instagram_mutuals";

    const csvContent =
      "data:text/csv;charset=utf-8,Username,Instagram Profile URL\n" +
      activeData
        .map((user) => `${user},https://www.instagram.com/${user}/`)
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV file downloaded! 📥");
  };

  // Download TXT
  const handleDownloadTxt = () => {
    const activeData =
      activeTab === "unfollowers"
        ? unfollowersList
        : activeTab === "fans"
        ? fansList
        : mutualsList;

    if (!activeData || activeData.length === 0) return;

    const title =
      activeTab === "unfollowers"
        ? "unfollowers"
        : activeTab === "fans"
        ? "fans"
        : "mutuals";

    const textContent = activeData.join("\n");
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `instagram_${title}_list.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("TXT list downloaded! 📄");
  };

  // Copy Single Username
  const handleCopyUser = (username) => {
    navigator.clipboard.writeText(username);
    setCopiedId(username);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Copy All handles to clipboard
  const handleCopyAll = () => {
    if (!displayedList.length) return;
    navigator.clipboard.writeText(displayedList.join("\n"));
    showToast(`Copied ${displayedList.length} handles to clipboard! 📋`);
  };

  // Reset Everything
  const handleReset = () => {
    setFollowers(null);
    setFollowing(null);
    setFollowersFileName("");
    setFollowingFileName("");
    setIsRevealed(false);
    setIsScanning(false);
    setSearchTerm("");
    setActiveTab("unfollowers");
  };

  const bothReady = followers && following;

  return (
    <div className="instadiff-root">
      {/* Toast Notification */}
      {toastText && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(15, 23, 42, 0.95)",
          color: "#00f2fe",
          padding: "12px 24px",
          borderRadius: "999px",
          border: "1px solid rgba(0, 242, 254, 0.4)",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.8)",
          zIndex: 999,
          fontWeight: 700,
          fontSize: "14px",
          backdropFilter: "blur(10px)",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          {toastText}
        </div>
      )}

      {/* Global Floating Header */}
      <header className="instadiff-header">
        <div className="brand-wrapper">
          <span className="brand-icon">⚡</span>
          <span className="brand-title">InstaDiff Matrix</span>
        </div>

        <div className="header-badges">
          <div className="privacy-badge">
            <span className="privacy-dot"></span>
            100% Client-Side Safe
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="btn-ghost"
            title="How to get JSON data from Instagram"
          >
            ❓ How To Export
          </button>
          {!bothReady && !isRevealed && (
            <button
              type="button"
              onClick={handleLoadSample}
              className="btn-sample"
              title="Test the interface with demo data"
            >
              🚀 Try Demo Data
            </button>
          )}
          {isRevealed && (
            <button
              type="button"
              onClick={handleReset}
              className="btn-ghost"
            >
              🔄 Start Over
            </button>
          )}
        </div>
      </header>

      {/* ===================================================================
          SPLIT SCREEN ARENA (When not in results mode)
          =================================================================== */}
      {!isRevealed ? (
        <main className="split-arena-container">
          {/* Hidden File Inputs */}
          <input
            type="file"
            ref={followersInputRef}
            accept=".json,.txt,.csv"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files?.[0]) processFile(e.target.files[0], "followers");
            }}
          />
          <input
            type="file"
            ref={followingInputRef}
            accept=".json,.txt,.csv"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files?.[0]) processFile(e.target.files[0], "following");
            }}
          />

          {/* LEFT HALF: FOLLOWERS ZONE */}
          <div
            className={`zone-half zone-followers ${isFollowersDragOver ? "is-drag-over" : ""} ${followers ? "is-loaded" : ""}`}
            onClick={() => followersInputRef.current?.click()}
            onDragOver={(e) => handleDragOver(e, "followers")}
            onDragLeave={() => handleDragLeave("followers")}
            onDrop={(e) => handleDrop(e, "followers")}
          >
            <div className="zone-content">
              <div className="zone-icon-portal">
                <div className="zone-icon-ring"></div>
                <div className="zone-icon-core">
                  {followers ? "✓" : "📥"}
                </div>
              </div>

              <span className="zone-pill-tag">PART 1 • INBOUND</span>
              <h2 className="zone-title">Followers File</h2>
              <p className="zone-desc">
                Drop your <strong>followers.json</strong> or <strong>followers_1.json</strong> here
              </p>

              {followers ? (
                <div className="loaded-badge-container">
                  <div className="loaded-stat-box">
                    <span className="loaded-stat-number">{followers.length.toLocaleString()}</span>
                    <span className="loaded-stat-label">Followers Loaded</span>
                  </div>
                  <div className="loaded-sample-chips">
                    {followers.slice(0, 4).map((u, i) => (
                      <span key={i} className="user-mini-chip">@{u}</span>
                    ))}
                    {followers.length > 4 && (
                      <span className="user-mini-chip">+{followers.length - 4} more</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn-change-file"
                    onClick={(e) => {
                      e.stopPropagation();
                      followersInputRef.current?.click();
                    }}
                  >
                    Click to replace ({followersFileName || "file"})
                  </button>
                </div>
              ) : (
                <>
                  <div className="zone-upload-cta">
                    <span>⚡ Click or Drag File Here</span>
                  </div>
                  <span className="zone-file-hint">Accepts .json, .txt or .csv</span>
                </>
              )}
            </div>
          </div>

          {/* CENTER SEAM & NEON LASER BEAM */}
          <div className={`center-seam ${bothReady ? "both-ready" : ""}`} />

          {/* EPIC CENTER REVEAL TRIGGER */}
          {bothReady && (
            <div className="epic-center-stage">
              <button
                type="button"
                className="epic-reveal-btn"
                onClick={handleRevealClick}
              >
                <div className="epic-btn-glow-ring"></div>
                <div className="epic-btn-inner">
                  <span className="epic-btn-icon">⚡</span>
                  <div className="epic-btn-text-block">
                    <span className="epic-btn-main-text">REVEAL UNFOLLOWERS</span>
                    <span className="epic-btn-sub-text">CLICK TO DETECT NON-MUTUALS</span>
                  </div>
                  <span className="epic-btn-icon" style={{ transform: "rotate(180deg)" }}>⚡</span>
                </div>
              </button>
            </div>
          )}

          {/* RIGHT HALF: FOLLOWING ZONE */}
          <div
            className={`zone-half zone-following ${isFollowingDragOver ? "is-drag-over" : ""} ${following ? "is-loaded" : ""}`}
            onClick={() => followingInputRef.current?.click()}
            onDragOver={(e) => handleDragOver(e, "following")}
            onDragLeave={() => handleDragLeave("following")}
            onDrop={(e) => handleDrop(e, "following")}
          >
            <div className="zone-content">
              <div className="zone-icon-portal">
                <div className="zone-icon-ring"></div>
                <div className="zone-icon-core">
                  {following ? "✓" : "📤"}
                </div>
              </div>

              <span className="zone-pill-tag">PART 2 • OUTBOUND</span>
              <h2 className="zone-title">Following File</h2>
              <p className="zone-desc">
                Drop your <strong>following.json</strong> here
              </p>

              {following ? (
                <div className="loaded-badge-container">
                  <div className="loaded-stat-box" style={{ background: "rgba(255, 8, 68, 0.15)", borderColor: "rgba(255, 8, 68, 0.35)" }}>
                    <span className="loaded-stat-number" style={{ color: "#ff5277" }}>{following.length.toLocaleString()}</span>
                    <span className="loaded-stat-label">Following Loaded</span>
                  </div>
                  <div className="loaded-sample-chips">
                    {following.slice(0, 4).map((u, i) => (
                      <span key={i} className="user-mini-chip">@{u}</span>
                    ))}
                    {following.length > 4 && (
                      <span className="user-mini-chip">+{following.length - 4} more</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn-change-file"
                    onClick={(e) => {
                      e.stopPropagation();
                      followingInputRef.current?.click();
                    }}
                  >
                    Click to replace ({followingFileName || "file"})
                  </button>
                </div>
              ) : (
                <>
                  <div className="zone-upload-cta">
                    <span>🔥 Click or Drag File Here</span>
                  </div>
                  <span className="zone-file-hint">Accepts .json, .txt or .csv</span>
                </>
              )}
            </div>
          </div>
        </main>
      ) : (
        /* ===================================================================
           RESULTS DASHBOARD VIEW
           =================================================================== */
        <main className="results-page">
          {/* Top Hero Card */}
          <div className="results-hero-card">
            <div className="results-top-row">
              <div className="results-title-group">
                <h1>
                  <span>⚡ Analysis Matrix</span>
                </h1>
                <p>
                  Comparing <strong>{following?.length.toLocaleString()}</strong> following accounts against <strong>{followers?.length.toLocaleString()}</strong> followers.
                </p>
              </div>

              <div className="results-action-buttons">
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="btn-action-primary"
                  title="Download clean CSV sheet"
                >
                  📥 Download CSV ({displayedList.length})
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  className="btn-action-secondary"
                  title="Download plain TXT list"
                >
                  📄 Export TXT
                </button>
                <button
                  type="button"
                  onClick={handleCopyAll}
                  className="btn-action-secondary"
                  title="Copy all currently shown usernames"
                >
                  📋 Copy List
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn-reset-app"
                >
                  🔄 Reset Diff
                </button>
              </div>
            </div>

            {/* Interactive Stats Metric Tabs */}
            <div className="stats-metrics-grid">
              <div
                className={`metric-card ${activeTab === "unfollowers" ? "active-tab" : ""}`}
                onClick={() => setActiveTab("unfollowers")}
              >
                <div className="metric-icon-box" style={{ background: "rgba(255, 8, 68, 0.2)", color: "#ff0844" }}>
                  🚫
                </div>
                <div className="metric-info">
                  <span className="metric-value">{unfollowersList.length}</span>
                  <span className="metric-label">Don't Follow Back</span>
                </div>
              </div>

              <div
                className={`metric-card ${activeTab === "mutuals" ? "active-tab-green" : ""}`}
                onClick={() => setActiveTab("mutuals")}
              >
                <div className="metric-icon-box" style={{ background: "rgba(16, 185, 129, 0.2)", color: "#10b981" }}>
                  🤝
                </div>
                <div className="metric-info">
                  <span className="metric-value">{mutualsList.length}</span>
                  <span className="metric-label">Mutual Connections</span>
                </div>
              </div>

              <div
                className={`metric-card ${activeTab === "fans" ? "active-tab-cyan" : ""}`}
                onClick={() => setActiveTab("fans")}
              >
                <div className="metric-icon-box" style={{ background: "rgba(0, 242, 254, 0.2)", color: "#00f2fe" }}>
                  🌟
                </div>
                <div className="metric-info">
                  <span className="metric-value">{fansList.length}</span>
                  <span className="metric-label">Fans (You Don't Follow)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Sort Toolbar */}
          <div className="results-toolbar">
            <div className="search-input-wrapper">
              <span className="search-icon-fixed">🔍</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search @username in ${activeTab}...`}
                className="search-input"
              />
            </div>

            <div className="filter-sort-group">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="select-dropdown"
              >
                <option value="az">Sort: Alphabetical (A to Z)</option>
                <option value="za">Sort: Alphabetical (Z to A)</option>
                <option value="default">Sort: File Order</option>
              </select>
            </div>
          </div>

          {/* User Cards Grid */}
          <div className="user-cards-grid">
            {displayedList.length > 0 ? (
              displayedList.map((user, idx) => (
                <div key={idx} className="user-card">
                  <div className="user-card-left">
                    <div
                      className="user-avatar-hex"
                      style={{ background: getAvatarGradient(user) }}
                    >
                      {user.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-details">
                      <span className="user-handle">@{user}</span>
                      <span className="user-status-tag">
                        {activeTab === "unfollowers"
                          ? "Does not follow back"
                          : activeTab === "fans"
                          ? "Follows you"
                          : "Mutual connection"}
                      </span>
                    </div>
                  </div>

                  <div className="user-card-actions">
                    <button
                      type="button"
                      onClick={() => handleCopyUser(user)}
                      className={`btn-icon-action ${copiedId === user ? "copied" : ""}`}
                      title="Copy @handle"
                    >
                      {copiedId === user ? "✓" : "📋"}
                    </button>
                    <a
                      href={`https://www.instagram.com/${user}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-icon-action"
                      title={`Open instagram.com/${user}`}
                    >
                      ↗
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state-card">
                <div className="empty-state-icon">
                  {searchTerm ? "🔍" : activeTab === "unfollowers" ? "🎉" : "✨"}
                </div>
                <h3 className="empty-state-title">
                  {searchTerm
                    ? "No usernames matched your search"
                    : activeTab === "unfollowers"
                    ? "Zero Non-Followers Found!"
                    : "No accounts in this category"}
                </h3>
                <p className="empty-state-desc">
                  {searchTerm
                    ? `Try refining your search query "${searchTerm}".`
                    : activeTab === "unfollowers"
                    ? "Every single person you follow follows you back. Your relationship ratio is immaculate!"
                    : "Check your other tabs or upload a different export file."}
                </p>
              </div>
            )}
          </div>
        </main>
      )}

      {/* ===================================================================
          SCANNING RADAR OVERLAY
          =================================================================== */}
      {isScanning && (
        <div className="scanning-overlay">
          <div className="scanner-core">
            <div className="scanner-radar-line"></div>
            <div className="scanner-ring-outer"></div>
            <span className="scanner-icon">⚡</span>
          </div>
          <h3 className="scanner-title">DIFFING FOLLOW GRAPH</h3>
          <p className="scanner-status">CROSS-REFERENCING INBOUND VS OUTBOUND NODES...</p>
        </div>
      )}

      {/* ===================================================================
          HOW TO EXPORT GUIDE MODAL
          =================================================================== */}
      {showGuideModal && (
        <div className="modal-overlay" onClick={() => setShowGuideModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📦 How to get your Instagram Data</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowGuideModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="guide-step">
                <div className="step-num">1</div>
                <div className="step-text">
                  <h4>Go to Instagram Accounts Center</h4>
                  <p>Open Instagram Settings & Privacy → <strong>Accounts Center</strong> → <strong>Your information and permissions</strong>.</p>
                </div>
              </div>

              <div className="guide-step">
                <div className="step-num">2</div>
                <div className="step-text">
                  <h4>Request Information Download</h4>
                  <p>Click <strong>Download your information</strong> → <strong>Download or transfer information</strong> → Select <strong>Some of your information</strong>.</p>
                </div>
              </div>

              <div className="guide-step">
                <div className="step-num">3</div>
                <div className="step-text">
                  <h4>Select Followers and Following</h4>
                  <p>Scroll down and check only <strong>Followers and Following</strong>.</p>
                </div>
              </div>

              <div className="guide-step">
                <div className="step-num">4</div>
                <div className="step-text">
                  <h4>Choose JSON Format</h4>
                  <p>Choose <strong>Download to device</strong>, select <strong>Format: JSON</strong> and Date range: <strong>All time</strong>.</p>
                </div>
              </div>

              <div className="guide-step">
                <div className="step-num">5</div>
                <div className="step-text">
                  <h4>Extract and Drop Files</h4>
                  <p>When Meta emails your zip file, unzip it and drop <strong>followers_1.json</strong> into the left zone and <strong>following.json</strong> into the right zone!</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="btn-action-primary"
                style={{ width: "100%", justifyContent: "center", marginTop: "12px" }}
              >
                Got It! Let's Diff ⚡
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

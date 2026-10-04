import React, { useState, useMemo, useRef } from "react";

// ─── Avatar gradient ─────────────────────────────────────────────────────────
function avatarGradient(name = "") {
  const g = [
    ["#f857a6","#ff5858"],["#4facfe","#00f2fe"],["#43e97b","#38f9d7"],
    ["#fa709a","#fee140"],["#6a11cb","#2575fc"],["#f093fb","#f5576c"],
    ["#30cfd0","#667eea"],["#ff9a9e","#fad0c4"],["#a18cd1","#fbc2eb"],
    ["#fccb90","#d57eeb"],
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const [a, b] = g[Math.abs(h) % g.length];
  return `linear-gradient(135deg,${a},${b})`;
}

// ─── Sample data ─────────────────────────────────────────────────────────────
const SAMPLE_FOLLOWERS = ["alex_rivers","tech_lead_dan","sarah_codes","cyber_samurai","neon_dreamer","pixel_artist","web_wizard","stellar_voyager","quantum_leap","design_guru","coffee_addict","luna_sky","matrix_agent","synth_wave","crypto_kaiju","retro_gamer","astro_nova","code_ninja","urban_explorer","sound_architect","daily_dev","minimal_vibes","hyper_focus","space_cadet","alpha_centauri"];
const SAMPLE_FOLLOWING = ["alex_rivers","tech_lead_dan","sarah_codes","celebrity_star","brand_official","elon_musk_fan","ghost_account","cyber_samurai","inactive_user_99","neon_dreamer","viral_meme_page","pixel_artist","top_influencer","web_wizard","gordon_ramsay_official","stellar_voyager","news_daily","coffee_addict","super_car_hub","luna_sky","crypto_whale","code_ninja","billionaire_club","synth_wave","trendy_fits","daily_dev","hype_beast","alpha_centauri","travel_bug_world","zen_master"];

// ─── Shared tokens ─────────────────────────────────────────────────────────
const C = {
  bg:     "#0a0b10",
  card:   "#13151f",
  card2:  "#1a1d2e",
  border: "rgba(255,255,255,0.07)",
  muted:  "#64748b",
  sub:    "#94a3b8",
  text:   "#f0f2f8",
  cyan:   "#00d4ff",
  pink:   "#ff3366",
  amber:  "#ffaa00",
  green:  "#00c97d",
};

// ─── Utility styles ───────────────────────────────────────────────────────────
const S = {
  flex: (dir="row",align="center",justify="flex-start",gap=0) => ({
    display:"flex", flexDirection:dir, alignItems:align, justifyContent:justify, gap,
  }),
  pill: (color, bg) => ({
    display:"inline-flex", alignItems:"center", gap:5,
    padding:"3px 10px", borderRadius:999,
    fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase",
    color, background:bg, border:`1px solid ${color}33`,
    fontFamily:"'JetBrains Mono',monospace",
  }),
};

export default function InstaDiffApp() {
  const [followers, setFollowers]   = useState(null);
  const [following, setFollowing]   = useState(null);
  const [follFile,  setFollFile]    = useState("");
  const [fgFile,    setFgFile]      = useState("");
  const [drag,      setDrag]        = useState({ f: false, fg: false });
  const [scanning,  setScanning]    = useState(false);
  const [revealed,  setRevealed]    = useState(false);
  const [tab,       setTab]         = useState("nf");   // nf | mut | fans
  const [q,         setQ]           = useState("");
  const [sort,      setSort]        = useState("az");
  const [copied,    setCopied]      = useState(null);
  const [guide,     setGuide]       = useState(false);
  const [toast,     setToast]       = useState("");

  const fRef  = useRef(null);
  const fgRef = useRef(null);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 2800); };

  // ── Parse Instagram JSON ─────────────────────────────────────────────────
  const parse = (raw, type) => {
    try {
      const p = JSON.parse(raw);
      const ex = (arr) => !Array.isArray(arr) ? [] :
        arr.flatMap(x => typeof x==="string" ? x : x?.string_list_data?.[0]?.value ?? x?.value ?? x?.title ?? []).filter(Boolean);
      if (type==="f") {
        if (Array.isArray(p)) return ex(p);
        if (p.relationships_followers) return ex(p.relationships_followers);
        if (p.followers) return ex(p.followers);
      } else {
        if (p.relationships_following) return ex(p.relationships_following);
        if (p.following) return ex(p.following);
        if (Array.isArray(p)) return ex(p);
      }
      const col=[]; const scan=(o)=>{
        if(!o||typeof o!=="object") return;
        if(Array.isArray(o)) o.forEach(el=>{ if(el?.string_list_data?.[0]?.value) col.push(el.string_list_data[0].value); else if(typeof el==="string"&&el.length<50&&!el.includes(" ")) col.push(el); else scan(el); });
        else Object.values(o).forEach(scan);
      }; scan(p); return [...new Set(col)];
    } catch {
      return raw.split(/[\r\n,]+/).map(s=>s.trim().replace(/^@/,"")).filter(s=>s&&!s.includes(" "));
    }
  };

  const load = (file, type) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = (e) => {
      const u = parse(e.target.result, type);
      if (!u?.length) { alert(`Couldn't read usernames from ${file.name}`); return; }
      if (type==="f") { setFollowers([...new Set(u)]); setFollFile(file.name); }
      else            { setFollowing([...new Set(u)]); setFgFile(file.name); }
    };
    r.readAsText(file);
  };

  // ── Computed lists ───────────────────────────────────────────────────────
  const { nf, mut, fans } = useMemo(() => {
    if (!followers||!following) return { nf:[], mut:[], fans:[] };
    const fs=new Set(followers), fgs=new Set(following);
    return { nf: following.filter(u=>!fs.has(u)), mut: following.filter(u=>fs.has(u)), fans: followers.filter(u=>!fgs.has(u)) };
  }, [followers, following]);

  const list = useMemo(() => {
    let l = tab==="nf"?[...nf]:tab==="fans"?[...fans]:[...mut];
    if (q.trim()) l = l.filter(u=>u.toLowerCase().includes(q.toLowerCase()));
    if (sort==="az") l.sort((a,b)=>a.localeCompare(b));
    else if (sort==="za") l.sort((a,b)=>b.localeCompare(a));
    return l;
  }, [tab, nf, mut, fans, q, sort]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const dl = (content, name, mime="text/plain") => {
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([content],{type:mime}));
    a.download=name; document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(a.href);
  };
  const activeData = () => tab==="nf"?nf:tab==="fans"?fans:mut;
  const dlCsv  = () => { if(!activeData().length) return; dl("Username,URL\n"+activeData().map(u=>`${u},https://instagram.com/${u}/`).join("\n"),`insta_${tab}.csv`,"text/csv"); showToast("CSV saved 📥"); };
  const dlTxt  = () => { if(!activeData().length) return; dl(activeData().join("\n"),`insta_${tab}.txt`); showToast("TXT saved 📄"); };
  const cpAll  = () => { if(!list.length) return; navigator.clipboard.writeText(list.join("\n")); showToast(`Copied ${list.length} usernames 📋`); };
  const cpUser = (u) => { navigator.clipboard.writeText(u); setCopied(u); setTimeout(()=>setCopied(null),1400); };
  const reset  = () => { setFollowers(null); setFollowing(null); setFollFile(""); setFgFile(""); setRevealed(false); setScanning(false); setQ(""); setTab("nf"); };
  const reveal = () => { setScanning(true); setTimeout(()=>{ setScanning(false); setRevealed(true); }, 600); };
  const demo   = () => { setFollowers(SAMPLE_FOLLOWERS); setFollFile("sample_followers.json"); setFollowing(SAMPLE_FOLLOWING); setFgFile("sample_following.json"); showToast("Demo loaded 🚀"); };

  const both = followers && following;

  // ── Tab config ───────────────────────────────────────────────────────────
  const TABS = [
    { id:"nf",   icon:"🚫", label:"No Follow-Back", count:nf.length,   color:C.pink,  bg:"rgba(255,51,102,0.12)",  active:"rgba(255,51,102,0.18)",  border:"rgba(255,51,102,0.5)"  },
    { id:"mut",  icon:"🤝", label:"Mutuals",         count:mut.length,  color:C.green, bg:"rgba(0,201,125,0.12)",   active:"rgba(0,201,125,0.18)",   border:"rgba(0,201,125,0.5)"   },
    { id:"fans", icon:"⭐", label:"Fans",             count:fans.length, color:C.cyan,  bg:"rgba(0,212,255,0.12)",   active:"rgba(0,212,255,0.18)",   border:"rgba(0,212,255,0.5)"   },
  ];
  const curTab = TABS.find(t=>t.id===tab);

  return (
    <div style={{ minHeight:"100dvh", background:C.bg, color:C.text, fontFamily:"'Inter',sans-serif", fontSize:15 }}>

      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet"/>

      {/* ── Global styles + animations ── */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }
        body { background: ${C.bg}; }
        ::-webkit-scrollbar { width:4px } ::-webkit-scrollbar-track { background:transparent } ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.15); border-radius:2px }
        input::placeholder { color: ${C.muted} }
        select option { background: #1a1d2e }
        button { font-family: inherit; cursor:pointer; }
        a { color: inherit; }

        @keyframes fadeUp   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes glow     { 0%,100%{box-shadow:0 0 20px rgba(0,212,255,.35)} 50%{box-shadow:0 0 40px rgba(255,51,102,.5)} }
        @keyframes scanline { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes ripple   { 0%{transform:scale(0.95);opacity:.9} 100%{transform:scale(1.05);opacity:0} }

        .card-hover:hover { background: #1e2133 !important; border-color: rgba(255,255,255,0.12) !important; }
        .zone-hover:hover { background: rgba(255,255,255,0.025) !important; }
        .btn-hover:hover  { filter: brightness(1.15); transform: translateY(-1px); }
        .icon-btn:hover   { background: rgba(255,255,255,0.12) !important; }
        .tab-btn:hover    { opacity: .85; }
      `}</style>

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)", zIndex:9999,
          background:C.card2, border:`1px solid ${C.border}`, borderRadius:12,
          padding:"10px 20px", fontSize:13, fontWeight:600, color:C.text,
          backdropFilter:"blur(16px)", boxShadow:"0 8px 32px rgba(0,0,0,.6)",
          whiteSpace:"nowrap", animation:"fadeUp .2s ease",
        }}>{toast}</div>
      )}

      {/* ── Header ── */}
      <header style={{ position:"fixed", inset:"0 0 auto 0", zIndex:100, height:56,
        background:"rgba(10,11,16,0.92)", backdropFilter:"blur(20px)",
        borderBottom:`1px solid ${C.border}`,
        ...S.flex("row","center","space-between",0), padding:"0 16px",
      }}>
        {/* Logo */}
        <div style={S.flex("row","center","flex-start",8)}>
          <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,#00d4ff,#ff3366)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>⚡</div>
          <span style={{ fontWeight:800, fontSize:16, letterSpacing:-.3 }}>InstaDiff</span>
        </div>

        {/* Right: actions */}
        <div style={S.flex("row","center","flex-end",6)}>
          <button onClick={()=>setGuide(true)} className="btn-hover"
            style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.sub, borderRadius:8, padding:"6px 10px", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
            <span>❓</span><span className="hide-xs">How To Export</span>
          </button>
          {!both && !revealed && (
            <button onClick={demo} className="btn-hover"
              style={{ background:`linear-gradient(135deg,${C.cyan}22,${C.pink}22)`, border:`1px solid rgba(255,255,255,0.15)`, color:C.text, borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", gap:4 }}>
              <span>🚀</span><span className="hide-xs">Try Demo</span>
            </button>
          )}
          {revealed && (
            <button onClick={reset} className="btn-hover"
              style={{ background:"transparent", border:`1px solid rgba(255,80,80,0.3)`, color:"#ff6b6b", borderRadius:8, padding:"6px 10px", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
              🔄<span className="hide-xs"> Reset</span>
            </button>
          )}
        </div>

        {/* Hide text on very small screens */}
        <style>{`@media(max-width:380px){.hide-xs{display:none}}`}</style>
      </header>

      {/* ── Hidden inputs ── */}
      <input ref={fRef}  type="file" accept=".json,.txt,.csv" style={{display:"none"}} onChange={e=>e.target.files?.[0]&&load(e.target.files[0],"f")}/>
      <input ref={fgRef} type="file" accept=".json,.txt,.csv" style={{display:"none"}} onChange={e=>e.target.files?.[0]&&load(e.target.files[0],"fg")}/>

      {/* ════════════════════════════════════════════════
          UPLOAD SCREEN
         ════════════════════════════════════════════════ */}
      {!revealed && (
        <main style={{
          position:"fixed", inset:0, top:56,
          display:"flex", flexDirection:"column",
          overflow:"hidden",
        }}>
          {/* ── Zone: Followers ── */}
          <UploadZone
            accent={C.cyan}
            label="Followers"
            tag="STEP 1"
            file={followers}
            count={followers?.length}
            fileName={follFile}
            chips={followers?.slice(0,3)}
            total={followers?.length}
            dragOver={drag.f}
            onClick={()=>fRef.current?.click()}
            onDragOver={e=>{e.preventDefault();setDrag(p=>({...p,f:true}));}}
            onDragLeave={()=>setDrag(p=>({...p,f:false}))}
            onDrop={e=>{e.preventDefault();setDrag(p=>({...p,f:false}));e.dataTransfer.files?.[0]&&load(e.dataTransfer.files[0],"f");}}
            onReplace={()=>fRef.current?.click()}
            hint="followers_1.json"
          />

          {/* divider */}
          <div style={{ height:1, background:`linear-gradient(90deg,transparent,${C.cyan}44,${C.pink}44,transparent)`, flexShrink:0 }}/>

          {/* ── Zone: Following ── */}
          <UploadZone
            accent={C.pink}
            label="Following"
            tag="STEP 2"
            file={following}
            count={following?.length}
            fileName={fgFile}
            chips={following?.slice(0,3)}
            total={following?.length}
            dragOver={drag.fg}
            onClick={()=>fgRef.current?.click()}
            onDragOver={e=>{e.preventDefault();setDrag(p=>({...p,fg:true}));}}
            onDragLeave={()=>setDrag(p=>({...p,fg:false}))}
            onDrop={e=>{e.preventDefault();setDrag(p=>({...p,fg:false}));e.dataTransfer.files?.[0]&&load(e.dataTransfer.files[0],"fg");}}
            onReplace={()=>fgRef.current?.click()}
            hint="following.json"
          />

          {/* ── Reveal button (fixed overlay) ── */}
          {both && (
            <div style={{ position:"absolute", bottom:0, left:0, right:0, zIndex:20,
              background:`linear-gradient(0deg,${C.bg} 60%,transparent)`,
              padding:"24px 20px 28px", display:"flex", justifyContent:"center",
            }}>
              <button onClick={reveal}
                style={{ position:"relative", border:"none", outline:"none", cursor:"pointer",
                  background:`linear-gradient(135deg,${C.cyan},${C.pink})`,
                  borderRadius:16, padding:"16px 40px", width:"100%", maxWidth:360,
                  animation:"glow 2.5s ease infinite",
                }}>
                <div style={{ position:"absolute", inset:0, borderRadius:16, animation:"ripple 2s ease infinite",
                  background:`linear-gradient(135deg,${C.cyan},${C.pink})`, opacity:.3,
                }}/>
                <div style={{ position:"relative", display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                  <span style={{ fontSize:18, fontWeight:900, letterSpacing:.5, color:"#fff" }}>⚡ Reveal Unfollowers</span>
                  <span style={{ fontSize:11, color:"rgba(255,255,255,0.7)", fontFamily:"'JetBrains Mono',monospace", letterSpacing:2, textTransform:"uppercase" }}>tap to compare your lists</span>
                </div>
              </button>
            </div>
          )}
        </main>
      )}

      {/* ════════════════════════════════════════════════
          RESULTS
         ════════════════════════════════════════════════ */}
      {revealed && (
        <main style={{ paddingTop:56, minHeight:"100dvh", animation:"fadeIn .35s ease" }}>
          <div style={{ maxWidth:680, margin:"0 auto", padding:"20px 12px 80px" }}>

            {/* ── Hero summary ── */}
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20, overflow:"hidden", marginBottom:12, animation:"fadeUp .3s ease" }}>
              {/* rainbow top bar */}
              <div style={{ height:3, background:`linear-gradient(90deg,${C.pink},${C.amber},${C.cyan})` }}/>
              <div style={{ padding:"16px 16px 12px" }}>
                <div style={{ ...S.flex("row","center","space-between",8), flexWrap:"wrap", gap:8, marginBottom:12 }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:20 }}>⚡ Analysis</div>
                    <div style={{ color:C.sub, fontSize:12, marginTop:2 }}>
                      {following?.length} following · {followers?.length} followers
                    </div>
                  </div>
                  {/* Action buttons row */}
                  <div style={S.flex("row","center","flex-end",6)}>
                    <ActionBtn icon="📥" label={`CSV(${list.length})`} onClick={dlCsv} primary/>
                    <ActionBtn icon="📄" label="TXT" onClick={dlTxt}/>
                    <ActionBtn icon="📋" label="Copy" onClick={cpAll}/>
                    <ActionBtn icon="🔄" label="" onClick={reset} danger/>
                  </div>
                </div>

                {/* ── Tab pills ── */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                  {TABS.map(t=>(
                    <button key={t.id} onClick={()=>setTab(t.id)} className="tab-btn"
                      style={{ background: tab===t.id ? t.active : C.card2, border:`1px solid ${tab===t.id?t.border:C.border}`,
                        borderRadius:14, padding:"10px 8px", cursor:"pointer", transition:"all .2s",
                        display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                        boxShadow: tab===t.id ? `0 0 16px ${t.color}33` : "none",
                      }}>
                      <span style={{ fontSize:18 }}>{t.icon}</span>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:20, fontWeight:800, color:"#fff", lineHeight:1 }}>{t.count}</span>
                      <span style={{ fontSize:10, color:t.color, fontWeight:700, textTransform:"uppercase", letterSpacing:1 }}>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Search + sort ── */}
            <div style={{ ...S.flex("row","center","flex-start",8), marginBottom:12, animation:"fadeUp .35s ease" }}>
              <div style={{ position:"relative", flex:1 }}>
                <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:C.muted, fontSize:14 }}>🔍</span>
                <input value={q} onChange={e=>setQ(e.target.value)} placeholder={`Search in ${curTab?.label}…`}
                  style={{ width:"100%", padding:"11px 12px 11px 36px", background:C.card, border:`1px solid ${C.border}`,
                    borderRadius:12, color:C.text, fontSize:14, outline:"none", transition:"border .2s",
                  }}
                  onFocus={e=>e.target.style.borderColor=C.cyan} onBlur={e=>e.target.style.borderColor=C.border}
                />
              </div>
              <select value={sort} onChange={e=>setSort(e.target.value)}
                style={{ padding:"11px 10px", background:C.card, border:`1px solid ${C.border}`,
                  borderRadius:12, color:C.text, fontSize:13, fontWeight:600, outline:"none", cursor:"pointer", flexShrink:0,
                }}>
                <option value="az">A → Z</option>
                <option value="za">Z → A</option>
                <option value="default">Default</option>
              </select>
            </div>

            {/* ── User list ── */}
            <div style={{ display:"flex", flexDirection:"column", gap:8, animation:"fadeUp .4s ease" }}>
              {list.length > 0 ? list.map((user,i) => (
                <div key={i} className="card-hover"
                  style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14,
                    padding:"12px 14px", display:"flex", alignItems:"center", gap:12, transition:"all .18s",
                  }}>
                  {/* Avatar */}
                  <div style={{ width:42, height:42, borderRadius:12, flexShrink:0, background:avatarGradient(user),
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontWeight:800, fontSize:16, color:"#fff",
                  }}>{user[0].toUpperCase()}</div>

                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:14, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>@{user}</div>
                    <div style={{ fontSize:11, color:curTab?.color, marginTop:2, fontFamily:"'JetBrains Mono',monospace" }}>
                      {tab==="nf"?"doesn't follow back":tab==="fans"?"follows you":"mutual"}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={S.flex("row","center","flex-end",6)}>
                    <button onClick={()=>cpUser(user)} className="icon-btn"
                      style={{ width:32, height:32, borderRadius:8, border:`1px solid ${C.border}`, fontSize:14,
                        background: copied===user?"rgba(0,201,125,0.18)":"transparent",
                        borderColor: copied===user?"rgba(0,201,125,0.5)":C.border,
                        color: copied===user?C.green:C.muted, display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s",
                      }}>{copied===user?"✓":"📋"}</button>
                    <a href={`https://instagram.com/${user}/`} target="_blank" rel="noopener noreferrer" className="icon-btn"
                      style={{ width:32, height:32, borderRadius:8, border:`1px solid ${C.border}`, fontSize:13,
                        background:"transparent", color:C.muted, display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s", textDecoration:"none",
                      }}>↗</a>
                  </div>
                </div>
              )) : (
                <div style={{ textAlign:"center", padding:"56px 24px", background:C.card, borderRadius:20, border:`2px dashed ${C.border}` }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>{q?"🔍":tab==="nf"?"🎉":"✨"}</div>
                  <div style={{ fontWeight:800, fontSize:18, marginBottom:6 }}>
                    {q?"No matches found":tab==="nf"?"Everyone follows you back!":"Nothing here"}
                  </div>
                  <div style={{ color:C.sub, fontSize:13 }}>
                    {q?`Try a different search for "${q}"`:tab==="nf"?"Your follow game is immaculate 💚":"Check another tab."}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* ── Scanning overlay ── */}
      {scanning && (
        <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(10,11,16,0.96)",
          backdropFilter:"blur(20px)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
          animation:"fadeIn .2s ease",
        }}>
          <div style={{ position:"relative", width:80, height:80, marginBottom:24 }}>
            <div style={{ position:"absolute", inset:0, borderRadius:"50%",
              border:`3px solid transparent`, borderTopColor:C.cyan,
              animation:"spin .9s linear infinite",
            }}/>
            <div style={{ position:"absolute", inset:8, borderRadius:"50%",
              border:`3px solid transparent`, borderTopColor:C.pink,
              animation:"spin .6s linear infinite reverse",
            }}/>
            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>⚡</div>
          </div>
          <div style={{ fontWeight:800, fontSize:18, marginBottom:6 }}>Analyzing…</div>
          <div style={{ color:C.sub, fontSize:12, fontFamily:"'JetBrains Mono',monospace", letterSpacing:2, textTransform:"uppercase" }}>comparing follow graphs</div>
        </div>
      )}

      {/* ── Guide modal ── */}
      {guide && (
        <div onClick={()=>setGuide(false)} style={{ position:"fixed", inset:0, zIndex:300,
          background:"rgba(0,0,0,0.75)", backdropFilter:"blur(16px)", animation:"fadeIn .2s ease",
          display:"flex", alignItems:"flex-end", justifyContent:"center",
          /* bottom-sheet on mobile */
        }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:C.card, borderRadius:"20px 20px 0 0",
            width:"100%", maxWidth:600, padding:"8px 20px 32px", maxHeight:"85dvh", overflowY:"auto",
            animation:"fadeUp .25s ease",
          }}>
            {/* Drag handle */}
            <div style={{ width:36, height:4, borderRadius:2, background:C.border, margin:"12px auto 20px" }}/>
            <div style={{ ...S.flex("row","center","space-between",0), marginBottom:20 }}>
              <span style={{ fontWeight:800, fontSize:17 }}>📦 How to Export Instagram Data</span>
              <button onClick={()=>setGuide(false)} style={{ background:"transparent", border:"none", color:C.sub, fontSize:20 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {[
                ["Open Instagram","Settings & Privacy → Accounts Center → Your information and permissions"],
                ["Request Download","Download your information → Download or transfer information → Some of your information"],
                ["Select Data","Scroll and check only Followers and Following"],
                ["Choose JSON","Format: JSON · Date range: All time · Download to device"],
                ["Drop the Files","Unzip the email. Drop followers_1.json (left zone) + following.json (right zone)"],
              ].map(([t,d],i)=>(
                <div key={i} style={S.flex("row","flex-start","flex-start",12)}>
                  <div style={{ width:26, height:26, borderRadius:"50%", flexShrink:0, marginTop:1,
                    background:`linear-gradient(135deg,${C.cyan},${C.pink})`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:12, fontWeight:800, color:"#fff",
                  }}>{i+1}</div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>{t}</div>
                    <div style={{ color:C.sub, fontSize:13, lineHeight:1.5 }}>{d}</div>
                  </div>
                </div>
              ))}
              <button onClick={()=>setGuide(false)}
                style={{ marginTop:8, padding:"14px", borderRadius:14, border:"none",
                  background:`linear-gradient(135deg,${C.cyan},${C.pink})`, color:"#fff",
                  fontWeight:700, fontSize:15, cursor:"pointer", width:"100%",
                }}>Got It ⚡</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── UploadZone ───────────────────────────────────────────────────────────────
function UploadZone({ accent, label, tag, file, count, fileName, chips, total, dragOver,
  onClick, onDragOver, onDragLeave, onDrop, onReplace, hint }) {
  return (
    <div onClick={onClick} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
        padding:"12px 16px", cursor:"pointer", userSelect:"none", overflow:"hidden", position:"relative",
        background: dragOver
          ? `radial-gradient(ellipse at 50% 50%,${accent}18,transparent 70%)`
          : file
          ? `radial-gradient(ellipse at 50% 30%,${accent}10,transparent 70%)`
          : "transparent",
        transition:"background .25s",
      }}>

      {/* glow strip at top */}
      <div style={{ position:"absolute", top:0, left:"20%", right:"20%", height:1, background:`linear-gradient(90deg,transparent,${accent}77,transparent)` }}/>

      {/* Card */}
      <div style={{ width:"100%", maxWidth:400, display:"flex", flexDirection:"column", gap:10 }}>

        {/* Tag + icon row */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:"uppercase",
            color:accent, fontFamily:"'JetBrains Mono',monospace",
          }}>{tag} · {label}</span>
          <div style={{ width:28, height:28, borderRadius:8,
            background: file ? "rgba(0,201,125,0.2)" : `${accent}18`,
            border:`1px solid ${file?"rgba(0,201,125,0.5)":accent+"44"}`,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0,
          }}>{file?"✓":label==="Followers"?"📥":"📤"}</div>
        </div>

        {file ? (
          /* ── Loaded state ── */
          <div style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${accent}33`,
            borderRadius:14, padding:"12px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10,
          }}>
            <div>
              <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                <span style={{ fontSize:26, fontWeight:800, color:accent, fontFamily:"'JetBrains Mono',monospace" }}>{count?.toLocaleString()}</span>
                <span style={{ fontSize:12, color:"#94a3b8", fontWeight:600 }}>accounts</span>
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:6 }}>
                {chips?.map((u,i)=>(
                  <span key={i} style={{ fontSize:10, padding:"2px 8px", borderRadius:6,
                    background:"rgba(255,255,255,0.07)", color:"#64748b",
                    fontFamily:"'JetBrains Mono',monospace",
                  }}>@{u}</span>
                ))}
                {total>3 && <span style={{ fontSize:10, padding:"2px 8px", borderRadius:6, background:"rgba(255,255,255,0.07)", color:"#64748b", fontFamily:"'JetBrains Mono',monospace" }}>+{total-3}</span>}
              </div>
            </div>
            <button onClick={e=>{e.stopPropagation();onReplace();}}
              style={{ background:"transparent", border:`1px solid rgba(255,255,255,0.1)`, color:"#64748b",
                borderRadius:8, padding:"6px 10px", fontSize:11, cursor:"pointer", flexShrink:0, whiteSpace:"nowrap",
              }}>Replace</button>
          </div>
        ) : (
          /* ── Empty state ── */
          <div style={{ border:`1.5px dashed ${accent}44`, borderRadius:14, padding:"20px 14px",
            display:"flex", flexDirection:"column", alignItems:"center", gap:8, textAlign:"center",
            background:`${accent}05`,
          }}>
            <div style={{ fontSize:13, fontWeight:600, color:"#94a3b8" }}>
              Tap to upload <span style={{ color:accent, fontFamily:"'JetBrains Mono',monospace", fontSize:12 }}>{hint}</span>
            </div>
            <div style={{ fontSize:11, color:"#475569" }}>or drag & drop · .json .txt .csv</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ActionBtn ────────────────────────────────────────────────────────────────
function ActionBtn({ icon, label, onClick, primary, danger }) {
  const bg = primary ? "linear-gradient(135deg,#ff3366,#ff6b35)"
    : danger ? "rgba(255,80,80,0.1)"
    : "rgba(255,255,255,0.07)";
  const border = primary ? "none"
    : danger ? "1px solid rgba(255,80,80,0.3)"
    : "1px solid rgba(255,255,255,0.1)";
  const color = danger ? "#ff9090" : "#f0f2f8";
  return (
    <button onClick={onClick} className="btn-hover"
      style={{ background:bg, border, color, borderRadius:10, padding:"7px 11px",
        fontSize:12, fontWeight:700, display:"flex", alignItems:"center", gap:4, transition:"all .18s",
        boxShadow: primary ? "0 4px 16px rgba(255,51,102,0.35)" : "none",
        whiteSpace:"nowrap",
      }}>
      {icon}{label&&<span>{label}</span>}
    </button>
  );
}

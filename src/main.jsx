import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight, Camera, Check, ChevronLeft, ChevronRight, CircleHelp,
  Clock3, FileText, History, Home, Leaf, Menu, MessageCircle, ScanLine,
  Search, ShieldCheck, Sparkles, Target, Upload, X, Zap
} from "lucide-react";
import "./styles.css";

const GREEN = "#7CFC00";

const plates = [
  { title:"The label", eyebrow:"01 / READ", copy:"Start with the front of the pack, then turn the page to the ingredient story.", mark:"INGREDIENTS", accent:"leaf" },
  { title:"The claim", eyebrow:"02 / QUESTION", copy:"Separate marketing language from information that can actually be checked.", mark:"CLAIM CHECK", accent:"claim" },
  { title:"The numbers", eyebrow:"03 / MEASURE", copy:"Bring calories, sugar, protein, fibre and serving size into one calm view.", mark:"NUTRITION", accent:"chart" },
  { title:"The ingredients", eyebrow:"04 / TRACE", copy:"See the ingredients that matter and why they may affect the overall picture.", mark:"INGREDIENT MAP", accent:"map" },
  { title:"The score", eyebrow:"05 / UNDERSTAND", copy:"A transparent summary instead of a mysterious green badge.", mark:"TRUTH SCORE", accent:"score" },
  { title:"The context", eyebrow:"06 / COMPARE", copy:"Compare what the package says with what the label actually supports.", mark:"CONTEXT", accent:"compare" },
  { title:"Your history", eyebrow:"07 / REMEMBER", copy:"Keep previous scans together so patterns become easier to spot.", mark:"SCAN LOG", accent:"history" },
  { title:"Durva", eyebrow:"08 / ASK", copy:"Ask Durva about a label, meal planning, tasks or your next food decision.", mark:"DURVA AI", accent:"chat" },
  { title:"Your report", eyebrow:"09 / SHARE", copy:"Turn a scan into a clean, readable report you can revisit.", mark:"REPORT", accent:"report" }
];

function go(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function App() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const fn = () => setPath(window.location.pathname);
    window.addEventListener("popstate", fn);
    return () => window.removeEventListener("popstate", fn);
  }, []);

  if (path === "/durva") return <DurvaPage />;
  if (path === "/scan") return <ScanPage />;
  if (path === "/history") return <HistoryPage />;
  if (path === "/limits") return <SimplePage title="Usage limits" icon={<Zap />} text="Your TruthLens workspace is ready for your next scan." />;
  if (path === "/pricing") return <SimplePage title="Pricing" icon={<Target />} text="Choose the TruthLens plan that fits how often you scan." />;
  if (path === "/contact") return <SimplePage title="Contact" icon={<MessageCircle />} text="Questions about TruthLens? Send a message from your existing contact flow." />;
  if (path === "/login") return <LoginPage />;
  return <HomePage />;
}

function Shell({ children, active = "/" }) {
  const [open, setOpen] = useState(false);
  const nav = [
    ["/", "Home", Home],
    ["/scan", "Scan", ScanLine],
    ["/history", "History", History],
    ["/durva", "Durva", MessageCircle],
    ["/pricing", "Pricing", Sparkles]
  ];
  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => go("/")}>
        <span className="brand-mark"><span>T</span></span>
        <span>TruthLens</span>
      </button>
      <nav className={open ? "nav open" : "nav"}>
        {nav.map(([href,label,Icon]) =>
          <button key={href} className={active===href ? "nav-link active" : "nav-link"} onClick={() => {go(href);setOpen(false)}}><Icon size={15}/>{label}</button>
        )}
      </nav>
      <div className="top-actions">
        <button className="ghost-btn" onClick={() => go("/login")}>Log in</button>
        <button className="green-btn compact" onClick={() => go("/scan")}><Camera size={15}/> Scan</button>
        <button className="menu-btn" onClick={() => setOpen(v=>!v)}>{open?<X/>:<Menu/>}</button>
      </div>
    </header>
    <main>{children}</main>
    <footer className="footer">
      <span>TruthLens · food, without the marketing fog.</span>
      <div><button onClick={()=>go("/contact")}>Contact</button><button onClick={()=>go("/limits")}>Limits</button></div>
    </footer>
  </div>
}

function HomePage() {
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [mag, setMag] = useState(false);
  const [tilt, setTilt] = useState({x:0,y:0});
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const move = e => {
      const r = el.getBoundingClientRect();
      setTilt({x:(e.clientX-r.left-r.width/2)/r.width, y:(e.clientY-r.top-r.height/2)/r.height});
    };
    const leave = () => setTilt({x:0,y:0});
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove",move);el.removeEventListener("pointerleave",leave); };
  }, []);

  const p = plates[page];

  return <Shell active="/">
    <section className="hero" ref={ref}>
      <div className="paper-grain"></div>
      <div className="hero-copy">
        <div className="kicker"><span className="dot"></span> TRUTHLENS / FIELD NOTE 2026</div>
        <h1>Turn the package.<br/><em>See the truth.</em></h1>
        <p>TruthLens reads food labels, checks claims and turns complicated packaging into a clear, human report.</p>
        <div className="hero-buttons">
          <button className="green-btn large" onClick={()=>go("/scan")}><ScanLine/> Scan a food <ArrowRight/></button>
          <button className="outline-btn large" onClick={()=>go("/durva")}><MessageCircle/> Ask Durva</button>
        </div>
        <div className="micro-proof"><ShieldCheck size={16}/> Built around readable evidence, not fear.</div>
      </div>

      <div className="sketchbook-wrap" style={{transform:`perspective(1200px) rotateX(${tilt.y*-3}deg) rotateY(${tilt.x*4}deg) scale(${zoom})`}}>
        <div className="book-shadow"></div>
        <div className="sketchbook">
          <div className="paper-side"></div>
          <div className="plate">
            <div className="plate-head"><span>{p.eyebrow}</span><span>{String(page+1).padStart(2,"0")} / 09</span></div>
            <div className={"illustration "+p.accent}>
              <div className="illus-ring"></div>
              <div className="illus-shape"></div>
              <div className="illus-label">{p.mark}</div>
            </div>
            <div className="plate-copy">
              <h2>{p.title}</h2>
              <p>{p.copy}</p>
            </div>
            <div className="plate-footer"><span>TRUTHLENS</span><span>FIELD SKETCH</span></div>
          </div>
          <div className="plate next-plate">
            <div className="plate-head"><span>{plates[(page+1)%plates.length].eyebrow}</span><span>{String((page+1)%9+1).padStart(2,"0")} / 09</span></div>
            <div className={"illustration "+plates[(page+1)%9].accent}><div className="illus-ring"></div><div className="illus-shape"></div></div>
            <div className="plate-copy"><h2>{plates[(page+1)%9].title}</h2></div>
          </div>
        </div>
        {mag && <div className="magnifier"><div className="lens"><span>TRUTH<br/><b>CHECK</b></span></div><i></i></div>}
      </div>

      <div className="book-controls">
        <button onClick={()=>setPage((page+8)%9)}><ChevronLeft/></button>
        <span>{String(page+1).padStart(2,"0")} <small>/ 09</small></span>
        <button onClick={()=>setPage((page+1)%9)}><ChevronRight/></button>
        <button onClick={()=>setZoom(Math.max(.88, zoom-.06))}>−</button>
        <button onClick={()=>setZoom(Math.min(1.12, zoom+.06))}>+</button>
        <button className={mag?"selected":""} onClick={()=>setMag(v=>!v)}><Search/></button>
      </div>
    </section>

    <section className="index-section">
      <div className="section-label">EDITORIAL INDEX <span>09 PLATES</span></div>
      <div className="index-grid">
        {plates.map((x,i)=><button key={x.title} onClick={()=>{setPage(i);window.scrollTo({top:0,behavior:"smooth"})}}>
          <span>{String(i+1).padStart(2,"0")}</span><strong>{x.title}</strong><small>{x.mark}</small><ArrowRight size={15}/>
        </button>)}
      </div>
    </section>

    <section className="trust-strip">
      <div><Leaf/><span><b>Ingredients</b> explained</span></div>
      <div><Check/><span><b>Claims</b> checked</span></div>
      <div><FileText/><span><b>Reports</b> saved</span></div>
      <div><MessageCircle/><span><b>Durva</b> ready</span></div>
    </section>
  </Shell>
}

function ScanPage() {
  const [drag, setDrag] = useState(false);
  return <Shell active="/scan">
    <section className="page">
      <div className="page-heading"><div><span className="kicker">TRUTHLENS / SCAN</span><h1>What are you really buying?</h1><p>Upload a clear photo of the front and nutrition label. The scan flow is designed for quick, readable results.</p></div><button className="green-btn" onClick={()=>go("/durva")}><MessageCircle/> Ask Durva</button></div>
      <div className={drag?"upload-card drag":"upload-card"} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={()=>setDrag(false)}>
        <div className="upload-icon"><Camera/></div>
        <h2>Drop a food photo here</h2>
        <p>or choose an image from your device</p>
        <div className="upload-actions"><button className="green-btn"><Upload/> Upload image</button><button className="outline-btn"><Camera/> Open camera</button></div>
        <span className="privacy"><ShieldCheck size={14}/> Your scan stays in your TruthLens workspace.</span>
      </div>
      <div className="three-cards">
        <InfoCard n="01" t="Read" d="OCR finds the product name, ingredients and nutrition panel."/>
        <InfoCard n="02" t="Check" d="Claims are compared with the information visible on the label."/>
        <InfoCard n="03" t="Understand" d="You get a compact report with evidence and useful context."/>
      </div>
    </section>
  </Shell>
}

function InfoCard({n,t,d}) { return <div className="info-card"><span>{n}</span><h3>{t}</h3><p>{d}</p></div> }

function HistoryPage() {
  const rows = [
    ["Chocolate cereal","Today","Claim check · nutrition"],
    ["Protein snack","Yesterday","Ingredients · protein"],
    ["Fruit drink","28 Sep","Sugar · serving size"]
  ];
  return <Shell active="/history"><section className="page"><div className="page-heading"><div><span className="kicker">TRUTHLENS / HISTORY</span><h1>Your scan notebook.</h1><p>Previous reports stay organized so you can revisit what you found.</p></div><button className="green-btn" onClick={()=>go("/scan")}><ScanLine/> New scan</button></div><div className="history-list">{rows.map((r,i)=><button key={i} className="history-row"><div className="history-num">0{i+1}</div><div><strong>{r[0]}</strong><span>{r[2]}</span></div><time><Clock3 size={14}/>{r[1]}</time><ArrowRight/></button>)}</div></section></Shell>
}

function DurvaPage() {
  const [messages,setMessages] = useState([{role:"ai",text:"Hi, I’m Durva. I can help you understand a food label, make a simple meal plan, or turn your goals into tasks."}]);
  const [input,setInput] = useState("");
  const send = () => {
    if (!input.trim()) return;
    const q=input.trim();
    setMessages(m=>[...m,{role:"user",text:q},{role:"ai",text:"I’m ready to help. Connect this UI to your existing Gemini-backed Durva API to receive live analysis and plans."}]);
    setInput("");
  };
  return <Shell active="/durva"><section className="durva-page"><div className="durva-side"><span className="kicker">TRUTHLENS / DURVA</span><h1>Your food<br/><em>co-pilot.</em></h1><p>Ask about a label, create a task, plan meals, or make sense of a scan.</p><div className="durva-chips"><span>Label analysis</span><span>Meal plans</span><span>Tasks</span><span>Nutrition chat</span></div></div><div className="chat-card"><div className="chat-head"><div className="durva-avatar">D</div><div><strong>Durva</strong><small>TruthLens assistant</small></div><span className="online"></span></div><div className="chat-body">{messages.map((m,i)=><div key={i} className={m.role==="ai"?"bubble ai":"bubble user"}>{m.text}</div>)}</div><div className="quick-row">{["Explain this label","Make a plan","Create a task"].map(x=><button key={x} onClick={()=>setInput(x)}>{x}</button>)}</div><div className="chat-input"><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask Durva anything about your food..." /><button onClick={send}><ArrowRight/></button></div></div></section></Shell>
}

function LoginPage() {
  return <Shell><section className="login-page"><div className="login-art"><div className="chip-doodle"><span className="eye e1"></span><span className="eye e2"></span><span className="smile"></span></div><div className="doodle-copy">READ<br/>THE LABEL.</div></div><div className="login-card"><span className="kicker">WELCOME BACK</span><h1>Open your notebook.</h1><p>Sign in to keep your scans, reports and Durva conversations together.</p><input placeholder="Email"/><input placeholder="Password" type="password"/><button className="green-btn full"><ShieldCheck/> Log in</button><button className="text-btn">Forgot password?</button><div className="or"><span></span>or<span></span></div><button className="outline-btn full">Continue with Google</button></div></section></Shell>
}

function SimplePage({title,icon,text}) {
  return <Shell><section className="page simple"><div className="simple-icon">{icon}</div><span className="kicker">TRUTHLENS</span><h1>{title}</h1><p>{text}</p><button className="green-btn" onClick={()=>go("/")}>Back home <ArrowRight/></button></section></Shell>
}

createRoot(document.getElementById("root")).render(<App />);

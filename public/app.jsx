/* =========================================================================
   STUDY SMART — ENHANCED UI v2.0 (React + Firebase)
   ========================================================================= */

const T = {
  dark: {
    bg: "#0B0F17",
    bgSoft: "#111827",
    card: "rgba(255,255,255,0.03)",
    cardSolid: "#151E2E",
    cardBorder: "rgba(255,255,255,0.08)",
    ink: "#F1F5F9",
    inkDim: "#94A3B8",
    inkFaint: "#64748B",
    ember: "#F59E0B",
    emberSoft: "rgba(245,158,11,0.15)",
    jade: "#10B981",
    jadeSoft: "rgba(16,185,129,0.15)",
    violet: "#8B5CF6",
    violetSoft: "rgba(139,92,246,0.15)",
    rose: "#EF4444",
    roseSoft: "rgba(239,68,68,0.15)",
    sky: "#38BDF8",
    skySoft: "rgba(56,189,248,0.15)",
    gradient: "linear-gradient(135deg, #10B981 0%, #38BDF8 50%, #8B5CF6 100%)",
    gradientEmber: "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
  },
  sans: "'Cairo', 'Segoe UI', system-ui, sans-serif",
  mono: "'IBM Plex Sans Arabic', ui-monospace, monospace",
};

// ========================================================================
// 🔥 Firebase Setup
// ========================================================================
const { initializeApp, getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, getFirestore, doc, setDoc, getDoc, collection, getDocs } = window.FirebaseApp;

const firebaseConfig = {
  apiKey: "AIzaSyB-vkTesMW6ONIZKW31hfWzbu",
  authDomain: "zaker-1de07.firebaseapp.com",
  projectId: "zaker-1de07",
  storageBucket: "zaker-1de07.firebasestorage.app",
  messagingSenderId: "525017383794",
  appId: "1:525017383794:web:342adb2ae974d7872b93eb",
  measurementId: "G-R86QCRXPBN"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const { useState, useEffect, useRef, useCallback } = React;

const DAY = 86400000;
const SPACING = [1, 3, 7];

const LEVELS = [
  { min: 0, name: "مبتدئ", icon: "🌱" },
  { min: 500, name: "متعلّم", icon: "📖" },
  { min: 1500, name: "مستكشف", icon: "🧭" },
  { min: 4000, name: "مفكّر", icon: "💭" },
  { min: 8000, name: "محلّل", icon: "📊" },
  { min: 15000, name: "استراتيجي", icon: "♟️" },
  { min: 26000, name: "خبير", icon: "🎯" },
  { min: 45000, name: "معلم", icon: "👨‍🏫" },
  { min: 80000, name: "أسطورة", icon: "👑" },
];

function levelFromXP(xp) {
  let idx = 0, name = "مبتدئ", icon = "🌱";
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].min) { idx = i; name = LEVELS[i].name; icon = LEVELS[i].icon; }
  }
  const base = idx * 11 + 1;
  const next = LEVELS[idx + 1] ? LEVELS[idx + 1].min : LEVELS[idx].min + 20000;
  const cur = LEVELS[idx].min;
  const pct = Math.min(100, Math.round(((xp - cur) / (next - cur)) * 100));
  return { level: base + Math.floor(pct / 9), name, icon, pct, next, cur };
}

const SUBJECTS = ["رياضيات", "فيزياء", "كيمياء", "أحياء", "لغة عربية", "English", "تاريخ", "جغرافيا"];
const SUBJECT_ICONS = {
  "رياضيات": "📐", "فيزياء": "⚛️", "كيمياء": "🧪", "أحياء": "🧬",
  "لغة عربية": "📝", "English": "🔤", "تاريخ": "🏛️", "جغرافيا": "🌍"
};

const DEFAULT_PROFILE = {
  name: "طالب جديد",
  username: "learner_" + Math.random().toString(36).slice(2, 7),
  xp: 0,
  streak: 0,
  lastStudyDate: null,
  skills: { understanding: 50, application: 45, reasoning: 45, problemSolving: 45, recall: 50 },
  subjectStats: {},
  achievements: [],
  history: [],
  mistakes: [],
  dailyXPToday: 0,
  dailyXPDate: null,
  lastQuizAt: {},
};

const ACHIEVEMENTS = [
  { id: "first_session", label: "أول جلسة", icon: "🎯", desc: "أكملت أول جلسة مذاكرة", check: (p) => p.history.length >= 1 },
  { id: "first_lesson", label: "أول إتقان", icon: "⭐", desc: "حصلت على 85%+ في اختبار", check: (p) => p.history.some((h) => h.quizScore >= 85) },
  { id: "streak_7", label: "أسبوع نار", icon: "🔥", desc: "٧ أيام متتالية", check: (p) => p.streak >= 7 },
  { id: "correct_100", label: "ماكينة", icon: "⚡", desc: "١٠٠ إجابة صحيحة", check: (p) => Object.values(p.subjectStats).reduce((a, s) => a + s.correct, 0) >= 100 },
  { id: "level_10", label: "صاعد", icon: "🚀", desc: "وصلت للمستوى ١٠", check: (p) => levelFromXP(p.xp).level >= 10 },
  { id: "fixed_weakness", label: "متغلب", icon: "💪", desc: "تغلبت على نقطة ضعف", check: (p) => p.history.some((h) => h.improvementFlag) },
];

async function loadProfile() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            resolve({ ...DEFAULT_PROFILE, ...docSnap.data(), name: user.displayName, username: user.uid });
          } else {
            const newProfile = { ...DEFAULT_PROFILE, name: user.displayName, username: user.uid };
            await setDoc(docRef, newProfile);
            resolve(newProfile);
          }
        } catch (e) {
          resolve({ ...DEFAULT_PROFILE, name: user.displayName, username: user.uid });
        }
      } else {
        resolve(null);
      }
    });
  });
}

async function saveProfile(p) {
  try {
    if (auth.currentUser) {
      await setDoc(doc(db, "users", auth.currentUser.uid), p);
    }
  } catch (e) {}
}

async function pushLeaderboard(p) {
  try {
    if (auth.currentUser) {
      await setDoc(doc(db, "users", auth.currentUser.uid), {
        xp: p.xp,
        level: levelFromXP(p.xp).level,
        streak: p.streak
      }, { merge: true });
    }
  } catch (e) {}
}

async function fetchLeaderboard() {
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    const entries = [];
    querySnapshot.forEach((doc) => {
      entries.push({ username: doc.data().name || doc.id, xp: doc.data().xp || 0, level: doc.data().level || 1, streak: doc.data().streak || 0 });
    });
    return entries.sort((a, b) => b.xp - a.xp);
  } catch (e) { return []; }
}

async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    console.error("Login error:", e);
  }
}

async function logout() {
  await signOut(auth);
}

async function callClaude(system, userText, maxTokens = 1000) {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, userText, maxTokens }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "AI request failed");
  return data.text || "";
}

function extractJSON(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const s1 = cleaned.indexOf("["), s2 = cleaned.indexOf("{");
  const start = s1 === -1 ? s2 : s2 === -1 ? s1 : Math.min(s1, s2);
  const end = Math.max(cleaned.lastIndexOf("]"), cleaned.lastIndexOf("}"));
  try { return JSON.parse(cleaned.slice(start, end + 1)); } catch (e) { return null; }
}

// ─── UI COMPONENTS ──────────────────────────────────────────────────────
function Bar({ pct, color, height = 8, bg, gradient }) {
  const theme = T.dark;
  return (
    <div style={{ height, background: bg || theme.cardBorder, borderRadius: 99, overflow: "hidden", width: "100%", position: "relative" }}>
      <div style={{
        width: `${Math.max(2, Math.min(100, pct))}%`,
        height: "100%",
        background: gradient || color || theme.gradient,
        borderRadius: 99,
        transition: "width .6s cubic-bezier(.4,0,.2,1)",
        boxShadow: `0 0 12px ${(color || theme.jade)}44`,
      }} />
    </div>
  );
}

function Card({ children, style, hover, glow }) {
  const theme = T.dark;
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: theme.cardSolid,
        border: `1px solid ${glow ? theme.jade + "66" : theme.cardBorder}`,
        borderRadius: 16,
        padding: 16,
        backdropFilter: "blur(10px)",
        transition: "all .3s ease",
        boxShadow: hovered && hover ? `0 8px 24px rgba(0,0,0,0.2), 0 0 20px ${theme.jade}22` : "0 2px 8px rgba(0,0,0,0.1)",
        ...(hover ? { cursor: "pointer" } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Pill({ children, tone = "ember" }) {
  const theme = T.dark;
  const colors = {
    ember: [theme.ember, theme.emberSoft],
    jade: [theme.jade, theme.jadeSoft],
    rose: [theme.rose, theme.roseSoft],
    violet: [theme.violet, theme.violetSoft],
    sky: [theme.sky, theme.skySoft],
  };
  const [color, bg] = colors[tone] || colors.ember;
  return (
    <span style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, color, background: bg, border: `1px solid ${color}44`, borderRadius: 999, padding: "4px 12px", display: "inline-flex", alignItems: "center", gap: 4 }}>{children}</span>
  );
}

function Btn({ children, onClick, tone = "ember", full, disabled, ghost, size }) {
  const theme = T.dark;
  const colors = {
    ember: [theme.ember, theme.gradientEmber],
    jade: [theme.jade, "linear-gradient(135deg, #10B981, #059669)"],
    rose: [theme.rose, "linear-gradient(135deg, #EF4444, #DC2626)"],
    violet: [theme.violet, "linear-gradient(135deg, #8B5CF6, #7C3AED)"],
    sky: [theme.sky, "linear-gradient(135deg, #38BDF8, #0284C7)"],
  };
  const [color, gradient] = colors[tone] || colors.ember;
  const pad = size === "sm" ? "8px 16px" : size === "lg" ? "16px 24px" : "13px 20px";
  const fs = size === "sm" ? 13 : size === "lg" ? 16 : 15;
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        width: full ? "100%" : "auto",
        background: ghost ? "transparent" : disabled ? theme.cardBorder : gradient,
        color: ghost ? color : disabled ? theme.inkFaint : "#FFFFFF",
        border: ghost ? `1.5px solid ${color}88` : "none",
        borderRadius: 12, padding: pad, fontSize: fs, fontWeight: 700,
        fontFamily: T.sans, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1, transition: "all .3s ease",
        boxShadow: ghost ? "none" : disabled ? "none" : `0 4px 14px ${color}33`,
        position: "relative", overflow: "hidden",
      }}
      onMouseEnter={(e) => { if (!disabled) e.target.style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { e.target.style.transform = "translateY(0)"; }}
    >{children}</button>
  );
}

function useTheme() {
  return T.dark;
}

function ThemeToggle() {
  return (
    <button style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 20, padding: 4 }}>
      ☀️
    </button>
  );
}

function Radar({ skills, size = 220 }) {
  const theme = T.dark;
  const labels = [["understanding", "الفهم"], ["application", "التطبيق"], ["reasoning", "الاستنتاج"], ["problemSolving", "حل المشكلات"], ["recall", "التذكر"]];
  const cx = size / 2, cy = size / 2, r = size / 2 - 30, n = labels.length;
  const pt = (i, val) => {
    const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
    const rad = (val / 100) * r;
    return [cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)];
  };
  const poly = labels.map(([k], i) => pt(i, skills[k]).join(",")).join(" ");
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs><linearGradient id="radarGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={theme.jade} stopOpacity="0.4" /><stop offset="100%" stopColor={theme.sky} stopOpacity="0.4" /></linearGradient></defs>
      {[25, 50, 75, 100].map((rv) => (<polygon key={rv} points={labels.map((_, i) => pt(i, rv).join(",")).join(" ")} fill="none" stroke={theme.cardBorder} strokeWidth="1" strokeDasharray="4 4" />))}
      {labels.map((_, i) => { const [x, y] = pt(i, 100); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={theme.cardBorder} strokeWidth="1" />; })}
      <polygon points={poly} fill="url(#radarGrad)" stroke={theme.jade} strokeWidth="2" strokeLinejoin="round" />
      {labels.map(([k, label], i) => { const [x, y] = pt(i, 118); return (<text key={k} x={x} y={y} fill={theme.inkDim} fontSize="11" fontFamily={T.sans} textAnchor="middle" dominantBaseline="middle" fontWeight="600">{label}</text>); })}
      {labels.map(([k], i) => { const [x, y] = pt(i, skills[k]); return <circle key={k} cx={x} cy={y} r="4" fill={theme.jade} />; })}
    </svg>
  );
}

const inpStyleBase = { width: "100%", borderRadius: 12, padding: "12px 14px", fontSize: 14, fontFamily: T.sans, boxSizing: "border-box", transition: "all .3s ease", outline: "none" };
function Field({ label, children }) { const theme = T.dark; return (<div><div style={{ fontSize: 12, color: theme.inkDim, marginBottom: 6, fontWeight: 600 }}>{label}</div>{children}</div>); }
function useInputStyle() { const theme = T.dark; return { ...inpStyleBase, background: theme.bgSoft, border: `1px solid ${theme.cardBorder}`, color: theme.ink }; }

// ─── SCREENS ────────────────────────────────────────────────────────────
function Home({ profile, onStart, onQuickFix, nav }) {
  const theme = T.dark;
  const lvl = levelFromXP(profile.xp);
  const subjects = Object.entries(profile.subjectStats);
  let strength = null, weakness = null;
  if (subjects.length) {
    const rates = subjects.map(([s, v]) => [s, v.total ? v.correct / v.total : 0]);
    rates.sort((a, b) => b[1] - a[1]);
    strength = rates[0][0];
    weakness = rates[rates.length - 1][0];
  }
  const todayGoalPct = Math.min(100, Math.round((profile.dailyXPToday / 150) * 100));
  const dueReview = profile.mistakes.filter((m) => m.dueAt <= Date.now()).sort((a, b) => a.dueAt - b.dueAt)[0];
  const staleSubject = (() => {
    const lastBySubject = {};
    profile.history.forEach((h) => { lastBySubject[h.subject] = Math.max(lastBySubject[h.subject] || 0, h.date); });
    const entries = Object.entries(lastBySubject);
    if (!entries.length) return null;
    entries.sort((a, b) => a[1] - b[1]);
    const [subj, last] = entries[0];
    const daysAgo = Math.floor((Date.now() - last) / DAY);
    return daysAgo >= 3 ? { subj, daysAgo } : null;
  })();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeIn .5s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>👋 أهلاً يا {profile.name}</div>
          <div style={{ color: theme.inkDim, fontSize: 13, marginTop: 2 }}>جاهز تكمل رحلتك؟ 🚀</div>
        </div>
        <ThemeToggle />
      </div>

      {(dueReview || staleSubject) && (
        <Card style={{ background: `linear-gradient(135deg, ${theme.jadeSoft}, ${theme.skySoft})`, border: `1px solid ${theme.jade}66` }} glow>
          <div style={{ fontSize: 13, color: theme.jade, fontWeight: 800, marginBottom: 6 }}>🎯 أفضل خطوة ليك دلوقتي</div>
          {dueReview ? (<><div style={{ fontSize: 13, marginBottom: 10, lineHeight: 1.6 }}>عندك مفهوم في <b>{dueReview.subject}</b> "{dueReview.concept}" محتاج مراجعة سريعة.</div><Btn tone="jade" onClick={() => onQuickFix(dueReview)}>⚡ مراجعة سريعة — 3 أسئلة</Btn></>) : (<><div style={{ fontSize: 13, marginBottom: 10, lineHeight: 1.6 }}>عندك درس في <b>{staleSubject.subj}</b> مر عليه {staleSubject.daysAgo} أيام من غير مراجعة.</div><Btn tone="jade" onClick={onStart}>🔄 ابدأ مراجعة</Btn></>)}
        </Card>
      )}

      <Card style={{ background: `linear-gradient(135deg, ${theme.cardSolid}, ${theme.violetSoft})`, border: `1px solid ${theme.violet}44` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 40 }}>{lvl.icon}</div>
            <div><div style={{ fontSize: 13, color: theme.inkDim, fontWeight: 600 }}>المستوى الحالي</div><div style={{ fontSize: 22, fontWeight: 900, color: theme.violet }}>Lv.{lvl.level} — {lvl.name}</div></div>
          </div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 12, color: theme.inkDim, fontWeight: 600 }}>XP</div><div style={{ fontFamily: T.mono, fontSize: 20, color: theme.ember, fontWeight: 800 }}>{profile.xp.toLocaleString()}</div></div>
        </div>
        <div style={{ marginTop: 12 }}><Bar pct={lvl.pct} color={theme.violet} /><div style={{ fontSize: 10, color: theme.inkFaint, marginTop: 4, textAlign: "left" }}>{lvl.next - profile.xp} XP للمستوى التالي</div></div>
      </Card>

      <div style={{ display: "flex", gap: 10 }}>
        <Card style={{ flex: 1, textAlign: "center", background: `linear-gradient(135deg, ${theme.cardSolid}, ${theme.emberSoft})` }}><div style={{ fontSize: 24 }}>🔥</div><div style={{ fontFamily: T.mono, fontSize: 20, fontWeight: 800, color: theme.ember }}>{profile.streak}</div><div style={{ fontSize: 11, color: theme.inkDim, fontWeight: 600 }}>يوم Streak</div></Card>
        <Card style={{ flex: 1, textAlign: "center", background: `linear-gradient(135deg, ${theme.cardSolid}, ${theme.jadeSoft})` }}><div style={{ fontSize: 24 }}>📚</div><div style={{ fontFamily: T.mono, fontSize: 20, fontWeight: 800, color: theme.jade }}>{profile.history.filter((h) => h.quizScore >= 80).length}</div><div style={{ fontSize: 11, color: theme.inkDim, fontWeight: 600 }}>درس متقن</div></Card>
        <Card style={{ flex: 1, textAlign: "center", background: `linear-gradient(135deg, ${theme.cardSolid}, ${theme.skySoft})` }}><div style={{ fontSize: 24 }}>🏅</div><div style={{ fontFamily: T.mono, fontSize: 20, fontWeight: 800, color: theme.sky }}>{profile.achievements.length}</div><div style={{ fontSize: 11, color: theme.inkDim, fontWeight: 600 }}>إنجاز</div></Card>
      </div>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><div style={{ fontSize: 13, color: theme.inkDim, fontWeight: 700 }}>📚 هدف اليوم</div><Pill tone={todayGoalPct >= 100 ? "jade" : "ember"}>{profile.dailyXPToday} / 150 XP</Pill></div>
        <Bar pct={todayGoalPct} color={todayGoalPct >= 100 ? theme.jade : theme.ember} />
        {todayGoalPct >= 100 && <div style={{ fontSize: 11, color: theme.jade, marginTop: 6, fontWeight: 700 }}>🎉 حققت هدف اليوم! كمّل كده!</div>}
      </Card>

      {strength && (<div style={{ display: "flex", gap: 10 }}>
        <Card style={{ flex: 1, background: `linear-gradient(135deg, ${theme.cardSolid}, ${theme.jadeSoft})` }}><div style={{ fontSize: 12, color: theme.jade, fontWeight: 700 }}>🎯 نقطة قوتك</div><div style={{ fontWeight: 800, marginTop: 4, fontSize: 15 }}>{SUBJECT_ICONS[strength]} {strength}</div></Card>
        <Card style={{ flex: 1, background: `linear-gradient(135deg, ${theme.cardSolid}, ${theme.emberSoft})` }}><div style={{ fontSize: 12, color: theme.ember, fontWeight: 700 }}>⚠️ تحتاج تدريب</div><div style={{ fontWeight: 800, marginTop: 4, fontSize: 15 }}>{SUBJECT_ICONS[weakness]} {weakness}</div></Card>
      </div>)}

      <Btn full size="lg" tone="jade" onClick={onStart} style={{ fontSize: 17 }}>🎯 ابدأ جلسة مذاكرة</Btn>
      <div style={{ display: "flex", gap: 10 }}>
        <Btn ghost full tone="violet" onClick={() => nav("coach")}>🤖 AI Coach</Btn>
        <Btn ghost full tone="ember" onClick={() => nav("leaderboard")}>🏆 المنافسة</Btn>
      </div>
    </div>
  );
}

function startQuickFix(mistake) { window.dispatchEvent(new CustomEvent("quickfix", { detail: mistake })); }

function Setup({ onLaunch }) {
  const theme = T.dark;
  const inpStyle = useInputStyle();
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [grade, setGrade] = useState("الصف الثاني الثانوي");
  const [lesson, setLesson] = useState("");
  const [duration, setDuration] = useState(30);
  const [goal, setGoal] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeIn .5s ease" }}>
      <div style={{ textAlign: "center" }}><div style={{ fontSize: 40, marginBottom: 8 }}>🎯</div><div style={{ fontSize: 20, fontWeight: 900 }}>إنشاء جلسة مذاكرة</div><div style={{ color: theme.inkDim, fontSize: 13, marginTop: 4 }}>جهز نفسك للتركيز العميق</div></div>
      <Card><Field label="📚 المادة"><select style={inpStyle} value={subject} onChange={(e) => setSubject(e.target.value)}>{SUBJECTS.map((s) => (<option key={s} value={s}>{SUBJECT_ICONS[s]} {s}</option>))}</select></Field></Card>
      <Card><Field label="🏫 الصف / المستوى الدراسي"><input style={inpStyle} value={grade} onChange={(e) => setGrade(e.target.value)} /></Field></Card>
      <Card><Field label="📖 اسم الدرس"><input style={inpStyle} placeholder="مثال: قوانين نيوتن" value={lesson} onChange={(e) => setLesson(e.target.value)} /></Field></Card>
      <Card><Field label={`⏱️ مدة الجلسة: ${duration} دقيقة`}><input type="range" min={10} max={90} step={5} value={duration} onChange={(e) => setDuration(+e.target.value)} style={{ width: "100%", accentColor: theme.jade }} /></Field></Card>
      <Card><Field label="🎯 الهدف من الجلسة"><input style={inpStyle} placeholder="مثال: فهم الدرس وحل 5 مسائل" value={goal} onChange={(e) => setGoal(e.target.value)} /></Field></Card>
      <Btn full size="lg" tone="jade" onClick={() => onLaunch({ subject, grade, lesson: lesson.trim() || `درس في ${subject}`, duration, goal: goal || "فهم الدرس جيدًا" })}>🔥 ابدأ Focus Mode</Btn>
    </div>
  );
}

function Focus({ session, onDone }) {
  const theme = T.dark;
  const [secondsLeft, setSecondsLeft] = useState(session.duration * 60);
  const [paused, setPaused] = useState(false);
  const [focusedSeconds, setFocusedSeconds] = useState(0);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => { setSecondsLeft((s) => (s > 0 ? s - 1 : 0)); setFocusedSeconds((s) => s + 1); }, 1000);
    return () => clearInterval(id);
  }, [paused]);

  useEffect(() => { if (secondsLeft === 0) onDone(focusedSeconds); }, [secondsLeft]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const pct = 100 - (secondsLeft / (session.duration * 60)) * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, paddingTop: 20, animation: "fadeIn .5s ease" }}>
      <div style={{ color: theme.inkDim, fontSize: 13, fontWeight: 600 }}>{SUBJECT_ICONS[session.subject]} {session.subject} · {session.lesson}</div>
      <Card style={{ width: "100%", boxSizing: "border-box", textAlign: "center" }}><div style={{ fontSize: 12, color: theme.inkDim, fontWeight: 700 }}>مهمتك</div><div style={{ fontSize: 15, fontWeight: 800, marginTop: 4 }}>🎯 {session.goal}</div></Card>
      <div style={{ position: "relative", width: 240, height: 240 }}>
        <svg width={240} height={240} viewBox="0 0 240 240">
          <defs><linearGradient id="focusGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={theme.jade} /><stop offset="100%" stopColor={theme.sky} /></linearGradient></defs>
          <circle cx="120" cy="120" r="105" fill="none" stroke={theme.cardBorder} strokeWidth="12" />
          <circle cx="120" cy="120" r="105" fill="none" stroke="url(#focusGrad)" strokeWidth="12" strokeLinecap="round" strokeDasharray={2 * Math.PI * 105} strokeDashoffset={2 * Math.PI * 105 * (1 - pct / 100)} transform="rotate(-90 120 120)" style={{ transition: "stroke-dashoffset 1s linear", filter: `drop-shadow(0 0 10px ${theme.jade}66)` }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontFamily: T.mono, fontSize: 44, fontWeight: 900, color: theme.ink }}>{mm}:{ss}</div>
          <div style={{ fontSize: 11, color: theme.inkDim, fontWeight: 600 }}>{paused ? "⏸ متوقف" : "🧠 مركز"}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <Btn ghost tone="sky" onClick={() => setPaused((p) => !p)}>{paused ? "▶ استكمال" : "⏸ إيقاف مؤقت"}</Btn>
        <Btn tone="rose" onClick={() => onDone(focusedSeconds)}>إنهاء الجلسة</Btn>
      </div>
    </div>
  );
}

const PROOF_MODES = [
  { id: "write", icon: "📝", label: "اكتب", hint: "اكتب أهم حاجة فهمتها.", tone: "sky" },
  { id: "photo", icon: "📸", label: "صوّر", hint: "صوّر ملاحظاتك (اكتب وصف سريع لمحتوى الصورة).", tone: "violet" },
  { id: "blind", icon: "🧠", label: "بدون مساعدة", hint: "من غير ما تبص للكتاب، اكتب كل اللي فاكره.", tone: "ember" },
];

function Proof({ onSubmit }) {
  const theme = T.dark;
  const inpStyle = useInputStyle();
  const [mode, setMode] = useState("write");
  const [summary, setSummary] = useState("");
  const activeMode = PROOF_MODES.find((m) => m.id === mode);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeIn .5s ease" }}>
      <div style={{ textAlign: "center" }}><div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div><div style={{ fontSize: 20, fontWeight: 900 }}>انتهت جلسة المذاكرة!</div><div style={{ color: theme.inkDim, fontSize: 13, marginTop: 4 }}>وريني ذاكرت إيه 👀</div></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {PROOF_MODES.map((m) => (
          <button key={m.id} onClick={() => setMode(m.id)} style={{ padding: "14px 8px", borderRadius: 14, textAlign: "center", cursor: "pointer", fontFamily: T.sans, background: mode === m.id ? theme.jadeSoft : theme.cardSolid, border: `1.5px solid ${mode === m.id ? theme.jade : theme.cardBorder}`, color: mode === m.id ? theme.jade : theme.ink, transition: "all .3s ease" }}>
            <div style={{ fontSize: 24 }}>{m.icon}</div><div style={{ fontSize: 13, marginTop: 6, fontWeight: 800 }}>{m.label}</div>
          </button>
        ))}
      </div>
      <Card><Field label={activeMode.hint}><textarea style={{ ...inpStyle, minHeight: 120, resize: "vertical" }} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="اكتب هنا..." /></Field></Card>
      {mode === "blind" && (<div style={{ fontSize: 12, color: theme.jade, fontWeight: 700, textAlign: "center" }}>👍 اختيار قوي — استرجاع من الذاكرة بيقيس فهمك الحقيقي أكتر</div>)}
      <Btn full size="lg" tone="jade" disabled={!summary.trim()} onClick={() => onSubmit({ summary, mode })}>🧠 ابدأ اختبار AI</Btn>
      {!summary.trim() && (<div style={{ fontSize: 11, color: theme.inkFaint, textAlign: "center" }}>اكتب حاجة الأول عشان الزرار يفتح</div>)}
    </div>
  );
}

const TYPE_LABEL = { direct: "سؤال مباشر", understanding: "سؤال فهم", application: "سؤال تطبيق", reasoning: "سؤال استنتاج", spot_error: "كشف الفهم الحقيقي", recall: "استرجاع حر" };
const TYPE_ICONS = { direct: "📌", understanding: "💡", application: "🔧", reasoning: "🔍", spot_error: "🎯", recall: "🧠" };

function buildAdaptiveSystemPrompt(session, questionCount) {
  return `أنت محرك اختبار تكيفي داخل تطبيق مذاكرة. المادة: ${session.subject}. الدرس: ${session.lesson}. عدد الأسئلة: ${questionCount}.
أول استدعاء: eval=null. لكل استدعاء قيم الإجابة (correct/partial/incorrect). لو محتاج أسئلة ولّد next. لو خلصت اعمل done=true و finalSkills.
أرجع JSON فقط: {"eval":{"verdict":"","feedback":"","concept":"","misconception":null}|null,"next":{"question":"","type":"","difficulty":"","concept":"","plantedAnswer":null}|null,"done":false,"finalSkills":null,"confidence":0,"summaryNote":"","conceptMap":[]}`;
}

function AdaptiveQuiz({ session, proof, questionCount = 5, onFinish }) {
  const theme = T.dark;
  const inpStyle = useInputStyle();
  const [turns, setTurns] = useState([]);
  const [current, setCurrent] = useState(null);
  const [inputVal, setInputVal] = useState("");
  const [lastFeedback, setLastFeedback] = useState(null);
  const [phase, setPhase] = useState("loading");
  const askedCount = turns.length;

  const step = useCallback(async (answerForCurrent) => {
    setPhase("loading");
    try {
      const sys = buildAdaptiveSystemPrompt(session, questionCount);
      const transcript = turns.map((t, i) => `${i + 1}) [${t.difficulty}/${t.type}] س: ${t.question}\nإجابة الطالب: ${t.studentAnswer}\nالتقييم: ${t.verdict} — ${t.feedback}`).join("\n\n");
      let userText;
      if (!current) userText = `ابدأ. ${proof ? `ملخص الطالب: ${proof.summary}` : "لا يوجد ملخص"}\n${transcript}`;
      else userText = `السؤال الحالي: ${current.question}. إجابة الطالب: ${answerForCurrent}`;
      const text = await callClaude(sys, userText, 900);
      const json = extractJSON(text);
      if (!json) throw new Error("bad json");

      let newTurns = turns;
      if (json.eval && current) {
        const finishedTurn = { ...current, studentAnswer: answerForCurrent, verdict: json.eval.verdict, feedback: json.eval.feedback, misconception: json.eval.misconception };
        newTurns = [...turns, finishedTurn];
        setTurns(newTurns);
        setLastFeedback(finishedTurn);
      }

      if (json.done) { onFinish({ turns: newTurns, skills: json.finalSkills, confidence: json.confidence, summaryNote: json.summaryNote, conceptMap: json.conceptMap || [] }); return; }
      setCurrent(json.next); setInputVal(""); setPhase(json.eval ? "feedback" : "asking");
    } catch (e) { setPhase("error"); }
  }, [turns, current, session, proof, questionCount, onFinish]);

  useEffect(() => { step(null); }, []);

  if (phase === "loading") return (<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, paddingTop: 60 }}><div style={{ fontSize: 48, animation: "pulse 1.5s infinite" }}>🧠</div><div style={{ color: theme.inkDim, fontSize: 14, textAlign: "center", fontWeight: 600 }}>{askedCount === 0 ? "جاري تحليل ملخصك وتوليد أول سؤال..." : "جاري تحليل إجابتك..."}</div><Bar pct={30} color={theme.jade} height={4} /></div>);
  if (phase === "error") return (<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, paddingTop: 40 }}><div style={{ fontSize: 36 }}>😅</div><div style={{ color: theme.rose, fontWeight: 700 }}>حصل خطأ في الاتصال بمحرك الأسئلة.</div><Btn onClick={() => step(null)}>حاول تاني</Btn></div>);

  if (phase === "feedback" && lastFeedback) {
    const tone = lastFeedback.verdict === "correct" ? "jade" : lastFeedback.verdict === "incorrect" ? "rose" : "ember";
    const verdictLabel = lastFeedback.verdict === "correct" ? "✅ صحيحة" : lastFeedback.verdict === "incorrect" ? "❌ تحتاج تعديل" : "🟡 جزئية";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "slideUp .4s ease" }}>
        <div style={{ textAlign: "center" }}><Pill tone={tone}>{verdictLabel}</Pill></div>
        <Card><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: theme.inkDim }}>{TYPE_ICONS[lastFeedback.type]} {lastFeedback.question}</div><div style={{ fontSize: 14, lineHeight: 1.8 }}>{lastFeedback.feedback}</div>{lastFeedback.misconception && (<div style={{ marginTop: 10, padding: 10, background: theme.emberSoft, borderRadius: 10, fontSize: 13, color: theme.ember, fontWeight: 600 }}>🔎 {lastFeedback.misconception}</div>)}</Card>
        <Btn full size="lg" tone="jade" onClick={() => setPhase("asking")}>السؤال الجاي ←</Btn>
      </div>
    );
  }

  if (phase === "asking" && current) {
    const progress = (askedCount / questionCount) * 100;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "slideUp .4s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><Pill tone="jade">{TYPE_ICONS[current.type]} {TYPE_LABEL[current.type] || current.type}</Pill><div style={{ fontFamily: T.mono, fontSize: 12, color: theme.inkFaint, fontWeight: 600 }}>{askedCount + 1} / {questionCount} · {current.difficulty}</div></div>
        <Bar pct={progress} color={theme.jade} />
        <Card style={{ border: `1.5px solid ${theme.jade}33` }}><div style={{ fontSize: 16, lineHeight: 1.8, fontWeight: 700 }}>{current.question}</div></Card>
        <textarea style={{ ...inpStyle, minHeight: 110, resize: "vertical", border: `1.5px solid ${theme.jade}44` }} value={inputVal} onChange={(e) => setInputVal(e.target.value)} placeholder="اكتب إجابتك هنا..." />
        <Btn full size="lg" tone="jade" disabled={!inputVal.trim()} onClick={() => step(inputVal)}>{askedCount + 1 < questionCount ? "إرسال والسؤال التالي ⬇" : "إرسال وإنهاء الاختبار 🎯"}</Btn>
      </div>
    );
  }
  return null;
}

function Results({ session, result, xpGained, leveledUp, onHome, onQuickFixConcept }) {
  const theme = T.dark;
  const weakConcepts = (result.conceptMap || []).filter((c) => c.status !== "mastered");
  const score = Math.round(result.turns.filter((t) => t.verdict === "correct").length / result.turns.length * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeIn .5s ease" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 100, height: 100, margin: "0 auto", borderRadius: "50%", background: `conic-gradient(${theme.jade} ${score * 3.6}deg, ${theme.cardBorder} ${score * 3.6}deg)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: theme.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 28, fontWeight: 900, color: theme.jade }}>{score}%</span></div>
        </div>
        <div style={{ color: theme.inkDim, fontSize: 13, marginTop: 8, fontWeight: 600 }}>نتيجة الاختبار — {session.lesson}</div>
      </div>
      <Card><div style={{ fontSize: 13, color: theme.inkDim, marginBottom: 6, fontWeight: 700 }}>🧠 Learning Confidence</div><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Bar pct={result.confidence} color={theme.ember} /><div style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 800, color: theme.ember }}>{result.confidence}%</div></div></Card>
      {leveledUp && (<Card style={{ background: `linear-gradient(135deg, ${theme.jadeSoft}, ${theme.violetSoft})`, border: `1px solid ${theme.jade}` }}><div style={{ textAlign: "center", fontWeight: 900, color: theme.jade, fontSize: 18 }}>🚀 Level Up!</div></Card>)}
      <Card style={{ textAlign: "center", background: `linear-gradient(135deg, ${theme.cardSolid}, ${theme.emberSoft})` }}><div style={{ fontFamily: T.mono, fontSize: 28, color: theme.ember, fontWeight: 900 }}>+{xpGained} XP</div><div style={{ fontSize: 12, color: theme.inkDim, fontWeight: 600 }}>نقاط خبرة مكتسبة</div></Card>
      <div style={{ fontWeight: 800, marginTop: 4, fontSize: 15 }}>🧠 إيه اللي حصل في دماغك؟</div>
      <Card>{(result.conceptMap || []).map((c, i) => (<div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < result.conceptMap.length - 1 ? `1px solid ${theme.cardBorder}` : "none" }}><div style={{ fontSize: 13, fontWeight: 700 }}>{c.status === "mastered" ? "✅" : c.status === "needs_practice" ? "⚠️" : "🔴"} {c.concept}</div><Pill tone={c.status === "mastered" ? "jade" : c.status === "needs_practice" ? "ember" : "rose"}>{c.status === "mastered" ? "أتقنت" : c.status === "needs_practice" ? "يحتاج تدريب" : "لم تتقن"}</Pill></div>))}</Card>
      {weakConcepts.length > 0 && (<Btn full tone="rose" onClick={() => onQuickFixConcept(weakConcepts[0])}>💪 أصلح نقطة ضعفي — {weakConcepts[0].concept}</Btn>)}
      <Btn full size="lg" tone="jade" onClick={onHome}>🏠 العودة للرئيسية</Btn>
    </div>
  );
}

function Leaderboard({ profile }) {
  const theme = T.dark;
  const [entries, setEntries] = useState(null);

  useEffect(() => { fetchLeaderboard().then(setEntries); }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeIn .5s ease" }}>
      <div style={{ textAlign: "center" }}><div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div><div style={{ fontSize: 20, fontWeight: 900 }}>Learning Rating</div><div style={{ fontSize: 12, color: theme.inkFaint, fontWeight: 600, marginTop: 4 }}>مش عدد الساعات — الترتيب بيتحسب من جودة فهمك ودقة إجاباتك</div></div>
      {entries === null && (<div style={{ color: theme.inkDim, textAlign: "center", padding: 20 }}>جاري التحميل...</div>)}
      {entries && entries.length === 0 && (<Card><div style={{ color: theme.inkDim, textAlign: "center" }}>لسه محدش ظهر في الترتيب.</div></Card>)}
      {entries && entries.map((e, i) => (
        <Card key={e.username} hover style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexDirection: "row", ...(e.username === profile.username ? { border: `1.5px solid ${theme.jade}`, background: theme.jadeSoft } : {}) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontFamily: T.mono, fontWeight: 900, fontSize: 16, color: i === 0 ? theme.ember : i === 1 ? theme.inkDim : i === 2 ? "#CD7F32" : theme.inkFaint, width: 40, textAlign: "center" }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</div>
            <div><div style={{ fontWeight: 800, fontSize: 14 }}>{e.username === profile.username ? "أنت 👈" : e.username}</div><div style={{ fontSize: 11, color: theme.inkFaint, fontWeight: 600 }}>Lv.{e.level} · 🔥 {e.streak} يوم</div></div>
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 16, color: theme.ember, fontWeight: 900, background: theme.emberSoft, padding: "6px 12px", borderRadius: 10 }}>{e.xp}</div>
        </Card>
      ))}
    </div>
  );
}

function Achievements({ profile }) {
  const theme = T.dark;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeIn .5s ease" }}>
      <div style={{ textAlign: "center" }}><div style={{ fontSize: 36, marginBottom: 8 }}>🏅</div><div style={{ fontSize: 20, fontWeight: 900 }}>الإنجازات</div><div style={{ fontSize: 12, color: theme.inkFaint, fontWeight: 600, marginTop: 4 }}>{profile.achievements.length} / {ACHIEVEMENTS.length} مفتوح</div></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {ACHIEVEMENTS.map((a) => { const unlocked = profile.achievements.includes(a.id); return (
          <Card key={a.id} style={{ opacity: unlocked ? 1 : 0.4, textAlign: "center", background: unlocked ? theme.jadeSoft : theme.cardSolid, border: unlocked ? `1px solid ${theme.jade}66` : `1px solid ${theme.cardBorder}` }}>
            <div style={{ fontSize: 30 }}>{a.icon}</div><div style={{ fontSize: 13, marginTop: 6, fontWeight: 800 }}>{a.label}</div><div style={{ fontSize: 10, color: theme.inkDim, marginTop: 2, fontWeight: 600 }}>{a.desc}</div>{unlocked && <div style={{ fontSize: 10, color: theme.jade, marginTop: 4, fontWeight: 800 }}>✅ مفتوح</div>}
          </Card>
        ); })}
      </div>
    </div>
  );
}

function Analytics({ profile }) {
  const theme = T.dark;
  const weekAgo = Date.now() - 7 * DAY;
  const week = profile.history.filter((h) => h.date >= weekAgo);
  const focusMin = week.reduce((a, h) => a + h.focusMinutes, 0);
  const avgUnderstanding = week.length ? Math.round(week.reduce((a, h) => a + (h.skillsSnapshot?.understanding || 0), 0) / week.length) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeIn .5s ease" }}>
      <div style={{ textAlign: "center" }}><div style={{ fontSize: 36, marginBottom: 8 }}>📊</div><div style={{ fontSize: 20, fontWeight: 900 }}>تحليلك الأسبوعي</div></div>
      <div style={{ display: "flex", gap: 10 }}>
        <Card style={{ flex: 1, textAlign: "center", background: `linear-gradient(135deg, ${theme.cardSolid}, ${theme.skySoft})` }}><div style={{ fontFamily: T.mono, fontSize: 20, fontWeight: 900, color: theme.sky }}>{focusMin}د</div><div style={{ fontSize: 11, color: theme.inkDim, fontWeight: 600 }}>وقت تركيز</div></Card>
        <Card style={{ flex: 1, textAlign: "center", background: `linear-gradient(135deg, ${theme.cardSolid}, ${theme.jadeSoft})` }}><div style={{ fontFamily: T.mono, fontSize: 20, fontWeight: 900, color: theme.jade }}>{week.length}</div><div style={{ fontSize: 11, color: theme.inkDim, fontWeight: 600 }}>جلسات</div></Card>
        <Card style={{ flex: 1, textAlign: "center", background: `linear-gradient(135deg, ${theme.cardSolid}, ${theme.violetSoft})` }}><div style={{ fontFamily: T.mono, fontSize: 20, fontWeight: 900, color: theme.violet }}>{avgUnderstanding}%</div><div style={{ fontSize: 11, color: theme.inkDim, fontWeight: 600 }}>متوسط الفهم</div></Card>
      </div>
      <Card><div style={{ fontSize: 14, color: theme.inkDim, marginBottom: 12, fontWeight: 700, textAlign: "center" }}>Study Intelligence Profile</div><div style={{ display: "flex", justifyContent: "center" }}><Radar skills={profile.skills} /></div></Card>
    </div>
  );
}

function Coach({ profile }) {
  const theme = T.dark;
  const inpStyle = useInputStyle();
  const [messages, setMessages] = useState([{ role: "assistant", text: `أهلاً يا ${profile.name}! 👋\nأنا مدرّبك الذكي. اسألني عن أي جزئية مش فاهمها.` }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const updated = [...messages, { role: "user", text: input.trim() }];
    setMessages(updated); setInput(""); setLoading(true);
    try {
      const conv = updated.map((m) => `${m.role === "user" ? "الطالب" : "المدرّب"}: ${m.text}`).join("\n");
      const text = await callClaude("أنت AI Study Coach ودود ومختصر بالعامية المصرية.", conv, 500);
      setMessages((m) => [...m, { role: "assistant", text }]);
    } catch (e) { setMessages((m) => [...m, { role: "assistant", text: "معلش، حصل خطأ في الاتصال. جرب تاني." }]); }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", animation: "fadeIn .5s ease" }}>
      <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 12, textAlign: "center" }}>🤖 AI Study Coach</div>
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingBottom: 10, minHeight: 300, maxHeight: 400 }}>
        {messages.map((m, i) => (<div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%", animation: "slideUp .3s ease" }}><div style={{ background: m.role === "user" ? theme.gradient : theme.cardSolid, color: m.role === "user" ? "#FFFFFF" : theme.ink, border: m.role === "user" ? "none" : `1px solid ${theme.cardBorder}`, borderRadius: 16, padding: "12px 16px", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", fontWeight: 600 }}>{m.text}</div></div>))}
        {loading && <div style={{ color: theme.inkFaint, fontSize: 12, fontWeight: 600, alignSelf: "flex-start" }}>المدرّب بيكتب...</div>}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input style={{ ...inpStyle, flex: 1 }} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="اكتب سؤالك..." />
        <Btn onClick={send} disabled={loading} tone="jade">إرسال</Btn>
      </div>
    </div>
  );
}

// ─── APP ROOT ───────────────────────────────────────────────────────────

function App() {
  const [profile, setProfile] = useState(null);
  const [screen, setScreen] = useState("home");
  const [session, setSession] = useState(null);
  const [proofData, setProofData] = useState(null);
  const [quizResult, setQuizResult] = useState(null);
  const [xpGained, setXpGained] = useState(0);
  const [leveledUp, setLeveledUp] = useState(false);

  useEffect(() => { loadProfile().then(setProfile); }, []);
  const persist = useCallback((p) => { setProfile(p); saveProfile(p); pushLeaderboard(p); }, []);

  if (profile === null) {
    return (
      <div style={{ background: T.dark.bg, color: "#94A3B8", padding: 40, textAlign: "center", fontSize: 16, fontWeight: 600, height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 20 }}>
        <div style={{ fontSize: 50 }}>📚</div>
        <h1 style={{ color: "#F1F5F9" }}>Study Smart</h1>
        <p style={{ fontSize: 14 }}>سجل دخولك بحساب جوجل لمتابعة تقدمك والمنافسة مع أصدقائك</p>
        <Btn full size="lg" tone="jade" onClick={loginWithGoogle}>🔐 تسجيل الدخول بحساب جوجل</Btn>
      </div>
    );
  }

  function launchSession(s) { setSession(s); setScreen("focus"); }
  function finishFocus(focusedSeconds) { setSession((s) => ({ ...s, actualFocusSeconds: focusedSeconds })); setScreen("proof"); }
  function submitProof(data) { setProofData(data); setScreen("quiz"); }

  function startQuickFix(mistake) {
    setSession({ subject: mistake.subject, lesson: mistake.concept, grade: "مراجعة", goal: `تثبيت مفهوم: ${mistake.concept}`, actualFocusSeconds: 0, isReview: true });
    setProofData(null);
    setScreen("quiz");
  }

  function applyQuizResult(result) {
    const questionCount = result.turns.length;
    const correctCount = result.turns.filter((t) => t.verdict === "correct").length;
    const overallScore = Math.round((correctCount / questionCount) * 100);

    let earned = session.isReview ? 10 : 20;
    if (overallScore >= 50) earned += session.isReview ? 20 : 50;
    if (overallScore >= 90 && !session.isReview) earned += 100;

    const today = new Date().toDateString();
    let streak = profile.streak;
    if (profile.lastStudyDate !== today) {
      const yesterday = new Date(Date.now() - DAY).toDateString();
      streak = profile.lastStudyDate === yesterday ? streak + 1 : 1;
    }

    const newXP = profile.xp + earned;
    const beforeLevel = levelFromXP(profile.xp).level;
    const afterLevel = levelFromXP(newXP).level;

    const newProfile = { ...profile, xp: newXP, streak, lastStudyDate: today, history: [...profile.history, { date: Date.now(), subject: session.subject, lesson: session.lesson, focusMinutes: Math.round((session.actualFocusSeconds || 0) / 60), quizScore: overallScore, skillsSnapshot: result.skills, xpGained: earned }] };

    const unlocked = ACHIEVEMENTS.filter((a) => !newProfile.achievements.includes(a.id) && a.check(newProfile)).map((a) => a.id);
    newProfile.achievements = [...newProfile.achievements, ...unlocked];

    setXpGained(earned);
    setLeveledUp(afterLevel > beforeLevel);
    setQuizResult({ ...result, overallScore });
    persist(newProfile);
    setScreen("results");
  }

  function goHome() {
    setSession(null); setProofData(null); setQuizResult(null); setScreen("home");
  }

  const tabs = [
    ["home", "🏠", "الرئيسية"],
    ["analytics", "📊", "تقدمي"],
    ["leaderboard", "🏆", "المنافسة"],
    ["achievements", "🏅", "إنجازات"],
    ["coach", "🤖", "المدرّب"],
  ];

  const inFlow = ["setup", "focus", "proof", "quiz", "results"].includes(screen);
  const canGoBack = ["setup", "focus", "proof", "quiz"].includes(screen);

  return (
    <div style={{ background: T.dark.bg, color: T.dark.ink, fontFamily: T.sans, height: "100vh", maxHeight: "760px", width: "100%", maxWidth: 420, margin: "0 auto", display: "flex", flexDirection: "column", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }} dir="rtl">
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: "#111827" }}>
        <button onClick={logout} style={{ background: "transparent", border: "1px solid #333", color: "#94A3B8", fontFamily: T.sans, fontSize: 12, cursor: "pointer", padding: "4px 10px", borderRadius: 8 }}>تسجيل خروج</button>
        <ThemeToggle />
      </div>

      {canGoBack && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 0" }}>
          <button onClick={goHome} style={{ background: "transparent", border: "none", color: "#94A3B8", fontFamily: T.sans, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: "6px 4px", fontWeight: 700 }}>
            <span style={{ fontSize: 16 }}>→</span> رجوع
          </button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "18px 16px 8px" }}>
        {screen === "home" && <Home profile={profile} onStart={() => setScreen("setup")} onQuickFix={startQuickFix} nav={setScreen} />}
        {screen === "setup" && <Setup onLaunch={launchSession} />}
        {screen === "focus" && <Focus session={session} onDone={finishFocus} />}
        {screen === "proof" && <Proof onSubmit={submitProof} />}
        {screen === "quiz" && <AdaptiveQuiz session={session} proof={proofData} questionCount={session.isReview ? 3 : 5} onFinish={applyQuizResult} />}
        {screen === "results" && quizResult && <Results session={session} result={quizResult} xpGained={xpGained} leveledUp={leveledUp} onHome={goHome} onQuickFixConcept={(c) => startQuickFix({ subject: session.subject, concept: c.concept })} />}
        {screen === "leaderboard" && <Leaderboard profile={profile} />}
        {screen === "achievements" && <Achievements profile={profile} />}
        {screen === "analytics" && <Analytics profile={profile} />}
        {screen === "coach" && <Coach profile={profile} />}
      </div>

      {!inFlow && (
        <div style={{ display: "flex", borderTop: `1px solid rgba(255,255,255,0.08)`, background: "rgba(17,24,39,0.95)", backdropFilter: "blur(10px)" }}>
          {tabs.map(([id, icon, label]) => (
            <button key={id} onClick={() => setScreen(id)} style={{ flex: 1, background: "transparent", border: "none", padding: "10px 4px", cursor: "pointer", color: screen === id ? "#10B981" : "#64748B", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, fontFamily: T.sans, transition: "all .3s ease", position: "relative" }}>
              {screen === id && <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 24, height: 3, background: "#10B981", borderRadius: "0 0 4px 4px" }} />}
              <div style={{ fontSize: 18 }}>{icon}</div>
              <div style={{ fontSize: 10, fontWeight: 700 }}>{label}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

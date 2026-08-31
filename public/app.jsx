/* =========================================================================
   STUDY SMART — ENHANCED UI v2.0 (React App)
   Design System: Modern, Motivational, Clean
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
  try {
    const raw = localStorage.getItem("study_app_profile");
    if (raw) return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch (e) {}
  return { ...DEFAULT_PROFILE };
}
async function saveProfile(p) {
  try { localStorage.setItem("study_app_profile", JSON.stringify(p)); } catch (e) {}
}
async function pushLeaderboard(p) {
  try {
    const lvl = levelFromXP(p.xp);
    await fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: p.username, xp: p.xp, level: lvl.level, rating: Math.floor(p.xp / 10), streak: p.streak }),
    });
  } catch (e) {}
}
async function fetchLeaderboard() {
  try {
    const res = await fetch("/api/leaderboard");
    const data = await res.json();
    return data.entries || [];
  } catch (e) { return []; }
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
    <span style={{
      fontFamily: T.sans, fontSize: 12, fontWeight: 700,
      color, background: bg, border: `1px solid ${color}44`,
      borderRadius: 999, padding: "4px 12px",
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>{children}</span>
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

function ThemeToggle() {
  return (
    <button style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 20, padding: 4 }}>
      ☀️
    </button>
  );
}

// ─── SCREENS ────────────────────────────────────────────────────────────

function Home({ profile, onStart, nav }) {
  const theme = T.dark;
  const lvl = levelFromXP(profile.xp);
  const dueMistakes = profile.mistakes.filter((m) => m.dueAt <= Date.now());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeIn .5s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>👋 أهلاً يا {profile.name}</div>
          <div style={{ color: theme.inkDim, fontSize: 13, marginTop: 2 }}>جاهز تكمل رحلتك؟ 🚀</div>
        </div>
        <ThemeToggle />
      </div>

      {dueMistakes.length > 0 && (
        <Card style={{ background: `linear-gradient(135deg, ${theme.jadeSoft}, ${theme.skySoft})`, border: `1px solid ${theme.jade}66` }} glow>
          <div style={{ fontSize: 13, color: theme.jade, fontWeight: 800, marginBottom: 6 }}>🎯 عندك مراجعات مستحقة</div>
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
            مفهومات محتاجة تثبيت سريع. اضغط "مراجعة سريعة".
          </div>
          <Btn tone="jade" onClick={() => startQuickFix(dueMistakes[0])}>⚡ مراجعة سريعة</Btn>
        </Card>
      )}

      <Card style={{ background: `linear-gradient(135deg, ${theme.cardSolid}, ${theme.violetSoft})`, border: `1px solid ${theme.violet}44` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 40 }}>{lvl.icon}</div>
            <div>
              <div style={{ fontSize: 13, color: theme.inkDim, fontWeight: 600 }}>المستوى الحالي</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: theme.violet }}>Lv.{lvl.level} — {lvl.name}</div>
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, color: theme.inkDim, fontWeight: 600 }}>XP</div>
            <div style={{ fontFamily: T.mono, fontSize: 20, color: theme.ember, fontWeight: 800 }}>{profile.xp.toLocaleString()}</div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <Bar pct={lvl.pct} color={theme.violet} />
          <div style={{ fontSize: 10, color: theme.inkFaint, marginTop: 4, textAlign: "left" }}>{lvl.next - profile.xp} XP للمستوى التالي</div>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 10 }}>
        <Card style={{ flex: 1, textAlign: "center", background: `linear-gradient(135deg, ${theme.cardSolid}, ${theme.emberSoft})` }}>
          <div style={{ fontSize: 24 }}>🔥</div>
          <div style={{ fontFamily: T.mono, fontSize: 20, fontWeight: 800, color: theme.ember }}>{profile.streak}</div>
          <div style={{ fontSize: 11, color: theme.inkDim, fontWeight: 600 }}>يوم Streak</div>
        </Card>
        <Card style={{ flex: 1, textAlign: "center", background: `linear-gradient(135deg, ${theme.cardSolid}, ${theme.jadeSoft})` }}>
          <div style={{ fontSize: 24 }}>📚</div>
          <div style={{ fontFamily: T.mono, fontSize: 20, fontWeight: 800, color: theme.jade }}>
            {profile.history.filter((h) => h.quizScore >= 80).length}
          </div>
          <div style={{ fontSize: 11, color: theme.inkDim, fontWeight: 600 }}>درس متقن</div>
        </Card>
        <Card style={{ flex: 1, textAlign: "center", background: `linear-gradient(135deg, ${theme.cardSolid}, ${theme.skySoft})` }}>
          <div style={{ fontSize: 24 }}>🏅</div>
          <div style={{ fontFamily: T.mono, fontSize: 20, fontWeight: 800, color: theme.sky }}>{profile.achievements.length}</div>
          <div style={{ fontSize: 11, color: theme.inkDim, fontWeight: 600 }}>إنجاز</div>
        </Card>
      </div>

      <Btn full size="lg" tone="jade" onClick={onStart} style={{ fontSize: 17 }}>🎯 ابدأ جلسة مذاكرة</Btn>

      <div style={{ display: "flex", gap: 10 }}>
        <Btn ghost full tone="violet" onClick={() => nav("coach")}>🤖 AI Coach</Btn>
        <Btn ghost full tone="ember" onClick={() => nav("leaderboard")}>🏆 المنافسة</Btn>
      </div>
    </div>
  );
}

function startQuickFix(mistake) {
  window.dispatchEvent(new CustomEvent("quickfix", { detail: mistake }));
}

function Setup({ onLaunch }) {
  const theme = T.dark;
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [lesson, setLesson] = useState("");
  const [duration, setDuration] = useState(30);
  const [goal, setGoal] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeIn .5s ease" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🎯</div>
        <div style={{ fontSize: 20, fontWeight: 900 }}>إنشاء جلسة مذاكرة</div>
        <div style={{ color: theme.inkDim, fontSize: 13, marginTop: 4 }}>جهز نفسك للتركيز العميق</div>
      </div>

      <div style={{ background: theme.cardSolid, border: `1px solid ${theme.cardBorder}`, borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 12, color: theme.inkDim, marginBottom: 6, fontWeight: 600 }}>📚 المادة</div>
        <select style={{ width: "100%", borderRadius: 12, padding: "12px 14px", fontSize: 14, fontFamily: T.sans, background: theme.bgSoft, border: `1px solid ${theme.cardBorder}`, color: theme.ink }} value={subject} onChange={(e) => setSubject(e.target.value)}>
          {SUBJECTS.map((s) => (<option key={s} value={s}>{SUBJECT_ICONS[s]} {s}</option>))}
        </select>
      </div>

      <div style={{ background: theme.cardSolid, border: `1px solid ${theme.cardBorder}`, borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 12, color: theme.inkDim, marginBottom: 6, fontWeight: 600 }}>📖 اسم الدرس</div>
        <input style={{ width: "100%", borderRadius: 12, padding: "12px 14px", fontSize: 14, fontFamily: T.sans, background: theme.bgSoft, border: `1px solid ${theme.cardBorder}`, color: theme.ink, boxSizing: "border-box" }} placeholder="مثال: قوانين نيوتن" value={lesson} onChange={(e) => setLesson(e.target.value)} />
      </div>

      <div style={{ background: theme.cardSolid, border: `1px solid ${theme.cardBorder}`, borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 12, color: theme.inkDim, marginBottom: 6, fontWeight: 600 }}>⏱️ مدة الجلسة: {duration} دقيقة</div>
        <input type="range" min={10} max={90} step={5} value={duration} onChange={(e) => setDuration(+e.target.value)} style={{ width: "100%", accentColor: theme.jade }} />
      </div>

      <div style={{ background: theme.cardSolid, border: `1px solid ${theme.cardBorder}`, borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 12, color: theme.inkDim, marginBottom: 6, fontWeight: 600 }}>🎯 الهدف من الجلسة</div>
        <input style={{ width: "100%", borderRadius: 12, padding: "12px 14px", fontSize: 14, fontFamily: T.sans, background: theme.bgSoft, border: `1px solid ${theme.cardBorder}`, color: theme.ink, boxSizing: "border-box" }} placeholder="فهم الدرس وحل 5 مسائل" value={goal} onChange={(e) => setGoal(e.target.value)} />
      </div>

      <Btn full size="lg" tone="jade" onClick={() => onLaunch({ subject, lesson: lesson.trim() || `درس في ${subject}`, duration, goal: goal || "فهم الدرس جيدًا" })}>🔥 ابدأ Focus Mode</Btn>
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
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
      setFocusedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [paused]);

  useEffect(() => {
    if (secondsLeft === 0) onDone(focusedSeconds);
  }, [secondsLeft]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const pct = 100 - (secondsLeft / (session.duration * 60)) * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, paddingTop: 20, animation: "fadeIn .5s ease" }}>
      <div style={{ color: theme.inkDim, fontSize: 13, fontWeight: 600 }}>{SUBJECT_ICONS[session.subject]} {session.subject} · {session.lesson}</div>
      <Card style={{ width: "100%", boxSizing: "border-box", textAlign: "center" }}>
        <div style={{ fontSize: 12, color: theme.inkDim, fontWeight: 700 }}>مهمتك</div>
        <div style={{ fontSize: 15, fontWeight: 800, marginTop: 4 }}>🎯 {session.goal}</div>
      </Card>

      <div style={{ position: "relative", width: 240, height: 240 }}>
        <svg width={240} height={240} viewBox="0 0 240 240">
          <defs>
            <linearGradient id="focusGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={theme.jade} />
              <stop offset="100%" stopColor={theme.sky} />
            </linearGradient>
          </defs>
          <circle cx="120" cy="120" r="105" fill="none" stroke={theme.cardBorder} strokeWidth="12" />
          <circle cx="120" cy="120" r="105" fill="none" stroke="url(#focusGrad)" strokeWidth="12" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 105} strokeDashoffset={2 * Math.PI * 105 * (1 - pct / 100)}
            transform="rotate(-90 120 120)"
            style={{ transition: "stroke-dashoffset 1s linear", filter: `drop-shadow(0 0 10px ${theme.jade}66)` }} />
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

// ─── PROOF SCREEN: CAMERA INTEGRATION START ─────────────────────────────

const PROOF_MODES = [
  { id: "write", icon: "📝", label: "اكتب", hint: "اكتب أهم حاجة فهمتها.", tone: "sky" },
  { id: "photo", icon: "📸", label: "صوّر", hint: "صوّر ملاحظاتك (يتم إرسال الصورة للـ AI مباشرة)", tone: "violet" },
  { id: "blind", icon: "🧠", label: "بدون مساعدة", hint: "من غير ما تبص للكتاب، اكتب كل اللي فاكره.", tone: "ember" },
];

function Proof({ onSubmit }) {
  const theme = T.dark;
  const [mode, setMode] = useState("write");
  const [summary, setSummary] = useState("");
  const [imageBase64, setImageBase64] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const activeMode = PROOF_MODES.find((m) => m.id === mode);

  const handleCameraCapture = (event) => {
    const file = event.target.files[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeIn .5s ease" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
        <div style={{ fontSize: 20, fontWeight: 900 }}>انتهت جلسة المذاكرة!</div>
        <div style={{ color: theme.inkDim, fontSize: 13, marginTop: 4 }}>وريني ذاكرت إيه 👀</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {PROOF_MODES.map((m) => (
          <button key={m.id} onClick={() => setMode(m.id)}
            style={{
              padding: "14px 8px", borderRadius: 14, textAlign: "center", cursor: "pointer", fontFamily: T.sans,
              background: mode === m.id ? theme.jadeSoft : theme.cardSolid,
              border: `1.5px solid ${mode === m.id ? theme.jade : theme.cardBorder}`,
              color: mode === m.id ? theme.jade : theme.ink, transition: "all .3s ease",
            }}>
            <div style={{ fontSize: 24 }}>{m.icon}</div>
            <div style={{ fontSize: 13, marginTop: 6, fontWeight: 800 }}>{m.label}</div>
          </button>
        ))}
      </div>

      {mode === "photo" ? (
        <Card>
          <div style={{ textAlign: "center" }}>
            {/* هذا هو الجزء الخاص بفتح الكاميرا الحقيقية */}
            <input type="file" id="camera-input" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleCameraCapture} />
            
            <Btn tone="violet" full disabled={isUploading} onClick={() => document.getElementById("camera-input").click()}>
              {isUploading ? "جاري رفع الصورة..." : "📸 اضغط لفتح الكاميرا وتصوير ملاحظاتك"}
            </Btn>
            
            {imageBase64 && (
              <div style={{ marginTop: 15 }}>
                <img src={imageBase64} style={{ width: "100%", borderRadius: 12, border: `1px solid ${theme.jade}66` }} />
                <div style={{ fontSize: 12, color: theme.jade, fontWeight: 700, marginTop: 8 }}>
                  ✅ تم التقاط الصورة بنجاح! سيتم تحليلها بالذكاء الاصطناعي.
                </div>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <div style={{ fontSize: 12, color: theme.inkDim, marginBottom: 6, fontWeight: 600 }}>{activeMode.hint}</div>
          <textarea
            style={{ width: "100%", borderRadius: 12, padding: "12px 14px", minHeight: 120, resize: "vertical", fontSize: 14, background: theme.bgSoft, border: `1px solid ${theme.cardBorder}`, color: theme.ink, boxSizing: "border-box", fontFamily: T.sans, outline: "none" }}
            value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="اكتب هنا..."
          />
        </Card>
      )}

      {mode === "blind" && (
        <div style={{ fontSize: 12, color: theme.jade, fontWeight: 700, textAlign: "center" }}>
          👍 اختيار قوي — استرجاع من الذاكرة بيقيس فهمك الحقيقي أكتر
        </div>
      )}

      <Btn full size="lg" tone="jade" disabled={!summary.trim() && !imageBase64} onClick={() => onSubmit({ summary, mode, imageBase64 })}>
        🧠 ابدأ اختبار AI
      </Btn>
      {!summary.trim() && !imageBase64 && (
        <div style={{ fontSize: 11, color: theme.inkFaint, textAlign: "center" }}>
          اكتب حاجة أو صوّر الأول عشان الزرار يفتح
        </div>
      )}
    </div>
  );
}
// ─── PROOF SCREEN: CAMERA INTEGRATION END ─────────────────────────────

// ─── ADAPTIVE QUIZ ──────────────────────────────────────────────────────

const TYPE_LABEL = { direct: "سؤال مباشر", understanding: "سؤال فهم", application: "سؤال تطبيق", reasoning: "سؤال استنتاج", spot_error: "كشف الفهم الحقيقي", recall: "استرجاع حر" };
const TYPE_ICONS = { direct: "📌", understanding: "💡", application: "🔧", reasoning: "🔍", spot_error: "🎯", recall: "🧠" };

function buildAdaptiveSystemPrompt(session, questionCount) {
  return `أنت محرك اختبار تكيفي داخل تطبيق مذاكرة. المادة: ${session.subject}. الدرس: ${session.lesson}. عدد الأسئلة: ${questionCount}.
أول استدعاء: eval=null، ابدأ بسؤال متوسط.
لكل استدعاء: قيم الإجابة (correct/partial/incorrect). ولو لسه محتاج أسئلة، ولّد next. لو خلصت، اعمل done=true و finalSkills.
أرجع JSON فقط: {"eval":{"verdict":"","feedback":"","concept":"","misconception":null}|null,"next":{"question":"","type":"","difficulty":"","concept":"","plantedAnswer":null}|null,"done":false,"finalSkills":null,"confidence":0,"summaryNote":"","conceptMap":[]}`;
}

function AdaptiveQuiz({ session, proof, questionCount = 5, onFinish }) {
  const theme = T.dark;
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
      let userText;
      if (!current) {
        userText = `ابدأ. ${proof?.summary ? `ملخص الطالب: ${proof.summary}` : ""} ${proof?.imageBase64 ? `صورة مرفقة (بنسخة Base64): ${proof.imageBase64}` : ""}`;
      } else {
        userText = `السؤال الحالي: ${current.question}. إجابة الطالب: ${answerForCurrent}`;
      }
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

      if (json.done) {
        onFinish({ turns: newTurns, skills: json.finalSkills, confidence: json.confidence, summaryNote: json.summaryNote, conceptMap: json.conceptMap || [] });
        return;
      }
      setCurrent(json.next);
      setInputVal("");
      setPhase(json.eval ? "feedback" : "asking");
    } catch (e) {
      setPhase("error");
    }
  }, [turns, current, session, proof, onFinish]);

  useEffect(() => { step(null); }, []);

  if (phase === "loading") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, paddingTop: 60, animation: "fadeIn .5s ease" }}>
        <div style={{ fontSize: 48, animation: "pulse 1.5s infinite" }}>🧠</div>
        <div style={{ color: theme.inkDim, fontSize: 14, textAlign: "center", fontWeight: 600 }}>
          {askedCount === 0 ? "جاري تحليل ملخصك وتوليد أول سؤال..." : "جاري تحليل إجابتك..."}
        </div>
        <Bar pct={30} color={theme.jade} height={4} />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, paddingTop: 40 }}>
        <div style={{ fontSize: 36 }}>😅</div>
        <div style={{ color: theme.rose, fontWeight: 700 }}>حصل خطأ في الاتصال بمحرك الأسئلة.</div>
        <Btn onClick={() => step(null)}>حاول تاني</Btn>
      </div>
    );
  }

  if (phase === "feedback" && lastFeedback) {
    const tone = lastFeedback.verdict === "correct" ? "jade" : lastFeedback.verdict === "incorrect" ? "rose" : "ember";
    const verdictLabel = lastFeedback.verdict === "correct" ? "✅ صحيحة" : lastFeedback.verdict === "incorrect" ? "❌ تحتاج تعديل" : "🟡 جزئية";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "slideUp .4s ease" }}>
        <div style={{ textAlign: "center" }}><Pill tone={tone}>{verdictLabel}</Pill></div>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: theme.inkDim }}>{TYPE_ICONS[lastFeedback.type]} {lastFeedback.question}</div>
          <div style={{ fontSize: 14, lineHeight: 1.8 }}>{lastFeedback.feedback}</div>
          {lastFeedback.misconception && (
            <div style={{ marginTop: 10, padding: 10, background: theme.emberSoft, borderRadius: 10, fontSize: 13, color: theme.ember, fontWeight: 600 }}>
              🔎 {lastFeedback.misconception}
            </div>
          )}
        </Card>
        <Btn full size="lg" tone="jade" onClick={() => setPhase("asking")}>السؤال الجاي ←</Btn>
      </div>
    );
  }

  if (phase === "asking" && current) {
    const progress = (askedCount / questionCount) * 100;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "slideUp .4s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Pill tone="jade">{TYPE_ICONS[current.type]} {TYPE_LABEL[current.type] || current.type}</Pill>
          <div style={{ fontFamily: T.mono, fontSize: 12, color: theme.inkFaint, fontWeight: 600 }}>{askedCount + 1} / {questionCount} · {current.difficulty}</div>
        </div>
        <Bar pct={progress} color={theme.jade} />
        <Card style={{ border: `1.5px solid ${theme.jade}33` }}>
          <div style={{ fontSize: 16, lineHeight: 1.8, fontWeight: 700 }}>{current.question}</div>
        </Card>
        <textarea
          style={{ width: "100%", minHeight: 110, resize: "vertical", borderRadius: 12, padding: "12px 14px", border: `1.5px solid ${theme.jade}44`, background: theme.bgSoft, color: theme.ink, fontFamily: T.sans }}
          value={inputVal} onChange={(e) => setInputVal(e.target.value)} placeholder="اكتب إجابتك هنا..." />
        <Btn full size="lg" tone="jade" disabled={!inputVal.trim()} onClick={() => step(inputVal)}>
          {askedCount + 1 < questionCount ? "إرسال والسؤال التالي ⬇" : "إرسال وإنهاء الاختبار 🎯"}
        </Btn>
      </div>
    );
  }
  return null;
}

function extractJSON(text) {
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch (e) { return null; }
}

function Results({ session, result, xpGained, leveledUp, onHome, onQuickFixConcept }) {
  const theme = T.dark;
  const weakConcepts = (result.conceptMap || []).filter((c) => c.status !== "mastered");
  const score = Math.round(result.turns.filter((t) => t.verdict === "correct").length / result.turns.length * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeIn .5s ease" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 100, height: 100, margin: "0 auto", borderRadius: "50%", background: `conic-gradient(${theme.jade} ${score * 3.6}deg, ${theme.cardBorder} ${score * 3.6}deg)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: theme.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: theme.jade }}>{score}%</span>
          </div>
        </div>
        <div style={{ color: theme.inkDim, fontSize: 13, marginTop: 8, fontWeight: 600 }}>نتيجة الاختبار — {session.lesson}</div>
      </div>

      <Card style={{ textAlign: "center", background: `linear-gradient(135deg, ${theme.cardSolid}, ${theme.emberSoft})` }}>
        <div style={{ fontFamily: T.mono, fontSize: 28, color: theme.ember, fontWeight: 900 }}>+{xpGained} XP</div>
        <div style={{ fontSize: 12, color: theme.inkDim, fontWeight: 600 }}>نقاط خبرة مكتسبة</div>
      </Card>

      {leveledUp && (
        <Card style={{ background: `linear-gradient(135deg, ${theme.jadeSoft}, ${theme.violetSoft})`, border: `1px solid ${theme.jade}` }}>
          <div style={{ textAlign: "center", fontWeight: 900, color: theme.jade, fontSize: 18 }}>🚀 Level Up!</div>
        </Card>
      )}

      {weakConcepts.length > 0 && (
        <Btn full tone="rose" onClick={() => onQuickFixConcept(weakConcepts[0])}>💪 أصلح نقطة ضعفي — {weakConcepts[0].concept}</Btn>
      )}

      <Btn full size="lg" tone="jade" onClick={onHome}>🏠 العودة للرئيسية</Btn>
    </div>
  );
}

// ─── LEADERBOARD (FRIENDS CHALLENGE) ───────────────────────────────────

function Leaderboard({ profile }) {
  const theme = T.dark;
  const [entries, setEntries] = useState(null);

  useEffect(() => { fetchLeaderboard().then(setEntries); }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeIn .5s ease" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
        <div style={{ fontSize: 20, fontWeight: 900 }}>تحدي الأصدقاء (XP)</div>
        <div style={{ fontSize: 12, color: theme.inkFaint, fontWeight: 600, marginTop: 4 }}>تنافس مع أصدقائك واجمع أكبر قدر من النقاط</div>
      </div>

      {entries === null && <div style={{ color: theme.inkDim, textAlign: "center", padding: 20 }}>جاري التحميل...</div>}
      {entries && entries.length === 0 && <Card><div style={{ color: theme.inkDim, textAlign: "center" }}>لسه محدش ظهر في الترتيب.</div></Card>}
      
      {entries && entries.map((e, i) => (
        <Card key={e.username} hover style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexDirection: "row", ...(e.username === profile.username ? { border: `1.5px solid ${theme.jade}`, background: theme.jadeSoft } : {}) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontFamily: T.mono, fontWeight: 900, fontSize: 16, color: i === 0 ? theme.ember : i === 1 ? theme.inkDim : i === 2 ? "#CD7F32" : theme.inkFaint, width: 40, textAlign: "center" }}>
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{e.username === profile.username ? "أنت 👈" : e.username}</div>
              <div style={{ fontSize: 11, color: theme.inkFaint, fontWeight: 600 }}>Lv.{e.level} · 🔥 {e.streak} يوم</div>
            </div>
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
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🏅</div>
        <div style={{ fontSize: 20, fontWeight: 900 }}>الإنجازات</div>
        <div style={{ fontSize: 12, color: theme.inkFaint, fontWeight: 600, marginTop: 4 }}>{profile.achievements.length} / {ACHIEVEMENTS.length} مفتوح</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {ACHIEVEMENTS.map((a) => {
          const unlocked = profile.achievements.includes(a.id);
          return (
            <Card key={a.id} style={{ opacity: unlocked ? 1 : 0.4, textAlign: "center", background: unlocked ? theme.jadeSoft : theme.cardSolid, border: unlocked ? `1px solid ${theme.jade}66` : `1px solid ${theme.cardBorder}` }}>
              <div style={{ fontSize: 30 }}>{a.icon}</div>
              <div style={{ fontSize: 13, marginTop: 6, fontWeight: 800 }}>{a.label}</div>
              <div style={{ fontSize: 10, color: theme.inkDim, marginTop: 2, fontWeight: 600 }}>{a.desc}</div>
              {unlocked && <div style={{ fontSize: 10, color: theme.jade, marginTop: 4, fontWeight: 800 }}>✅ مفتوح</div>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Analytics({ profile }) {
  const theme = T.dark;
  const skills = profile.skills;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeIn .5s ease" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
        <div style={{ fontSize: 20, fontWeight: 900 }}>تحليلك</div>
      </div>

      <Card>
        <div style={{ fontSize: 14, color: theme.inkDim, marginBottom: 12, fontWeight: 700, textAlign: "center" }}>Study Intelligence Profile</div>
        <div style={{ textAlign: "center" }}>
          {Object.keys(skills).map((skill) => (
            <div key={skill} style={{ marginBottom: 15 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{skill === "understanding" ? "الفهم" : skill === "application" ? "التطبيق" : skill === "reasoning" ? "الاستنتاج" : skill === "problemSolving" ? "حل المشكلات" : "التذكر"}</span>
                <span style={{ fontSize: 13, color: theme.jade, fontWeight: 700 }}>{skills[skill]}%</span>
              </div>
              <Bar pct={skills[skill]} color={theme.jade} height={6} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Coach({ profile }) {
  const theme = T.dark;
  const [messages, setMessages] = useState([{ role: "assistant", text: `أهلاً يا ${profile.name}! 👋\nأنا مدرّبك الذكي. اسألني عن أي جزئية مش فاهمها.` }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const updated = [...messages, { role: "user", text: input.trim() }];
    setMessages(updated);
    setInput("");
    setLoading(true);
    try {
      const conv = updated.map((m) => `${m.role === "user" ? "الطالب" : "المدرّب"}: ${m.text}`).join("\n");
      const text = await callClaude("أنت AI Study Coach ودود ومختصر بالعامية المصرية، اشرح المفاهيم واسأل الطالب يشرحلك هو بنفسه.", conv, 500);
      setMessages((m) => [...m, { role: "assistant", text }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: "معلش، حصل خطأ في الاتصال. جرب تاني." }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", animation: "fadeIn .5s ease" }}>
      <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 12, textAlign: "center" }}>🤖 AI Study Coach</div>
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingBottom: 10, minHeight: 300, maxHeight: 400 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%", animation: "slideUp .3s ease" }}>
            <div style={{ background: m.role === "user" ? theme.gradient : theme.cardSolid, color: m.role === "user" ? "#FFFFFF" : theme.ink, border: m.role === "user" ? "none" : `1px solid ${theme.cardBorder}`, borderRadius: 16, padding: "12px 16px", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", fontWeight: 600 }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && <div style={{ color: theme.inkFaint, fontSize: 12, fontWeight: 600, alignSelf: "flex-start" }}>المدرّب بيكتب...</div>}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input
          style={{ flex: 1, borderRadius: 12, padding: "12px 14px", fontSize: 14, background: theme.bgSoft, border: `1px solid ${theme.cardBorder}`, color: theme.ink, fontFamily: T.sans, outline: "none" }}
          value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="اكتب سؤالك..." />
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

  useEffect(() => {
    const handler = (e) => {
      const mistake = e.detail;
      setSession({ subject: mistake.subject, lesson: mistake.concept, grade: "مراجعة", goal: "تثبيت المفهوم", actualFocusSeconds: 0, isReview: true });
      setProofData(null);
      setScreen("quiz");
    };
    window.addEventListener("quickfix", handler);
    return () => window.removeEventListener("quickfix", handler);
  }, []);

  const persist = useCallback((p) => { setProfile(p); saveProfile(p); pushLeaderboard(p); }, []);

  if (!profile) {
    return (
      <div style={{ background: T.dark.bg, color: "#94A3B8", padding: 40, textAlign: "center", fontSize: 16, fontWeight: 600, height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        جاري التحميل... ⏳
      </div>
    );
  }

  function launchSession(s) { setSession(s); setScreen("focus"); }
  function finishFocus(focusedSeconds) { setSession((s) => ({ ...s, actualFocusSeconds: focusedSeconds })); setScreen("proof"); }
  function submitProof(data) { setProofData(data); setScreen("quiz"); }

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

    let newMistakes = profile.mistakes;
    result.turns.forEach((t) => {
      newMistakes = upsertMistake(newMistakes, { subject: session.subject, lesson: session.lesson, concept: t.concept, verdict: t.verdict });
    });

    const newXP = profile.xp + earned;
    const beforeLevel = levelFromXP(profile.xp).level;
    const afterLevel = levelFromXP(newXP).level;

    let newProfile = {
      ...profile,
      xp: newXP,
      streak,
      lastStudyDate: today,
      mistakes: newMistakes,
      history: [...profile.history, { date: Date.now(), subject: session.subject, lesson: session.lesson, focusMinutes: Math.round((session.actualFocusSeconds || 0) / 60), quizScore: overallScore, skillsSnapshot: result.skills, xpGained: earned }],
    };

    const unlocked = ACHIEVEMENTS.filter((a) => !newProfile.achievements.includes(a.id) && a.check(newProfile)).map((a) => a.id);
    newProfile = { ...newProfile, achievements: [...newProfile.achievements, ...unlocked] };

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
      {canGoBack && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 0" }}>
          <button onClick={goHome} style={{ background: "transparent", border: "none", color: "#94A3B8", fontFamily: T.sans, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: "6px 4px", fontWeight: 700 }}>
            <span style={{ fontSize: 16 }}>→</span> رجوع
          </button>
          <ThemeToggle />
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "18px 16px 8px" }}>
        {screen === "home" && <Home profile={profile} onStart={() => setScreen("setup")} nav={setScreen} />}
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

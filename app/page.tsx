import './landing.css'

export default function Home() {
  const skills = [
    { label: 'Cell structure',  pct: 91, level: 's' },
    { label: 'Membranes',       pct: 83, level: 's' },
    { label: 'Photosynthesis',  pct: 57, level: 'm' },
    { label: 'Respiration',     pct: 39, level: 'm' },
    { label: 'Mitosis',         pct: 14, level: 'w' },
  ]

  const lessons = [
    { title: 'Intro to cells',        meta: '4 exercises • 1 challenge',  tag: 'ready',  tagClass: 'tag-grn' },
    { title: 'Cell membrane',         meta: '5 exercises • 1 challenge',  tag: 'ready',  tagClass: 'tag-grn' },
    { title: 'Photosynthesis',        meta: '6 exercises • 2 challenges', tag: 'active', tagClass: 'tag-acc' },
    { title: 'Cellular respiration',  meta: '5 exercises • 1 challenge',  tag: 'queued', tagClass: 'tag-pur' },
  ]

  const exerciseChips = ['fill-blank', 'multiple-choice', 'drag-reorder', 'sort-buckets']

  const instructorList = [
    'Upload any materials — textbook, syllabus, slides, lab manual',
    'AI reads your content and builds a structured curriculum plan',
    'Every generated lesson traces back to your exact source material',
    'Per-student competency maps updated continuously in real time',
    'AI flags misconceptions before they become failing grades',
    'Materials auto-update when standards or rubrics change',
  ]

  const studentList = [
    'Immediate feedback on every attempt',
    'AI hints that guide without giving the answer away',
    'Watch your competency map grow concept by concept',
    'Your progress follows you across semesters',
    'Join any classroom with a single key — zero setup',
  ]

  const importFiles = [
    { name: 'biology-syllabus.pdf',   color: 'var(--accent)' },
    { name: 'week3-slides.pptx',      color: 'var(--green)' },
    { name: 'chapter4-outline.docx',  color: 'var(--purple)' },
  ]

  return (
    <div className="landing-page">

      {/* NAV */}
      <nav className="lnav">
        <span className="logo">
          <img src="/brand/luminent-logo-mark-only.svg" alt="" className="logo-mark" />
          luminent
        </span>
        <div className="nav-links">
          <a href="#" className="nav-link">Platform</a>
          <a href="#" className="nav-link">For educators</a>
          <a href="#" className="nav-link">For students</a>
          <a href="/auth/login" className="nav-cta">Sign in</a>
        </div>
      </nav>

      {/* HERO */}
      <div className="grid-bg hero-wrap">
        <div className="sq sq-teal sq-lg"    style={{ top: 55,  left: '5%' }}>{'{}'}</div>
        <div className="sq sq-navy sq-md"    style={{ top: 90,  left: '20%' }}>/</div>
        <div className="sq sq-teal sq-sm"    style={{ top: 240, left: '12%' }} />
        <div className="sq sq-cyan sq-lg"    style={{ top: 50,  right: '8%' }}>{'<>'}</div>
        <div className="sq sq-md"            style={{ top: 170, right: '20%', background: '#8c9eed' }}>#</div>
        <div className="sq sq-purple sq-sm"  style={{ top: 310, right: '13%' }} />
        <div className="sq sq-teal sq-sm"    style={{ top: 400, left: '4%' }} />
        <div className="sq sq-purple sq-sm"  style={{ top: 440, right: '4%' }} />
        <div className="sq sq-teal-dk sq-sm" style={{ bottom: 220, left: '17%' }} />
        <div className="sq sq-cyan sq-sm"    style={{ bottom: 240, right: '19%' }} />

        <div className="hero-badge">
          <span className="badge-dot" />
          now in summer 2025 &nbsp;/&nbsp; AI-native classrooms built from your materials
        </div>

        <h1 className="hero-title">Your materials.<br />A living classroom.</h1>

        <p className="hero-sub">
          Luminent reads your textbooks, syllabi, and lab manuals — then builds a fully
          structured classroom from them. Every lesson, assessment, and study guide
          traces back to what you actually teach. Students learn. You see exactly why they do or don&apos;t.
        </p>

        <div className="hero-btns">
          <a href="/auth/login?role=instructor" className="btn-dark">Build your classroom</a>
          <a href="/auth/login?role=student" className="btn-outline">I am a student</a>
        </div>

        {/* SPLIT MOCKUP: teacher import + student lesson */}
        <div className="hero-screen">
          <div className="hs-bar">
            <div className="hs-dots">
              <div className="hs-dot" style={{ background: '#ff5f57' }} />
              <div className="hs-dot" style={{ background: '#febc2e' }} />
              <div className="hs-dot" style={{ background: '#28c840' }} />
            </div>
            <div className="hs-url">luminent.app</div>
          </div>
          <div className="hs-body">
            <div className="hs-left">
              <div className="hs-left-tag">instructor / import content</div>
              <div className="hs-left-title">Upload your materials. We do the rest.</div>
              <div className="import-box">
                <div className="import-icon">{'⬆'}</div>
                <div className="import-label">drop textbook, syllabus, lab manual, or slides</div>
              </div>
              <div className="import-files">
                {importFiles.map(f => (
                  <div className="import-file" key={f.name}>
                    <div className="if-dot" style={{ background: f.color }} />
                    {f.name}
                    <span className="if-arrow">&#x2192;</span>
                  </div>
                ))}
              </div>
              <div className="gen-badge">&#x2713; &nbsp;6 grounded lessons generated from your content</div>
            </div>
            <div className="hs-right">
              <div className="hs-right-tag">student / lesson 2 of 6</div>
              <div className="hs-right-title">How does photosynthesis work?</div>
              <div className="hs-right-sub">
                Choose the correct description of what chlorophyll does during photosynthesis.
              </div>
              <div className="mc-options">
                <div className="mc-opt wrong">Breaks down glucose into energy for the plant</div>
                <div className="mc-opt correct">
                  &#x2713; &nbsp;Absorbs light energy to convert CO{'₂'} and water into glucose
                </div>
                <div className="mc-opt">Transports water from roots to leaves</div>
              </div>
              <div className="agent-bubble">
                <span className="ab-ico">&#9888;</span>
                <span className="ab-txt">
                  Think about where light plays a role. What part of the plant captures it,
                  and what does it do with it?
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dash-div"><div className="dash-line" /></div>

      {/* WHAT LUMINENT IS */}
      <div className="section">
        <p className="kicker">What Luminent is</p>
        <h2 className="sec-h">Not a template engine.<br />Not a quiz generator.</h2>
        <p className="sec-p">
          A structured classroom environment that reads your actual materials, builds
          curriculum grounded in them, and tracks whether students genuinely understand
          what you taught — concept by concept, not score by score.
        </p>
        <div className="big-three">
          <div className="bt-card">
            <div className="bt-n">01</div>
            <div className="bt-icon bi-teal">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="var(--teal-dark)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" rx="1.5" />
                <rect x="12" y="3" width="7" height="5" rx="1.5" />
                <rect x="12" y="11" width="7" height="8" rx="1.5" />
                <rect x="3" y="15" width="7" height="4" rx="1.5" />
              </svg>
            </div>
            <h3>A curriculum engine grounded in your materials</h3>
            <p>Upload your textbook, syllabus, or lab manual. Luminent reads them, structures their content, and builds every lesson and assessment from what&apos;s actually inside — not from the internet, not from generic templates.</p>
          </div>
          <div className="bt-card">
            <div className="bt-n">02</div>
            <div className="bt-icon bi-blue">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="M11 7v4.5l3 3" />
              </svg>
            </div>
            <h3>A dynamic classroom that adapts as students learn</h3>
            <p>Students don&apos;t just read. They interact, make decisions, and get guided feedback. The classroom routes each student based on their demonstrated understanding — not where the syllabus says they should be.</p>
          </div>
          <div className="bt-card">
            <div className="bt-n">03</div>
            <div className="bt-icon bi-purple">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="var(--purple)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 17l5-5 4 4 5-8" />
                <circle cx="4"  cy="17" r="1.5" />
                <circle cx="9"  cy="12" r="1.5" />
                <circle cx="13" cy="16" r="1.5" />
                <circle cx="18" cy="8"  r="1.5" />
              </svg>
            </div>
            <h3>A living competency map, not a gradebook</h3>
            <p>Every student interaction feeds a real-time picture of what each student knows at the concept level. When standards change or assessment data reveals a gap, the system proposes what to update — and you approve it.</p>
          </div>
        </div>
      </div>

      <div className="dash-div"><div className="dash-line" /></div>

      {/* GENERATIVE ENGINE */}
      <div className="gen-section">
        <div className="gen-inner">
          <div className="gen-copy">
            <p className="kicker" style={{ textAlign: 'left' }}>The curriculum engine</p>
            <h2>From your materials to a structured classroom — in one conversation</h2>
            <p>
              Other tools generate content from the internet. Luminent generates from what you gave it.
              Every lesson, every assessment item, every study guide traces back to a specific
              block in your uploaded documents. The teacher remains in control at every step.
            </p>
            <div className="gen-steps">
              <div className="gen-step">
                <div className="gs-num">1</div>
                <div>
                  <h4>Upload what you already have</h4>
                  <p>Textbook, syllabus, lab manual, slides. Any format. Luminent reads them all and builds a unified, queryable corpus across every document.</p>
                </div>
              </div>
              <div className="gen-step">
                <div className="gs-num teal">2</div>
                <div>
                  <h4>Build a curriculum plan through conversation</h4>
                  <p>Tell the AI what to cover and in what order. It cross-references your materials, proposes a structured plan, and refines it until you approve it.</p>
                </div>
              </div>
              <div className="gen-step">
                <div className="gs-num">3</div>
                <div>
                  <h4>Generate lessons, assessments, and study guides</h4>
                  <p>Every piece of content is built from your approved plan and sourced from your materials. Review, edit, or ship as-is. Every output shows you exactly where it came from.</p>
                </div>
              </div>
              <div className="gen-step">
                <div className="gs-num teal">4</div>
                <div>
                  <h4>Materials update as your classroom evolves</h4>
                  <p>When state standards change, when a rubric gets revised, or when assessment data reveals a concept wasn&apos;t landing — Luminent identifies what needs updating and drafts the fix for your review.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="gen-visual">
            <div className="gv-top">
              <span>luminent / classroom builder</span>
              <span className="gv-live">generating</span>
            </div>
            <div className="gv-body">
              <div className="gv-import-row">
                <div className="gv-file">biology-unit2.pdf</div>
                <span className="gv-arrow">&#x2192;</span>
                <div className="gv-gen">&#x2713; structured</div>
              </div>
              <div className="gv-lessons">
                {lessons.map(l => (
                  <div className="gv-lesson" key={l.title}>
                    <div>
                      <div className="gv-ltitle">{l.title}</div>
                      <div className="gv-lmeta">{l.meta}</div>
                    </div>
                    <span className={`gv-ltag ${l.tagClass}`}>{l.tag}</span>
                  </div>
                ))}
              </div>
              <div className="gv-chips">
                {exerciseChips.map(c => <div className="gv-chip" key={c}>{c}</div>)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dash-div"><div className="dash-line" /></div>

      {/* COMPETENCY MAP */}
      <div className="map-section">
        <div className="map-inner">
          <div className="map-copy">
            <p className="kicker" style={{ textAlign: 'left' }}>The competency map</p>
            <h2>Know exactly where each student is — and why</h2>
            <p className="lead">
              Every attempt, every mistake, and every breakthrough feeds a real-time map of
              student understanding at the concept level. Not a score — a signal. Teachers see
              which concepts are weak, which materials they trace to, and what to do about it.
              The map travels with students across semesters.
            </p>
            <div className="map-feat">
              <div className="mf-ico">
                <svg viewBox="0 0 16 16">
                  <polyline points="1,12 4,7 8,9 13,3" />
                  <circle cx="15" cy="2" r="1.5" fill="var(--accent)" stroke="none" />
                </svg>
              </div>
              <div>
                <h4>Growth velocity</h4>
                <p>Not just where a student is, but how fast they are moving and whether they are accelerating or stalling on specific concepts.</p>
              </div>
            </div>
            <div className="map-feat">
              <div className="mf-ico">
                <svg viewBox="0 0 16 16">
                  <circle cx="8" cy="8" r="6" />
                  <path d="M5 8h6M8 5v6" />
                </svg>
              </div>
              <div>
                <h4>Concept-level error taxonomy</h4>
                <p>Not just wrong — but which concept broke down and where in your source material it was taught. The same wrong answer from two students can signal entirely different gaps.</p>
              </div>
            </div>
            <div className="map-feat">
              <div className="mf-ico">
                <svg viewBox="0 0 16 16">
                  <path d="M2 10l4-4 3 3 5-6" />
                  <polyline points="11,4 13,4 13,6" />
                </svg>
              </div>
              <div>
                <h4>Longitudinal memory</h4>
                <p>Maps persist across years. The next teacher inherits full context — which concepts a student has mastered, where gaps remain, and what interventions have already been tried.</p>
              </div>
            </div>
          </div>
          <div className="map-card">
            <div className="mc-hdr">
              <span className="mc-hdrtxt">student / competency map</span>
              <span className="mc-pill">live</span>
            </div>
            <div className="mc-body">
              <div className="mc-stu">
                <div className="mc-av">MA</div>
                <div>
                  <div className="mc-name">Maya A.</div>
                  <div className="mc-meta">biology unit 2 &bull; week 3</div>
                </div>
              </div>
              {skills.map(s => (
                <div className="sk-row" key={s.label}>
                  <span className="sk-lbl">{s.label}</span>
                  <div className="sk-track">
                    <div className={`sk-fill sk-${s.level}`} style={{ width: `${s.pct}%` }} />
                  </div>
                  <span className="sk-pct">{s.pct}%</span>
                </div>
              ))}
              <div className="mc-flag">
                <div className="mc-fdot" />
                <div className="mc-ftxt">
                  Recurring confusion on light-dependent vs light-independent reactions.
                  5 of 22 students share this pattern — source traced to pp. 84–87 of your textbook.
                  Consider revisiting before unit 3.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI SECTION - dark */}
      <div className="ai-section">
        <div className="ai-sq sq sq-teal sq-lg"   style={{ top: 40, left: '4%' }}>{'{}'}</div>
        <div className="ai-sq sq sq-cyan sq-md"   style={{ bottom: 60, right: '6%' }}>{'<>'}</div>
        <div className="ai-sq sq sq-purple sq-sm" style={{ top: 80, right: '15%' }} />
        <div className="ai-sq sq sq-teal sq-sm"   style={{ bottom: 100, left: '20%' }} />
        <div className="ai-inner">
          <p className="kicker">AI that knows its role</p>
          <h2 className="sec-h" style={{ color: '#fff' }}>Grounded in your content.<br />Controlled by design.</h2>
          <p className="sec-p" style={{ color: 'rgba(255,255,255,.4)', marginBottom: 56 }}>
            Not a chatbot pointed at the internet. Agents embedded directly in the learning
            environment, with access only to your materials and your students&apos; actual
            performance data — nothing else.
          </p>
          <div className="ai-grid">
            <div className="ai-card">
              <div className="ai-card-ico aic-teal">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--teal)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="10" cy="10" r="8" />
                  <path d="M7 10h6M10 7v6" />
                </svg>
              </div>
              <h3>Socratic by design</h3>
              <p>The AI never gives the answer. It asks one guiding question per intervention, drawn from the relevant section of your source material. After three hints, the teacher is notified — not more AI.</p>
            </div>
            <div className="ai-card">
              <div className="ai-card-ico aic-blue">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#6B96EE" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 16l4-4 3.5 3.5 4.5-7" />
                  <circle cx="4" cy="16" r="1.5" />
                </svg>
              </div>
              <h3>Traceable generation</h3>
              <p>Every lesson explanation, assessment question, and study guide links back to a specific page and block in your uploaded documents. You can always see where the content came from.</p>
            </div>
            <div className="ai-card">
              <div className="ai-card-ico aic-purple">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#A78BFA" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 3C6 3 3 6 3 10s3 7 7 7 7-3 7-7-3-7-7-7z" />
                  <path d="M10 8v2.5l2 2" />
                </svg>
              </div>
              <h3>Standards-aware updates</h3>
              <p>When rubrics are revised or state criteria change, the system identifies which lessons and assessments are affected and drafts revisions for teacher review — it never updates content autonomously.</p>
            </div>
          </div>
          <div className="ai-quote">
            &ldquo;The teacher stays in control at every step. AI handles the structural work. Teachers handle what matters.&rdquo;
          </div>
        </div>
      </div>

      {/* FOR WHO */}
      <div className="for-section">
        <div className="for-inner">
          <p className="kicker">Who Luminent is for</p>
          <h2 className="sec-h">Built for both sides<br />of the classroom</h2>
          <p className="sec-p">
            Whether you teach AP Biology or Introduction to JavaScript, run a semester course
            or a summer program — if you have materials, Luminent can build a classroom from them.
          </p>
          <div className="for-grid">
            <div className="for-card">
              <p className="for-tag">For instructors</p>
              <h3>Your materials. A structured classroom. Full control.</h3>
              <p>
                Upload what you already have. Luminent reads it, structures it, and builds a full
                curriculum grounded in your content. Every lesson is yours — generated from your
                textbook, not someone else&apos;s. Watch students in real time and get flagged when
                someone falls behind before they know it themselves.
              </p>
              <div className="for-list">
                {instructorList.map(item => (
                  <div className="for-item" key={item}>
                    <div className="for-dot" />
                    {item}
                  </div>
                ))}
              </div>
              <a href="/auth/login?role=instructor" className="for-cta">Build your classroom &#x2192;</a>
            </div>
            <div className="for-card">
              <p className="for-tag">For students</p>
              <h3>Learn by doing. Track exactly how far you have come.</h3>
              <p>
                No lectures to sit through. No generic content pulled from the internet.
                Everything you learn is built from what your teacher actually assigned —
                structured into exercises that require real thinking. When you&apos;re stuck,
                a Socratic agent asks the right question. Your growth is visible, yours, and it follows you.
              </p>
              <div className="for-list">
                {studentList.map(item => (
                  <div className="for-item" key={item}>
                    <div className="for-dot" />
                    {item}
                  </div>
                ))}
              </div>
              <a href="/auth/login?role=student" className="for-cta">Join a classroom &#x2192;</a>
            </div>
          </div>
        </div>
      </div>

      {/* FINAL CTA */}
      <div className="final-cta">
        <div className="fc-sq sq sq-teal sq-lg"    style={{ top: 40, left: '4%' }}>{'</>'}</div>
        <div className="fc-sq sq sq-cyan sq-md"    style={{ top: 60, right: '7%' }}>{'{}'}</div>
        <div className="fc-sq sq sq-purple sq-sm"  style={{ bottom: 80, left: '14%' }} />
        <div className="fc-sq sq sq-teal-dk sq-sm" style={{ bottom: 90, right: '18%' }} />
        <div className="fc-inner">
          <p className="kicker" style={{ color: 'rgba(255,255,255,.3)', marginBottom: 24 }}>Get started today</p>
          <div className="fc-title">Your materials.<br /><em>A living classroom.</em></div>
          <p className="fc-sub">
            Any subject. Any content format. Upload what you have — Luminent handles the rest.
            Students need nothing installed. Learning grounded in your materials starts on day one.
          </p>
          <div className="fc-btns">
            <a href="/auth/login?role=instructor" className="fc-p">I am an instructor</a>
            <a href="/auth/login?role=student" className="fc-s">Join as a student</a>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="lfoot">
        <span className="lfoot-logo">
          <img src="/brand/luminent-logo-mark-only.svg" alt="" className="lfoot-logo-mark" />
          luminent
        </span>
        <span className="lfoot-r">2025 Luminent. Built under Curio Lab.</span>
      </footer>

    </div>
  )
}

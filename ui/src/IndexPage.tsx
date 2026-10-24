import { useState, useEffect } from 'react';
import type { CampusConfig, SessionUser } from './types';
import { useLanguage, LanguageToggle } from './i18n';

interface IndexPageProps {
  campusConfig: CampusConfig | null;
  user: SessionUser | null;
  onNavigateToLogin: (mode?: 'signin' | 'signup') => void;
  onEnterOverview?: () => void;
}

function Symbol({ name, filled = false }: { name: string; filled?: boolean }) {
  return (
    <span className="material-symbols-rounded symbol" data-filled={filled} aria-hidden="true">
      {name}
    </span>
  );
}

export default function IndexPage({
  campusConfig,
  user,
  onNavigateToLogin,
  onEnterOverview,
}: IndexPageProps) {
  const { lang, t } = useLanguage();
  const [activeFeatureTab, setActiveFeatureTab] = useState<'multimodal' | 'twin3d' | 'biometric' | 'operations'>('multimodal');
  const [activeRoleTab, setActiveRoleTab] = useState<'student' | 'technician' | 'admin'>('student');
  const [activeSimStep, setActiveSimStep] = useState<number>(0);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [scrolled, setScrolled] = useState(false);

  const campusCode = campusConfig?.code || 'CAMPUS-2026';
  const campusName = campusConfig?.name || 'Central University';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-advance the interactive simulation if user hasn't clicked
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSimStep((prev) => (prev + 1) % 4);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  const simulationSteps = lang === 'hi' ? [
    {
      title: '1. मल्टीमॉडल इनटेक',
      icon: 'photo_camera',
      badge: 'मल्टीमॉडल जेमिनी एआई',
      desc: 'छात्र साइंस हॉल 302 में टूटे पाइप की फोटो खींचते हैं या वॉयस से विवरण देते हैं।',
      detail: 'विज़ुअल एआई 94% खतरे की गंभीरता और पानी के दबाव का पता लगाकर तत्काल शटऑफ की सिफारिश करता है।',
      tag: 'वॉयस और कंप्यूटर विज़न',
    },
    {
      title: '2. ऑटोनॉमस स्पष्टीकरण',
      icon: 'psychology',
      badge: 'सक्रिय स्पष्टीकरण',
      desc: 'संवादात्मक एजेंट पूछता है: "क्या पानी कमरा 302 के सर्वर रैक की तरफ फैल रहा है?"',
      detail: 'छात्र 1-टैप में पुष्टि करते हैं। टिकट में सटीक उप-कक्ष निर्देशांक जोड़ दिए जाते हैं।',
      tag: 'शून्य अस्पष्ट शिकायतें',
    },
    {
      title: '3. डुप्लिकेट व एसएलए छंटनी',
      icon: 'account_tree',
      badge: 'सिमेंटिक क्लस्टरिंग',
      desc: 'प्रणाली 12 सक्रिय टिकटों की तुलना करती है, 8 मीटर दूर से 1 संबंधित रिपोर्ट का पता लगाती है और क्लस्टर करती है।',
      detail: '2 घंटे का एसएलए काउंटडाउन शुरू। प्लंबिंग रैपिड रिस्पांस क्रू को ऑटो-डिस्पैच अलर्ट।',
      tag: 'डुप्लिकेट उन्मूलन',
    },
    {
      title: '4. 3D प्रेषण व समाधान प्रमाण',
      icon: 'view_in_ar',
      badge: '3D स्थानिक ट्विन',
      desc: 'तकनीशियन को 3D ट्विन पर सब-मीटर नेविगेशन मिलता है, वॉल्व ठीक करके कार्य पूर्णता की फोटो अपलोड करते हैं।',
      detail: 'छात्र को फोटो प्रमाण के साथ तुरंत पुश सूचना मिलती है और 5-स्टार रेटिंग देते हैं।',
      tag: 'सत्यापित समाधान',
    },
  ] : [
    {
      title: '1. Multimodal Intake',
      icon: 'photo_camera',
      badge: 'Multimodal Gemini AI',
      desc: 'Student snaps a photo of a burst copper pipe in Science Hall 302 or dictates via voice.',
      detail: 'Visual AI detects 94% hazard severity, high pressure water release, and recommends immediate shutoff.',
      tag: 'Voice & Computer Vision',
    },
    {
      title: '2. Autonomous Clarification',
      icon: 'psychology',
      badge: 'Active Clarifier',
      desc: 'Conversational agent asks: "Is the water spreading toward the floor server rack in room 302?"',
      detail: 'Student confirms with 1 tap. Ticket parameters are enriched with exact sub-room coordinates.',
      tag: 'Zero Vague Tickets',
    },
    {
      title: '3. Duplicate & SLA Triage',
      icon: 'account_tree',
      badge: 'Semantic Clustering',
      desc: 'System compares against 12 active tickets, detects 1 related report 8 meters away, and clusters them.',
      detail: 'SLA countdown locks in at 2 hours. Automated dispatch alerts the Plumbing Rapid Response crew.',
      tag: 'Duplicate Elimination',
    },
    {
      title: '4. 3D Dispatch & Proof of Fix',
      icon: 'view_in_ar',
      badge: '3D Spatial Twin',
      desc: 'Technician receives sub-meter navigation coordinates on the 3D twin, isolates the valve, and logs fix photos.',
      detail: 'Student receives instant SMS/app push with photo proof and rates the resolution with 5 stars.',
      tag: 'Verified Resolution',
    },
  ];

  const faqs = lang === 'hi' ? [
    {
      q: 'कैंपसकनेक्ट अस्पष्ट या अधूरी शिकायतों को कैसे समाप्त करता है?',
      a: 'सामान्य वेब फ़ॉर्म या अनौपचारिक समूहों के विपरीत, कैंपसकनेक्ट गूगल जेमिनी मल्टीमॉडल एआई का उपयोग करता है। जब कोई छात्र विवरण या फोटो जमा करता है, तो एआई गायब महत्वपूर्ण संदर्भ (जैसे सटीक मंजिल, कमरा संख्या, या बिजली का खतरा) को पहचानता है और टिकट बनने से पहले ही स्पष्टीकरण प्रश्न पूछता है।',
    },
    {
      q: 'बायोमेट्रिक फेस लॉगिन उपयोगकर्ता की गोपनीयता की सुरक्षा कैसे करता है?',
      a: 'कैंपसकनेक्ट क्लाइंट-साइड फेशियल लैंडमार्क मैचिंग का उपयोग करता है। बायोमेट्रिक फीचर वैक्टर सीधे ब्राउज़र पर उत्पन्न होते हैं। कोई भी कच्चा वीडियो कभी भी किसी बाहरी सर्वर पर अपलोड नहीं होता।',
    },
    {
      q: 'यह प्रणाली रखरखाव कर्मचारियों को डुप्लिकेट शिकायतों से कैसे बचाती है?',
      a: 'जब कई छात्र एक ही समस्या (जैसे छात्रावास में खराब वाटर कूलर या वाई-फाई बंद होना) देखते हैं, तो हमारा सिमेंटिक डुप्लिकेट इंजन विवरण और निर्देशांकों की तुलना करता है और उन्हें एक मुख्य टिकट से जोड़ देता है।',
    },
    {
      q: 'क्या कैंपसकनेक्ट एक से अधिक विश्वविद्यालय परिसरों या कॉलेजों को संभाल सकता है?',
      a: 'हाँ! कैंपसकनेक्ट में एक संस्थागत गेटवे आर्किटेक्चर है। प्रत्येक परिसर समर्पित कैंपस कोड (जैसे CAMPUS-2026, STANFORD, IITB) और पृथक डेटाबेस के साथ सुरक्षित रूप से काम करता है।',
    },
    {
      q: 'यदि कोई छात्र टाइप नहीं करना चाहता या इंटरनेट धीमा है तो क्या होगा?',
      a: 'छात्र 1-टैप वॉयस डिक्टेशन से बोल सकते हैं, कैमरे से फोटो खींचकर विज़न ऑटो-निरीक्षण करा सकते हैं, या कक्षाओं के दरवाजों पर लगे क्यूआर कोड को स्कैन कर सकते हैं।',
    },
  ] : [
    {
      q: 'How does CampusConnect eliminate vague or unhelpful complaint tickets?',
      a: 'Unlike traditional web forms or informal group chats, CampusConnect integrates Google Gemini Multimodal AI. When a student submits a brief description or photo, the AI detects missing crucial context (such as exact floor, room number, or whether an electrical hazard is present) and automatically asks focused clarification questions before the ticket is created.',
    },
    {
      q: 'How does the Biometric Face Login protect user privacy?',
      a: 'CampusConnect uses edge facial landmark matching. Biometric feature vectors are generated and verified on the client browser against cryptographic hashes. Raw video frames are never stored or broadcast to unauthenticated servers, ensuring full GDPR and educational privacy compliance.',
    },
    {
      q: 'How does the system prevent duplicate complaints from flooding maintenance staff?',
      a: 'When multiple students notice the same issue (e.g., a broken water cooler or Wi-Fi outage in a hostel), our Semantic Duplicate Engine compares incoming descriptions, categories, and spatial coordinates. Related reports are automatically linked to a master ticket, updating all reporters simultaneously without dispatching redundant repair teams.',
    },
    {
      q: 'Can CampusConnect handle multiple university campuses or colleges?',
      a: 'Yes! CampusConnect includes an Institutional Gateway Architecture. Campuses operate with dedicated cryptographic Campus Codes (e.g. CAMPUS-2026, STANFORD, MIT), separate building maps, custom departmental routing rules, and isolated role directories.',
    },
    {
      q: 'What happens if a student does not want to type or has poor connectivity?',
      a: 'Students can report issues via 1-tap Voice Dictation, snap photos directly through the camera for Gemini Vision auto-inspection, or scan physical room QR stickers placed at lecture hall doors, which instantly pre-fill location metadata.',
    },
  ];

  return (
    <div className="index-landing">
      {/* Top Banner for Logged-In Users */}
      {user && (
        <aside className="index-session-banner" aria-label="Active session notice">
          <div className="index-session-banner-inner">
            <span className="index-session-info">
              <Symbol name="verified_user" filled />
              {t('logged_in_as')} <strong>{user.name}</strong> ({user.role}) • {campusName}
            </span>
            <button
              type="button"
              className="button primary small"
              onClick={onEnterOverview}
            >
              <span>{t('go_to_overview')}</span>
              <Symbol name="arrow_forward" />
            </button>
          </div>
        </aside>
      )}

      {/* Main Sticky Navbar */}
      <header className={`index-navbar ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="index-nav-container">
          <div className="index-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="index-brand-logo">
              <Symbol name="domain" filled />
            </div>
            <div className="index-brand-text">
              <span className="brand-name">CampusConnect</span>
              <span className="brand-sub">{t('brand_sub')}</span>
            </div>
          </div>

          <nav className="index-nav-links" aria-label="Index page navigation">
            <a href="#features">{t('nav_features')}</a>
            <a href="#pipeline">{t('nav_ai_engine')}</a>
            <a href="#spatial-twin">{t('nav_3d_twin')}</a>
            <a href="#roles">{t('nav_portals')}</a>
            <a href="#faq">{t('nav_faq')}</a>
          </nav>

          <div className="index-nav-actions">
            <LanguageToggle />
            <div className="index-campus-pill" title={`Institutional Gateway: ${campusCode}`}>
              <span className="live-dot" />
              <span className="campus-label">{campusCode}</span>
            </div>

            {user ? (
              <button
                type="button"
                className="button primary index-cta-btn"
                onClick={onEnterOverview}
              >
                <span>{t('overview_tab')}</span>
                <Symbol name="space_dashboard" filled />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="button secondary index-signin-btn"
                  onClick={() => onNavigateToLogin('signin')}
                >
                  <Symbol name="login" />
                  <span>{t('sign_in')}</span>
                </button>
                <button
                  type="button"
                  className="button primary index-signup-btn"
                  onClick={() => onNavigateToLogin('signup')}
                >
                  <Symbol name="person_add" filled />
                  <span>{t('get_started')}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="index-hero">
        <div className="index-hero-glow" aria-hidden="true" />
        <div className="index-hero-container">
          <div className="index-hero-badge-row">
            <span className="index-pill-badge">
              <span className="pulse-beacon" />
              {t('hero_badge')}
            </span>
            <span className="index-campus-badge">
              <Symbol name="school" filled />
              {campusName}
            </span>
          </div>

          <h1 className="index-hero-title">
            {t('hero_title_prefix')} <span className="highlight-text">{t('hero_title_highlight')}</span>
          </h1>

          <p className="index-hero-subtitle">
            {t('hero_subtitle')}
          </p>

          <div className="index-hero-cta-group">
            <button
              type="button"
              className="button primary hero-primary-btn"
              onClick={() => onNavigateToLogin('signin')}
            >
              <Symbol name="rocket_launch" filled />
              <span>{t('launch_campus_portal')}</span>
              <Symbol name="arrow_forward" />
            </button>

            <button
              type="button"
              className="button secondary hero-secondary-btn"
              onClick={() => onNavigateToLogin('signup')}
            >
              <Symbol name="badge" />
              <span>{t('create_student_account')}</span>
            </button>

            <a href="#pipeline" className="hero-text-link">
              <Symbol name="play_circle" />
              <span>{t('see_how_it_works')}</span>
            </a>
          </div>

          {/* Social Proof / Advert Impact Metric Strip */}
          <div className="index-metrics-strip">
            <div className="index-metric-card">
              <div className="metric-icon-box primary-tint">
                <Symbol name="timer" filled />
              </div>
              <div className="metric-data">
                <strong className="metric-number">{t('metric_faster')}</strong>
                <span className="metric-caption">{t('metric_faster_desc')}</span>
              </div>
            </div>

            <div className="index-metric-card">
              <div className="metric-icon-box tertiary-tint">
                <Symbol name="neurology" filled />
              </div>
              <div className="metric-data">
                <strong className="metric-number">{t('metric_accuracy')}</strong>
                <span className="metric-caption">{t('metric_accuracy_desc')}</span>
              </div>
            </div>

            <div className="index-metric-card">
              <div className="metric-icon-box secondary-tint">
                <Symbol name="view_in_ar" filled />
              </div>
              <div className="metric-data">
                <strong className="metric-number">{t('metric_twin')}</strong>
                <span className="metric-caption">{t('metric_twin_desc')}</span>
              </div>
            </div>

            <div className="index-metric-card">
              <div className="metric-icon-box accent-tint">
                <Symbol name="verified" filled />
              </div>
              <div className="metric-data">
                <strong className="metric-number">{t('metric_accountable')}</strong>
                <span className="metric-caption">{t('metric_accountable_desc')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem vs Solution Comparison Section */}
      <section className="index-section comparison-section">
        <div className="section-head-centered">
          <span className="eyebrow">{t('dilemma_eyebrow')}</span>
          <h2>{t('dilemma_title')}</h2>
          <p>{t('dilemma_desc')}</p>
        </div>

        <div className="comparison-grid">
          <div className="comparison-card legacy-card">
            <div className="comparison-card-header">
              <div className="comparison-icon-bad">
                <Symbol name="cancel" filled />
              </div>
              <div>
                <h3>{t('legacy_methods_title')}</h3>
                <span className="comparison-sub">{t('legacy_methods_sub')}</span>
              </div>
            </div>
            <ul className="comparison-list">
              <li>
                <Symbol name="close" />
                <span>{t('legacy_point_1')}</span>
              </li>
              <li>
                <Symbol name="close" />
                <span>{t('legacy_point_2')}</span>
              </li>
              <li>
                <Symbol name="close" />
                <span>{t('legacy_point_3')}</span>
              </li>
              <li>
                <Symbol name="close" />
                <span>{t('legacy_point_4')}</span>
              </li>
              <li>
                <Symbol name="close" />
                <span>{t('legacy_point_5')}</span>
              </li>
            </ul>
          </div>

          <div className="comparison-card modern-card">
            <div className="comparison-card-badge">CampusConnect</div>
            <div className="comparison-card-header">
              <div className="comparison-icon-good">
                <Symbol name="check_circle" filled />
              </div>
              <div>
                <h3>{t('solution_methods_title')}</h3>
                <span className="comparison-sub">{t('solution_methods_sub')}</span>
              </div>
            </div>
            <ul className="comparison-list">
              <li>
                <Symbol name="check" />
                <span>{t('solution_point_1')}</span>
              </li>
              <li>
                <Symbol name="check" />
                <span>{t('solution_point_2')}</span>
              </li>
              <li>
                <Symbol name="check" />
                <span>{t('solution_point_3')}</span>
              </li>
              <li>
                <Symbol name="check" />
                <span>{t('solution_point_4')}</span>
              </li>
              <li>
                <Symbol name="check" />
                <span>{t('solution_point_5')}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Interactive AI Simulation Section */}
      <section id="pipeline" className="index-section pipeline-section">
        <div className="section-head-centered">
          <span className="eyebrow">{t('pipeline_eyebrow')}</span>
          <h2>{t('pipeline_title')}</h2>
          <p>{t('pipeline_desc')}</p>
        </div>

        <div className="pipeline-interactive-box">
          <div className="pipeline-stepper" role="tablist" aria-label="Pipeline workflow steps">
            {simulationSteps.map((step, idx) => (
              <button
                key={step.title}
                type="button"
                className={`pipeline-step-tab ${activeSimStep === idx ? 'is-active' : ''}`}
                onClick={() => setActiveSimStep(idx)}
              >
                <div className="step-tab-icon">
                  <Symbol name={step.icon} filled={activeSimStep === idx} />
                </div>
                <div className="step-tab-meta">
                  <span className="step-tab-num">Stage 0{idx + 1}</span>
                  <strong className="step-tab-title">{step.title.split('. ')[1]}</strong>
                </div>
              </button>
            ))}
          </div>

          <div className="pipeline-display-card">
            <div className="display-card-header">
              <div className="display-badge-group">
                <span className="pipeline-badge">{simulationSteps[activeSimStep].badge}</span>
                <span className="pipeline-tag">{simulationSteps[activeSimStep].tag}</span>
              </div>
              <span className="display-step-counter">Step {activeSimStep + 1} of 4</span>
            </div>

            <div className="display-card-body">
              <div className="display-main-icon">
                <Symbol name={simulationSteps[activeSimStep].icon} filled />
              </div>
              <div className="display-content">
                <h3>{simulationSteps[activeSimStep].desc}</h3>
                <p>{simulationSteps[activeSimStep].detail}</p>
              </div>
            </div>

            <div className="display-card-footer">
              <div className="sim-progress-bar">
                <div
                  className="sim-progress-fill"
                  style={{ width: `${((activeSimStep + 1) / 4) * 100}%` }}
                />
              </div>
              <div className="sim-actions">
                <button
                  type="button"
                  className="button secondary small"
                  onClick={() => setActiveSimStep((prev) => (prev > 0 ? prev - 1 : 3))}
                >
                  <Symbol name="chevron_left" />
                  <span>{t('stage_previous')}</span>
                </button>
                <button
                  type="button"
                  className="button primary small"
                  onClick={() => setActiveSimStep((prev) => (prev + 1) % 4)}
                >
                  <span>{t('stage_next')}</span>
                  <Symbol name="chevron_right" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Deep-Dive Feature Pillars Section */}
      <section id="features" className="index-section features-pillar-section">
        <div className="section-head-centered">
          <span className="eyebrow">{t('pillars_eyebrow')}</span>
          <h2>{t('pillars_title')}</h2>
          <p>{t('pillars_desc')}</p>
        </div>

        {/* Feature Tabs Selector */}
        <div className="features-tabs-nav" role="tablist">
          <button
            type="button"
            className={`feature-tab-btn ${activeFeatureTab === 'multimodal' ? 'active' : ''}`}
            onClick={() => setActiveFeatureTab('multimodal')}
          >
            <Symbol name="neurology" filled />
            <span>{t('pillar_tab_multimodal')}</span>
          </button>
          <button
            type="button"
            className={`feature-tab-btn ${activeFeatureTab === 'twin3d' ? 'active' : ''}`}
            onClick={() => setActiveFeatureTab('twin3d')}
          >
            <Symbol name="view_in_ar" filled />
            <span>{t('pillar_tab_twin3d')}</span>
          </button>
          <button
            type="button"
            className={`feature-tab-btn ${activeFeatureTab === 'biometric' ? 'active' : ''}`}
            onClick={() => setActiveFeatureTab('biometric')}
          >
            <Symbol name="face" filled />
            <span>{t('pillar_tab_biometric')}</span>
          </button>
          <button
            type="button"
            className={`feature-tab-btn ${activeFeatureTab === 'operations' ? 'active' : ''}`}
            onClick={() => setActiveFeatureTab('operations')}
          >
            <Symbol name="monitoring" filled />
            <span>{t('pillar_tab_operations')}</span>
          </button>
        </div>

        {/* Tab 1: Multimodal Gemini AI */}
        {activeFeatureTab === 'multimodal' && (
          <div className="feature-detail-grid">
            <div className="feature-detail-card">
              <div className="feature-icon primary-tone">
                <Symbol name="mic" filled />
              </div>
              <h3>Voice-to-Ticket Multimodal Dictation</h3>
              <p>
                Students simply speak: "The projector in Hall 4 is flickering and making a buzzing noise."
                Audio transcription and semantic parsing extract problem category, affected equipment, and room metadata in real-time.
              </p>
              <div className="feature-chip">Zero Typing Required</div>
            </div>

            <div className="feature-detail-card">
              <div className="feature-icon tertiary-tone">
                <Symbol name="camera" filled />
              </div>
              <h3>Gemini Computer Vision Inspection</h3>
              <p>
                Upload or snap photos of damaged ceilings, exposed wires, broken flush tanks, or pest infestations.
                Gemini Vision analyzes the image, calculates a hazard severity score (0-100%), and tags potential safety risks.
              </p>
              <div className="feature-chip">Instant Visual Triage</div>
            </div>

            <div className="feature-detail-card">
              <div className="feature-icon secondary-tone">
                <Symbol name="forum" filled />
              </div>
              <h3>Active Clarification Dialogue</h3>
              <p>
                Never suffer from vague complaints again. If a report lacks essential details, our AI agent politely asks
                the reporter clarifying questions before ticket creation, ensuring technicians receive actionable instructions.
              </p>
              <div className="feature-chip">Pre-Flight Clarification</div>
            </div>

            <div className="feature-detail-card">
              <div className="feature-icon accent-tone">
                <Symbol name="dynamic_form" filled />
              </div>
              <h3>Semantic Duplicate Clustering</h3>
              <p>
                Vector embeddings compare new complaints against active campus tickets. Potential duplicates are clustered
                with explainable confidence scores, preventing double technician dispatch and redundant work.
              </p>
              <div className="feature-chip">Saves Technician Hours</div>
            </div>
          </div>
        )}

        {/* Tab 2: 3D Twin & QR Codes */}
        {activeFeatureTab === 'twin3d' && (
          <div className="feature-detail-grid">
            <div className="feature-detail-card">
              <div className="feature-icon primary-tone">
                <Symbol name="view_in_ar" filled />
              </div>
              <h3>Interactive WebGL 3D Campus Twin</h3>
              <p>
                A high-fidelity spatial representation of university grounds, academic blocks, engineering labs, and hostels.
                Live incident pins illuminate in real time based on active ticket severity and department.
              </p>
              <div className="feature-chip">Three.js Spatial Engine</div>
            </div>

            <div className="feature-detail-card">
              <div className="feature-icon secondary-tone">
                <Symbol name="qr_code_scanner" filled />
              </div>
              <h3>Physical Door & Room QR Anchors</h3>
              <p>
                Permanent QR plaques at lecture rooms, restrooms, and labs allow students to scan with their smartphone camera,
                instantly launching CampusConnect with pre-populated building, wing, and room identifiers.
              </p>
              <div className="feature-chip">1-Tap Location Lock</div>
            </div>

            <div className="feature-detail-card">
              <div className="feature-icon tertiary-tone">
                <Symbol name="explore" filled />
              </div>
              <h3>Technician Floor-Level Navigation</h3>
              <p>
                Maintenance crews do not waste time searching vast campus corridors. The 3D twin guides them directly
                to the exact floor and fixture location with sub-meter spatial precision.
              </p>
              <div className="feature-chip">Rapid Dispatch</div>
            </div>

            <div className="feature-detail-card">
              <div className="feature-icon accent-tone">
                <Symbol name="tune" filled />
              </div>
              <h3>Campus Architect Studio</h3>
              <p>
                Campus administrators can add new buildings, customize floor plans, assign facilities zones, and update
                department boundaries directly through the visual architect interface.
              </p>
              <div className="feature-chip">Dynamic Campus Layout</div>
            </div>
          </div>
        )}

        {/* Tab 3: Biometric Zero-Trust IAM */}
        {activeFeatureTab === 'biometric' && (
          <div className="feature-detail-grid">
            <div className="feature-detail-card">
              <div className="feature-icon primary-tone">
                <Symbol name="face" filled />
              </div>
              <h3>Instant Facial Landmark Recognition</h3>
              <p>
                Students and staff sign in within 1 second using webcam facial recognition. No passwords to forget,
                no credential theft, and frictionless access between mobile phones and campus kiosks.
              </p>
              <div className="feature-chip">1-Second Sign-In</div>
            </div>

            <div className="feature-detail-card">
              <div className="feature-icon tertiary-tone">
                <Symbol name="shield" filled />
              </div>
              <h3>Privacy-First Edge Vectoring</h3>
              <p>
                Facial landmark vectors are computed and hashed client-side. Raw image feeds never leave the user's
                browser or get stored on public servers, ensuring strict student privacy protections.
              </p>
              <div className="feature-chip">FERPA & GDPR Compliant</div>
            </div>

            <div className="feature-detail-card">
              <div className="feature-icon secondary-tone">
                <Symbol name="corporate_fare" filled />
              </div>
              <h3>Multi-Campus Code Isolation</h3>
              <p>
                Institutions are isolated using distinct cryptographic Campus Codes (e.g. CAMPUS-2026, STANFORD).
                Data, staff directories, and tickets are strictly segmented by campus tenant.
              </p>
              <div className="feature-chip">Multi-Tenant Gateway</div>
            </div>

            <div className="feature-detail-card">
              <div className="feature-icon accent-tone">
                <Symbol name="key" filled />
              </div>
              <h3>Zero-Trust Role-Based Access</h3>
              <p>
                Students, maintenance technicians, and campus deans receive cryptographically signed session tokens
                with strict role enforcement on all API routes and data mutations.
              </p>
              <div className="feature-chip">Enterprise Security</div>
            </div>
          </div>
        )}

        {/* Tab 4: Operations Pulse & SLA */}
        {activeFeatureTab === 'operations' && (
          <div className="feature-detail-grid">
            <div className="feature-detail-card">
              <div className="feature-icon primary-tone">
                <Symbol name="pulse_alert" filled />
              </div>
              <h3>Live Operations Pulse</h3>
              <p>
                Real-time dashboard summarizing active ticket loads, departmental capacity, pending SLA breaches,
                and high-severity emergencies across plumbing, electricity, and network infrastructure.
              </p>
              <div className="feature-chip">Executive Overview</div>
            </div>

            <div className="feature-detail-card">
              <div className="feature-icon secondary-tone">
                <Symbol name="alarm" filled />
              </div>
              <h3>Dynamic SLA Urgency Matrix</h3>
              <p>
                Tickets receive automated priority and deadline targets (e.g. 2 hours for electrical hazards, 24 hours for minor cleanliness).
                Timers tick visibly, alerting supervisors before SLA breach occurs.
              </p>
              <div className="feature-chip">Zero Missed Deadlines</div>
            </div>

            <div className="feature-detail-card">
              <div className="feature-icon tertiary-tone">
                <Symbol name="picture_as_pdf" filled />
              </div>
              <h3>One-Click Executive PDF & CSV Reports</h3>
              <p>
                Generate comprehensive audit documentation for university board meetings, maintenance budget reviews,
                and regulatory inspections at the touch of a button.
              </p>
              <div className="feature-chip">Audit-Ready Export</div>
            </div>

            <div className="feature-detail-card">
              <div className="feature-icon accent-tone">
                <Symbol name="star" filled />
              </div>
              <h3>Closed-Loop Feedback & CSAT Scoring</h3>
              <p>
                Upon ticket resolution, students grade the fix (Exceptional, Good, Average, Poor) with satisfaction tags.
                Performance metrics incentivize technician speed, courtesy, and quality.
              </p>
              <div className="feature-chip">Continuous Accountability</div>
            </div>
          </div>
        )}
      </section>

      {/* Stakeholder Portals Section */}
      <section id="roles" className="index-section roles-showcase-section">
        <div className="section-head-centered">
          <span className="eyebrow">{t('roles_eyebrow')}</span>
          <h2>{t('roles_title')}</h2>
          <p>{t('roles_desc')}</p>
        </div>

        <div className="roles-tabs-container">
          <div className="roles-switcher" role="tablist">
            <button
              type="button"
              className={`role-switch-btn ${activeRoleTab === 'student' ? 'active' : ''}`}
              onClick={() => setActiveRoleTab('student')}
            >
              <Symbol name="school" filled />
              <span>{t('role_student_portal')}</span>
            </button>
            <button
              type="button"
              className={`role-switch-btn ${activeRoleTab === 'technician' ? 'active' : ''}`}
              onClick={() => setActiveRoleTab('technician')}
            >
              <Symbol name="engineering" filled />
              <span>{t('role_technician_hub')}</span>
            </button>
            <button
              type="button"
              className={`role-switch-btn ${activeRoleTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveRoleTab('admin')}
            >
              <Symbol name="admin_panel_settings" filled />
              <span>{t('role_dean_cockpit')}</span>
            </button>
          </div>

          <div className="role-portal-preview-card">
            {activeRoleTab === 'student' && (
              <div className="role-preview-content">
                <div className="role-preview-left">
                  <div className="role-badge">Student Experience</div>
                  <h3>Frictionless Intake, 100% Transparency</h3>
                  <p>
                    Students never wonder whether their complaint was read. From smart voice dictation and camera photo analysis
                    to real-time push notifications when a technician arrives, the student is kept informed at every step.
                  </p>
                  <ul className="role-features-list">
                    <li><Symbol name="check" /> Instant photo auto-triage with Gemini Vision</li>
                    <li><Symbol name="check" /> Live chronological status timeline with timestamps</li>
                    <li><Symbol name="check" /> Interactive 3D campus map locator</li>
                    <li><Symbol name="check" /> Rate resolution quality and provide feedback</li>
                  </ul>
                  <button
                    type="button"
                    className="button primary small"
                    onClick={() => onNavigateToLogin('signup')}
                  >
                    <span>Create Student Account</span>
                    <Symbol name="arrow_forward" />
                  </button>
                </div>
                <div className="role-preview-right">
                  <div className="portal-mockup-frame">
                    <div className="mockup-header">
                      <span className="mockup-dot red" />
                      <span className="mockup-dot yellow" />
                      <span className="mockup-dot green" />
                      <span className="mockup-title">Student Portal Overview</span>
                    </div>
                    <div className="mockup-body">
                      <div className="mockup-ticket-card">
                        <div className="mockup-ticket-badge">Active Ticket #CC-9021</div>
                        <h4>Water Leakage in Hostel 4 Washroom</h4>
                        <div className="mockup-status-row">
                          <span className="m3-badge status-live">In Progress</span>
                          <span className="mockup-time">Assigned to Rapid Plumbing</span>
                        </div>
                        <div className="mockup-stepper">
                          <span className="step-point done">Submitted</span>
                          <span className="step-line active" />
                          <span className="step-point done">Triaged</span>
                          <span className="step-line active" />
                          <span className="step-point current">Dispatched</span>
                          <span className="step-line" />
                          <span className="step-point">Resolved</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeRoleTab === 'technician' && (
              <div className="role-preview-content">
                <div className="role-preview-left">
                  <div className="role-badge">Staff & Technician Experience</div>
                  <h3>Prioritized Work Order Execution Queue</h3>
                  <p>
                    Campus technicians and supervisors receive clear, AI-enriched work orders sorted by urgency and SLA deadlines.
                    No vague notes, no lost paperwork, and built-in duplicate clustering.
                  </p>
                  <ul className="role-features-list">
                    <li><Symbol name="check" /> Prioritized work queue with live SLA breach warnings</li>
                    <li><Symbol name="check" /> Semantic duplicate review workbench</li>
                    <li><Symbol name="check" /> 1-Click AI Auto-Write for professional resolution notes</li>
                    <li><Symbol name="check" /> Sub-meter 3D coordinates guiding technician to fixture</li>
                  </ul>
                  <button
                    type="button"
                    className="button primary small"
                    onClick={() => onNavigateToLogin('signin')}
                  >
                    <span>Staff Sign In</span>
                    <Symbol name="arrow_forward" />
                  </button>
                </div>
                <div className="role-preview-right">
                  <div className="portal-mockup-frame">
                    <div className="mockup-header">
                      <span className="mockup-dot red" />
                      <span className="mockup-dot yellow" />
                      <span className="mockup-dot green" />
                      <span className="mockup-title">Technician Dispatch Work Queue</span>
                    </div>
                    <div className="mockup-body">
                      <div className="mockup-queue-row urgent">
                        <div className="queue-priority">Urgent • 1h 45m left</div>
                        <strong>Substation Circuit Breaker Tripped - Science Block</strong>
                        <span className="queue-meta">Assigned: Electrical Crew A</span>
                      </div>
                      <div className="mockup-queue-row">
                        <div className="queue-priority medium">Medium • 14h left</div>
                        <strong>Broken AC Remote Sensor - Lecture Hall 2</strong>
                        <span className="queue-meta">Assigned: HVAC Services</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeRoleTab === 'admin' && (
              <div className="role-preview-content">
                <div className="role-preview-left">
                  <div className="role-badge">Dean & Executive Oversight</div>
                  <h3>Campus Intelligence & Operational Command</h3>
                  <p>
                    University leadership gains comprehensive insight into facility health, recurring vendor bottlenecks,
                    budget allocation, and department responsiveness with live analytics.
                  </p>
                  <ul className="role-features-list">
                    <li><Symbol name="check" /> Real-time Operations Pulse & incident frequency heatmaps</li>
                    <li><Symbol name="check" /> Dynamic routing rules configuration for campus departments</li>
                    <li><Symbol name="check" /> Instant PDF executive summaries for administrative meetings</li>
                    <li><Symbol name="check" /> Multi-campus code generation and facility twin builder</li>
                  </ul>
                  <button
                    type="button"
                    className="button primary small"
                    onClick={() => onNavigateToLogin('signin')}
                  >
                    <span>Admin Gateway</span>
                    <Symbol name="arrow_forward" />
                  </button>
                </div>
                <div className="role-preview-right">
                  <div className="portal-mockup-frame">
                    <div className="mockup-header">
                      <span className="mockup-dot red" />
                      <span className="mockup-dot yellow" />
                      <span className="mockup-dot green" />
                      <span className="mockup-title">Executive Operations Analytics</span>
                    </div>
                    <div className="mockup-body">
                      <div className="mockup-analytics-grid">
                        <div className="analytics-mini-card">
                          <span>SLA Compliance</span>
                          <strong>98.2%</strong>
                        </div>
                        <div className="analytics-mini-card">
                          <span>MTTR Speed</span>
                          <strong>3.4 hrs</strong>
                        </div>
                        <div className="analytics-mini-card">
                          <span>Student CSAT</span>
                          <strong>4.9 / 5.0</strong>
                        </div>
                      </div>
                      <div className="analytics-bar-chart-mock">
                        <div className="chart-bar" style={{ height: '80%' }} title="Plumbing: 80%" />
                        <div className="chart-bar" style={{ height: '55%' }} title="Electrical: 55%" />
                        <div className="chart-bar" style={{ height: '95%' }} title="Cleanliness: 95%" />
                        <div className="chart-bar" style={{ height: '40%' }} title="Network: 40%" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="index-section faq-section">
        <div className="section-head-centered">
          <span className="eyebrow">{t('faq_eyebrow')}</span>
          <h2>{t('faq_title')}</h2>
          <p>{t('faq_desc')}</p>
        </div>

        <div className="faq-accordion-list">
          {faqs.map((faq, index) => {
            const isOpen = expandedFaq === index;
            return (
              <div
                key={faq.q}
                className={`faq-item ${isOpen ? 'is-open' : ''}`}
                onClick={() => setExpandedFaq(isOpen ? null : index)}
              >
                <button
                  type="button"
                  className="faq-question-btn"
                  aria-expanded={isOpen}
                >
                  <span className="faq-question-text">{faq.q}</span>
                  <Symbol name={isOpen ? 'remove' : 'add'} />
                </button>
                {isOpen && (
                  <div className="faq-answer-pane">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* High-Conversion Footer CTA Banner */}
      <section className="index-cta-banner">
        <div className="cta-banner-content">
          <div className="cta-badge">{t('cta_banner_badge')}</div>
          <h2>{t('cta_banner_title')}</h2>
          <p>{t('cta_banner_desc')}</p>

          <div className="cta-button-row">
            <button
              type="button"
              className="button primary large cta-pulse-btn"
              onClick={() => onNavigateToLogin('signin')}
            >
              <Symbol name="login" filled />
              <span>{t('enter_campus_portal')}</span>
              <Symbol name="arrow_forward" />
            </button>

            <button
              type="button"
              className="button secondary large"
              onClick={() => onNavigateToLogin('signup')}
            >
              <Symbol name="person_add" />
              <span>{t('create_account')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="index-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-brand-logo">
              <Symbol name="domain" filled />
            </div>
            <div>
              <strong className="footer-title">CampusConnect</strong>
              <p className="footer-tagline">{t('hero_title_prefix')} {t('hero_title_highlight')}</p>
            </div>
          </div>

          <div className="footer-links-group">
            <div className="footer-col">
              <h4>{t('nav_portals')}</h4>
              <a href="#pipeline">{t('nav_ai_engine')}</a>
              <a href="#features">{t('nav_features')}</a>
              <a href="#roles">{t('nav_portals')}</a>
              <a href="#faq">{t('nav_faq')}</a>
            </div>
            <div className="footer-col">
              <h4>Security & IAM</h4>
              <button type="button" className="footer-link-btn" onClick={() => onNavigateToLogin('signin')}>
                {t('biometric_gateway_title')}
              </button>
              <button type="button" className="footer-link-btn" onClick={() => onNavigateToLogin('signup')}>
                {t('create_student_account')}
              </button>
              <span className="footer-static-link">Zero-Trust RBAC</span>
            </div>
            <div className="footer-col">
              <h4>Language / भाषा</h4>
              <LanguageToggle className="pill-light" />
              <span className="footer-static-link">Code: {campusCode}</span>
              <span className="footer-static-link">Campus: {campusName}</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} CampusConnect. All rights reserved. Built with Google Gemini AI & Three.js.</p>
          <button
            type="button"
            className="back-to-top-btn"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <span>{t('back_to_top')}</span>
            <Symbol name="arrow_upward" />
          </button>
        </div>
      </footer>
    </div>
  );
}

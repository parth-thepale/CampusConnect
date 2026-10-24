import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Language = 'en' | 'hi';

export interface Translations {
  [key: string]: {
    en: string;
    hi: string;
  };
}

export const translations: Translations = {
  // Global brand & navigation
  brand_name: { en: 'CampusConnect', hi: 'कैंपसकनेक्ट' },
  brand_sub: { en: 'Autonomous Facilities Platform', hi: 'स्वायत्त सुविधाएं प्लेटफॉर्म' },
  nav_features: { en: 'Features', hi: 'विशेषताएं' },
  nav_ai_engine: { en: 'AI Engine', hi: 'एआई इंजन' },
  nav_pipeline: { en: 'AI Engine', hi: 'एआई इंजन' },
  nav_3d_twin: { en: '3D Twin', hi: '3D ट्विन' },
  nav_portals: { en: 'Portals', hi: 'पोर्टल' },
  nav_faq: { en: 'FAQ', hi: 'प्रश्नोत्तरी' },
  overview: { en: 'Overview', hi: 'अवलोकन' },
  report_an_issue: { en: 'Report an issue', hi: 'समस्या दर्ज करें' },
  my_tickets: { en: 'My tickets', hi: 'मेरी शिकायतें' },
  campus_tech_locator: { en: 'Campus tech locator', hi: 'कैंपस लोकेटर' },
  virtual_campus_3d: { en: 'Virtual campus 3D', hi: 'वर्चुअल कैंपस 3D' },
  work_queue: { en: 'Work queue', hi: 'कार्य सूची' },
  problem_analytics: { en: 'Problem Analytics', hi: 'समस्या विश्लेषण' },
  ai_intelligence: { en: 'AI intelligence', hi: 'एआई इंटेलिजेंस' },
  routing_rules: { en: 'Routing rules', hi: 'रूटिंग नियम' },
  presentation_mode: { en: 'Presentation mode', hi: 'प्रस्तुति मोड' },
  product_showcase: { en: 'Product Showcase', hi: 'उत्पाद विवरण' },
  sign_in: { en: 'Sign In', hi: 'साइन इन' },
  sign_out: { en: 'Sign out', hi: 'लॉग आउट' },
  get_started: { en: 'Get Started', hi: 'शुरू करें' },
  create_account: { en: 'Create Account', hi: 'खाता बनाएं' },
  create_student_account: { en: 'Create Student Account', hi: 'छात्र खाता बनाएं' },
  local_sqlite_workspace: { en: 'Local SQLite workspace', hi: 'स्थानीय डेटाबेस' },
  campus_id_pass: { en: 'Campus ID Pass', hi: 'कैंपस आईडी पास' },
  design_campus: { en: 'Design Campus', hi: 'कैंपस डिज़ाइन' },
  student_workspace: { en: 'Student workspace', hi: 'छात्र कार्यक्षेत्र' },
  admin_workspace: { en: 'Administrator workspace', hi: 'प्रशासक कार्यक्षेत्र' },
  facilities_workspace: { en: 'Facilities workspace', hi: 'सुविधाएं कार्यक्षेत्र' },
  context_campus: { en: 'Biometric Auth · Multimodal AI · Live Analytics', hi: 'बायोमेट्रिक प्रमाणीकरण · मल्टीमॉडल एआई · लाइव विश्लेषण' },
  opening_campusconnect: { en: 'Opening CampusConnect…', hi: 'कैंपसकनेक्ट खुल रहा है…' },
  logged_in_as: { en: 'Logged in as', hi: 'लॉग इन हैं:' },
  go_to_overview: { en: 'Go to Overview Tab', hi: 'अवलोकन टैब पर जाएं' },
  overview_tab: { en: 'Overview Tab', hi: 'अवलोकन टैब' },

  // Categories
  category_plumbing: { en: 'Plumbing', hi: 'नलसाजी / प्लंबिंग' },
  category_electricity: { en: 'Electricity', hi: 'बिजली / विद्युत' },
  category_cleanliness: { en: 'Cleanliness', hi: 'सफ़ाई एवं स्वच्छता' },
  category_internet: { en: 'Internet', hi: 'इंटरनेट / नेटवर्क' },

  // Statuses
  status_submitted: { en: 'Submitted', hi: 'सबमिट किया गया' },
  status_needs_information: { en: 'Needs information', hi: 'अधिक जानकारी चाहिए' },
  status_assigned: { en: 'Assigned', hi: 'सौंपा गया' },
  status_in_progress: { en: 'In progress', hi: 'प्रगति में' },
  status_resolved: { en: 'Resolved', hi: 'समाधान संपन्न' },
  status_reopened: { en: 'Reopened', hi: 'पुनः खोला गया' },

  // Index Page - Hero
  hero_badge: { en: 'Next-Gen Autonomous AI Facilities Platform • 2026 Edition', hi: 'नेक्स्ट-जेन ऑटोनॉमस एआई सुविधाएं प्लेटफॉर्म • 2026 संस्करण' },
  hero_title_prefix: { en: 'From Campus Complaints to', hi: 'कैंपस की समस्याओं से' },
  hero_title_highlight: { en: 'Accountable Action.', hi: 'जवाबदेह समाधान तक।' },
  hero_subtitle: {
    en: 'The next-generation facilities intelligence ecosystem connecting students, technicians, and university deans. Featuring Multimodal Gemini AI for voice & vision triage, 3D Spatial Digital Twins for instant technician dispatch, and Zero-Trust Biometric Gateways for seamless campus security.',
    hi: 'छात्रों, तकनीशियनों और विश्वविद्यालय डीन को जोड़ने वाला अगली पीढ़ी का सुविधाएं इंटेलिजेंस इकोसिस्टम। वॉयस और विज़न निदान के लिए मल्टीमॉडल जेमिनी एआई, त्वरित तकनीशियन प्रेषण के लिए 3D स्थानिक डिजिटल ट्विन, और सुगम सुरक्षा के लिए जीरो-ट्रस्ट बायोमेट्रिक गेटवे।',
  },
  launch_campus_portal: { en: 'Launch Campus Portal', hi: 'कैंपस पोर्टल शुरू करें' },
  see_how_it_works: { en: 'See How It Works', hi: 'जानें यह कैसे काम करता है' },

  // Index Page - Metrics Strip
  metric_faster: { en: '85% Faster', hi: '85% तेज़' },
  metric_faster_desc: { en: 'Resolution Turnaround (MTTR)', hi: 'समाधान का समय (MTTR)' },
  metric_accuracy: { en: '99.4% Accuracy', hi: '99.4% सटीकता' },
  metric_accuracy_desc: { en: 'Multimodal Category & SLA Triage', hi: 'मल्टीमॉडल श्रेणी और एसएलए निदान' },
  metric_twin: { en: '3D Digital Twin', hi: '3D डिजिटल ट्विन' },
  metric_twin_desc: { en: 'Sub-meter Building Spatial Map', hi: 'सटीक भवन स्थानिक मानचित्र' },
  metric_accountable: { en: '100% Accountable', hi: '100% जवाबदेह' },
  metric_accountable_desc: { en: 'End-to-End Audit Trail', hi: 'शुरू से अंत तक ऑडिट ट्रेल' },

  // Index Page - Problem vs Solution
  dilemma_eyebrow: { en: 'The Campus Dilemma', hi: 'कैंपस की दुविधा' },
  dilemma_title: { en: 'Why Traditional Maintenance Reporting Fails Modern Universities', hi: 'पारंपरिक रखरखाव रिपोर्टिंग आधुनिक विश्वविद्यालयों में क्यों विफल रहती है' },
  dilemma_desc: {
    en: 'Informal WhatsApp messages, verbal complaints, and clunky email chains leave students frustrated and maintenance departments overwhelmed with duplicate, untracked requests.',
    hi: 'अनौपचारिक व्हाट्सएप संदेश, मौखिक शिकायतें और बिखरी हुई ईमेल छात्रों को निराश करती हैं और रखरखाव विभागों पर बिना ट्रैक किए गए डुप्लिकेट अनुरोधों का बोझ डालती हैं।',
  },
  legacy_methods_title: { en: 'Traditional Legacy Methods', hi: 'पारंपरिक पुरानी विधियां' },
  legacy_methods_sub: { en: 'Informal, Disorganized, Black-Box', hi: 'अनौपचारिक, अव्यवस्थित, पारदर्शी नहीं' },
  legacy_point_1: { en: 'Unstructured Reports: "Water leaking somewhere" with zero location or severity details.', hi: 'अस्पष्ट रिपोर्ट: "कहीं पानी टपक रहा है" बिना सटीक स्थान या गंभीरता विवरण के।' },
  legacy_point_2: { en: 'Duplicate Ticket Chaos: 30 students reporting the same classroom air conditioner overload staff.', hi: 'डुप्लिकेट शिकायतों की अराजकता: 30 छात्र एक ही एसी की शिकायत कर स्टाफ को व्यस्त कर देते हैं।' },
  legacy_point_3: { en: 'Zero Student Visibility: Complaints vanish into an administrative black hole with no status updates.', hi: 'शून्य पारदर्शिता: शिकायतें बिना किसी अपडेट के प्रशासनिक अंधेरे में गायब हो जाती हैं।' },
  legacy_point_4: { en: 'Manual Routing Bottlenecks: Staff spend hours sorting emails to identify which technician is on duty.', hi: 'धीमी मैन्युअल प्रक्रिया: सही तकनीशियन खोजने में कर्मचारियों के कई घंटे बर्बाद होते हैं।' },
  legacy_point_5: { en: 'Lost Accountability: No proof of fix, no timestamps, and no verification loop.', hi: 'जवाबदेही का अभाव: काम पूरा होने का कोई सबूत, टाइमस्टैम्प या सत्यापन नहीं होता।' },

  solution_methods_title: { en: 'CampusConnect Autonomous Engine', hi: 'कैंपसकनेक्ट ऑटोनॉमस इंजन' },
  solution_methods_sub: { en: 'Multimodal AI, 3D Spatial, Transparent', hi: 'मल्टीमॉडल एआई, 3D स्थानिक, पूर्ण पारदर्शी' },
  solution_point_1: { en: 'Multimodal Clarity: Voice dictation, camera photo auto-diagnosis, and QR room identification.', hi: 'मल्टीमॉडल स्पष्टता: वॉयस डिक्टेशन, कैमरा फोटो ऑटो-निदान, और क्यूआर रूम पहचान।' },
  solution_point_2: { en: 'Semantic Duplicate Clustering: AI clusters nearby matching reports into a single actionable master ticket.', hi: 'स्मार्ट डुप्लिकेट क्लस्टरिंग: एआई आस-पास की समान शिकायतों को एक मास्टर टिकट में जोड़ देता है।' },
  solution_point_3: { en: 'Live Real-Time Timeline: Students follow status from Submitted → Assigned → In-Progress → Resolved.', hi: 'लाइव टाइमलाइन: छात्र सबमिट → सौंपा गया → प्रगति में → समाधान तक हर कदम देखते हैं।' },
  solution_point_4: { en: '3D Spatial Dispatch: Technicians pinpoint exact building, floor, and room coordinates instantly.', hi: '3D स्थानिक प्रेषण: तकनीशियन सीधे सटीक भवन, मंजिल और कमरे तक पहुंचते हैं।' },
  solution_point_5: { en: 'Verified Resolution & CSAT: Mandatory completion photos and 5-star student satisfaction rating.', hi: 'सत्यापित समाधान एवं रेटिंग: फोटो प्रमाण और 5-स्टार छात्र संतुष्टि रेटिंग।' },

  // Index Page - AI Pipeline
  pipeline_eyebrow: { en: 'Autonomous Intelligence in Action', hi: 'एआई कार्यप्रणाली का प्रत्यक्ष अनुभव' },
  pipeline_title: { en: 'Watch How Gemini AI Triages Campus Issues in Seconds', hi: 'देखें कैसे जेमिनी एआई सेकंडों में समस्याओं का वर्गीकरण करता है' },
  pipeline_desc: {
    en: 'Experience our intelligent 4-step pipeline that transforms raw student input into verified, resolved maintenance tasks.',
    hi: 'हमारी 4-चरणीय बुद्धिमान कार्यप्रणाली का अनुभव करें जो छात्रों के सामान्य इनपुट को सत्यापित, सुलझे हुए कार्यों में बदल देती है।',
  },
  stage_previous: { en: 'Previous', hi: 'पिछला' },
  stage_next: { en: 'Next Stage', hi: 'अगला चरण' },

  // Index Page - 4 Pillars
  pillars_eyebrow: { en: 'Enterprise Architecture', hi: 'उन्नत संरचना' },
  pillars_title: { en: 'Engineered with Four Revolutionary Technological Pillars', hi: 'चार क्रांतिकारी तकनीकी स्तंभों पर आधारित' },
  pillars_desc: { en: 'CampusConnect blends cutting-edge artificial intelligence with physical campus realities.', hi: 'कैंपसकनेक्ट आधुनिक कृत्रिम बुद्धिमत्ता को वास्तविक परिसर आवश्यकताओं के साथ जोड़ता है।' },
  pillar_tab_multimodal: { en: 'Multimodal Gemini AI', hi: 'मल्टीमॉडल जेमिनी एआई' },
  pillar_tab_twin3d: { en: '3D Twin & QR Codes', hi: '3D ट्विन और क्यूआर कोड' },
  pillar_tab_biometric: { en: 'Biometric Zero-Trust IAM', hi: 'बायोमेट्रिक जीरो-ट्रस्ट सुरक्षा' },
  pillar_tab_operations: { en: 'Operations Pulse & SLA', hi: 'ऑपरेशन्स पल्स और एसएलए' },

  // Index Page - Stakeholder Portals
  roles_eyebrow: { en: 'Tailored Role Experiences', hi: 'प्रत्येक उपयोगकर्ता के लिए विशेष अनुभव' },
  roles_title: { en: 'A Unified Platform Built for Every University Stakeholder', hi: 'विश्वविद्यालय के हर हितधारक के लिए एकीकृत मंच' },
  roles_desc: {
    en: 'Whether you are a student reporting a faulty lab socket or the Dean evaluating quarterly facility expenditures, CampusConnect delivers a purpose-built workspace.',
    hi: 'चाहे आप लैब में खराब सॉकेट की रिपोर्ट करने वाले छात्र हों या तिमाही बजट का मूल्यांकन करने वाले डीन, कैंपसकनेक्ट सभी को विशेष कार्यक्षेत्र प्रदान करता है।',
  },
  role_student_portal: { en: 'Student Portal', hi: 'छात्र पोर्टल' },
  role_technician_hub: { en: 'Staff & Technician Hub', hi: 'कर्मचारी एवं तकनीशियन हब' },
  role_dean_cockpit: { en: 'Dean & Executive Cockpit', hi: 'डीन एवं प्रशासनिक नियंत्रण' },

  // Index Page - FAQ
  faq_eyebrow: { en: 'Got Questions?', hi: 'कोई प्रश्न हैं?' },
  faq_title: { en: 'Frequently Asked Questions', hi: 'अक्सर पूछे जाने वाले प्रश्न' },
  faq_desc: { en: 'Everything you need to know about implementing and using CampusConnect.', hi: 'कैंपसकनेक्ट के उपयोग और कार्यान्वयन के बारे में महत्वपूर्ण जानकारियां।' },

  // Index Page - CTA Banner & Footer
  cta_banner_badge: { en: 'Transform Your University Operations', hi: 'अपने विश्वविद्यालय के संचालन को आधुनिक बनाएं' },
  cta_banner_title: { en: 'Ready to Bring Accountable Action to Your Campus?', hi: 'क्या आप अपने परिसर में जवाबदेह समाधान लाने के लिए तैयार हैं?' },
  cta_banner_desc: {
    en: 'Join the smart campus revolution. Experience seamless multimodal reporting, 3D twin dispatch, and complete operational transparency.',
    hi: 'स्मार्ट कैंपस क्रांति में शामिल हों। मल्टीमॉडल रिपोर्टिंग, 3D ट्विन प्रेषण और पूर्ण परिचालन पारदर्शिता का अनुभव करें।',
  },
  enter_campus_portal: { en: 'Enter Campus Portal', hi: 'कैंपस पोर्टल में प्रवेश करें' },
  back_to_top: { en: 'Back to top', hi: 'ऊपर जाएं' },

  // Login Gateway
  login_intro_eyebrow: { en: 'Enterprise Identity & Access Management', hi: 'एंटरप्राइज पहचान एवं एक्सेस प्रबंधन' },
  login_intro_title: { en: 'Unified Campus Auth Gateway', hi: 'एकीकृत कैंपस ऑथ गेटवे' },
  login_intro_desc: {
    en: 'Multi-portal biometric sign-in, self-service user registration, and role-guarded access for students, staff, and administration.',
    hi: 'छात्रों, कर्मचारियों और प्रशासन के लिए मल्टी-पोर्टल बायोमेट्रिक साइन-इन, स्व-पंजीकरण और भूमिका-आधारित पहुंच।',
  },
  role_gateways_title: { en: 'Role-Based Gateways', hi: 'भूमिका-आधारित गेटवे' },
  role_gateways_desc: { en: 'Dedicated pipelines for Student intake, Staff work orders, and Executive oversight.', hi: 'छात्र रिपोर्टिंग, स्टाफ कार्य आदेश और प्रशासनिक निगरानी के लिए समर्पित पाइपलाइन।' },
  biometric_gateway_title: { en: 'Biometric Face Gateway', hi: 'बायोमेट्रिक फेस गेटवे' },
  biometric_gateway_desc: { en: 'Webcam facial landmark matching with local privacy-preserving vectoring.', hi: 'स्थानीय गोपनीयता-संरक्षित फेशियल लैंडमार्क मैचिंग।' },
  zero_trust_title: { en: 'Zero-Trust Credentials', hi: 'जीरो-ट्रस्ट सुरक्षा' },
  zero_trust_desc: { en: 'Scrypt password hashing, session tokens, and strict role validation.', hi: 'स्क्रिप्ट पासवर्ड हैशिंग, सेशन टोकन और सख्त भूमिका सत्यापन।' },
  sign_in_gateway: { en: 'Sign In Gateway', hi: 'साइन इन गेटवे' },
  create_account_tab: { en: 'Create Account', hi: 'खाता बनाएं' },
  sign_in_heading: { en: 'Sign in to Campus Portal', hi: 'कैंपस पोर्टल में साइन इन करें' },
  sign_in_sub: { en: 'Choose your target portal gateway or enter credentials.', hi: 'अपना पोर्टल चुनें या अपनी साख दर्ज करें।' },
  student_portal_btn: { en: 'Student Portal', hi: 'छात्र पोर्टल' },
  staff_portal_btn: { en: 'Staff / Tech', hi: 'स्टाफ / तकनीशियन' },
  admin_portal_btn: { en: 'Administration', hi: 'प्रशासन' },
  email_address: { en: 'Email address', hi: 'ईमेल पता' },
  password: { en: 'Password', hi: 'पासवर्ड' },
  campus_code_field: { en: 'Campus Code (Institutional Isolation)', hi: 'संस्थागत कैंपस कोड' },
  face_sign_in_btn: { en: 'Biometric Face Sign In', hi: 'बायोमेट्रिक फेस साइन इन' },
  sign_in_button: { en: 'Sign In to Campus Portal', hi: 'कैंपस पोर्टल में साइन इन करें' },
  signing_in: { en: 'Signing in…', hi: 'साइन इन हो रहा है…' },
  register_heading: { en: 'Register University Account', hi: 'विश्वविद्यालय खाता पंजीकृत करें' },
  register_sub: { en: 'Self-service registration with optional biometric facial enrollment.', hi: 'वैकल्पिक बायोमेट्रिक फेशियल नामांकन के साथ पंजीकरण।' },
  full_name: { en: 'Full name', hi: 'पूरा नाम' },
  select_role: { en: 'Select your role', hi: 'अपनी भूमिका चुनें' },
  student_role: { en: 'Student (Report & Track)', hi: 'छात्र (शिकायत एवं ट्रैकिंग)' },
  staff_role: { en: 'Campus Staff (Work Queue)', hi: 'कैंपस स्टाफ (कार्य सूची)' },
  admin_role: { en: 'Administrator (Operations & Twin)', hi: 'प्रशासक (संचालन एवं 3D ट्विन)' },
  confirm_password: { en: 'Confirm password', hi: 'पासवर्ड की पुष्टि करें' },
  create_account_btn: { en: 'Create Campus Account', hi: 'कैंपस खाता बनाएं' },
  creating_account: { en: 'Creating account…', hi: 'खाता बन रहा है…' },
  optional_biometric: { en: 'Optional Biometric Face Enrollment', hi: 'वैकल्पिक बायोमेट्रिक चेहरा नामांकन' },

  // Student Overview
  welcome_back_user: { en: 'Welcome back, {name}', hi: 'स्वागत है, {name}' },
  overview_hero_sub: {
    en: 'Facilities triage, smart visual auto-diagnosis, and immediate maintenance dispatch for your university.',
    hi: 'सुविधाओं का विश्लेषण, स्मार्ट विज़ुअल ऑटो-निदान, और आपके विश्वविद्यालय के लिए त्वरित रखरखाव प्रेषण।',
  },
  active_monitoring: { en: 'Central Campus • Active Monitoring', hi: 'केंद्रीय परिसर • सक्रिय निगरानी' },
  campus_3d_view_btn: { en: 'Campus 3D View', hi: 'कैंपस 3D दृश्य' },
  quick_intake_eyebrow: { en: 'Quick Intake', hi: 'त्वरित रिपोर्ट' },
  how_to_report_heading: { en: 'How would you like to report?', hi: 'आप समस्या कैसे दर्ज करना चाहेंगे?' },
  gemini_hint: { en: 'Powered by Multimodal Gemini', hi: 'मल्टीमॉडल जेमिनी द्वारा संचालित' },
  visual_card_title: { en: 'Visual Problem Auto-Detection', hi: 'विज़ुअल समस्या ऑटो-डिटेक्शन' },
  visual_card_desc: {
    en: 'Snap or upload photos of broken fixtures, leaks, or electrical hazards. Multimodal AI automatically categorizes and routes the ticket.',
    hi: 'टूटी हुई फिटिंग, रिसाव या बिजली के खतरों की फोटो खींचें या अपलोड करें। मल्टीमॉडल एआई स्वचालित रूप से श्रेणी तय करके टिकट भेजता है।',
  },
  voice_card_title: { en: 'Smart Voice Dictation', hi: 'स्मार्ट वॉयस डिक्टेशन' },
  voice_card_desc: {
    en: 'Speak naturally using your microphone or write in everyday language. Smart triage extracts location details and dispatches immediately.',
    hi: 'माइक्रोफोन से स्वाभाविक रूप से बोलें या सरल भाषा में लिखें। स्मार्ट प्रणाली स्थान विवरण निकालकर तुरंत टिकट तैयार करती है।',
  },
  qr_card_title: { en: 'Door & Room QR Scanner', hi: 'डोर एवं रूम क्यूआर स्कैनर' },
  qr_card_desc: {
    en: 'Scan room-mounted QR stickers across university halls to pre-fill building, wing, and room coordinates instantly.',
    hi: 'हॉल और कक्षाओं में लगे क्यूआर कोड को स्कैन करें और भवन, विंग व कमरे के निर्देशांक तुरंत भरें।',
  },
  recent_tickets_heading: { en: 'Recent tickets', hi: 'हाल की शिकायतें' },
  view_all_tickets: { en: 'View all tickets', hi: 'सभी शिकायतें देखें' },
  metric_active_tickets: { en: 'Active tickets', hi: 'सक्रिय शिकायतें' },
  metric_in_progress: { en: 'In progress', hi: 'प्रगति में' },
  metric_resolved: { en: 'Resolved', hi: 'समाधान संपन्न' },
  no_tickets_submitted: { en: 'No tickets submitted yet. Use the quick intake above to report your first campus issue.', hi: 'अभी तक कोई शिकायत दर्ज नहीं है। पहली समस्या दर्ज करने के लिए ऊपर दिए गए विकल्पों का उपयोग करें।' },

  // Face Login
  face_gateway_title: { en: 'Biometric Face Recognition Gateway', hi: 'बायोमेट्रिक चेहरा पहचान गेटवे' },
  face_gateway_sub: { en: 'Local privacy-preserving landmark matching. No raw video is ever uploaded.', hi: 'स्थानीय गोपनीयता-संरक्षित लैंडमार्क मिलान। कोई कच्चा वीडियो अपलोड नहीं होता।' },
  back_to_password: { en: 'Back to Password Login', hi: 'पासवर्ड लॉगिन पर वापस जाएं' },
  verifying_face: { en: 'Verifying facial features…', hi: 'चेहरे के फीचर्स का सत्यापन हो रहा है…' },
  align_face: { en: 'Align face in camera preview', hi: 'कैमरे के फ्रेम में अपना चेहरा सीधा रखें' },
};

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('campusconnect_lang');
      if (saved === 'en' || saved === 'hi') return saved;
      // Auto-detect browser language if set to Hindi
      if (navigator.language && navigator.language.startsWith('hi')) {
        return 'hi';
      }
    }
    return 'en';
  });

  const setLang = (nextLang: Language) => {
    setLangState(nextLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('campusconnect_lang', nextLang);
      document.documentElement.lang = nextLang;
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const t = (key: string, params?: Record<string, string | number>): string => {
    const entry = translations[key];
    let text = entry ? (entry[lang] || entry.en || key) : key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className={`lang-toggle-pill ${className}`}
      role="group"
      aria-label="Language selector / भाषा चयन"
    >
      <span className="material-symbols-rounded symbol lang-icon" aria-hidden="true">
        translate
      </span>
      <button
        type="button"
        className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
        onClick={() => setLang('en')}
        title="Switch to English"
        aria-pressed={lang === 'en'}
      >
        EN
      </button>
      <span className="lang-divider" aria-hidden="true">/</span>
      <button
        type="button"
        className={`lang-btn ${lang === 'hi' ? 'active' : ''}`}
        onClick={() => setLang('hi')}
        title="हिन्दी में बदलें"
        aria-pressed={lang === 'hi'}
      >
        हिन्दी
      </button>
    </div>
  );
}

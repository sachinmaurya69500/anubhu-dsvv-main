const STORAGE_KEY = 'anubhuti-site-state';
const VISITOR_ID_KEY = 'anubhuti-visitor-id';
const LANGUAGE_KEY = 'anubhuti-language';
const DEFAULT_LANGUAGE = 'en';

const TRANSLATIONS = {
  en: {
    brandSubtitle: 'Dev Sanskriti Vishwavidyalaya',
    toggleNavigation: 'Toggle navigation',
    toggleHindi: 'हिंदी',
    toggleEnglish: 'English',
    navHome: 'Home',
    navForms: 'Forms',
    navArchive: 'Archive',
    navGallery: 'Gallery',
    navDashboard: 'Dashboard',
    navLogout: 'Logout',
    navAdmin: 'Admin',
    navLogin: 'Login',
    footerAboutTitle: 'About Anubhuti',
    footerAboutText: 'Anubhuti is an internship experience portal designed to help students document and share their professional journeys. Connect, learn, and grow with our academic community.',
    footerQuickLinks: 'Quick Links',
    footerSubmitExperience: 'Submit Experience',
    footerPhotoGallery: 'Photo Gallery',
    footerStudentDashboard: 'Student Dashboard',
    footerResources: 'Resources',
    footerInternshipForms: 'Internship Forms',
    footerPastExperiences: 'Past Experiences',
    footerGuidelines: 'Guidelines',
    footerFaqs: 'FAQs',
    footerContactTitle: 'Contact Us',
    footerContactText: 'Have questions or need support? Reach out to us at <a href="mailto:geetavpsgayatri@gmail.com">geetavpsgayatri@gmail.com</a>',
    footerCopyright: '&copy; 2026 Anubhuti. Part of Dev Sanskriti Vishwavidyalaya',
    homeViewExperiences: 'View Experiences',
    homeExploreGallery: 'Explore Gallery',
    homeShareStory: 'Share Your Story',
    homeVisionTitle: 'Our Vision',
    homeVisionText: 'To nurture rural talent through experiential learning, holistic education and inclusive opportunities that empower students to contribute to society.',
    homeAchievementsTitle: 'Achievements & Experiences of Our Students',
    homeArchivesTitle: 'Our Archives',
      homeVisitorsLabel: 'Total visits :',
    formsTitle: 'Submit Your Experience',
    formsSubtitle: 'Share your internship or field work experience with our community',
    formsLoginRequired: 'You must <a href="/auth" class="alert-link">log in</a> to submit a form.',
    archiveTitle: 'Archive Volumes',
    archiveSubtitle: 'Explore published collections of internship experiences',
    archiveViewMore: 'View More Archives',
    galleryTitle: 'Internship Photo Gallery',
    gallerySubtitle: 'Explore photos from internship experiences across our community',
    galleryAllPhotos: 'All Photos',
    galleryProfilePhotos: 'Profile Photos',
    galleryExperiencePhotos: 'Experience Photos',
    authUniversity: 'DEV SANSKRITI VISHWAVIDYALAYA',
    authStudentPortal: 'Student Portal',
    authLeftDescription: 'New students? Register first with your email and create a password. Existing students can log in directly.',
    authRegisterPrompt: 'New to Anubhuti? Register here',
    authStudentsPortal: 'STUDENTS PORTAL',
    authSupportServices: 'student support services',
    authLoginTitle: 'Student Login',
    authNoAccount: 'Don\'t have an account? <a href="#" onclick="showRegister(event)" style="color:var(--brand); text-decoration:underline; font-weight:600;">Register here</a>',
    authCreateAccount: 'Create Account',
    authRegisterDetails: 'Register with your details to get started',
    authRegister: 'Register',
    authHaveAccount: 'Already have an account? <a href="#" onclick="hideRegister(event)" style="color:var(--brand); text-decoration:underline; font-weight:600;">Login here</a>'
  },
  hi: {
    brandSubtitle: 'देव संस्कृति विश्वविद्यालय',
    toggleNavigation: 'नेविगेशन खोलें/बंद करें',
    toggleHindi: 'हिंदी',
    toggleEnglish: 'English',
    navHome: 'होम',
    navForms: 'फॉर्म',
    navArchive: 'आर्काइव',
    navGallery: 'गैलरी',
    navDashboard: 'डैशबोर्ड',
    navLogout: 'लॉगआउट',
    navAdmin: 'एडमिन',
    navLogin: 'लॉगिन',
    footerAboutTitle: 'अनुभूति के बारे में',
    footerAboutText: 'अनुभूति एक इंटर्नशिप अनुभव पोर्टल है, जहाँ छात्र अपनी पेशेवर यात्रा को दर्ज और साझा कर सकते हैं। हमारे अकादमिक समुदाय के साथ जुड़ें, सीखें और आगे बढ़ें।',
    footerQuickLinks: 'त्वरित लिंक',
    footerSubmitExperience: 'अनुभव साझा करें',
    footerPhotoGallery: 'फोटो गैलरी',
    footerStudentDashboard: 'स्टूडेंट डैशबोर्ड',
    footerResources: 'संसाधन',
    footerInternshipForms: 'इंटर्नशिप फॉर्म',
    footerPastExperiences: 'पिछले अनुभव',
    footerGuidelines: 'दिशानिर्देश',
    footerFaqs: 'अक्सर पूछे जाने वाले प्रश्न',
    footerContactTitle: 'संपर्क करें',
    footerContactText: 'कोई प्रश्न या सहायता चाहिए? हमें यहाँ संपर्क करें: <a href="mailto:geetavpsgayatri@gmail.com">geetavpsgayatri@gmail.com</a>',
    footerCopyright: '&copy; 2026 अनुभूति। देव संस्कृति विश्वविद्यालय का एक भाग',
    homeViewExperiences: 'अनुभव देखें',
    homeExploreGallery: 'गैलरी देखें',
    homeShareStory: 'अपनी कहानी साझा करें',
    homeVisionTitle: 'हमारा विजन',
    homeVisionText: 'ग्रामीण प्रतिभाओं को अनुभवात्मक शिक्षण, समग्र शिक्षा और समावेशी अवसरों के माध्यम से सशक्त बनाना ताकि वे समाज में सकारात्मक योगदान दे सकें।',
    homeAchievementsTitle: 'हमारे विद्यार्थियों की उपलब्धियाँ और अनुभव',
    homeArchivesTitle: 'हमारे आर्काइव',
      homeVisitorsLabel: 'कुल विज़िट्स :',
    formsTitle: 'अपना अनुभव जमा करें',
    formsSubtitle: 'अपना इंटर्नशिप या फील्ड वर्क अनुभव हमारे समुदाय के साथ साझा करें',
    formsLoginRequired: 'फॉर्म जमा करने के लिए आपको <a href="/auth" class="alert-link">लॉगिन</a> करना होगा।',
    archiveTitle: 'आर्काइव वॉल्यूम',
    archiveSubtitle: 'इंटर्नशिप अनुभवों के प्रकाशित संकलन देखें',
    archiveViewMore: 'और आर्काइव देखें',
    galleryTitle: 'इंटर्नशिप फोटो गैलरी',
    gallerySubtitle: 'हमारे समुदाय के इंटर्नशिप अनुभवों की तस्वीरें देखें',
    galleryAllPhotos: 'सभी फोटो',
    galleryProfilePhotos: 'प्रोफाइल फोटो',
    galleryExperiencePhotos: 'अनुभव फोटो',
    authUniversity: 'देव संस्कृति विश्वविद्यालय',
    authStudentPortal: 'स्टूडेंट पोर्टल',
    authLeftDescription: 'नए छात्र पहले ईमेल से रजिस्टर करें और पासवर्ड बनाएं। मौजूदा छात्र सीधे लॉगिन कर सकते हैं।',
    authRegisterPrompt: 'अनुभूति में नए हैं? यहाँ रजिस्टर करें',
    authStudentsPortal: 'स्टूडेंट्स पोर्टल',
    authSupportServices: 'छात्र सहायता सेवाएँ',
    authLoginTitle: 'स्टूडेंट लॉगिन',
    authNoAccount: 'क्या आपका अकाउंट नहीं है? <a href="#" onclick="showRegister(event)" style="color:var(--brand); text-decoration:underline; font-weight:600;">यहाँ रजिस्टर करें</a>',
    authCreateAccount: 'नया अकाउंट बनाएं',
    authRegisterDetails: 'शुरू करने के लिए अपनी जानकारी से रजिस्टर करें',
    authRegister: 'रजिस्टर',
    authHaveAccount: 'पहले से अकाउंट है? <a href="#" onclick="hideRegister(event)" style="color:var(--brand); text-decoration:underline; font-weight:600;">यहाँ लॉगिन करें</a>'
  }
};

function getSiteLanguage() {
  try {
    const fromStorage = localStorage.getItem(LANGUAGE_KEY);
    if (fromStorage === 'en' || fromStorage === 'hi') {
      return fromStorage;
    }
  } catch (err) {
    // Ignore storage errors and use default language.
  }
  return DEFAULT_LANGUAGE;
}

function setSiteLanguage(language) {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch (err) {
    // Ignore storage errors; language still applies for current page.
  }
}

function t(key, fallback = '') {
  const language = getSiteLanguage();
  const dictionary = TRANSLATIONS[language] || TRANSLATIONS[DEFAULT_LANGUAGE];
  return dictionary[key] || fallback || key;
}

function applyTranslations(language) {
  const dictionary = TRANSLATIONS[language] || TRANSLATIONS[DEFAULT_LANGUAGE];
  document.documentElement.lang = language === 'hi' ? 'hi' : 'en';

  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const key = node.getAttribute('data-i18n');
    if (!key || !dictionary[key]) return;
    node.textContent = dictionary[key];
  });

  document.querySelectorAll('[data-i18n-html]').forEach((node) => {
    const key = node.getAttribute('data-i18n-html');
    if (!key || !dictionary[key]) return;
    node.innerHTML = dictionary[key];
  });

  document.querySelectorAll('[data-i18n-attr]').forEach((node) => {
    const map = (node.getAttribute('data-i18n-attr') || '').split(';');
    map.forEach((item) => {
      const [attrName, key] = item.split(':').map((v) => (v || '').trim());
      if (!attrName || !key || !dictionary[key]) return;
      node.setAttribute(attrName, dictionary[key]);
    });
  });

  const enBtn = document.getElementById('lang-en');
  const hiBtn = document.getElementById('lang-hi');
  if (enBtn && hiBtn) {
    enBtn.classList.toggle('active', language === 'en');
    hiBtn.classList.toggle('active', language === 'hi');
    enBtn.setAttribute('aria-pressed', language === 'en' ? 'true' : 'false');
    hiBtn.setAttribute('aria-pressed', language === 'hi' ? 'true' : 'false');
  }

  window.dispatchEvent(new CustomEvent('anubhuti:language-changed', { detail: { language } }));
}

// Make setAppLanguage immediately available globally
window.setAppLanguage = function(lang) {
  if (lang === 'en' || lang === 'hi') {
    setSiteLanguage(lang);
    applyTranslations(lang);
  }
};

function initLanguageToggle() {
  const enBtn = document.getElementById('lang-en');
  const hiBtn = document.getElementById('lang-hi');
  const initial = getSiteLanguage();
  applyTranslations(initial);

  if (enBtn) {
    enBtn.addEventListener('click', () => {
      setSiteLanguage('en');
      applyTranslations('en');
    });
  }

  if (hiBtn) {
    hiBtn.addEventListener('click', () => {
      setSiteLanguage('hi');
      applyTranslations('hi');
    });
  }
}

window.__t = t;
window.__getSiteLanguage = getSiteLanguage;

function getVisitorId() {
  try {
    let visitorId = localStorage.getItem(VISITOR_ID_KEY);
    if (!visitorId) {
      // Generate a device-specific visitor ID
      const deviceFingerprint = generateDeviceFingerprint();
      visitorId = `visitor-${Date.now()}-${deviceFingerprint}`;
      localStorage.setItem(VISITOR_ID_KEY, visitorId);
    }
    return visitorId;
  } catch (err) {
    return null;
  }
}

function generateDeviceFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
    const fingerprint = canvas.toDataURL().slice(-50);
    
    // Combine with other device characteristics
    const screen = `${screen.width}x${screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;
    
    // Create a hash-like string
    const combined = `${fingerprint}-${screen}-${timezone}-${language}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  } catch (err) {
    // Fallback to random ID if fingerprinting fails
    return Math.random().toString(36).substring(2, 15);
  }
}

function setVisitorId(id) {
  try {
    localStorage.setItem(VISITOR_ID_KEY, id);
  } catch (err) {
    // Ignore localStorage errors.
  }
}

async function trackVisitor() {
  try {
    const path = window.location.pathname || 'home';
    const visitorId = getVisitorId();
    if (!visitorId) return; // Don't track if we can't identify the visitor
    
    const response = await fetch('/api/visitors/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Visitor-Id': visitorId,
      },
      body: JSON.stringify({ 
        page: path,
        referrer: document.referrer || '',
        userAgent: navigator.userAgent || '',
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      return;
    }

    const result = await response.json();
    // Visitor ID is already set, no need to update it
  } catch (err) {
    console.warn('Visitor tracking failed:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initLanguageToggle();
  trackVisitor();
});

const todayIso = () => new Date().toISOString().slice(0, 10);
const tomorrowIso = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
};
const addDays = (isoDate, days) => {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const dateLabel = (isoDate) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(`${isoDate}T00:00:00`),
  );
const relativeDays = (isoDate) => {
  const current = new Date(`${todayIso()}T00:00:00`).getTime();
  const target = new Date(`${isoDate}T00:00:00`).getTime();
  return Math.ceil((target - current) / 86400000);
};
const safeId = (prefix) => {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return `${prefix}-${window.crypto.randomUUID().slice(0, 8)}`;
  }

  return `${prefix}-${Math.random().toString(16).slice(2, 10)}`;
};
const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

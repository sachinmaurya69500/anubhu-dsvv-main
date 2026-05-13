const STORAGE_KEY = 'anubhuti-site-state';
const VISITOR_ID_KEY = 'anubhuti-visitor-id';
const LANGUAGE_KEY = 'anubhuti-language';
const DEFAULT_LANGUAGE = 'en';
const TRANSLATION_BATCH_SIZE = 40;
let dynamicTranslationObserver = null;
let dynamicTranslationTimer = null;
let followUpTranslationTimer = null;
const originalTextNodeMap = new WeakMap();
const originalAttrMap = new WeakMap();

function looksLikeEmailText(text) {
  return /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(String(text || '').trim());
}

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

function shouldSkipTranslationNode(node) {
  if (!node || !node.parentElement) return true;
  const parent = node.parentElement;
  if (parent.closest('[data-no-auto-translate="true"]')) return true;
  if (parent.closest('script, style, noscript, textarea, code, pre, svg, math')) return true;
  if (parent.hasAttribute('data-i18n') || parent.hasAttribute('data-i18n-html')) return true;
  const text = String(node.nodeValue || '').replace(/\s+/g, ' ').trim();
  if (!text || text.length < 2) return true;
  if (looksLikeEmailText(text)) return true;
  if (/^[\d\s\W]+$/.test(text)) return true;
  return false;
}

function collectTextNodes(root = document.body) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const nodes = [];
  let current = walker.nextNode();
  while (current) {
    if (!shouldSkipTranslationNode(current)) {
      nodes.push(current);
    }
    current = walker.nextNode();
  }
  return nodes;
}

function captureElementAttributes(element) {
  if (!element || !(element instanceof Element)) return;
  if (!originalAttrMap.has(element)) {
    originalAttrMap.set(element, {});
  }
  const stored = originalAttrMap.get(element);
  ['placeholder', 'title', 'aria-label', 'aria-description', 'alt'].forEach((attr) => {
    if (element.hasAttribute(attr) && typeof stored[attr] === 'undefined') {
      stored[attr] = element.getAttribute(attr) || '';
    }
  });
}

function restoreElementAttributes(element) {
  const stored = originalAttrMap.get(element);
  if (!stored) return;
  Object.entries(stored).forEach(([attr, value]) => {
    element.setAttribute(attr, value);
  });
}

async function translateTextNodesToLanguage(targetLanguage, root = document.body) {
  const nodes = collectTextNodes(root);
  if (!nodes.length) return;

  const originals = nodes.map((node) => {
    const original = originalTextNodeMap.get(node) || String(node.nodeValue || '');
    if (!originalTextNodeMap.has(node)) {
      originalTextNodeMap.set(node, original);
      captureElementAttributes(node.parentElement);
    }
    return original;
  });

  if (targetLanguage === 'en') {
    nodes.forEach((node, index) => {
      node.nodeValue = originals[index];
      restoreElementAttributes(node.parentElement);
    });
    return;
  }

  for (let start = 0; start < originals.length; start += TRANSLATION_BATCH_SIZE) {
    const end = start + TRANSLATION_BATCH_SIZE;
    const slice = originals.slice(start, end);
    try {
      const translated = await translateBatchOnline(slice, targetLanguage, 'auto');
      nodes.slice(start, end).forEach((node, index) => {
        const nextValue = translated[index];
        if (typeof nextValue === 'string' && nextValue.trim()) {
          node.nodeValue = nextValue;
        }
        const parent = node.parentElement;
        if (parent) {
          captureElementAttributes(parent);
          if (parent.hasAttribute('placeholder')) {
            const original = (originalAttrMap.get(parent) || {}).placeholder || parent.getAttribute('placeholder') || '';
            if (original) {
              parent.setAttribute('placeholder', translated[index] || original);
            }
          }
          if (parent.hasAttribute('title')) {
            const original = (originalAttrMap.get(parent) || {}).title || parent.getAttribute('title') || '';
            if (original) {
              parent.setAttribute('title', translated[index] || original);
            }
          }
          if (parent.hasAttribute('aria-label')) {
            const original = (originalAttrMap.get(parent) || {})['aria-label'] || parent.getAttribute('aria-label') || '';
            if (original) {
              parent.setAttribute('aria-label', translated[index] || original);
            }
          }
        }
      });
    } catch (err) {
      console.warn('Whole-page translation batch failed:', err);
      break;
    }
  }
}

async function translateBatchOnline(texts, target, source = 'auto') {
  const langTarget = target === 'hi' ? 'hi' : 'en';
  const langSource = source === 'en' || source === 'hi' ? source : 'auto';

  const translateOne = async (text) => {
    const url = new URL('https://translate.googleapis.com/translate_a/single');
    url.searchParams.set('client', 'gtx');
    url.searchParams.set('sl', langSource);
    url.searchParams.set('tl', langTarget);
    url.searchParams.set('dt', 't');
    url.searchParams.set('q', text);

    const response = await fetch(url.toString(), { method: 'GET' });
    if (!response.ok) {
      throw new Error(`Translation request failed (${response.status})`);
    }

    const data = await response.json();
    const translated = Array.isArray(data?.[0])
      ? data[0].map((part) => part?.[0] || '').join('')
      : '';
    return translated || text;
  };

  const results = [];
  for (const text of texts) {
    try {
      results.push(await translateOne(text));
    } catch (err) {
      results.push(text);
    }
  }
  return results;
}

function getDynamicTranslatableElements() {
  const selector = [
    'p', 'span', 'a', 'button', 'li', 'label', 'small', 'strong', 'em',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'th', 'div'
  ].join(',');

  return Array.from(document.querySelectorAll(selector)).filter((el) => {
    if (el.hasAttribute('data-i18n') || el.hasAttribute('data-i18n-html') || el.hasAttribute('data-no-auto-translate')) {
      return false;
    }
    if (el.closest('[data-no-auto-translate="true"]')) {
      return false;
    }
    if (el.children.length > 0) {
      return false;
    }
    const text = (el.textContent || '').trim();
    if (!text || text.length < 2) {
      return false;
    }
    if (looksLikeEmailText(text)) {
      return false;
    }
    if (/^[\d\s\W]+$/.test(text)) {
      return false;
    }
    return true;
  });
}

async function translateDynamicPageContent(targetLanguage) {
  const elements = getDynamicTranslatableElements().filter((el) => {
    return el.dataset.dynamicLang !== targetLanguage;
  });

  if (!elements.length) return;

  const texts = elements.map((el) => (el.textContent || '').trim());

  for (let start = 0; start < texts.length; start += TRANSLATION_BATCH_SIZE) {
    const end = start + TRANSLATION_BATCH_SIZE;
    const textSlice = texts.slice(start, end);
    const elementSlice = elements.slice(start, end);

    try {
      const translated = await translateBatchOnline(textSlice, targetLanguage, 'auto');
      elementSlice.forEach((el, index) => {
        const value = translated[index];
        if (typeof value === 'string' && value.trim()) {
          el.textContent = value;
          el.dataset.dynamicLang = targetLanguage;
        }
      });
    } catch (err) {
      console.warn('Dynamic translation failed for a batch:', err);
      break;
    }
  }
}

function scheduleFollowUpTranslation(targetLanguage) {
  if (followUpTranslationTimer) {
    clearTimeout(followUpTranslationTimer);
  }
  followUpTranslationTimer = setTimeout(() => {
    translateTextNodesToLanguage(targetLanguage).catch((err) => {
      console.warn('Follow-up full-page translation failed:', err);
    });
    translateDynamicPageContent(targetLanguage).catch((err) => {
      console.warn('Follow-up dynamic translation failed:', err);
    });
  }, 350);
}

// Make setAppLanguage immediately available globally
window.setAppLanguage = async function(lang) {
  if (lang === 'en' || lang === 'hi') {
    setSiteLanguage(lang);
    applyTranslations(lang);
    // Fire-and-forget so the UI updates immediately while translation happens online.
    translateTextNodesToLanguage(lang).catch((err) => {
      console.warn('Full-page translation failed:', err);
    });
    translateDynamicPageContent(lang).catch((err) => {
      console.warn('Dynamic translation failed:', err);
    });
    scheduleFollowUpTranslation(lang);
  }
};

function initLanguageToggle() {
  const enBtn = document.getElementById('lang-en');
  const hiBtn = document.getElementById('lang-hi');
  const initial = getSiteLanguage();
  applyTranslations(initial);

  // Only perform an initial translation pass when Hindi is the persisted language.
  // English should render immediately without any translation work.
  if (initial === 'hi') {
    translateTextNodesToLanguage(initial).catch((err) => {
      console.warn('Initial full-page translation failed:', err);
    });
    translateDynamicPageContent(initial).catch((err) => {
      console.warn('Initial dynamic translation failed:', err);
    });
    scheduleFollowUpTranslation(initial);
  }

  if (enBtn) {
    enBtn.addEventListener('click', () => {
      setSiteLanguage('en');
      applyTranslations('en');
      translateTextNodesToLanguage('en').catch((err) => {
        console.warn('Full-page translation failed:', err);
      });
      translateDynamicPageContent('en').catch((err) => {
        console.warn('Dynamic translation failed:', err);
      });
      scheduleFollowUpTranslation('en');
    });
  }

  if (hiBtn) {
    hiBtn.addEventListener('click', () => {
      setSiteLanguage('hi');
      applyTranslations('hi');
      translateTextNodesToLanguage('hi').catch((err) => {
        console.warn('Full-page translation failed:', err);
      });
      translateDynamicPageContent('hi').catch((err) => {
        console.warn('Dynamic translation failed:', err);
      });
      scheduleFollowUpTranslation('hi');
    });
  }
}

function startDynamicTranslationObserver() {
  if (dynamicTranslationObserver || !document.body) return;

  dynamicTranslationObserver = new MutationObserver(() => {
    const lang = getSiteLanguage();
    if (lang === DEFAULT_LANGUAGE) return;

    if (dynamicTranslationTimer) {
      clearTimeout(dynamicTranslationTimer);
    }
    dynamicTranslationTimer = setTimeout(() => {
      translateDynamicPageContent(lang).catch((err) => {
        console.warn('Dynamic observer translation failed:', err);
      });
    }, 160);
  });

  dynamicTranslationObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
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
  startDynamicTranslationObserver();
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

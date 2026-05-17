
  let currentSlide = 0;
  let isAuthenticated = false;
  let featuredArchiveVolumes = [];
  let _submissionsMap = {}; // Store submissions by ID for modal gallery lookup
  let homeExperiences = [];
  let homeFeaturedExperience = null;
  let featuredGalleryPhotos = [];
  let featuredGalleryIndex = 0;
  let featuredGalleryTimer = null;

  const previewLength = 180;
  const escapeHtml = window.escapeHtml || ((value) =>
    String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;'));
  window.escapeHtml = escapeHtml;

  (async function() {
    try {
      const bootstrapRes = await fetch('/api/bootstrap', { credentials: 'include' });
      const bootstrap = await bootstrapRes.json();
      isAuthenticated = Boolean(bootstrap.role);

      // Update Share button: if user is logged in, open forms directly
      try {
        const shareBtn = document.getElementById('share-story-btn');
        if (shareBtn) {
          shareBtn.href = isAuthenticated ? '/forms' : '/auth?next=/forms';
        }
      } catch (e) {
        console.warn('Share button update failed', e);
      }

      updateStatistics(bootstrap.stats || {});

      let submissions = Array.isArray(bootstrap.submissions) ? bootstrap.submissions : [];

      if (!submissions || submissions.length === 0) {
        submissions = [];
      }

      submissions = submissions.map((submission, index) => normalizeSubmission(submission, index));
      
      // Build submissions map for gallery lookup in modals
      _submissionsMap = {};
      submissions.forEach(sub => {
        _submissionsMap[sub.id] = sub;
      });
      
      window._submissionsMap = _submissionsMap;
      featuredArchiveVolumes = buildArchiveVolumes(submissions).slice(0, 3);
      renderFeaturedArchives(featuredArchiveVolumes);

      // Load the new home experiences showcase (featured + rail)
      await loadHomeExperiences(bootstrap);
    } catch (err) {
      console.error('Error loading testimonials:', err);
    }
  })();

  async function loadHomeExperiences(bootstrap) {
    try {
      let approved = Array.isArray(bootstrap.submissions) ? bootstrap.submissions.filter((item) => item && item.status === 'approved') : [];

      if (!approved.length) {
        const fallbackRes = await fetch('/api/submissions?approved=1', { credentials: 'include' });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (Array.isArray(fallbackData)) {
            approved = fallbackData.filter((item) => item && item.status === 'approved');
          }
        }
      }

      homeFeaturedExperience = normalizeHomeExperience(bootstrap.featuredSubmission || bootstrap.latestApprovedWithPhoto || approved[0] || null);
      const featuredId = homeFeaturedExperience ? String(homeFeaturedExperience.id) : '';
      homeExperiences = approved
        .map(normalizeHomeExperience)
        .filter((item) => item && String(item.id) !== featuredId);

      featuredExperiences = [homeFeaturedExperience, ...homeExperiences].filter(e => e);
      if (featuredExperiences.length > 0) {
        renderFeaturedExperienceBox();
      } else {
        displayNoExperiences();
      }

      renderHomeFeaturedExperience();
      renderHomeExperienceRail();
      renderHomeExperienceDots();
    } catch (err) {
      console.error('Error loading home experience showcase:', err);
      displayNoExperiences();
    }
  }

  function normalizeHomeExperience(item) {
    if (!item) return null;
    return {
      id: item.id,
      studentName: item.studentName || 'Student Experience',
      programme: item.programme || '',
      organization: item.organization || '',
      duration: item.duration || '',
      summary: item.summary || '',
      summaryPreview: item.summaryPreview || makeHomePreview(item.summary || '', 420),
      avatarUrl: item.avatarUrl || item.thumbnail || item.photo || '',
      gallery: Array.isArray(item.gallery) ? item.gallery : [],
      mentor: item.mentor || '',
      rollNumber: item.rollNumber || '',
    };
  }

  function makeHomePreview(text, maxLength) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return 'No description available.';
    return clean.length > maxLength ? `${clean.slice(0, maxLength).trim()}...` : clean;
  }

  function normalizeFullText(text) {
    return String(text || '').replace(/\.{3,}\s*$/, '').trim();
  }

  function renderHomeFeaturedExperience() {
    const container = document.getElementById('home-featured-experience');
    if (!container) return;
    if (!homeFeaturedExperience) {
      container.innerHTML = '<p style="text-align:center; color:var(--muted); padding:40px;">No featured experience yet.</p>';
      return;
    }

    const imageSrc = getHomeExperienceImageSrc(homeFeaturedExperience);
    const detailText = normalizeFullText(homeFeaturedExperience.summary || homeFeaturedExperience.summaryPreview || '');
    const intro = homeFeaturedExperience.organization || homeFeaturedExperience.programme || 'Featured student story';

    container.innerHTML = `
      <article class="featured-experience student-featured-layout">
        <div class="featured-experience-content student-featured-copy">
          <div class="student-featured-kicker">Featured Student Experience</div>
          <h3>${escapeHtml(homeFeaturedExperience.studentName)}</h3>
          <p class="meta student-featured-meta">${escapeHtml(homeFeaturedExperience.programme)}${homeFeaturedExperience.programme && homeFeaturedExperience.organization ? ' • ' : ''}${escapeHtml(homeFeaturedExperience.organization)}</p>
          <div class="student-featured-body">
            <p>${escapeHtml(detailText || intro)}</p>
          </div>
          <div class="student-featured-points">
            ${homeFeaturedExperience.duration ? `<p><strong>Duration:</strong> ${escapeHtml(homeFeaturedExperience.duration)}</p>` : ''}
            ${homeFeaturedExperience.mentor ? `<p><strong>Mentor:</strong> ${escapeHtml(homeFeaturedExperience.mentor)}</p>` : ''}
            ${homeFeaturedExperience.rollNumber ? `<p><strong>Roll No.:</strong> ${escapeHtml(homeFeaturedExperience.rollNumber)}</p>` : ''}
          </div>
          <div class="student-featured-actions">
            <button class="button primary" type="button" onclick="openHomeExperienceModal('${escapeJs(String(homeFeaturedExperience.id))}')">Read full story</button>
          </div>
        </div>
        <div class="featured-experience-media student-featured-media">
          ${renderHomeHeroMedia(imageSrc, homeFeaturedExperience.studentName)}
        </div>
      </article>
    `;
  }

  function renderHomeExperienceRail() {
    const rail = document.getElementById('home-experience-rail');
    if (!rail) return;
    if (!homeExperiences.length) {
      rail.innerHTML = '<p style="text-align:center; color:var(--muted); padding:40px; width:100%;">No student experiences found.</p>';
      return;
    }

    // Display only first 3 cards
    const cardsToDisplay = homeExperiences.slice(0, 3);
    rail.innerHTML = cardsToDisplay.map((item, index) => renderHomeExperienceCard(item, index)).join('');
  }

  function displayNoExperiences() {
    const box = document.getElementById('featured-exp-image-box');
    const desc = document.getElementById('featured-exp-description');
    const dots = document.getElementById('featured-exp-dots');
    const rail = document.getElementById('home-experience-rail');

    if (box) {
      box.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:100%; color: var(--muted);">No featured photos available.</div>';
    }
    if (desc) {
      desc.textContent = 'Approved internship experiences are being collected from the Anubhuti database. Check back soon for the latest stories and featured achievements.';
    }
    if (dots) {
      dots.innerHTML = '';
    }
    if (rail) {
      rail.innerHTML = '<p style="text-align:center; color:var(--muted); padding:40px; width:100%;">No student experiences are available yet. Please return later.</p>';
    }
  }

  function renderHomeExperienceDots() {
    // Dots not used in grid layout
    return;
  }

  function renderHomeExperienceCard(item, index) {
    const theme = ['theme-navy', 'theme-teal', 'theme-forest'][index % 3];
    const imageSrc = getHomeExperienceImageSrc(item);
    const quote = makeHomePreview(item.summary || item.summaryPreview || '', 180);
    const academicLine = [item.programme, item.duration].filter(Boolean).join(' | ');
    const locationText = item.organization || 'Location unavailable';

    return `
      <article class="experience-card ${theme}">
        <div class="experience-card-top">
          <div class="experience-card-logo">
            <img src="/assets/Dev_Sanskriti_Vishwavidyalaya.png" alt="Dev Sanskriti Vishwavidyalaya logo" />
          </div>
        </div>
        <div class="experience-card-body">
          <div class="experience-card-photo">
            ${renderHomeCardMedia(imageSrc, item.studentName)}
          </div>
          <div class="experience-card-copy">
            <div class="experience-card-quote-mark">&ldquo;</div>
            <p class="experience-card-quote">${escapeHtml(quote)}</p>
          </div>
        </div>
        <div class="experience-card-footer">
          <div>
            <div class="experience-card-name">${escapeHtml(item.studentName)}</div>
            <div class="experience-card-role">${escapeHtml(item.organization || 'Student')}</div>
          </div>
          <div class="experience-card-details">${escapeHtml(academicLine || item.organization || '')}</div>
        </div>
      </article>
    `;
  }

  function openHomeExperienceModal(id) {
    const item = [homeFeaturedExperience, ...homeExperiences].find((entry) => entry && String(entry.id) === String(id));
    if (!item) return;

    const modal = document.getElementById('home-experience-modal');
    const body = document.getElementById('home-experience-modal-body');
    const galleryMarkup = item.gallery && item.gallery.length
      ? `<div class="experience-modal-gallery">${item.gallery.slice(0, 6).map((src) => `<img src="${escapeHtml(src)}" alt="Experience photo" />`).join('')}</div>`
      : '';

    body.innerHTML = `
      <div class="experience-modal-layout">
        <div class="experience-modal-media">
          ${renderHomeHeroMedia(getHomeExperienceImageSrc(item), item.studentName)}
        </div>
        <div class="experience-modal-copy">
          <h2 id="home-experience-modal-title">${escapeHtml(item.studentName)}</h2>
          <p class="experience-modal-meta">${escapeHtml(item.programme)}${item.programme && item.organization ? ' • ' : ''}${escapeHtml(item.organization)}${item.duration ? ' • ' + escapeHtml(item.duration) : ''}</p>
          <p class="experience-modal-summary">${escapeHtml(item.summary || item.summaryPreview || '')}</p>
          ${galleryMarkup}
        </div>
      </div>
    `;

    modal.style.display = 'flex';
  }

  function closeHomeExperienceModal() {
    document.getElementById('home-experience-modal').style.display = 'none';
  }

  function getHomeExperienceImageSrc(item) {
      const src = (item.gallery && item.gallery[0]) || item.avatarUrl || '';
    if (!src) return '/assets/Dev_Sanskriti_Vishwavidyalaya.png';
    if (/^(https?:)?\/\//.test(src) || src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('/api/uploads/avatars/') || src.startsWith('/static/')) {
      return src;
    }
    return `/api/uploads/avatars/${encodeURIComponent(src)}`;
  }

  function renderHomeHeroMedia(src, altText) {
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(altText || 'Experience photo')}" onerror="this.onerror=null;this.src='/assets/Dev_Sanskriti_Vishwavidyalaya.png'" />`;
  }

  function renderHomeCardMedia(src, altText) {
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(altText || 'Experience photo')}" onerror="this.onerror=null;this.src='/assets/Dev_Sanskriti_Vishwavidyalaya.png'" />`;
  }

  function updateStatistics(stats) {
    setStatValue('stat-visitors', stats.totalVisitors ?? stats.siteVisitors ?? 0);
  }

  function setStatValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = Number(value || 0).toLocaleString('en-IN');
    }
  }

  function normalizeSubmission(submission, index) {
    const summary = String(submission.summary || '');
    const summaryPreview = submission.summaryPreview || (summary.length > previewLength ? `${summary.slice(0, previewLength).trimEnd()}...` : summary);

    return {
      ...submission,
      id: submission.id || submission._id || `testimonial-${index}`,
      summaryPreview,
      summary,
    };
  }

  function buildArchiveVolumes(submissions) {
    const groups = {};

    (Array.isArray(submissions) ? submissions : []).forEach((submission) => {
      const dateStr = submission.submittedAt || submission.createdAt || '';
      const parsed = new Date(dateStr);
      const year = Number.isNaN(parsed.getFullYear()) ? (submission.year || 'Unknown') : parsed.getFullYear();

      if (!groups[year]) {
        groups[year] = [];
      }

      groups[year].push(submission);
    });

    return Object.keys(groups)
      .map((year) => {
        const items = groups[year];
        const latest = items.reduce((acc, current) => {
          const date = new Date(current.submittedAt || current.createdAt || 0);
          return !acc || date > acc ? date : acc;
        }, null);

        return {
          id: `vol-${year}`,
          volumeLabel: `Volume ${year}`,
          year,
          publishedAt: latest ? latest.toISOString() : '',
          description: `Published collection of ${items.length} approved experiences from ${year}.`,
          items: items.length,
        };
      })
      .sort((a, b) => Number(b.year) - Number(a.year));
  }

  let featuredExpIndex = 0;
  let featuredExperiences = [];

  function renderFeaturedArchives(volumes) {
    const container = document.getElementById('featured-archives-box');
    if (!container) return;

    if (!Array.isArray(volumes) || !volumes.length) {
      container.innerHTML = `<div class="archive-items-wrapper"><p style="margin: 0; padding: 14px; color: var(--muted);">No archives yet.</p></div>`;
      return;
    }

    const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    container.innerHTML = `<div class="archive-items-wrapper">${volumes.map((volume, index) => {
      const fallbackDate = new Date(Number(volume.year) || new Date().getFullYear(), index % 12, Math.min(28, (index + 1) * 3));
      const parsedDate = volume.publishedAt ? new Date(volume.publishedAt) : fallbackDate;
      const date = Number.isNaN(parsedDate.getTime()) ? fallbackDate : parsedDate;
      const day = String(date.getDate()).padStart(2, '0');
      const month = monthShort[date.getMonth()] || 'Jan';
      const year = String(date.getFullYear());

      return `
      <div class="archive-item">
        <span class="archive-item-badge">
          <span class="date-day">${day}</span>
          <span class="date-month">${month}</span>
          <span class="date-year">${year}</span>
        </span>
        <div class="archive-item-title">
          <a href="/archive?vol=${encodeURIComponent(volume.id)}" class="archive-link">${escapeHtml(volume.volumeLabel)}</a>
          <div class="archive-item-desc">${volume.items} submissions · ${escapeHtml(volume.description || '')}</div>
        </div>
      </div>
    `;
    }).join('')}</div>`;
  }

  function renderFeaturedExperienceBox() {
    const boxContainer = document.getElementById('featured-exp-image-box');
    const descContainer = document.getElementById('featured-exp-description');
    const dotsContainer = document.getElementById('featured-exp-dots');

    if (!boxContainer || !descContainer || !dotsContainer) return;
    if (!featuredExperiences || featuredExperiences.length === 0) {
      descContainer.textContent = 'No featured experiences available.';
      return;
    }

    const current = featuredExperiences[featuredExpIndex];
    if (!current) return;

    const imgSrc = getHomeExperienceImageSrc(current);
    boxContainer.innerHTML = `
      <div class="featured-exp-image-wrapper">
        <img src="${escapeHtml(imgSrc)}" alt="Featured experience" onerror="this.onerror=null;this.src='/assets/Dev_Sanskriti_Vishwavidyalaya.png'" />
        <div class="featured-exp-image-label">
          <div class="featured-exp-image-name">${escapeHtml(current.studentName)}</div>
          <div class="featured-exp-image-location">${escapeHtml(current.organization || 'Location')}</div>
        </div>
      </div>
    `;

    // Show a readable preview and a 'View more' button that opens the modal with full experience
    const previewText = makeHomePreview(current.summary || current.summaryPreview || '', 180);
    descContainer.innerHTML = `
      <p style="margin:0 0 12px; color: var(--ink);">${escapeHtml(previewText)}</p>
      <div style="margin-top:8px;">
        <button class="button primary" type="button" onclick="openExperienceModal('${escapeJs(current.id)}')">View more</button>
      </div>
    `;

    // Render pagination dots; clicking a dot sets the index and restarts rotation
    dotsContainer.innerHTML = featuredExperiences.map((_, idx) => `
      <div class="featured-exp-dot ${idx === featuredExpIndex ? 'active' : ''}" onclick="setFeaturedExpIndex(${idx}); restartFeaturedRotation();"></div>
    `).join('');

    // ensure auto-rotation runs
    restartFeaturedRotation();
  }

  window.setFeaturedExpIndex = function(index) {
    if (index >= 0 && index < featuredExperiences.length) {
      featuredExpIndex = index;
      renderFeaturedExperienceBox();
    }
  };

  // Auto-rotation for featured experiences
  let _featuredRotationTimer = null;
  function startFeaturedRotation() {
    stopFeaturedRotation();
    if (!featuredExperiences || featuredExperiences.length <= 1) return;
    _featuredRotationTimer = setInterval(() => {
      featuredExpIndex = (featuredExpIndex + 1) % featuredExperiences.length;
      renderFeaturedExperienceBox();
    }, 6000);
  }

  function stopFeaturedRotation() {
    if (_featuredRotationTimer) {
      clearInterval(_featuredRotationTimer);
      _featuredRotationTimer = null;
    }
  }

  function restartFeaturedRotation() {
    stopFeaturedRotation();
    startFeaturedRotation();
  }

  function renderTestimonialCard(submission) {
    const summaryId = `testimonial-summary-${submission.id}`;
    const previewId = `testimonial-preview-${submission.id}`;
    const fullId = `testimonial-full-${submission.id}`;
    const buttonId = `testimonial-button-${submission.id}`;

    const imgSrc = resolveAvatarSrc(submission.thumbnail || submission.photo || submission.avatarUrl || '');

    // build avatar content: prefer thumbnail/photo url, otherwise initials
    const initials = (submission.studentName || '').split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();
    const avatarHtml = renderAvatarMarkup(imgSrc, initials, `${escapeHtml(submission.studentName)} avatar`);

    const badgeHtml = submission.duration ? `<span class="badge">${escapeHtml(submission.duration)}</span>` : '';

    return `
      <article class="card testimonial-card" data-submission-id="${escapeHtml(submission.id)}" id="testimonial-article-${escapeHtml(submission.id)}">
        <div class="testimonial-head">
          ${avatarHtml}
          <div style="flex:1;">
            <h3 class="testimonial-name">${escapeHtml(submission.studentName)}</h3>
            <p class="meta testimonial-meta">${escapeHtml(submission.organization)} ${badgeHtml ? '• ' + badgeHtml : ''}</p>
          </div>
          <div class="testimonial-quote">“</div>
        </div>

        <div class="testimonial-copy" id="${summaryId}" style="margin-top:12px;">
          <p class="testimonial-summary" id="${previewId}">${escapeHtml(submission.summaryPreview)}</p>
          ${isAuthenticated && submission.summary ? `<p class="testimonial-summary full" id="${fullId}" aria-hidden="true">${escapeHtml(submission.summaryPreview)}</p>` : ''}
        </div>
        <div class="testimonial-footer">
          <button
            class="button secondary button-sm read-more-button"
            id="${buttonId}"
            type="button"
            onclick="openTestimonialModal('${escapeJs(submission.id)}')"
          >
            View more
          </button>
        </div>
      </article>
    `;
  }


  function renderFeaturedExperience(submission) {
    const container = document.getElementById('featured-experience-container');
    if (!container) return;
    const imgSrc = resolveAvatarSrc(submission.thumbnail || submission.photo || submission.avatarUrl || '');
    const initials = (submission.studentName || '').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    const mediaHtml = renderAvatarMarkup(imgSrc, initials, 'P');
    container.innerHTML = `
      <div class="card featured-experience">
        <div class="featured-experience-media">
          ${mediaHtml}
        </div>
        <div class="featured-experience-content">
          <h3 style="margin-top:0;">${escapeHtml(submission.studentName)}</h3>
          <p class="meta" style="color: var(--muted); margin-top: 6px;">${escapeHtml(submission.organization)} • ${escapeHtml(submission.duration || '')}</p>
          <p style="margin-top: 12px; color: var(--ink); line-height: 1.7;">${escapeHtml(submission.summaryPreview)}</p>
          <div style="margin-top: 14px;">
            <button class="button primary" onclick="openExperienceModal('${escapeJs(submission.id)}')">View more</button>
          </div>
          ${submission.summary ? `<div id="featured-testimonial-full-${escapeHtml(submission.id)}" hidden style="margin-top:12px; color: var(--ink); line-height:1.6;">${escapeHtml(submission.summary)}</div>` : ''}
        </div>
      </div>
    `;
  }

  function escapeJs(str) {
    return String(str).replaceAll('\\', '\\\\').replaceAll("'", "\\'");
  }

  function resolveAvatarSrc(value) {
    const src = String(value || '').trim();
    if (!src) return '';
    if (/^(https?:)?\/\//.test(src) || src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('/api/uploads/avatars/') || src.startsWith('/static/')) {
      return src;
    }
    return `/api/uploads/avatars/${encodeURIComponent(src)}`;
  }

  function renderAvatarMarkup(src, initials, altText) {
    if (!src) {
      return `<div class="testimonial-avatar">${escapeHtml(initials)}</div>`;
    }

    const escapedSrc = escapeHtml(src);
    const escapedAlt = escapeHtml(altText);
    const escapedInitials = String(initials || '').replaceAll('"', '&quot;');
    const fallbackScript = `this.onerror=null;this.remove();this.parentElement.textContent="${escapedInitials}";`;
    return `<div class="testimonial-avatar"><img src="${escapedSrc}" alt="${escapedAlt}" onerror='${fallbackScript}' /></div>`;
  }

  function moveCarousel(direction) {
    const container = document.getElementById('testimonials-container');
    const track = container.querySelector('.carousel-track');
    
    if (!track) return;
    
    const itemsPerSlide = getItemsPerSlide();
    currentSlide += direction;
    const maxSlide = Math.max(0, track.children.length - itemsPerSlide);
    
    if (currentSlide < 0) currentSlide = 0;
    if (currentSlide > maxSlide) currentSlide = maxSlide;
    
    setCarouselOffset();
    
    updateCarouselButtons();
  }

  function setCarouselOffset() {
    const container = document.getElementById('testimonials-container');
    const track = container.querySelector('.carousel-track');
    if (!track) return;

    const card = track.querySelector('.testimonial-card');
    if (!card) return;

    const style = window.getComputedStyle(track);
    const gap = parseFloat(style.columnGap || style.gap || '20') || 20;
    const cardWidth = card.getBoundingClientRect().width + gap;
    track.style.transform = `translateX(-${currentSlide * cardWidth}px)`;
  }

  function updateCarouselButtons() {
    const track = document.querySelector('.carousel-track');
    if (!track) return;
    
    const maxSlide = Math.max(0, track.children.length - getItemsPerSlide());
    document.getElementById('carousel-prev').disabled = currentSlide === 0;
    document.getElementById('carousel-next').disabled = currentSlide === maxSlide;
  }

  function getItemsPerSlide() {
    if (window.innerWidth < 768) return 1;
    if (window.innerWidth < 1024) return 2;
    return 3;
  }

  function toggleTestimonialDetails(submissionId) {
    // Open modal view (like archive's "View Volume"). Full summary only
    // shown when available; otherwise show login CTA.
    openTestimonialModal(submissionId);
  }

  function openTestimonialModal(submissionId) {
    const article = document.getElementById(`testimonial-article-${submissionId}`);
    if (!article) return;

    const name = article.querySelector('.testimonial-name')?.textContent || '';
    const meta = article.querySelector('.testimonial-meta')?.textContent || '';
    const preview = article.querySelector(`#testimonial-preview-${submissionId}`)?.textContent || '';
    const fullElem = article.querySelector(`#testimonial-full-${submissionId}`);
    const avatarImg = article.querySelector('.testimonial-avatar img');
    const imgHtml = avatarImg ? `<div style="width:120px; height:120px; overflow:hidden; border-radius:8px; margin-right:16px; display:flex; align-items:center; justify-content:center;"><img src="${escapeHtml(avatarImg.src)}" alt="Student avatar" style="max-width:100%; max-height:100%; width:auto; height:auto; object-fit:contain;" /></div>` : '';

    const bodyHtml = fullElem
      ? `<p style="color: var(--ink); line-height:1.6;">${escapeHtml(fullElem.textContent)}</p>`
      : `<p style="color: var(--muted);">${escapeHtml(preview)}</p><p style="margin-top:12px;"><a class="button primary" href="/auth?next=/">Login to read full story</a></p>`;

    // Find submission data from bootstrap to get gallery images
    let galleryHtml = '';
    let galleryCount = 0;
    try {
      const submission = window._submissionsMap && window._submissionsMap[submissionId];
      if (submission && submission.gallery && Array.isArray(submission.gallery) && submission.gallery.length > 0) {
        galleryCount = submission.gallery.length;
        galleryHtml = `
          <div class="experience-gallery" style="margin-top:20px; border-top:1px solid rgba(29,42,36,0.1); padding-top:16px;">
            <h4 style="margin:0 0 12px; color: var(--brand); font-size:0.95rem;">Experience Gallery</h4>
            <div class="experience-gallery-shell" data-gallery-id="${escapeHtml(submissionId)}">
              <button class="gallery-nav left" type="button" aria-label="Previous photo" onclick="moveModalGallery('${escapeJs(submissionId)}', -1, event)">‹</button>
              <div class="experience-gallery-viewport" id="gallery-viewport-${escapeHtml(submissionId)}">
                <div class="experience-gallery-track" id="gallery-track-${escapeHtml(submissionId)}">
                  ${submission.gallery.map((src, idx) => {
                const resolvedSrc = resolveAvatarSrc(src);
                      return `<div class="experience-gallery-item" role="button" tabindex="0" aria-label="Open photo ${idx + 1}" onclick="expandImage('${escapeHtml(resolvedSrc)}', event)"><img src="${escapeHtml(resolvedSrc)}" alt="Experience photo" loading="lazy" /></div>`;
              }).join('')}
                </div>
              </div>
              <button class="gallery-nav right" type="button" aria-label="Next photo" onclick="moveModalGallery('${escapeJs(submissionId)}', 1, event)">›</button>
            </div>
          </div>
        `;
      }
    } catch (err) {
      console.warn('Gallery load error:', err);
    }

    const modalHtml = `
      <div id="testimonial-modal" class="archive-modal testimonial-modal-overlay" style="position:fixed; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.45); z-index:9999; padding:24px;" onclick="if(event.target === this) closeTestimonialModal()">
        <div class="archive-modal-content" style="max-width:880px; width:min(880px, 100%); background:var(--surface); border-radius:12px; padding:22px; box-shadow:0 24px 60px rgba(11, 34, 70, 0.24); max-height:80vh; overflow-y:auto;">
          <button class="modal-close-btn" onclick="closeTestimonialModal()">&times;</button>
          <div style="display:flex; gap:16px; align-items:flex-start;">
            ${imgHtml}
            <div style="flex:1;">
              <h2 style="margin:0 0 8px; color: var(--brand);">${escapeHtml(name)}</h2>
              <p style="margin:0 0 12px; color: var(--muted);">${escapeHtml(meta)}</p>
              ${bodyHtml}
              ${galleryHtml}
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.style.overflow = 'hidden';
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    if (galleryCount > 0) {
      initModalGallery(submissionId, galleryCount);
      updateModalGalleryButtons(submissionId, galleryCount);
    }
  }

  function getGalleryState(submissionId) {
    window._galleryState = window._galleryState || {};
    if (!window._galleryState[submissionId]) {
      window._galleryState[submissionId] = { index: 0 };
    }
    return window._galleryState[submissionId];
  }

  function setModalGalleryOffset(submissionId) {
    const track = document.getElementById(`gallery-track-${submissionId}`);
    if (!track) return;
    const item = track.querySelector('.experience-gallery-item');
    if (!item) return;

    const style = window.getComputedStyle(track);
    const gap = parseFloat(style.columnGap || style.gap || '12') || 12;
    const width = item.getBoundingClientRect().width + gap;
    const state = getGalleryState(submissionId);
    track.style.transform = `translateX(-${state.index * width}px)`;
  }

  function moveModalGallery(submissionId, direction, event) {
    if (event) event.stopPropagation();
    const track = document.getElementById(`gallery-track-${submissionId}`);
    if (!track) return;

    const total = track.children.length;
    const state = getGalleryState(submissionId);
    state.index = Math.min(total - 1, Math.max(0, state.index + direction));
    setModalGalleryOffset(submissionId);
    updateModalGalleryButtons(submissionId, total);
  }

  function updateModalGalleryButtons(submissionId, total) {
    const shell = document.querySelector(`[data-gallery-id="${String(submissionId)}"]`);
    if (!shell) return;
    const state = getGalleryState(submissionId);
    const prev = shell.querySelector('.gallery-nav.left');
    const next = shell.querySelector('.gallery-nav.right');
    if (prev) prev.disabled = state.index <= 0;
    if (next) next.disabled = state.index >= total - 1;
  }

  function initModalGallery(submissionId, total) {
    const viewport = document.getElementById(`gallery-viewport-${submissionId}`);
    if (!viewport) return;
    const state = getGalleryState(submissionId);
    state.index = 0;

    let startX = 0;
    let dragging = false;

    viewport.addEventListener('pointerdown', (e) => {
      dragging = true;
      startX = e.clientX;
      viewport.setPointerCapture(e.pointerId);
      viewport.classList.add('dragging');
    });

    viewport.addEventListener('pointerup', (e) => {
      if (!dragging) return;
      dragging = false;
      viewport.classList.remove('dragging');
      const delta = e.clientX - startX;
      if (Math.abs(delta) > 35) {
        moveModalGallery(submissionId, delta < 0 ? 1 : -1);
      }
    });

    viewport.addEventListener('pointercancel', () => {
      dragging = false;
      viewport.classList.remove('dragging');
    });

    setModalGalleryOffset(submissionId);
    updateModalGalleryButtons(submissionId, total);
  }

  function expandImage(src, event) {
    event.stopPropagation();
    const expandedHtml = `
      <div id="image-viewer-modal" class="archive-modal image-viewer-overlay" style="position:fixed; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.88); z-index:10000; padding:18px;" onclick="if(event.target === this) closeImageViewer()">
        <button class="modal-close-btn image-viewer-close" style="position:absolute; top:16px; right:20px; color:white; font-size:2.1rem; background:none; border:none; cursor:pointer; z-index:10001;" onclick="closeImageViewer()">&times;</button>
        ${renderExpandedImage(src)}
      </div>
    `;
    document.body.style.overflow = 'hidden';
    document.body.insertAdjacentHTML('beforeend', expandedHtml);
  }

  function renderExpandedImage(src) {
    return `
      <img
        src="${escapeHtml(src)}"
        alt="P"
        style="max-width:96vw; max-height:96vh; width:auto; height:auto; object-fit:contain; border-radius:12px; box-shadow:0 24px 60px rgba(0,0,0,0.55);"
      />
    `;
  }

  function closeImageViewer() {
    const viewer = document.getElementById('image-viewer-modal');
    if (viewer) viewer.remove();
    if (!document.getElementById('testimonial-modal')) {
      document.body.style.overflow = '';
    }
  }

  function closeTestimonialModal() {
    const modal = document.getElementById('testimonial-modal');
    if (modal) modal.remove();
    const viewer = document.getElementById('image-viewer-modal');
    if (viewer) viewer.remove();
    document.body.style.overflow = '';
  }

  function toggleFeaturedExperienceDetails(submissionId) {
    // Open full experience in modal (preferred) or redirect to login
    if (!isAuthenticated) {
      window.location.href = '/auth?next=/';
      return;
    }
    openExperienceModal(submissionId);
  }

  function openExperienceModal(submissionId) {
    const submission = window._submissionsMap && window._submissionsMap[submissionId];
    if (!submission) return;

    const name = submission.studentName || 'Student Experience';
    const meta = `${submission.organization || ''} • ${submission.duration || ''}`;
    const fullText = submission.summary || '';

    let galleryHtml = '';
    let galleryCount = 0;
    try {
      if (Array.isArray(submission.gallery) && submission.gallery.length > 0) {
        galleryCount = submission.gallery.length;
        galleryHtml = `
          <div class="experience-gallery" style="margin-top:20px; border-top:1px solid rgba(29,42,36,0.08); padding-top:16px;">
            <h4 style="margin:0 0 12px; color: var(--brand); font-size:0.95rem;">Experience Gallery</h4>
            <div class="experience-gallery-shell" data-gallery-id="${escapeHtml(submissionId)}">
              <button class="gallery-nav left" type="button" aria-label="Previous photo" onclick="moveModalGallery('${escapeJs(submissionId)}', -1, event)">‹</button>
              <div class="experience-gallery-viewport" id="gallery-viewport-${escapeHtml(submissionId)}">
                <div class="experience-gallery-track" id="gallery-track-${escapeHtml(submissionId)}">
                  ${submission.gallery.map((src, idx) => {
                    const resolvedSrc = resolveAvatarSrc(src);
                    return `<div class="experience-gallery-item" role="button" tabindex="0" aria-label="Open photo ${idx + 1}" onclick="expandImage('${escapeHtml(resolvedSrc)}', event)"><img src="${escapeHtml(resolvedSrc)}" alt="Experience photo" loading="lazy" /></div>`;
                  }).join('')}
                </div>
              </div>
              <button class="gallery-nav right" type="button" aria-label="Next photo" onclick="moveModalGallery('${escapeJs(submissionId)}', 1, event)">›</button>
            </div>
          </div>
        `;
      }
    } catch (err) {
      console.warn('Gallery render error:', err);
    }

    const imgHtml = submission.thumbnail || submission.photo ? `<div style="width:110px; height:110px; overflow:hidden; border-radius:8px; margin-right:16px; display:flex; align-items:center; justify-content:center;"><img src="${escapeHtml(resolveAvatarSrc(submission.thumbnail||submission.photo))}" alt="avatar" style="max-width:100%; max-height:100%; object-fit:cover;" /></div>` : '';

    const modalHtml = `
      <div id="experience-modal" class="archive-modal testimonial-modal-overlay" style="position:fixed; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.45); z-index:9999; padding:24px;" onclick="if(event.target === this) closeExperienceModal()">
        <div class="archive-modal-content" style="max-width:880px; width:min(880px, 100%); background:var(--surface); border-radius:12px; padding:22px; box-shadow:0 24px 60px rgba(11, 34, 70, 0.24); max-height:80vh; overflow-y:auto;">
          <button class="modal-close-btn" onclick="closeExperienceModal()">&times;</button>
          <div style="display:flex; gap:16px; align-items:flex-start;">
            ${imgHtml}
            <div style="flex:1;">
              <h2 style="margin:0 0 8px; color: var(--brand);">${escapeHtml(name)}</h2>
              <p style="margin:0 0 12px; color: var(--muted);">${escapeHtml(meta)}</p>
              <p style="color: var(--ink); line-height:1.6;">${escapeHtml(fullText)}</p>
              ${galleryHtml}
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.style.overflow = 'hidden';
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    if (galleryCount > 0) {
      initModalGallery(submissionId, galleryCount);
      updateModalGalleryButtons(submissionId, galleryCount);
    }
  }

  function closeExperienceModal() {
    const modal = document.getElementById('experience-modal');
    if (modal) modal.remove();
    document.body.style.overflow = '';
  }

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') moveCarousel(-1);
    if (e.key === 'ArrowRight') moveCarousel(1);
  });

  window.addEventListener('resize', () => {
    const track = document.querySelector('.carousel-track');
    if (track) {
      const maxSlide = Math.max(0, track.children.length - getItemsPerSlide());
      currentSlide = Math.min(currentSlide, maxSlide);
      setCarouselOffset();
      updateCarouselButtons();
    }
  });

/**
 * =========================================================================
 * HIGHLIGHT MODEL SCHOOL - CLIENT ENGINE
 * Saraghundi Thall, District Hangu, KPK
 * Theme: St. Jude Academy Inspired (#2589E8 & Pure White)
 * Features: Auto Image Slider, Live CMS Content Sync, Admission Generator
 * =========================================================================
 */

const CONFIG = {
  // Backend API URL (port 3030 or relative)
  API_BASE: "/api",

  // School Management Portal URL
  PORTAL_URL: "admin.html",

  // WhatsApp Contact for Online Inquiries & Support
  WHATSAPP_NUMBER: "923018323146", // International format without +

  // School Phone Displays
  PHONE_DISPLAY: "0301-8323146",
  PHONE_SECONDARY: "0303-8262123",

  // Auto-refresh interval for announcements (in ms) - 30 seconds
  ANNOUNCEMENT_POLL_INTERVAL: 30000
};

// Fallback announcements in case backend server is unreachable
const FALLBACK_ANNOUNCEMENTS = [
  {
    id: 101,
    title: "Admissions Open for Academic Session 2026-2027",
    description: "Admissions are officially open from Playgroup to Matric (Grade 10). Limited seats are available on merit. Prospectus and admission forms are obtainable from the main campus admission desk or online.",
    announcement_date: "2026-10-01",
    status: "Published",
    author_name: "Admin Principal"
  },
  {
    id: 102,
    title: "Parent-Teacher Meeting (PTM) & Term Progress Reports",
    description: "The quarterly Parent-Teacher Meeting will be held on the upcoming Saturday from 9:00 AM to 1:00 PM. Parents are warmly encouraged to discuss their child's academic and moral progress.",
    announcement_date: "2026-09-28",
    status: "Published",
    author_name: "Admin Office"
  },
  {
    id: 103,
    title: "Launch of Smart Biometric Attendance & Parent Portal Sync",
    description: "We are pleased to announce the complete rollout of automated fingerprint biometric attendance. Daily entry and exit alerts are now synchronized in real-time with the HMS Parent Portal.",
    announcement_date: "2026-09-20",
    status: "Published",
    author_name: "Administration"
  }
];

// State
let allAnnouncements = [];
let currentCategoryFilter = "ALL";
let currentSearchQuery = "";
let pollTimer = null;
let sliderIntervalId = null;

// =========================================================================
// 1. Initialization
// =========================================================================
document.addEventListener("DOMContentLoaded", () => {
  // Lucide Icons
  refreshIcons();

  // Mobile menu
  initMobileMenu();

  // Back to top & Scroll behavior
  initBackToTop();

  // Live CMS Content Loader (Hero, Principal, About, Programs, Teachers, Contact)
  initLiveWebsiteContent();

  // Real-time Announcements
  initAnnouncements();
});

function refreshIcons() {
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

// =========================================================================
// 2. Live CMS Content Loader (Connected to Admin Backend)
// =========================================================================
async function initLiveWebsiteContent() {
  try {
    let res = await fetch(`${CONFIG.API_BASE}/content`);
    if (!res.ok) {
      res = await fetch("data/content.json");
    }
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem("hms_content_cache", JSON.stringify(data));
      applyContentToDOM(data);
      return;
    }
  } catch (err) {
    console.warn("Using cached website data:", err);
  }

  // Fallback to local cache if offline
  const cached = localStorage.getItem("hms_content_cache");
  if (cached) {
    try {
      applyContentToDOM(JSON.parse(cached));
    } catch (e) {}
  } else {
    // If no cache and server offline, init slider with HTML defaults
    initSlider();
  }
}

function applyContentToDOM(data) {
  if (!data) return;

  // 1. Hero & Ticker
  if (data.hero) {
    const h = data.hero;
    if (h.breakingNotice) {
      const ticker = document.getElementById("heroBreakingNotice");
      if (ticker) ticker.innerHTML = `<strong>${escapeHtml(h.breakingNotice)}</strong>`;
    }
    const badge = document.getElementById("heroWelcomeBadge");
    if (badge && h.welcomeBadge) badge.textContent = h.welcomeBadge;

    const title = document.getElementById("heroMainTitle");
    if (title && h.title) title.textContent = h.title;

    const sub = document.getElementById("heroMainSubtitle");
    if (sub && h.subtitle) sub.textContent = h.subtitle;

    const applyBtn = document.getElementById("heroApplyBtn");
    if (applyBtn && h.applyBtnText) applyBtn.textContent = h.applyBtnText;

    // Dynamic Hero Slides
    if (Array.isArray(h.slides) && h.slides.length > 0) {
      const sliderContainer = document.getElementById("slider-container");
      const dotsContainer = document.getElementById("sliderDotsContainer");

      if (sliderContainer) {
        sliderContainer.innerHTML = h.slides.map((s, idx) => `
          <div class="slide-item absolute inset-0 w-full h-full ${idx === 0 ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500 ease-in-out">
            <img src="${s.image}" alt="${escapeAttr(s.alt || s.title || 'Slide')}" class="w-full h-full object-cover">
          </div>
        `).join("");
      }

      if (dotsContainer) {
        dotsContainer.innerHTML = h.slides.map((_, idx) => `
          <button class="indicator-dot h-2.5 ${idx === 0 ? 'w-7 bg-[#2589E8] active' : 'w-2.5 bg-slate-300'} rounded-full transition-all hover:bg-slate-400" onclick="setSlide(${idx})" aria-label="Slide ${idx + 1}"></button>
        `).join("");
      }

      initSlider();
    } else {
      initSlider();
    }
  } else {
    initSlider();
  }

  // 2. Principal Section
  if (data.principal) {
    const p = data.principal;
    const img = document.getElementById("principalPortraitImg");
    if (img && p.photoUrl) img.src = p.photoUrl;

    const titleDisp = document.getElementById("principalTitleDisplay");
    if (titleDisp && p.principalName) titleDisp.textContent = p.principalName;

    const campusDisp = document.getElementById("principalCampusDisplay");
    if (campusDisp && p.designation) campusDisp.textContent = p.designation;

    const badgeDisp = document.getElementById("principalBadgeDisplay");
    if (badgeDisp && p.badge) badgeDisp.textContent = p.badge;

    const headingDisp = document.getElementById("principalHeadingDisplay");
    if (headingDisp && p.title) headingDisp.textContent = p.title;

    const leadDisp = document.getElementById("principalLeadDisplay");
    if (leadDisp && p.lead) leadDisp.textContent = p.lead;

    const p1Disp = document.getElementById("principalP1Display");
    if (p1Disp && p.p1) p1Disp.textContent = p.p1;

    const p2Disp = document.getElementById("principalP2Display");
    if (p2Disp && p.p2) p2Disp.textContent = p.p2;

    const phonesDisp = document.getElementById("principalPhonesDisplay");
    if (phonesDisp && p.officePhones) phonesDisp.textContent = p.officePhones;
  }

  // 3. About & Core Cards
  if (data.about) {
    const ab = data.about;
    const abBadge = document.getElementById("aboutBadgeDisplay");
    if (abBadge && ab.badge) abBadge.textContent = ab.badge;

    const abHeading = document.getElementById("aboutHeadingDisplay");
    if (abHeading && ab.title) abHeading.textContent = ab.title;

    const abLead = document.getElementById("aboutLeadDisplay");
    if (abLead && ab.lead) abLead.textContent = ab.lead;

    const introT = document.getElementById("aboutIntroTitleDisplay");
    if (introT && ab.introTitle) introT.textContent = ab.introTitle;

    const introP = document.getElementById("aboutIntroTextDisplay");
    if (introP && ab.introText) introP.textContent = ab.introText;

    const introTag = document.getElementById("aboutIntroTagDisplay");
    if (introTag && ab.introTag) introTag.textContent = ab.introTag;

    const missT = document.getElementById("aboutMissionTitleDisplay");
    if (missT && ab.missionTitle) missT.textContent = ab.missionTitle;

    const missP = document.getElementById("aboutMissionTextDisplay");
    if (missP && ab.missionText) missP.textContent = ab.missionText;

    const missTag = document.getElementById("aboutMissionTagDisplay");
    if (missTag && ab.missionTag) missTag.textContent = ab.missionTag;

    const visT = document.getElementById("aboutVisionTitleDisplay");
    if (visT && ab.visionTitle) visT.textContent = ab.visionTitle;

    const visP = document.getElementById("aboutVisionTextDisplay");
    if (visP && ab.visionText) visP.textContent = ab.visionText;

    const visTag = document.getElementById("aboutVisionTagDisplay");
    if (visTag && ab.visionTag) visTag.textContent = ab.visionTag;
  }

  // 4. Academic Programs Dynamic Render
  if (Array.isArray(data.programs) && data.programs.length > 0) {
    const progContainer = document.getElementById("programsContainer");
    if (progContainer) {
      progContainer.innerHTML = data.programs.map(pr => `
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-[#2589E8] hover:shadow-md transition-all flex flex-col justify-between">
          <div class="space-y-3">
            <div class="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2589E8]">
              <i data-lucide="${pr.icon || 'book-open'}" class="w-5 h-5 text-[#2589E8]"></i>
            </div>
            <h3 class="text-lg font-bold text-slate-800">${escapeHtml(pr.title)}</h3>
            <p class="text-xs font-semibold text-[#2589E8]">${escapeHtml(pr.subtitle)}</p>
            <p class="text-xs text-slate-600 leading-relaxed">${escapeHtml(pr.description)}</p>
          </div>
          <div class="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span class="text-slate-500 font-medium">${escapeHtml(pr.badge || '')}</span>
            <button onclick="prefillAdmissionTrack('${escapeAttr(pr.actionTag || pr.title)}')" class="font-bold text-[#2589E8] hover:underline">Apply Now</button>
          </div>
        </div>
      `).join("");
    }
  }

  // 5. Teachers Directory Dynamic Render
  if (Array.isArray(data.teachers) && data.teachers.length > 0) {
    const teachersContainer = document.getElementById("teachersContainer");
    if (teachersContainer) {
      teachersContainer.innerHTML = data.teachers.map(tc => `
        <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:border-[#2589E8] hover:shadow-md transition-all group">
          <div class="aspect-square w-full overflow-hidden bg-slate-100 relative">
            <img src="${tc.image || 'images/logo.png'}" alt="${escapeAttr(tc.name)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
            <div class="absolute top-3 right-3 bg-white/95 px-2.5 py-1 rounded-md border border-slate-100 text-[11px] font-bold text-[#2589E8]">
              ${escapeHtml(tc.department || 'Faculty')}
            </div>
          </div>
          <div class="p-6 space-y-3">
            <div>
              <h3 class="text-xl font-bold text-slate-800">${escapeHtml(tc.name)}</h3>
              <p class="text-sm font-semibold text-[#2589E8]">${escapeHtml(tc.role)}</p>
            </div>
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span class="font-medium">${escapeHtml(tc.subjects || '')}</span>
              <span class="font-semibold text-[#2589E8]">${escapeHtml(tc.experience || '')}</span>
            </div>
          </div>
        </div>
      `).join("");
    }
  }

  // 6. Contact Information
  if (data.general) {
    const gen = data.general;
    const addr = document.getElementById("contactAddressDisplay");
    if (addr && gen.campusLocation) addr.textContent = gen.campusLocation;

    const phones = document.getElementById("contactPhonesDisplay");
    if (phones && (gen.phone1 || gen.phone2)) {
      phones.innerHTML = `${escapeHtml(gen.phone1 || '')}<br>${escapeHtml(gen.phone2 || '')}`;
    }

    const hours = document.getElementById("contactHoursDisplay");
    if (hours && gen.officeHours) hours.textContent = gen.officeHours;

    if (gen.whatsapp) {
      CONFIG.WHATSAPP_NUMBER = gen.whatsapp;
    }
  }

  // 7. Announcements Sync
  if (Array.isArray(data.announcements) && data.announcements.length > 0) {
    allAnnouncements = data.announcements.filter(a => a.status !== "Draft");
    renderAnnouncements();
  }

  refreshIcons();
}

// =========================================================================
// 3. Automatic Image Slider
// =========================================================================
function initSlider() {
  const slides = document.querySelectorAll(".slide-item");
  const dots = document.querySelectorAll(".indicator-dot");
  if (!slides.length) return;

  let currentIndex = 0;
  const totalSlides = slides.length;

  if (sliderIntervalId) clearInterval(sliderIntervalId);

  function showSlide(index) {
    slides.forEach((slide, i) => {
      if (i === index) {
        slide.classList.remove("opacity-0");
        slide.classList.add("opacity-100");
      } else {
        slide.classList.remove("opacity-100");
        slide.classList.add("opacity-0");
      }
    });

    dots.forEach((dot, i) => {
      if (i === index) {
        dot.classList.add("active", "bg-[#2589E8]", "w-7");
        dot.classList.remove("bg-slate-300", "w-2.5");
      } else {
        dot.classList.remove("active", "bg-[#2589E8]", "w-7");
        dot.classList.add("bg-slate-300", "w-2.5");
      }
    });

    currentIndex = index;
  }

  function nextSlide() {
    const next = (currentIndex + 1) % totalSlides;
    showSlide(next);
  }

  // Smooth automatic transition every 3.5 seconds
  sliderIntervalId = setInterval(nextSlide, 3500);

  // Manual indicator click
  window.setSlide = function(index) {
    clearInterval(sliderIntervalId);
    showSlide(index);
    sliderIntervalId = setInterval(nextSlide, 3500);
  };
}

// =========================================================================
// 4. Mobile Navigation Menu
// =========================================================================
function initMobileMenu() {
  const menuBtn = document.getElementById("mobileMenuBtn");
  const closeBtn = document.getElementById("mobileMenuCloseBtn");
  const mobileMenu = document.getElementById("mobileMenu");
  const navLinks = document.querySelectorAll(".mobile-nav-link");

  if (!menuBtn || !mobileMenu) return;

  function toggleMenu(show) {
    if (show) {
      mobileMenu.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    } else {
      mobileMenu.classList.add("hidden");
      document.body.style.overflow = "";
    }
  }

  menuBtn.addEventListener("click", () => toggleMenu(true));
  if (closeBtn) closeBtn.addEventListener("click", () => toggleMenu(false));

  mobileMenu.addEventListener("click", (e) => {
    if (e.target === mobileMenu) toggleMenu(false);
  });

  navLinks.forEach(link => {
    link.addEventListener("click", () => toggleMenu(false));
  });
}

// =========================================================================
// 5. Real-Time Announcements
// =========================================================================
function initAnnouncements() {
  const searchInput = document.getElementById("announcementSearch");
  const categoryContainer = document.getElementById("categoryFilterContainer");

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearchQuery = e.target.value.trim().toLowerCase();
      renderAnnouncements();
    });
  }

  if (categoryContainer) {
    const pills = categoryContainer.querySelectorAll(".filter-pill");
    pills.forEach(pill => {
      pill.addEventListener("click", () => {
        pills.forEach(p => {
          p.classList.remove("bg-[#2589E8]", "text-white");
          p.classList.add("bg-white", "text-slate-600", "border", "border-slate-200");
        });
        pill.classList.remove("bg-white", "text-slate-600", "border", "border-slate-200");
        pill.classList.add("bg-[#2589E8]", "text-white");

        currentCategoryFilter = pill.getAttribute("data-category") || "ALL";
        renderAnnouncements();
      });
    });
  }

  // Initial fetch
  fetchAnnouncements();

  // Setup periodic live polling
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(fetchAnnouncements, CONFIG.ANNOUNCEMENT_POLL_INTERVAL);
}

async function fetchAnnouncements() {
  const statusBadge = document.getElementById("announcementLiveStatus");

  try {
    const response = await fetch(`${CONFIG.API_BASE}/content`);
    if (!response.ok) throw new Error("Could not reach server");

    const data = await response.json();
    if (data && Array.isArray(data.announcements)) {
      allAnnouncements = data.announcements.filter(a => a.status !== "Draft");

      if (statusBadge) {
        statusBadge.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-[#2589E8] live-indicator"></span>
          <span class="text-slate-800 font-bold">Live Connected (${allAnnouncements.length} Notices)</span>
        `;
        statusBadge.className = "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs bg-blue-50 border border-blue-200 text-[#2589E8]";
      }

      renderAnnouncements();
      return;
    }
  } catch (err) {
    if (!allAnnouncements || allAnnouncements.length === 0) {
      allAnnouncements = FALLBACK_ANNOUNCEMENTS;
    }

    if (statusBadge) {
      statusBadge.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-slate-400"></span>
        <span class="text-slate-600 font-medium">Official Notice Board (${allAnnouncements.length} Notices)</span>
      `;
      statusBadge.className = "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs bg-slate-100 border border-slate-200";
    }

    renderAnnouncements();
  }
}

function renderAnnouncements() {
  const container = document.getElementById("announcementList");
  if (!container) return;

  const filtered = allAnnouncements.filter(item => {
    const title = (item.title || "").toLowerCase();
    const desc = (item.description || "").toLowerCase();

    const queryMatches = !currentSearchQuery || 
      title.includes(currentSearchQuery) || 
      desc.includes(currentSearchQuery);

    if (!queryMatches) return false;

    if (currentCategoryFilter === "ALL") return true;
    if (currentCategoryFilter === "ADMISSION" && (item.category === "ADMISSION" || title.includes("admission") || desc.includes("admission"))) return true;
    if (currentCategoryFilter === "EXAM" && (item.category === "EXAM" || title.includes("exam") || title.includes("result") || desc.includes("result"))) return true;
    if (currentCategoryFilter === "HOLIDAY" && (item.category === "HOLIDAY" || title.includes("holiday") || title.includes("vacation"))) return true;
    if (currentCategoryFilter === "GENERAL") return true;

    return false;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
        <div class="w-12 h-12 rounded-xl bg-blue-50 text-[#2589E8] flex items-center justify-center mx-auto mb-3 border border-blue-100">
          <i data-lucide="inbox" class="w-6 h-6"></i>
        </div>
        <h4 class="text-base font-bold text-slate-800">No Circular Found</h4>
        <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          No notices match this category or search filter right now.
        </p>
      </div>
    `;
    refreshIcons();
    return;
  }

  container.innerHTML = filtered.map((item, idx) => {
    const isNew = idx === 0;
    const author = item.author_name || "Admin Principal";
    const dateStr = formatDate(item.announcement_date || item.created_at);

    return `
      <article class="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:border-[#2589E8] hover:shadow-md transition-all">
        <div>
          <!-- Header metadata -->
          <div class="flex items-center justify-between gap-2 mb-3">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-[#2589E8] border border-blue-100">
              <i data-lucide="calendar" class="w-3.5 h-3.5 text-[#2589E8]"></i>
              <span>${dateStr}</span>
            </span>
            ${isNew ? `
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#2589E8] text-white">
                New Notice
              </span>
            ` : `
              <span class="text-xs text-slate-400 font-bold">#${item.id}</span>
            `}
          </div>

          <!-- Title -->
          <h3 class="text-lg font-bold text-slate-800 leading-snug">
            ${escapeHtml(item.title)}
          </h3>

          <!-- Description preview -->
          <p class="text-xs text-slate-600 mt-2.5 line-clamp-3 leading-relaxed">
            ${escapeHtml(item.description)}
          </p>
        </div>

        <!-- Footer Card Details -->
        <div class="pt-4 mt-5 border-t border-slate-100 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-blue-50 text-[#2589E8] font-bold text-xs flex items-center justify-center border border-blue-100">
              H
            </div>
            <div class="text-[11px]">
              <span class="font-bold text-slate-800 block leading-tight">${escapeHtml(author)}</span>
              <span class="text-[10px] text-slate-500">Official Notice</span>
            </div>
          </div>

          <button 
            type="button"
            onclick="openAnnouncementModal(${item.id})"
            class="inline-flex items-center gap-1.5 text-xs font-bold text-[#2589E8] hover:underline"
          >
            <span>Read Details</span>
            <i data-lucide="arrow-right" class="w-3.5 h-3.5 text-[#2589E8]"></i>
          </button>
        </div>
      </article>
    `;
  }).join("");

  refreshIcons();
}

// Modal view for announcement details
window.openAnnouncementModal = function(id) {
  const item = allAnnouncements.find(a => a.id === id);
  if (!item) return;

  const modal = document.getElementById("announcementModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalDate = document.getElementById("modalDate");
  const modalContent = document.getElementById("modalContent");
  const modalAttachment = document.getElementById("modalAttachment");
  const modalAttachmentLink = document.getElementById("modalAttachmentLink");
  const modalShareWhatsApp = document.getElementById("modalShareWhatsApp");

  if (!modal) return;

  if (modalTitle) modalTitle.textContent = item.title;
  if (modalDate) modalDate.textContent = formatDate(item.announcement_date || item.created_at);
  if (modalContent) modalContent.textContent = item.description;

  if (item.attachment_url && modalAttachment && modalAttachmentLink) {
    modalAttachment.classList.remove("hidden");
    modalAttachmentLink.href = item.attachment_url;
  } else if (modalAttachment) {
    modalAttachment.classList.add("hidden");
  }

  if (modalShareWhatsApp) {
    const text = `*Highlight Model School Notice*\n\n*${item.title}*\n${item.description}\n\nDate: ${formatDate(item.announcement_date || item.created_at)}\nSaraghundi Thall, Hangu`;
    modalShareWhatsApp.href = `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  refreshIcons();
};

window.closeAnnouncementModal = function() {
  const modal = document.getElementById("announcementModal");
  if (modal) {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }
};

// =========================================================================
// 6. Admissions Form & Exact Physical Form Replica Generator
// =========================================================================
window.handleDobChange = function(dateStr) {
  if (!dateStr) return;
  const inWords = convertDateToWords(dateStr);
  const inputWords = document.getElementById("admInWords");
  if (inputWords && inWords) {
    inputWords.value = inWords;
  }
};

window.loadSampleFormData = function() {
  document.getElementById("admNation").value = "Bangash";
  document.getElementById("admOccupation").value = "Driver in UAE";
  document.getElementById("admClass").value = "Nursery";
  document.getElementById("admStuName").value = "SHAH ABDUL LATIF";
  document.getElementById("admFatherName").value = "RIZWAN SHAH";
  document.getElementById("admReligion").value = "Islam";
  document.getElementById("admNationality").value = "Pakistan";
  document.getElementById("admDOB").value = "2023-01-08";
  document.getElementById("admInWords").value = "Eight January two thousand thirteen";
  document.getElementById("admLastSchool").value = "-";
  document.getElementById("admAddress").value = "Moh. Bijli Gar thall";
  document.getElementById("admContact").value = "0332-9666779 / 0333 9629280";

  const form = document.getElementById("admissionForm");
  if (form) {
    const event = new Event("submit", { cancelable: true });
    form.dispatchEvent(event);
  }
};

window.prefillAdmissionTrack = function(trackName) {
  const classInput = document.getElementById("admClass");
  const admissionsSection = document.getElementById("admissions");

  if (classInput) {
    if (trackName.includes("Pre-Primary")) classInput.value = "Nursery / KG";
    else if (trackName.includes("Primary")) classInput.value = "Class 1st";
    else if (trackName.includes("Middle")) classInput.value = "Class 6th";
    else if (trackName.includes("Secondary") || trackName.includes("Matric")) classInput.value = "Class 9th (Science)";
    else classInput.value = trackName;
  }

  if (admissionsSection) {
    admissionsSection.scrollIntoView({ behavior: "smooth" });
  }
};

window.handleAdmissionSubmit = function(event) {
  event.preventDefault();

  const nation = document.getElementById("admNation")?.value || "Bangash";
  const occupation = document.getElementById("admOccupation")?.value || "Driver in UAE";
  const className = document.getElementById("admClass")?.value || "Nursery";
  const stuName = document.getElementById("admStuName")?.value || "SHAH ABDUL LATIF";
  const fatherName = document.getElementById("admFatherName")?.value || "RIZWAN SHAH";
  const religion = document.getElementById("admReligion")?.value || "Islam";
  const nationality = document.getElementById("admNationality")?.value || "Pakistan";
  const dobRaw = document.getElementById("admDOB")?.value || "2023-01-08";
  const inWords = document.getElementById("admInWords")?.value || convertDateToWords(dobRaw);
  const lastSchool = document.getElementById("admLastSchool")?.value || "-";
  const address = document.getElementById("admAddress")?.value || "Moh. Bijli Gar thall";
  const contact = document.getElementById("admContact")?.value || "0332-9666779 / 0301-8323146";

  let formattedDOB = dobRaw;
  if (dobRaw && dobRaw.includes("-")) {
    const [y, m, d] = dobRaw.split("-");
    formattedDOB = `${d} - ${m} - ${y}`;
  }

  const regNo = "HMS-2026-" + Math.floor(1000 + Math.random() * 9000);

  // Populate Exact Physical Replica Form
  document.getElementById("formPaperNation").textContent = nation;
  document.getElementById("formPaperOccupation").textContent = occupation;
  document.getElementById("formPaperRegNo").textContent = regNo;

  document.getElementById("formPaperName").textContent = stuName;
  document.getElementById("formPaperFather").textContent = fatherName;

  document.getElementById("formPaperReligion").textContent = religion;
  document.getElementById("formPaperNationality").textContent = nationality;
  document.getElementById("formPaperDOB").textContent = formattedDOB;
  document.getElementById("formPaperInWords").textContent = inWords;
  document.getElementById("formPaperLastSchool").textContent = lastSchool;
  document.getElementById("formPaperClass").textContent = className;
  document.getElementById("formPaperAddress").textContent = address;
  document.getElementById("formPaperContact").textContent = contact;

  // Save to Admin CMS Submissions Backend!
  const applicationPayload = {
    id: regNo,
    regNo: regNo,
    stuName: stuName,
    fatherName: fatherName,
    nation: nation,
    occupation: occupation,
    className: className,
    religion: religion,
    nationality: nationality,
    dob: formattedDOB,
    inWords: inWords,
    lastSchool: lastSchool,
    address: address,
    contact: contact,
    status: "Pending",
    submittedAt: new Date().toISOString()
  };

  fetch(`${CONFIG.API_BASE}/admissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(applicationPayload)
  }).catch(e => console.log("Stored offline application"));

  // WhatsApp Pre-fill Link
  const waMessage = 
    `*HIGH LIGHT MODEL SCHOOL - OFFICIAL ADMISSION FORM*\n` +
    `*Reg. No:* ${regNo}\n` +
    `*Class:* ${className}\n` +
    `*Student:* ${stuName}\n` +
    `*Father:* ${fatherName}\n` +
    `*Nation:* ${nation}\n` +
    `*Father Occupation:* ${occupation}\n` +
    `*Religion:* ${religion}\n` +
    `*DOB:* ${formattedDOB} (${inWords})\n` +
    `*Address:* ${address}\n` +
    `*Contact:* ${contact}\n` +
    `Saraghundi Thall District Hangu`;

  const waBtn = document.getElementById("slipWhatsAppSubmitBtn");
  if (waBtn) {
    waBtn.href = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(waMessage)}`;
  }

  // Show Modal
  const modal = document.getElementById("admissionSlipModal");
  if (modal) {
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  refreshIcons();
};

window.closeAdmissionSlipModal = function() {
  const modal = document.getElementById("admissionSlipModal");
  if (modal) {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }
};

window.printAdmissionSlip = function() {
  window.print();
};

// Date to words helper
function convertDateToWords(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return "";
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function numToWords(n) {
    if (n === 0) return "Zero";
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + numToWords(n % 100) : "");
    if (n < 100000) return numToWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + numToWords(n % 1000) : "");
    return String(n);
  }

  const dayWord = numToWords(day);
  const monthWord = months[month - 1] || "";
  const yearWord = numToWords(year);

  return `${dayWord} ${monthWord} ${yearWord}`.toLowerCase();
}

// =========================================================================
// 7. Back to Top Button
// =========================================================================
function initBackToTop() {
  const btn = document.getElementById("backToTopBtn");
  if (!btn) return;

  window.addEventListener("scroll", () => {
    if (window.scrollY > 400) {
      btn.classList.remove("opacity-0", "pointer-events-none");
      btn.classList.add("opacity-100");
    } else {
      btn.classList.add("opacity-0", "pointer-events-none");
      btn.classList.remove("opacity-100");
    }
  });

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// Helpers
function formatDate(dateStr) {
  if (!dateStr) return "Recent Notice";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return dateStr;
  }
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(text) {
  if (!text) return "";
  return String(text)
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

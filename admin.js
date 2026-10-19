/**
 * =========================================================================
 * HIGHLIGHT MODEL SCHOOL - ADMIN CMS JAVASCRIPT ENGINE
 * Saraghundi Thall, District Hangu, KPK
 * Complete dynamic content editing, image uploading, and admissions management
 * =========================================================================
 */

let websiteData = null;
let admissionsData = [];
let activeTab = "dashboard";

// -------------------------------------------------------------------------
// 1. INITIALIZATION & AUTHENTICATION
// -------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  checkAuthSession();
  initMobileSidebar();
  loadAllData();
});

function refreshIcons() {
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

function checkAuthSession() {
  const token = localStorage.getItem("hms_admin_token") || sessionStorage.getItem("hms_admin_token");
  const overlay = document.getElementById("loginOverlay");
  if (token) {
    if (overlay) overlay.classList.add("hidden");
  } else {
    if (overlay) overlay.classList.remove("hidden");
  }
  refreshIcons();
}

function fillDemoCredentials() {
  document.getElementById("loginUsername").value = "admin";
  document.getElementById("loginPassword").value = "admin123";
}

async function handleLogin(event) {
  event.preventDefault();
  const user = document.getElementById("loginUsername").value.trim();
  const pass = document.getElementById("loginPassword").value.trim();
  const remember = document.getElementById("rememberMe").checked;
  const alertBox = document.getElementById("loginAlert");

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user, password: pass })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      if (remember) {
        localStorage.setItem("hms_admin_token", data.token);
      } else {
        sessionStorage.setItem("hms_admin_token", data.token);
      }
      document.getElementById("loginOverlay").classList.add("hidden");
      showToast("Welcome to HMS Admin CMS!", "success");
      loadAllData();
    } else {
      throw new Error(data.error || "Invalid username or password");
    }
  } catch (err) {
    // Local fallback check if server isn't running
    if (user === "admin" && pass === "admin123") {
      const mockToken = "hms_local_token_" + Date.now();
      if (remember) localStorage.setItem("hms_admin_token", mockToken);
      else sessionStorage.setItem("hms_admin_token", mockToken);
      document.getElementById("loginOverlay").classList.add("hidden");
      showToast("Signed in successfully (Offline Mode)", "info");
      loadAllData();
      return;
    }

    if (alertBox) {
      alertBox.textContent = err.message || "Login failed. Please check your credentials.";
      alertBox.classList.remove("hidden");
    }
  }
}

function handleLogout() {
  if (confirm("Are you sure you want to sign out?")) {
    localStorage.removeItem("hms_admin_token");
    sessionStorage.removeItem("hms_admin_token");
    window.location.reload();
  }
}

// -------------------------------------------------------------------------
// 2. DATA LOADING & SAVING (API + LOCALSTORAGE DUAL SYNC)
// -------------------------------------------------------------------------
async function loadAllData() {
  try {
    let res = await fetch("/api/content");
    if (!res.ok) {
      res = await fetch("data/content.json");
    }
    if (res.ok) {
      websiteData = await res.json();
      localStorage.setItem("hms_content_cache", JSON.stringify(websiteData));
      document.getElementById("backendStatusPill").innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Connected`;
    } else {
      throw new Error("API not ready");
    }
  } catch (err) {
    console.warn("Using cached or local data:", err);
    const cached = localStorage.getItem("hms_content_cache");
    if (cached) {
      websiteData = JSON.parse(cached);
    }
    document.getElementById("backendStatusPill").innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Local Cache`;
  }

  // Also load admissions
  try {
    const admRes = await fetch("/api/admissions");
    if (admRes.ok) {
      admissionsData = await admRes.json();
    }
  } catch (e) {
    admissionsData = [];
  }

  populateAllFields();
  refreshDashboard();
  renderAdmissionsTable();
  refreshIcons();
}

async function saveAllContent(showToastAlert = true) {
  if (!websiteData) return;

  // Gather Form Values into websiteData object
  gatherHeroFields();
  gatherPrincipalFields();
  gatherAboutFields();
  gatherContactFields();

  // Save to LocalStorage cache
  localStorage.setItem("hms_content_cache", JSON.stringify(websiteData));

  // Save to Backend server if available
  const saveBtn = document.getElementById("saveAllBtn");
  if (saveBtn) {
    saveBtn.innerHTML = `<i data-lucide="loader" class="w-3.5 h-3.5 text-white animate-spin"></i><span>Saving...</span>`;
    refreshIcons();
  }

  try {
    const res = await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(websiteData)
    });

    if (!res.ok) throw new Error("Failed to save to server");
    if (showToastAlert) showToast("All changes saved successfully!", "success");
  } catch (err) {
    console.warn("Saved to local storage:", err);
    if (showToastAlert) showToast("Saved to browser storage!", "info");
  } finally {
    if (saveBtn) {
      saveBtn.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5 text-white"></i><span>Saved!</span>`;
      refreshIcons();
      setTimeout(() => {
        saveBtn.innerHTML = `<i data-lucide="save" class="w-3.5 h-3.5 text-white"></i><span>Save Changes</span>`;
        refreshIcons();
      }, 2000);
    }
    refreshDashboard();
  }
}

// -------------------------------------------------------------------------
// 3. IMAGE UPLOAD HELPER (BASE64 TO SERVER /IMAGES DIR)
// -------------------------------------------------------------------------
function triggerFileInput(id) {
  const input = document.getElementById(id);
  if (input) input.click();
}

function uploadImageHandler(fileInput, callback) {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;

  if (file.size > 15 * 1024 * 1024) {
    alert("Image is too large! Please choose an image smaller than 15MB.");
    return;
  }

  showToast("Uploading image...", "info");

  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64Data = e.target.result;

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          data: base64Data
        })
      });

      const data = await response.json();
      if (response.ok && data.success && data.url) {
        showToast("Image uploaded to server!", "success");
        callback(data.url);
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (err) {
      console.warn("Falling back to data URI:", err);
      // Fallback: use the base64 string directly so it works even offline
      showToast("Image stored as local asset!", "info");
      callback(base64Data);
    }
  };
  reader.readAsDataURL(file);
}

// -------------------------------------------------------------------------
// 4. TAB SWITCHING & DASHBOARD
// -------------------------------------------------------------------------
function switchTab(tabId) {
  activeTab = tabId;

  // Toggle active pane
  document.querySelectorAll(".tab-pane").forEach(pane => {
    pane.classList.add("hidden");
  });
  const targetPane = document.getElementById(`tab-${tabId}`);
  if (targetPane) targetPane.classList.remove("hidden");

  // Toggle active nav tab style
  document.querySelectorAll(".nav-tab").forEach(tab => {
    tab.classList.remove("active-nav-tab");
    if (tab.getAttribute("data-tab") === tabId) {
      tab.classList.add("active-nav-tab");
    }
  });

  refreshIcons();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function initMobileSidebar() {
  const toggle = document.getElementById("mobileSidebarToggle");
  const sidebar = document.getElementById("sidebarNav");
  if (!toggle || !sidebar) return;

  toggle.addEventListener("click", () => {
    sidebar.classList.toggle("hidden");
  });
}

function refreshDashboard() {
  if (!websiteData) return;

  const totalNotices = (websiteData.announcements || []).length;
  const totalTeachers = (websiteData.teachers || []).length;
  const totalSlides = (websiteData.hero?.slides || []).length;
  const totalAdmissions = admissionsData.length;

  document.getElementById("dashTotalNotices").textContent = totalNotices;
  document.getElementById("dashTotalTeachers").textContent = totalTeachers;
  document.getElementById("dashTotalSlides").textContent = totalSlides;
  document.getElementById("dashTotalAdmissions").textContent = totalAdmissions;
  document.getElementById("admissionsTotalBadge").textContent = totalAdmissions;
  document.getElementById("sidebarAdmissionsBadge").textContent = totalAdmissions;

  const breakingNotice = websiteData.hero?.breakingNotice || "Admissions Open";
  document.getElementById("dashBreakingPreview").textContent = `"${breakingNotice}"`;
}

// -------------------------------------------------------------------------
// 5. POPULATE & GATHER FORMS
// -------------------------------------------------------------------------
function populateAllFields() {
  if (!websiteData) return;

  // 1. Hero
  const hero = websiteData.hero || {};
  document.getElementById("heroBreakingNoticeInput").value = hero.breakingNotice || "";
  document.getElementById("heroWelcomeBadge").value = hero.welcomeBadge || "";
  document.getElementById("heroTitle").value = hero.title || "";
  document.getElementById("heroSubtitle").value = hero.subtitle || "";
  document.getElementById("heroApplyBtnText").value = hero.applyBtnText || "";
  renderSlidesList();

  // 2. Principal
  const p = websiteData.principal || {};
  document.getElementById("principalBadge").value = p.badge || "";
  document.getElementById("principalTitle").value = p.title || "";
  document.getElementById("principalNameInput").value = p.principalName || "";
  document.getElementById("principalDesignationInput").value = p.designation || "";
  document.getElementById("principalOfficePhones").value = p.officePhones || "";
  document.getElementById("principalLead").value = p.lead || "";
  document.getElementById("principalP1").value = p.p1 || "";
  document.getElementById("principalP2").value = p.p2 || "";
  document.getElementById("principalPhotoUrlInput").value = p.photoUrl || "";
  document.getElementById("principalPhotoPreview").src = p.photoUrl || "images/logo.png";

  // 3. About
  const about = websiteData.about || {};
  document.getElementById("aboutBadge").value = about.badge || "";
  document.getElementById("aboutTitle").value = about.title || "";
  document.getElementById("aboutLead").value = about.lead || "";
  document.getElementById("aboutIntroTitle").value = about.introTitle || "";
  document.getElementById("aboutIntroText").value = about.introText || "";
  document.getElementById("aboutIntroTag").value = about.introTag || "";
  document.getElementById("aboutMissionTitle").value = about.missionTitle || "";
  document.getElementById("aboutMissionText").value = about.missionText || "";
  document.getElementById("aboutMissionTag").value = about.missionTag || "";
  document.getElementById("aboutVisionTitle").value = about.visionTitle || "";
  document.getElementById("aboutVisionText").value = about.visionText || "";
  document.getElementById("aboutVisionTag").value = about.visionTag || "";
  renderStatsList();

  // 4. Programs, Teachers, Notices, Facilities
  renderProgramsList();
  renderTeachersList();
  renderAnnouncementsList();
  renderFacilitiesList();

  // 5. Contact
  const gen = websiteData.general || {};
  document.getElementById("contactSchoolName").value = gen.schoolName || "";
  document.getElementById("contactEmail").value = gen.email || "";
  document.getElementById("contactPhone1").value = gen.phone1 || "";
  document.getElementById("contactPhone2").value = gen.phone2 || "";
  document.getElementById("contactWhatsapp").value = gen.whatsapp || "";
  document.getElementById("contactOfficeHours").value = gen.officeHours || "";
  document.getElementById("contactAddress").value = gen.campusLocation || "";
}

function gatherHeroFields() {
  if (!websiteData.hero) websiteData.hero = {};
  websiteData.hero.breakingNotice = document.getElementById("heroBreakingNoticeInput").value;
  websiteData.hero.welcomeBadge = document.getElementById("heroWelcomeBadge").value;
  websiteData.hero.title = document.getElementById("heroTitle").value;
  websiteData.hero.subtitle = document.getElementById("heroSubtitle").value;
  websiteData.hero.applyBtnText = document.getElementById("heroApplyBtnText").value;
}

function gatherPrincipalFields() {
  if (!websiteData.principal) websiteData.principal = {};
  websiteData.principal.badge = document.getElementById("principalBadge").value;
  websiteData.principal.title = document.getElementById("principalTitle").value;
  websiteData.principal.principalName = document.getElementById("principalNameInput").value;
  websiteData.principal.designation = document.getElementById("principalDesignationInput").value;
  websiteData.principal.officePhones = document.getElementById("principalOfficePhones").value;
  websiteData.principal.lead = document.getElementById("principalLead").value;
  websiteData.principal.p1 = document.getElementById("principalP1").value;
  websiteData.principal.p2 = document.getElementById("principalP2").value;
  websiteData.principal.photoUrl = document.getElementById("principalPhotoUrlInput").value;
}

function gatherAboutFields() {
  if (!websiteData.about) websiteData.about = {};
  websiteData.about.badge = document.getElementById("aboutBadge").value;
  websiteData.about.title = document.getElementById("aboutTitle").value;
  websiteData.about.lead = document.getElementById("aboutLead").value;
  websiteData.about.introTitle = document.getElementById("aboutIntroTitle").value;
  websiteData.about.introText = document.getElementById("aboutIntroText").value;
  websiteData.about.introTag = document.getElementById("aboutIntroTag").value;
  websiteData.about.missionTitle = document.getElementById("aboutMissionTitle").value;
  websiteData.about.missionText = document.getElementById("aboutMissionText").value;
  websiteData.about.missionTag = document.getElementById("aboutMissionTag").value;
  websiteData.about.visionTitle = document.getElementById("aboutVisionTitle").value;
  websiteData.about.visionText = document.getElementById("aboutVisionText").value;
  websiteData.about.visionTag = document.getElementById("aboutVisionTag").value;
}

function gatherContactFields() {
  if (!websiteData.general) websiteData.general = {};
  websiteData.general.schoolName = document.getElementById("contactSchoolName").value;
  websiteData.general.email = document.getElementById("contactEmail").value;
  websiteData.general.phone1 = document.getElementById("contactPhone1").value;
  websiteData.general.phone2 = document.getElementById("contactPhone2").value;
  websiteData.general.whatsapp = document.getElementById("contactWhatsapp").value;
  websiteData.general.officeHours = document.getElementById("contactOfficeHours").value;
  websiteData.general.campusLocation = document.getElementById("contactAddress").value;
}

// -------------------------------------------------------------------------
// 6. HERO SLIDER SLIDES MANAGER
// -------------------------------------------------------------------------
function renderSlidesList() {
  const container = document.getElementById("slidesListContainer");
  if (!container || !websiteData) return;

  const slides = websiteData.hero?.slides || [];
  container.innerHTML = slides.map((slide, idx) => `
    <div class="p-3 rounded-2xl border border-slate-200 bg-slate-50 space-y-3 relative group">
      <div class="aspect-video rounded-xl overflow-hidden bg-slate-200 relative">
        <img src="${slide.image}" alt="${slide.alt || 'Slide'}" class="w-full h-full object-cover">
        <span class="absolute top-2 left-2 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
          Slide #${idx + 1}
        </span>
      </div>

      <div class="space-y-1.5">
        <input 
          type="text" 
          value="${escapeAttr(slide.title || '')}" 
          onchange="updateSlideProperty(${idx}, 'title', this.value)"
          placeholder="Slide Caption / Title" 
          class="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 font-bold"
        >
        <div class="flex items-center gap-1.5">
          <label class="cursor-pointer px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#2589E8] font-bold text-[11px] flex items-center gap-1">
            <i data-lucide="upload" class="w-3 h-3"></i>
            <span>Upload New Pic</span>
            <input type="file" accept="image/*" class="hidden" onchange="uploadImageHandler(this, (url) => updateSlideProperty(${idx}, 'image', url))">
          </label>
          <button 
            type="button" 
            onclick="deleteSlide(${idx})"
            class="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 ml-auto transition-colors"
            title="Delete slide"
          >
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    </div>
  `).join("");

  refreshIcons();
}

window.updateSlideProperty = function(idx, prop, value) {
  if (websiteData?.hero?.slides?.[idx]) {
    websiteData.hero.slides[idx][prop] = value;
    renderSlidesList();
    saveAllContent(false);
  }
};

window.deleteSlide = function(idx) {
  if (confirm("Delete this slide?")) {
    websiteData.hero.slides.splice(idx, 1);
    renderSlidesList();
    saveAllContent(true);
  }
};

window.addNewSlidePrompt = function() {
  const newSlide = {
    id: Date.now(),
    title: "New School Activity",
    alt: "Highlight Model School Activity",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDO6Vt8krrs9nEOfcYTwmrDdx8IbK4-YG_P3p8s59QVq2dCtb16Eic2CPVP52AlsHGse3DpEctcZQVxqQMLUW_ndgkA07KG-xziD8x5WS_CMgsjDxaYGIHOu7r4KnQQNqwe-y09nYCrjpvNv04dT-xFnmSKBUD2PY32VIpNVVzH_XTIbgTG2bm6GgTsr1WW5gb4EpmIHs5TA-iB__IdV_07c3NCxHr-fibyoHJD-LzHeyqSsSYv2hcV"
  };
  if (!websiteData.hero) websiteData.hero = {};
  if (!websiteData.hero.slides) websiteData.hero.slides = [];
  websiteData.hero.slides.push(newSlide);
  renderSlidesList();
  showToast("New slide added! Click 'Upload New Pic' to choose a photo.", "info");
};

// -------------------------------------------------------------------------
// 7. PRINCIPAL PHOTO HANDLERS
// -------------------------------------------------------------------------
function setPrincipalPhoto(url) {
  document.getElementById("principalPhotoUrlInput").value = url;
  document.getElementById("principalPhotoPreview").src = url;
  if (!websiteData.principal) websiteData.principal = {};
  websiteData.principal.photoUrl = url;
  saveAllContent(false);
}

function updatePrincipalPhotoPreview(url) {
  document.getElementById("principalPhotoPreview").src = url || "images/logo.png";
}

// -------------------------------------------------------------------------
// 8. STATS COUNTERS
// -------------------------------------------------------------------------
function renderStatsList() {
  const container = document.getElementById("statsListContainer");
  if (!container || !websiteData) return;

  const stats = websiteData.about?.stats || [];
  container.innerHTML = stats.map((stat, idx) => `
    <div class="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
      <input 
        type="text" 
        value="${escapeAttr(stat.number)}" 
        onchange="updateStatProperty(${idx}, 'number', this.value)"
        class="w-full text-lg font-black text-[#2589E8] px-2 py-1 rounded-lg border border-slate-200 text-center"
      >
      <input 
        type="text" 
        value="${escapeAttr(stat.label)}" 
        onchange="updateStatProperty(${idx}, 'label', this.value)"
        class="w-full text-xs font-semibold text-slate-600 px-2 py-1 rounded-lg border border-slate-200 text-center"
      >
    </div>
  `).join("");
}

window.updateStatProperty = function(idx, prop, val) {
  if (websiteData?.about?.stats?.[idx]) {
    websiteData.about.stats[idx][prop] = val;
    saveAllContent(false);
  }
};

// -------------------------------------------------------------------------
// 9. ACADEMIC PROGRAMS
// -------------------------------------------------------------------------
function renderProgramsList() {
  const container = document.getElementById("programsListContainer");
  if (!container || !websiteData) return;

  const progs = websiteData.programs || [];
  container.innerHTML = progs.map((p, idx) => `
    <div class="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3 relative">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold text-[#2589E8] uppercase tracking-wide">Wing #${idx + 1}</span>
        <button onclick="deleteProgram(${idx})" class="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <input 
          type="text" 
          value="${escapeAttr(p.title)}" 
          onchange="updateProgramProperty(${idx}, 'title', this.value)"
          placeholder="Wing Title" 
          class="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 font-bold"
        >
        <input 
          type="text" 
          value="${escapeAttr(p.subtitle)}" 
          onchange="updateProgramProperty(${idx}, 'subtitle', this.value)"
          placeholder="Subtitle / Classes" 
          class="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-[#2589E8]"
        >
      </div>

      <textarea 
        rows="2" 
        onchange="updateProgramProperty(${idx}, 'description', this.value)"
        class="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
      >${escapeHtml(p.description)}</textarea>

      <div class="flex items-center gap-2">
        <input 
          type="text" 
          value="${escapeAttr(p.badge || '')}" 
          onchange="updateProgramProperty(${idx}, 'badge', this.value)"
          placeholder="Badge (e.g. Ages 3-5)" 
          class="flex-1 px-3 py-1 text-[11px] rounded-lg border border-slate-200"
        >
        <input 
          type="text" 
          value="${escapeAttr(p.actionTag || '')}" 
          onchange="updateProgramProperty(${idx}, 'actionTag', this.value)"
          placeholder="Admission Form Prefill Tag" 
          class="flex-1 px-3 py-1 text-[11px] rounded-lg border border-slate-200"
        >
      </div>
    </div>
  `).join("");

  refreshIcons();
}

window.updateProgramProperty = function(idx, prop, val) {
  if (websiteData?.programs?.[idx]) {
    websiteData.programs[idx][prop] = val;
    saveAllContent(false);
  }
};

window.deleteProgram = function(idx) {
  if (confirm("Delete this academic program?")) {
    websiteData.programs.splice(idx, 1);
    renderProgramsList();
    saveAllContent(true);
  }
};

window.addNewProgramPrompt = function() {
  const newP = {
    id: Date.now(),
    title: "New Academic Wing",
    subtitle: "Class Details",
    description: "Provide description of curriculum and learning outcomes for this wing.",
    badge: "Grades",
    actionTag: "General Admission",
    icon: "book-open"
  };
  if (!websiteData.programs) websiteData.programs = [];
  websiteData.programs.push(newP);
  renderProgramsList();
  showToast("New program added!", "info");
};

// -------------------------------------------------------------------------
// 10. TEACHERS & FACULTY
// -------------------------------------------------------------------------
function renderTeachersList() {
  const container = document.getElementById("teachersListContainer");
  if (!container || !websiteData) return;

  const teachers = websiteData.teachers || [];
  container.innerHTML = teachers.map((t, idx) => `
    <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:border-[#2589E8] transition-all flex flex-col justify-between">
      <div class="aspect-square w-full bg-slate-100 relative overflow-hidden group">
        <img src="${t.image || 'images/logo.png'}" alt="${escapeAttr(t.name)}" class="w-full h-full object-cover">
        <div class="absolute top-2 right-2 bg-white/90 backdrop-blur-xs px-2.5 py-0.5 rounded-md text-[10px] font-bold text-[#2589E8] border border-slate-100">
          ${escapeHtml(t.department || 'Faculty')}
        </div>
        <div class="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <label class="cursor-pointer bg-white text-slate-800 px-3 py-1.5 rounded-xl font-bold text-xs shadow-md hover:bg-blue-50">
            <span>Change Photo</span>
            <input type="file" accept="image/*" class="hidden" onchange="uploadImageHandler(this, (url) => updateTeacherImage(${idx}, url))">
          </label>
        </div>
      </div>

      <div class="p-4 space-y-2">
        <div>
          <h4 class="font-bold text-slate-900 text-sm">${escapeHtml(t.name)}</h4>
          <p class="text-xs font-semibold text-[#2589E8]">${escapeHtml(t.role)}</p>
        </div>
        <p class="text-[11px] text-slate-500 line-clamp-2">${escapeHtml(t.subjects || '')}</p>
        <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
          <span class="text-slate-500 font-semibold">${escapeHtml(t.experience || '')}</span>
          <div class="flex items-center gap-1">
            <button onclick="editTeacher(${idx})" class="p-1 rounded-lg text-slate-400 hover:text-[#2589E8] hover:bg-blue-50">
              <i data-lucide="edit-3" class="w-4 h-4"></i>
            </button>
            <button onclick="deleteTeacher(${idx})" class="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join("");

  refreshIcons();
}

window.updateTeacherImage = function(idx, url) {
  if (websiteData?.teachers?.[idx]) {
    websiteData.teachers[idx].image = url;
    renderTeachersList();
    saveAllContent(false);
  }
};

window.addNewTeacherModal = function() {
  document.getElementById("teacherEditId").value = "";
  document.getElementById("teacherModalTitle").textContent = "Add Faculty Member";
  document.getElementById("teacherName").value = "";
  document.getElementById("teacherRole").value = "";
  document.getElementById("teacherDepartment").value = "";
  document.getElementById("teacherExperience").value = "5 Yrs Exp";
  document.getElementById("teacherSubjects").value = "";
  document.getElementById("teacherModalPhotoUrl").value = "";
  document.getElementById("teacherModalPhotoPreview").src = "images/logo.png";

  document.getElementById("teacherModal").classList.remove("hidden");
  refreshIcons();
};

window.editTeacher = function(idx) {
  const t = websiteData?.teachers?.[idx];
  if (!t) return;

  document.getElementById("teacherEditId").value = idx;
  document.getElementById("teacherModalTitle").textContent = "Edit Faculty Member";
  document.getElementById("teacherName").value = t.name || "";
  document.getElementById("teacherRole").value = t.role || "";
  document.getElementById("teacherDepartment").value = t.department || "";
  document.getElementById("teacherExperience").value = t.experience || "";
  document.getElementById("teacherSubjects").value = t.subjects || "";
  document.getElementById("teacherModalPhotoUrl").value = t.image || "";
  document.getElementById("teacherModalPhotoPreview").src = t.image || "images/logo.png";

  document.getElementById("teacherModal").classList.remove("hidden");
  refreshIcons();
};

window.closeTeacherModal = function() {
  document.getElementById("teacherModal").classList.add("hidden");
};

window.setTeacherModalPhoto = function(url) {
  document.getElementById("teacherModalPhotoUrl").value = url;
  document.getElementById("teacherModalPhotoPreview").src = url;
};

window.handleTeacherSubmit = function(event) {
  event.preventDefault();
  const editId = document.getElementById("teacherEditId").value;
  const teacher = {
    id: editId !== "" ? websiteData.teachers[editId].id : Date.now(),
    name: document.getElementById("teacherName").value.trim(),
    role: document.getElementById("teacherRole").value.trim(),
    department: document.getElementById("teacherDepartment").value.trim(),
    experience: document.getElementById("teacherExperience").value.trim(),
    subjects: document.getElementById("teacherSubjects").value.trim(),
    image: document.getElementById("teacherModalPhotoUrl").value.trim() || "images/logo.png"
  };

  if (!websiteData.teachers) websiteData.teachers = [];

  if (editId !== "") {
    websiteData.teachers[editId] = teacher;
  } else {
    websiteData.teachers.push(teacher);
  }

  closeTeacherModal();
  renderTeachersList();
  saveAllContent(true);
};

window.deleteTeacher = function(idx) {
  if (confirm("Remove this teacher from directory?")) {
    websiteData.teachers.splice(idx, 1);
    renderTeachersList();
    saveAllContent(true);
  }
};

// -------------------------------------------------------------------------
// 11. NOTICES & ANNOUNCEMENTS
// -------------------------------------------------------------------------
function renderAnnouncementsList() {
  const container = document.getElementById("announcementsListContainer");
  if (!container || !websiteData) return;

  const list = websiteData.announcements || [];
  container.innerHTML = list.map((a, idx) => {
    const isBreaking = (websiteData.hero?.breakingNotice || "").includes(a.title);

    return `
      <div class="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#2589E8] transition-all">
        <div class="space-y-1.5 flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded-md bg-blue-50 text-[#2589E8] text-[10px] font-bold uppercase border border-blue-100">
              ${escapeHtml(a.category || 'GENERAL')}
            </span>
            <span class="text-[11px] text-slate-400 font-semibold">${escapeHtml(a.announcement_date || '')}</span>
            <span class="text-[10px] px-2 py-0.2 rounded-full font-bold ${a.status === 'Draft' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}">
              ${escapeHtml(a.status || 'Published')}
            </span>
            ${isBreaking ? `<span class="text-[10px] px-2 py-0.2 rounded-full font-bold bg-[#2589E8] text-white">Top Ticker</span>` : ''}
          </div>
          <h4 class="text-sm font-bold text-slate-800 truncate">${escapeHtml(a.title)}</h4>
          <p class="text-xs text-slate-500 line-clamp-2">${escapeHtml(a.description)}</p>
        </div>

        <div class="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button 
            type="button" 
            onclick="setAsBreakingTicker(${idx})" 
            class="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 hover:text-[#2589E8] text-slate-600 font-bold text-[11px] transition-colors"
            title="Set as top ticker"
          >
            Set Ticker
          </button>
          <button 
            type="button" 
            onclick="editNotice(${idx})" 
            class="p-2 rounded-lg text-slate-400 hover:text-[#2589E8] hover:bg-blue-50 transition-colors"
          >
            <i data-lucide="edit-3" class="w-4 h-4"></i>
          </button>
          <button 
            type="button" 
            onclick="deleteNotice(${idx})" 
            class="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `;
  }).join("");

  refreshIcons();
}

window.addNewNoticeModal = function() {
  document.getElementById("noticeEditId").value = "";
  document.getElementById("noticeModalTitle").textContent = "Publish Official Notice";
  document.getElementById("noticeTitleInput").value = "";
  document.getElementById("noticeCategorySelect").value = "GENERAL";
  document.getElementById("noticeDateInput").value = new Date().toISOString().split("T")[0];
  document.getElementById("noticeAuthorInput").value = "Admin Principal";
  document.getElementById("noticeStatusSelect").value = "Published";
  document.getElementById("noticeDescInput").value = "";

  document.getElementById("noticeModal").classList.remove("hidden");
  refreshIcons();
};

window.editNotice = function(idx) {
  const a = websiteData?.announcements?.[idx];
  if (!a) return;

  document.getElementById("noticeEditId").value = idx;
  document.getElementById("noticeModalTitle").textContent = "Edit Circular";
  document.getElementById("noticeTitleInput").value = a.title || "";
  document.getElementById("noticeCategorySelect").value = a.category || "GENERAL";
  document.getElementById("noticeDateInput").value = a.announcement_date || new Date().toISOString().split("T")[0];
  document.getElementById("noticeAuthorInput").value = a.author_name || "Admin Principal";
  document.getElementById("noticeStatusSelect").value = a.status || "Published";
  document.getElementById("noticeDescInput").value = a.description || "";

  document.getElementById("noticeModal").classList.remove("hidden");
  refreshIcons();
};

window.closeNoticeModal = function() {
  document.getElementById("noticeModal").classList.add("hidden");
};

window.handleNoticeSubmit = function(event) {
  event.preventDefault();
  const editId = document.getElementById("noticeEditId").value;
  const notice = {
    id: editId !== "" ? websiteData.announcements[editId].id : (100 + Date.now() % 900),
    title: document.getElementById("noticeTitleInput").value.trim(),
    category: document.getElementById("noticeCategorySelect").value,
    announcement_date: document.getElementById("noticeDateInput").value,
    author_name: document.getElementById("noticeAuthorInput").value.trim(),
    status: document.getElementById("noticeStatusSelect").value,
    description: document.getElementById("noticeDescInput").value.trim()
  };

  if (!websiteData.announcements) websiteData.announcements = [];

  if (editId !== "") {
    websiteData.announcements[editId] = notice;
  } else {
    // Add to front of list
    websiteData.announcements.unshift(notice);
  }

  closeNoticeModal();
  renderAnnouncementsList();
  saveAllContent(true);
};

window.deleteNotice = function(idx) {
  if (confirm("Delete this circular notification?")) {
    websiteData.announcements.splice(idx, 1);
    renderAnnouncementsList();
    saveAllContent(true);
  }
};

window.setAsBreakingTicker = function(idx) {
  const a = websiteData?.announcements?.[idx];
  if (!a) return;

  const tickerText = `${a.title}: ${a.description.slice(0, 95)}...`;
  if (!websiteData.hero) websiteData.hero = {};
  websiteData.hero.breakingNotice = tickerText;
  document.getElementById("heroBreakingNoticeInput").value = tickerText;
  renderAnnouncementsList();
  saveAllContent(true);
  showToast("Set as top breaking notice ticker!", "success");
};

// -------------------------------------------------------------------------
// 12. CAMPUS FACILITIES
// -------------------------------------------------------------------------
function renderFacilitiesList() {
  const container = document.getElementById("facilitiesListContainer");
  if (!container || !websiteData) return;

  const facs = websiteData.facilities || [];
  container.innerHTML = facs.map((f, idx) => `
    <div class="p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
      <div class="flex items-center justify-between">
        <input 
          type="text" 
          value="${escapeAttr(f.name)}" 
          onchange="updateFacilityProperty(${idx}, 'name', this.value)"
          class="font-bold text-xs text-slate-900 px-2 py-1 rounded-lg border border-slate-200 flex-1 mr-2"
        >
        <button onclick="deleteFacility(${idx})" class="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
      <textarea 
        rows="2" 
        onchange="updateFacilityProperty(${idx}, 'desc', this.value)"
        class="w-full px-2 py-1 text-xs rounded-lg border border-slate-200"
      >${escapeHtml(f.desc)}</textarea>
    </div>
  `).join("");

  refreshIcons();
}

window.updateFacilityProperty = function(idx, prop, val) {
  if (websiteData?.facilities?.[idx]) {
    websiteData.facilities[idx][prop] = val;
    saveAllContent(false);
  }
};

window.deleteFacility = function(idx) {
  if (confirm("Delete this facility?")) {
    websiteData.facilities.splice(idx, 1);
    renderFacilitiesList();
    saveAllContent(true);
  }
};

window.addNewFacilityPrompt = function() {
  const newF = {
    id: Date.now(),
    name: "New Facility Room / Lab",
    desc: "Describe equipment and student learning opportunities.",
    icon: "sparkles"
  };
  if (!websiteData.facilities) websiteData.facilities = [];
  websiteData.facilities.push(newF);
  renderFacilitiesList();
  showToast("New facility added!", "info");
};

// -------------------------------------------------------------------------
// 13. ADMISSIONS SUBMISSIONS INBOX
// -------------------------------------------------------------------------
let currentAdmissionsFilter = "ALL";
let currentAdmissionsSearch = "";

function renderAdmissionsTable() {
  const tbody = document.getElementById("admissionsTableBody");
  if (!tbody) return;

  const filtered = admissionsData.filter(item => {
    const q = currentAdmissionsSearch.toLowerCase();
    const matchesQ = !q || 
      (item.stuName || "").toLowerCase().includes(q) ||
      (item.fatherName || "").toLowerCase().includes(q) ||
      (item.regNo || "").toLowerCase().includes(q) ||
      (item.className || "").toLowerCase().includes(q);

    if (!matchesQ) return false;
    if (currentAdmissionsFilter !== "ALL" && item.status !== currentAdmissionsFilter) return false;
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="p-8 text-center text-slate-400 font-medium">
          No admission applications found.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map((adm) => {
    let statusClass = "bg-amber-50 text-amber-700 border-amber-200";
    if (adm.status === "Approved") statusClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (adm.status === "Rejected") statusClass = "bg-red-50 text-red-700 border-red-200";

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="p-3.5 font-mono font-bold text-[#8b1515]">${escapeHtml(adm.regNo || adm.id)}</td>
        <td class="p-3.5 font-bold text-slate-900">${escapeHtml(adm.stuName)}</td>
        <td class="p-3.5 font-medium text-slate-600">${escapeHtml(adm.fatherName)}</td>
        <td class="p-3.5"><span class="px-2 py-0.5 rounded-md bg-blue-50 text-[#2589E8] font-bold text-[11px]">${escapeHtml(adm.className)}</span></td>
        <td class="p-3.5 font-mono text-slate-600">${escapeHtml(adm.contact)}</td>
        <td class="p-3.5">
          <select 
            onchange="updateAdmissionStatus('${adm.id || adm.regNo}', this.value)"
            class="px-2 py-1 rounded-md text-[11px] font-bold border ${statusClass} focus:outline-none"
          >
            <option value="Pending" ${adm.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Approved" ${adm.status === 'Approved' ? 'selected' : ''}>Approved</option>
            <option value="Rejected" ${adm.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
          </select>
        </td>
        <td class="p-3.5 text-right space-x-1">
          <button 
            type="button" 
            onclick="viewAdmissionReplica('${adm.id || adm.regNo}')" 
            class="px-2 py-1 rounded-md bg-[#8b1515] text-white hover:bg-[#a81c1c] text-[11px] font-bold transition-colors"
            title="View & Print Replica"
          >
            Print
          </button>
          <button 
            type="button" 
            onclick="deleteAdmissionEntry('${adm.id || adm.regNo}')" 
            class="p-1 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
            title="Delete Application"
          >
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </td>
      </tr>
    `;
  }).join("");

  refreshIcons();
}

window.filterAdmissionsList = function() {
  currentAdmissionsSearch = (document.getElementById("admissionsSearchInput")?.value || "").trim();
  currentAdmissionsFilter = document.getElementById("admissionsStatusFilter")?.value || "ALL";
  renderAdmissionsTable();
};

window.refreshAdmissionsList = async function() {
  showToast("Refreshing admissions...", "info");
  try {
    const res = await fetch("/api/admissions");
    if (res.ok) {
      admissionsData = await res.json();
      renderAdmissionsTable();
      refreshDashboard();
      showToast("Admissions refreshed!", "success");
    }
  } catch (e) {
    showToast("Server offline, using cached submissions.", "info");
  }
};

window.updateAdmissionStatus = async function(id, newStatus) {
  const item = admissionsData.find(a => (a.id === id || a.regNo === id));
  if (item) item.status = newStatus;

  try {
    await fetch(`/api/admissions/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });
    showToast(`Application ${id} updated to ${newStatus}`, "success");
  } catch (e) {
    showToast(`Updated status locally`, "info");
  }
};

window.deleteAdmissionEntry = async function(id) {
  if (confirm(`Delete application ${id}?`)) {
    admissionsData = admissionsData.filter(a => a.id !== id && a.regNo !== id);
    renderAdmissionsTable();
    refreshDashboard();

    try {
      await fetch(`/api/admissions/${encodeURIComponent(id)}`, { method: "DELETE" });
      showToast("Application deleted", "success");
    } catch (e) {
      showToast("Deleted locally", "info");
    }
  }
};

window.viewAdmissionReplica = function(id) {
  const item = admissionsData.find(a => a.id === id || a.regNo === id);
  if (!item) return;

  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Official Form - ${escapeHtml(item.regNo)}</title>
      <style>
        body { font-family: 'Plus Jakarta Sans', Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 700px; margin: auto; }
        .box { border: 3px double #8b1515; padding: 30px; border-radius: 8px; background: #fffdfa; }
        .title { text-align: center; color: #8b1515; font-size: 24px; font-weight: 900; margin-bottom: 2px; }
        .sub { text-align: center; color: #8b1515; font-size: 13px; font-weight: bold; margin-bottom: 20px; }
        .row { display: flex; justify-content: space-between; border-bottom: 1px dotted #8b1515; padding: 8px 0; font-size: 13px; }
        .label { font-weight: bold; color: #8b1515; }
        .val { font-weight: 600; color: #0f172a; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 16px; text-align: right;">
        <button onclick="window.print()" style="background: #8b1515; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold;">Print Form</button>
      </div>
      <div class="box">
        <div class="title">HIGH LIGHT MODEL SCHOOL</div>
        <div class="sub">Saraghundi Thall District Hangu • OFFICIAL ADMISSION FORM</div>
        <div class="row"><span class="label">Registration No:</span><span class="val">${item.regNo}</span></div>
        <div class="row"><span class="label">Candidate Name:</span><span class="val">${item.stuName}</span></div>
        <div class="row"><span class="label">Father Name:</span><span class="val">${item.fatherName}</span></div>
        <div class="row"><span class="label">Class In Which Admitted:</span><span class="val">${item.className}</span></div>
        <div class="row"><span class="label">Nation / Tribe:</span><span class="val">${item.nation || '-'}</span></div>
        <div class="row"><span class="label">Father Occupation:</span><span class="val">${item.occupation || '-'}</span></div>
        <div class="row"><span class="label">Date of Birth:</span><span class="val">${item.dob} (${item.inWords || ''})</span></div>
        <div class="row"><span class="label">Religion & Nationality:</span><span class="val">${item.religion} / ${item.nationality}</span></div>
        <div class="row"><span class="label">Home Address:</span><span class="val">${item.address}</span></div>
        <div class="row"><span class="label">Contact Telephone:</span><span class="val">${item.contact}</span></div>
        <div class="row"><span class="label">School Last Attended:</span><span class="val">${item.lastSchool || '-'}</span></div>
        <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; color: #8b1515;">
          <span>Parent / Guardian Signature</span>
          <span>Principal Highlight Model School</span>
        </div>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
};

window.exportAdmissionsCSV = function() {
  if (admissionsData.length === 0) {
    alert("No admission records to export.");
    return;
  }

  let csv = "RegNo,StudentName,FatherName,Class,Contact,DOB,Address,Status,SubmittedAt\n";
  admissionsData.forEach(a => {
    csv += `"${a.regNo || ''}","${a.stuName || ''}","${a.fatherName || ''}","${a.className || ''}","${a.contact || ''}","${a.dob || ''}","${(a.address || '').replace(/"/g, '""')}","${a.status || ''}","${a.submittedAt || ''}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hms_admissions_${Date.now()}.csv`;
  a.click();
};

// -------------------------------------------------------------------------
// 14. SETTINGS, PASSWORD & BACKUP
// -------------------------------------------------------------------------
async function handlePasswordChange(event) {
  event.preventDefault();
  const currentPass = document.getElementById("settingsCurrentPass").value;
  const newUser = document.getElementById("settingsNewUser").value.trim();
  const newPass = document.getElementById("settingsNewPass").value;

  try {
    const res = await fetch("/api/auth/change-credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: currentPass,
        newUsername: newUser,
        newPassword: newPass
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      showToast("Credentials updated successfully!", "success");
      document.getElementById("settingsCurrentPass").value = "";
      document.getElementById("settingsNewPass").value = "";
    } else {
      throw new Error(data.error || "Update failed");
    }
  } catch (err) {
    alert("Error changing credentials: " + err.message);
  }
}

window.downloadBackupJSON = function() {
  if (!websiteData) return;
  const backup = {
    websiteContent: websiteData,
    admissions: admissionsData,
    exportedAt: new Date().toISOString()
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
  const dlAnchor = document.createElement("a");
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", `hms_cms_backup_${Date.now()}.json`);
  dlAnchor.click();
  showToast("Backup downloaded!", "success");
};

window.restoreBackupHandler = function(fileInput) {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.websiteContent) {
        websiteData = parsed.websiteContent;
        if (Array.isArray(parsed.admissions)) admissionsData = parsed.admissions;
      } else {
        websiteData = parsed;
      }
      populateAllFields();
      saveAllContent(true);
      showToast("Backup restored successfully!", "success");
    } catch (err) {
      alert("Invalid backup JSON file: " + err.message);
    }
  };
  reader.readAsText(file);
};

window.resetToFactoryDefaults = function() {
  if (confirm("Reset website content to initial defaults? Any unsaved edits will be lost.")) {
    localStorage.removeItem("hms_content_cache");
    window.location.reload();
  }
};

// -------------------------------------------------------------------------
// 15. TOAST NOTIFICATION SYSTEM
// -------------------------------------------------------------------------
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  let bg = "bg-slate-900 text-white";
  let icon = "check-circle";

  if (type === "success") {
    bg = "bg-emerald-600 text-white";
    icon = "check-circle";
  } else if (type === "info") {
    bg = "bg-[#2589E8] text-white";
    icon = "info";
  } else if (type === "error") {
    bg = "bg-red-600 text-white";
    icon = "alert-circle";
  }

  toast.className = `${bg} px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold pointer-events-auto transition-all transform translate-y-2 opacity-0 duration-300`;
  toast.innerHTML = `<i data-lucide="${icon}" class="w-4 h-4 shrink-0"></i><span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);
  refreshIcons();

  requestAnimationFrame(() => {
    toast.classList.remove("translate-y-2", "opacity-0");
  });

  setTimeout(() => {
    toast.classList.add("translate-y-2", "opacity-0");
    setTimeout(() => toast.remove(), 350);
  }, 3200);
}

// -------------------------------------------------------------------------
// 16. SANITIZATION UTILITIES
// -------------------------------------------------------------------------
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

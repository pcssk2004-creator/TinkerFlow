/* =====================================================
   TINKERHUB SBCE EVENTOPS - APPLICATION
   UI, role permissions and real-time rendering.
   All shared data lives in Firebase (see firebase-backend.js).
   Only theme / notification preferences are kept on the device.
===================================================== */

'use strict';

/* =====================================================
   TEAM, ROLES AND STANDARD DUTIES
===================================================== */

const TEAM = {
    anjali:  { name: "Anjali S Pillai",  role: "Campus Lead",          initials: "AS" },
    amal:    { name: "Amal Kakkat",      role: "Learning Coordinator", initials: "AK" },
    saurav:  { name: "Saurav Sreekumar", role: "Outreach Lead",        initials: "SS" },
    adithya: { name: "Adithya S",        role: "Wit Lead",             initials: "AS" },
    parthiv: { name: "Parthiv R",        role: "Head Coordinator",     initials: "PR" },
    jithu:   { name: "Jithu Biju",       role: "Head Coordinator",     initials: "JB" },
    madhav:  { name: "Madhav P",         role: "First Year Coordinator", initials: "MP" },
    devika:  { name: "Devika R S",        role: "First Year Coordinator", initials: "DV" }
};

const ROLES = ["Campus Lead", "Learning Coordinator", "Outreach Lead", "Wit Lead", "Head Coordinator", "First Year Coordinator"];
const PHASES = ["Before Event", "During Event", "After Event"];
const EVENT_TYPES = ["Workshop", "Study Jam", "Meetup", "Hackathon", "Talk", "Community Event"];

const ROLE_INFO = {
    "Campus Lead": "Campus coordination, permissions, venue and overall supervision.",
    "Learning Coordinator": "Learning sessions, speakers, materials and the educational experience.",
    "Outreach Lead": "Promotion, announcements, communication and community outreach.",
    "Wit Lead": "Creative activities, engagement and interactive experiences.",
    "Head Coordinator": "Team-wide coordination, readiness, timing and event execution.",
    "First Year Coordinator": "First-year student coordination, communication, engagement and support."
};

const ROLE_DUTIES = {
    "Campus Lead": {
        "Before Event": ["Approve event plan", "Coordinate with college authorities", "Finalize venue", "Approve major requirements"],
        "During Event": ["Overall event supervision", "Coordinate core team", "Handle major issues"],
        "After Event": ["Review event execution", "Approve final documentation"]
    },
    "Learning Coordinator": {
        "Before Event": ["Finalize learning/session topic", "Coordinate with speaker/facilitator", "Prepare learning materials", "Prepare session requirements"],
        "During Event": ["Coordinate learning session", "Support facilitator", "Manage participant activities"],
        "After Event": ["Collect participant feedback", "Review learning outcomes", "Prepare learning documentation"]
    },
    "Outreach Lead": {
        "Before Event": ["Create promotion plan", "Prepare social media announcement", "Class and community outreach", "Send event announcements"],
        "During Event": ["Participant communication", "Handle announcements"],
        "After Event": ["Publish event recap", "Share event highlights", "Community follow-up"]
    },
    "Wit Lead": {
        "Before Event": ["Plan creative activities", "Prepare engagement ideas", "Prepare interactive content"],
        "During Event": ["Run interactive activities", "Keep participants engaged", "Handle creative segments"],
        "After Event": ["Collect creative feedback", "Document activity highlights"]
    },
    "Head Coordinator": {
        "Before Event": ["Review event plan", "Coordinate between teams", "Check event readiness"],
        "During Event": ["Overall event coordination", "Time management", "Handle unexpected issues"],
        "After Event": ["Review event completion", "Prepare final event report", "Conduct post-event review"]
    }
};

const ROLE_ABILITIES = {
    "Campus Lead": [
        [true, "Create events"],
        [true, "Delete events and all their duties"],
        [true, "See every role's duties and progress"],
        [true, "Assign duties to any role"],
        [true, "Complete or reopen any duty"],
        [true, "Read the full activity log"]
    ],
    "Head Coordinator": [
        [false, "Cannot create events"],
        [false, "Cannot delete events"],
        [false, "Cannot add custom duties"],
        [true, "Complete or reopen any duty"],
        [true, "Read the full activity log"]
    ],
    "Outreach Lead": [
        [true, "Create events"],
        [true, "Delete events and all their duties"],
        [true, "Assign duties to any role"],
        [true, "See events and the shared workspace"]
    ],
    "default": [
        [true, "View events and the calendar"],
        [true, "Complete and reopen duties assigned to your role"],
        [false, "Cannot create or delete events"],
        [false, "Cannot add custom duties"]
    ]
};

const ACTIONS = {
    login:           { label: "logged in",             cat: "access" },
    logout:          { label: "logged out",            cat: "access" },
    pin_set:         { label: "set up their account",  cat: "access" },
    pin_changed:     { label: "changed their PIN",     cat: "access" },
    event_created:   { label: "created the event",     cat: "events" },
    event_deleted:   { label: "deleted the event",     cat: "events" },
    legacy_imported: { label: "imported earlier data", cat: "events" },
    duty_added:      { label: "added the duty",        cat: "duties" },
    duty_completed:  { label: "completed the duty",    cat: "duties" },
    duty_reopened:   { label: "reopened the duty",     cat: "duties" }
};

/* =====================================================
   ICONS
===================================================== */

const ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    events: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
    duties: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    team: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    settings: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    left: '<polyline points="15 18 9 12 15 6"/>',
    right: '<polyline points="9 18 15 12 9 6"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    no: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'
};

function icon(name, size) {
    const s = size || 18;
    return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

/* =====================================================
   STATE
===================================================== */

const PREF_KEY = "sbce_prefs";

const S = {
    user: null,
    events: [],
    duties: [],
    users: {},
    activity: [],
    activityLimit: 200,
    activityUnsub: null,
    subs: [],
    ready: { events: false, duties: false, users: false, activity: false },

    page: "dashboard",
    calendarDate: firstOfMonth(new Date()),
    eventFilter: "upcoming",
    dutyFilter: "all",
    activityFilter: "all",

    liveNotes: [],
    seenKeys: new Set(),
    notifOpen: false,

    openEventId: null,
    legacy: null,
    online: navigator.onLine,
    syncError: false,
    prefs: loadPrefs()
};

let authFlow = false;
let renderQueued = false;
let toastTimer = null;
let confirmResolve = null;
let syncErrorShown = false;

const $ = id => document.getElementById(id);

/* =====================================================
   PERMISSIONS (UI side; Firestore rules enforce them too)
===================================================== */

const can = {
    createEvent: () => !!S.user && (S.user.role === "Campus Lead" || S.user.role === "Outreach Lead"),
    deleteEvent: () => !!S.user && (S.user.role === "Campus Lead" || S.user.role === "Outreach Lead"),
    addDuty: () => !!S.user && (S.user.role === "Campus Lead" || S.user.role === "Outreach Lead"),
    viewActivity: () => !!S.user && (S.user.role === "Campus Lead" || S.user.role === "Head Coordinator"),
    toggleDuty: duty => !!S.user && (S.user.role === "Campus Lead" || S.user.role === "Head Coordinator" || duty.role === S.user.role)
};

/* =====================================================
   HELPERS
===================================================== */

function esc(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function plural(n, one, many) {
    return n === 1 ? one : many;
}

function firstOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function fmtDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function parseDate(str) {
    return new Date(str + "T00:00:00");
}

function todayStr() {
    return fmtDate(new Date());
}

function daysBetween(a, b) {
    return Math.round((parseDate(b) - parseDate(a)) / 86400000);
}

function displayDate(str) {
    return parseDate(str).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function shortDate(str) {
    return parseDate(str).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function dateParts(str) {
    const d = parseDate(str);
    return { day: d.getDate(), month: d.toLocaleDateString("en-IN", { month: "short" }) };
}

function fmtTime(str) {
    if (!str) return "";
    const [h, m] = str.split(":").map(Number);
    if (isNaN(h)) return str;
    const suffix = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(m || 0).padStart(2, "0")} ${suffix}`;
}

function fmtStamp(ms) {
    if (!ms) return "just now";
    return new Date(ms).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function relDay(str) {
    const diff = daysBetween(todayStr(), str);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    return diff > 0 ? `In ${diff} days` : `${-diff} days ago`;
}

function greeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
}

function firstName(name) {
    return String(name).split(" ")[0];
}

function initialsOf(name) {
    return String(name).split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function pct(done, total) {
    return total ? Math.round((done / total) * 100) : 0;
}

/* ----- Preferences (device only) ----- */

function loadPrefs() {
    const defaults = { theme: "light", remind: true, live: true };
    try {
        return Object.assign(defaults, JSON.parse(localStorage.getItem(PREF_KEY) || "{}"));
    } catch (e) {
        return defaults;
    }
}

function savePrefs() {
    try {
        localStorage.setItem(PREF_KEY, JSON.stringify(S.prefs));
    } catch (e) { /* ignore */ }
}

function applyTheme() {
    const dark = S.prefs.theme === "dark" ||
        (S.prefs.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

/* ----- Derived data ----- */

function eventById(id) {
    return S.events.find(e => e.id === id);
}

function sortEvents(list) {
    return [...list].sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));
}

// Duties whose event still exists (guards against orphans).
function liveDuties() {
    const ids = new Set(S.events.map(e => e.id));
    return S.duties.filter(d => ids.has(d.eventId));
}

function myDuties() {
    return liveDuties().filter(d => d.role === S.user.role);
}

function dutyStatus(duty) {
    if (duty.completed) return "completed";
    return duty.deadline < todayStr() ? "overdue" : "pending";
}

function summarize(duties) {
    let completed = 0;
    let overdue = 0;
    duties.forEach(d => {
        const s = dutyStatus(d);
        if (s === "completed") completed++;
        if (s === "overdue") overdue++;
    });
    return { total: duties.length, completed, overdue, pending: duties.length - completed };
}

function byDeadline(a, b) {
    return a.deadline.localeCompare(b.deadline);
}

/* =====================================================
   TOAST, MODALS, CONFIRM
===================================================== */

function toast(message, type) {
    const el = $("toast");
    $("toastMessage").textContent = message;
    el.classList.toggle("error", type === "error");
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}

function handleError(err, fallback) {
    console.error(err);
    if (err && err.code === "permission-denied") {
        toast("You do not have permission to do that.", "error");
    } else {
        toast(fallback, "error");
    }
}

function openModal(id) {
    const modal = $(id);
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    const first = modal.querySelector("input:not([type=hidden]), select, textarea");
    if (first && id !== "confirmModal" && id !== "detailsModal") setTimeout(() => first.focus(), 30);
}

function closeModal(id) {
    $(id).classList.add("hidden");
    if (id === "detailsModal") S.openEventId = null;
    if (!document.querySelector(".modal:not(.hidden)")) document.body.style.overflow = "";
}

function closeAllModals() {
    document.querySelectorAll(".modal").forEach(m => m.classList.add("hidden"));
    document.body.style.overflow = "";
    S.openEventId = null;
    if (confirmResolve) resolveConfirm(false);
}

function confirmDialog(options) {
    $("confirmTitle").textContent = options.title;
    $("confirmText").textContent = options.message;
    const yes = $("confirmYes");
    yes.textContent = options.confirmText || "Confirm";
    yes.className = "btn " + (options.danger === false ? "btn-primary" : "btn-danger");
    openModal("confirmModal");
    yes.focus();
    return new Promise(resolve => { confirmResolve = resolve; });
}

function resolveConfirm(value) {
    closeModal("confirmModal");
    if (confirmResolve) {
        const done = confirmResolve;
        confirmResolve = null;
        done(value);
    }
}

function setBusy(buttonId, busy, label) {
    const btn = $(buttonId);
    if (!btn) return;
    if (busy) {
        btn.dataset.label = btn.textContent;
        btn.textContent = label || "Working...";
        btn.disabled = true;
    } else {
        if (btn.dataset.label) btn.textContent = btn.dataset.label;
        btn.disabled = false;
    }
}

function showFormError(id, message) {
    const el = $(id);
    el.textContent = message || "";
    el.classList.toggle("hidden", !message);
}

/* =====================================================
   SESSION: LOGIN, SETUP, LOGOUT
===================================================== */

function hideBoot() {
    $("bootLoader").classList.add("hidden");
}

function showLogin(message) {
    stopListeners();
    S.user = null;
    S.events = [];
    S.duties = [];
    S.users = {};
    S.activity = [];
    S.liveNotes = [];
    S.seenKeys = new Set();
    S.legacy = null;
    S.notifOpen = false;
    $("notifPanel").classList.add("hidden");
    closeAllModals();
    $("app").classList.add("hidden");
    $("loginScreen").classList.remove("hidden");
    $("loginPin").value = "";
    if (message) showFormError("loginError", message);
    hideBoot();
}

async function bootSession(user, opts) {
    const options = opts || {};
    const profile = await Backend.getProfile(user.uid);
    const member = profile && TEAM[profile.accountId];

    if (!member || profile.role !== member.role) {
        const err = new Error("This account has no profile yet.");
        err.code = "app/no-profile";
        throw err;
    }

    S.user = { uid: user.uid, id: profile.accountId, name: member.name, role: member.role, initials: member.initials };
    Backend.setIdentity({ id: S.user.id, name: profile.name, role: profile.role });

    S.page = "dashboard";
    S.eventFilter = "upcoming";
    S.dutyFilter = "all";
    S.activityFilter = "all";
    S.calendarDate = firstOfMonth(new Date());

    $("loginScreen").classList.add("hidden");
    $("app").classList.remove("hidden");

    updateUserUI();
    startListeners();
    renderPage();

    if (options.created) logActivity({ action: "pin_set" });
    if (options.fresh) logActivity({ action: "login" });

    if (S.user.role === "Campus Lead") loadLegacy();
}

function logActivity(entry) {
    Backend.logActivity(entry).catch(err => console.warn("Activity log failed:", err));
}

async function doLogout() {
    if (!S.user) return;

    const logged = Backend.logActivity({ action: "logout" }).catch(() => {});
    await Promise.race([logged, new Promise(resolve => setTimeout(resolve, 1500))]);

    stopListeners();
    try {
        await Backend.signOut();
    } catch (err) {
        console.error(err);
    }
    showLogin();
    toast("You are logged out.");
}

$("loginForm").addEventListener("submit", async event => {
    event.preventDefault();
    showFormError("loginError", "");

    const account = $("accountSelect").value;
    const pin = $("loginPin").value.trim();

    if (!account) return showFormError("loginError", "Choose your account.");
    if (!/^\d{4,6}$/.test(pin)) return showFormError("loginError", "Enter your PIN. It has 4 to 6 digits.");

    authFlow = true;
    setBusy("loginBtn", true, "Logging in...");

    try {
        const user = await Backend.signIn(account, pin);
        await bootSession(user, { fresh: true });
        $("loginPin").value = "";
    } catch (err) {
        console.error(err);
        if (err && err.code === "app/no-profile") {
            try { await Backend.signOut(); } catch (e) { /* ignore */ }
            showFormError("loginError", "Setup for this account was not finished. Ask the Campus Lead to reset the account, then set your PIN again.");
        } else {
            showFormError("loginError", Backend.authMessage(err));
        }
    } finally {
        authFlow = false;
        setBusy("loginBtn", false);
    }
});

function openSetup() {
    showFormError("setupError", "");
    $("setupForm").reset();
    const chosen = $("accountSelect").value;
    if (chosen) $("setupAccount").value = chosen;
    openModal("setupModal");
}

$("setupForm").addEventListener("submit", async event => {
    event.preventDefault();
    showFormError("setupError", "");

    const accountId = $("setupAccount").value;
    const pin = $("setupPin").value.trim();
    const confirmPin = $("setupConfirm").value.trim();

    if (!/^\d{4,6}$/.test(pin)) return showFormError("setupError", "Your PIN must be 4 to 6 digits.");
    if (pin !== confirmPin) return showFormError("setupError", "The two PINs do not match.");

    authFlow = true;
    setBusy("setupSubmit", true, "Setting up...");

    try {
        const result = await Backend.setupAccount({
            accountId,
            pin,
            name: TEAM[accountId].name,
            role: TEAM[accountId].role
        });
        await bootSession(result.user, { fresh: true, created: result.created });
        closeModal("setupModal");
        toast(result.created ? "PIN saved. You are logged in." : "You are logged in.");
    } catch (err) {
        console.error(err);
        if (err && err.code === "app/no-profile") {
            try { await Backend.signOut(); } catch (e) { /* ignore */ }
            showFormError("setupError", "Setup could not be completed. Try again.");
        } else {
            showFormError("setupError", Backend.authMessage(err));
        }
    } finally {
        authFlow = false;
        setBusy("setupSubmit", false);
    }
});


function openChangePin() {
    showFormError("pinError", "");
    $("pinForm").reset();
    openModal("pinModal");
}

$("pinForm").addEventListener("submit", async event => {
    event.preventDefault();
    showFormError("pinError", "");

    const current = $("currentPin").value.trim();
    const next = $("newPin").value.trim();
    const confirmPin = $("confirmPin").value.trim();

    if (!/^\d{4,6}$/.test(current)) return showFormError("pinError", "Enter your current PIN.");
    if (!/^\d{4,6}$/.test(next)) return showFormError("pinError", "Your new PIN must be 4 to 6 digits.");
    if (next !== confirmPin) return showFormError("pinError", "The two new PINs do not match.");
    if (next === current) return showFormError("pinError", "Choose a PIN different from your current one.");

    setBusy("pinSubmit", true, "Saving...");

    try {
        await Backend.changePin(current, next);
        logActivity({ action: "pin_changed" });
        closeModal("pinModal");
        toast("PIN changed.");
    } catch (err) {
        console.error(err);
        showFormError("pinError", Backend.authMessage(err, "change"));
    } finally {
        setBusy("pinSubmit", false);
    }
});

/* =====================================================
   REAL-TIME LISTENERS
===================================================== */

function startListeners() {
    stopListeners();

    S.ready = { events: false, duties: false, users: false, activity: !can.viewActivity() };
    S.syncError = false;
    syncErrorShown = false;

    S.subs.push(Backend.watchEvents(onEvents, onListenerError));
    S.subs.push(Backend.watchDuties(onDuties, onListenerError));
    S.subs.push(Backend.watchUsers(onUsers, onListenerError));

    if (can.viewActivity()) startActivityWatch();
    updateSync();
}

function startActivityWatch() {
    if (S.activityUnsub) S.activityUnsub();
    S.activityUnsub = Backend.watchActivity(S.activityLimit, docs => {
        S.activity = docs;
        S.ready.activity = true;
        scheduleRender();
    }, onListenerError);
}

function stopListeners() {
    S.subs.forEach(unsub => { if (typeof unsub === "function") unsub(); });
    S.subs = [];
    if (S.activityUnsub) {
        S.activityUnsub();
        S.activityUnsub = null;
    }
}

function onListenerError(err) {
    if (!S.user) return;
    S.syncError = true;
    updateSync();
    if (!syncErrorShown) {
        syncErrorShown = true;
        toast(err && err.code === "permission-denied"
            ? "Live data was blocked. Publish the latest Firestore rules."
            : "Live sync hit a problem. Data may be out of date.", "error");
    }
}

function onEvents(docs, changes, initial) {
    if (!S.user) return;
    S.events = docs;
    S.ready.events = true;
    S.syncError = false;

    if (!initial) {
        changes.forEach(change => {
            const ev = change.doc;

            if (change.type === "added" && !ev.legacy && ev.createdBy !== S.user.id) {
                notify({
                    key: "event:" + ev.id,
                    kind: "event",
                    title: "New event: " + ev.name,
                    text: `${displayDate(ev.date)} at ${fmtTime(ev.time)}`,
                    action: "open-event",
                    id: ev.id
                });
            }

            if (change.type === "removed" && S.openEventId === ev.id) {
                toast("This event was deleted.");
            }
        });
    }

    updateSync();
    scheduleRender();
}

function onDuties(docs, changes, initial) {
    if (!S.user) return;
    S.duties = docs;
    S.ready.duties = true;

    if (!initial) {
        changes.forEach(change => {
            const duty = change.doc;
            const ev = eventById(duty.eventId);
            const eventName = ev ? ev.name : "an event";

            if (change.type === "added" && duty.custom && duty.role === S.user.role && duty.createdBy !== S.user.id) {
                notify({
                    key: "duty:" + duty.id,
                    kind: "duty",
                    title: "New duty: " + duty.title,
                    text: `${eventName}, due ${shortDate(duty.deadline)}`,
                    action: "nav",
                    page: "duties"
                });
            }

            if (change.type === "modified" && duty.completed && duty.completedBy && duty.completedBy !== S.user.id && can.createEvent()) {
                const who = TEAM[duty.completedBy] ? TEAM[duty.completedBy].name : "A team member";
                notify({
                    key: "done:" + duty.id + ":" + duty.completedAt,
                    kind: "done",
                    title: `${duty.role} completed a duty`,
                    text: `${who} finished "${duty.title}" for ${eventName}`,
                    action: "open-event",
                    id: duty.eventId
                });
            }
        });
    }

    scheduleRender();
}

function onUsers(docs) {
    if (!S.user) return;
    const map = {};
    docs.forEach(u => { if (u.accountId) map[u.accountId] = u; });
    S.users = map;
    S.ready.users = true;
    scheduleRender();
}

/* =====================================================
   NOTIFICATIONS
===================================================== */

function notify(note) {
    if (S.seenKeys.has(note.key)) return;
    S.seenKeys.add(note.key);

    S.liveNotes.unshift(Object.assign({ read: false, at: Date.now() }, note));
    S.liveNotes = S.liveNotes.slice(0, 30);

    if (S.prefs.live) toast(note.title);
}

function derivedNotes() {
    if (!S.user || !S.prefs.remind) return [];

    const notes = [];
    const today = todayStr();
    const open = myDuties().filter(d => !d.completed).sort(byDeadline);
    const overdue = open.filter(d => d.deadline < today);
    const soon = open.filter(d => d.deadline >= today && daysBetween(today, d.deadline) <= 3);

    if (overdue.length) {
        notes.push({
            kind: "overdue",
            title: `${overdue.length} overdue ${plural(overdue.length, "duty", "duties")}`,
            text: `Oldest was due ${shortDate(overdue[0].deadline)}`,
            action: "nav",
            page: "duties"
        });
    }

    if (soon.length) {
        notes.push({
            kind: "due",
            title: `${soon.length} ${plural(soon.length, "duty", "duties")} due within 3 days`,
            text: `Next: ${soon[0].title}`,
            action: "nav",
            page: "duties"
        });
    }

    const rest = open.length - overdue.length - soon.length;
    if (rest > 0) {
        notes.push({
            kind: "pending",
            title: `${rest} more pending ${plural(rest, "duty", "duties")}`,
            text: "Due later",
            action: "nav",
            page: "duties"
        });
    }

    sortEvents(S.events)
        .filter(e => e.date >= today && daysBetween(today, e.date) <= 7)
        .slice(0, 4)
        .forEach(e => {
            notes.push({
                kind: "upcoming",
                title: e.name,
                text: `${relDay(e.date)} at ${fmtTime(e.time)}`,
                action: "open-event",
                id: e.id
            });
        });

    return notes;
}

const NOTE_STYLE = {
    event: { ico: "events", cls: "info" },
    duty: { ico: "duties", cls: "" },
    done: { ico: "check", cls: "" },
    overdue: { ico: "clock", cls: "bad" },
    due: { ico: "clock", cls: "warn" },
    pending: { ico: "duties", cls: "info" },
    upcoming: { ico: "events", cls: "info" }
};

function noteItem(note) {
    const style = NOTE_STYLE[note.kind] || { ico: "bell", cls: "" };
    return `
        <button class="notif-item" data-action="${esc(note.action)}" data-page="${esc(note.page || "")}" data-id="${esc(note.id || "")}">
            <span class="ico ${style.cls}">${icon(style.ico, 16)}</span>
            <span><strong>${esc(note.title)}</strong><span>${esc(note.text)}</span></span>
        </button>`;
}

function updateBell() {
    const unread = S.liveNotes.filter(n => !n.read).length;
    const total = unread + derivedNotes().length;
    const badge = $("bellBadge");
    badge.textContent = total > 9 ? "9+" : String(total);
    badge.classList.toggle("hidden", total === 0);
}

function renderNotifPanel() {
    const live = S.liveNotes;
    const derived = derivedNotes();

    let html = `
        <div class="notif-head">
            <h2>Notifications</h2>
            ${live.length ? `<button class="btn btn-secondary btn-sm" data-action="clear-notifs">Clear new</button>` : ""}
        </div>`;

    if (!live.length && !derived.length) {
        html += `<div class="notif-empty">You are all caught up.</div>`;
    }

    if (live.length) {
        html += `<div class="notif-group">New</div>` + live.map(noteItem).join("");
    }

    if (derived.length) {
        html += `<div class="notif-group">Reminders</div>` + derived.map(noteItem).join("");
    }

    $("notifPanel").innerHTML = html;
}

function toggleNotifs(force) {
    S.notifOpen = typeof force === "boolean" ? force : !S.notifOpen;
    $("notifPanel").classList.toggle("hidden", !S.notifOpen);
    $("bellBtn").setAttribute("aria-expanded", String(S.notifOpen));

    if (S.notifOpen) {
        renderNotifPanel();
        S.liveNotes.forEach(n => { n.read = true; });
        updateBell();
    }
}

/* =====================================================
   SYNC STATUS
===================================================== */

function updateSync() {
    const el = $("syncStatus");
    if (!el) return;
    el.classList.remove("offline", "error");

    let label = "Live";
    if (!S.online) {
        el.classList.add("offline");
        label = "Offline";
    } else if (S.syncError) {
        el.classList.add("error");
        label = "Sync issue";
    }
    el.querySelector("span").textContent = label;
}

window.addEventListener("online", () => { S.online = true; updateSync(); });
window.addEventListener("offline", () => { S.online = false; updateSync(); });

/* =====================================================
   RENDERING
===================================================== */

function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
        renderQueued = false;
        renderAll();
    });
}

function renderAll() {
    if (!S.user) return;
    renderPage();
    updateBell();
    if (S.notifOpen) renderNotifPanel();
    if (S.openEventId && !$("detailsModal").classList.contains("hidden")) {
        renderEventDetails(S.openEventId);
    }
}

function updateUserUI() {
    $("sidebarName").textContent = S.user.name;
    $("sidebarRole").textContent = S.user.role;
    $("sidebarAvatar").textContent = S.user.initials;
    $("topAvatar").textContent = S.user.initials;
    $("navActivity").classList.toggle("hidden", !can.viewActivity());

    let tip = `You see the duties assigned to ${S.user.role}.`;
    if (S.user.role === "Campus Lead") tip = "You can create and delete events and assign duties to any role.";
    if (S.user.role === "Outreach Lead") tip = "You can create and delete events and assign duties to any role.";
    if (S.user.role === "Head Coordinator") tip = "You coordinate the team and can complete or reopen any duty, but cannot create events or add duties.";
    $("sidebarTip").textContent = tip;
}

function pageMeta() {
    const map = {
        dashboard: ["Dashboard", `${greeting()}, ${firstName(S.user.name)}`],
        events: ["Events", "Shared TinkerHub SBCE events"],
        duties: ["My duties", `${S.user.role} responsibilities`],
        calendar: ["Calendar", "Events and your duty deadlines"],
        team: ["Team", "TinkerHub SBCE core team"],
        activity: ["Activity log", "Everything that happened in the workspace"],
        settings: ["Settings", "Your account and preferences"]
    };
    return map[S.page] || map.dashboard;
}

function goToPage(page) {
    if (page === "activity" && !can.viewActivity()) page = "dashboard";
    S.page = page;
    closeSidebar();
    renderPage();
    window.scrollTo(0, 0);
}

function renderPage() {
    if (!S.user) return;

    if (S.page === "activity" && !can.viewActivity()) S.page = "dashboard";

    const [title, subtitle] = pageMeta();
    $("pageTitle").textContent = title;
    $("pageSubtitle").textContent = subtitle;
    document.title = `${title} | TinkerHub SBCE EventOps`;

    document.querySelectorAll(".nav-item[data-page]").forEach(item => {
        item.classList.toggle("active", item.dataset.page === S.page);
    });

    const content = $("pageContent");

    if (!S.ready.events || !S.ready.duties) {
        content.innerHTML = renderSkeleton();
        return;
    }

    switch (S.page) {
        case "events": content.innerHTML = renderEventsPage(); break;
        case "duties": content.innerHTML = renderDutiesPage(); break;
        case "calendar": content.innerHTML = renderCalendarPage(); break;
        case "team": content.innerHTML = renderTeamPage(); break;
        case "activity": content.innerHTML = renderActivityPage(); break;
        case "settings": content.innerHTML = renderSettingsPage(); break;
        default: content.innerHTML = renderDashboard();
    }
}

function renderSkeleton() {
    return `
        <div class="skeleton" style="height:200px;margin-bottom:20px"></div>
        <div class="skeleton" style="height:88px;margin-bottom:20px"></div>
        <div class="skeleton" style="height:260px"></div>`;
}

function emptyState(title, text) {
    return `
        <div class="empty">
            ${icon("inbox", 36)}
            <h3>${esc(title)}</h3>
            <p>${esc(text)}</p>
        </div>`;
}

function actionButtons() {
    let html = "";
    if (can.addDuty()) {
        html += `<button class="btn btn-secondary" data-action="new-duty">${icon("plus", 16)}Add duty</button>`;
    }
    if (can.createEvent()) {
        html += `<button class="btn btn-primary" data-action="new-event">${icon("plus", 16)}Create event</button>`;
    }
    return html ? `<div class="page-actions">${html}</div>` : "";
}

/* ----- Shared row builders ----- */

function phaseClass(phase) {
    return phase === "Before Event" ? "before" : phase === "During Event" ? "during" : "after";
}

function phaseShort(phase) {
    return phase.replace(" Event", "");
}

function dutyRow(duty, opts) {
    const options = opts || {};
    const showEvent = options.showEvent !== false;
    const status = dutyStatus(duty);
    const ev = eventById(duty.eventId);
    const allowed = can.toggleDuty(duty);

    let badge;
    if (status === "completed") badge = `<span class="tag tag-good">Done</span>`;
    else if (status === "overdue") badge = `<span class="tag tag-bad">Overdue, was due ${esc(shortDate(duty.deadline))}</span>`;
    else badge = `<span class="tag tag-info">Due ${esc(shortDate(duty.deadline))}</span>`;

    let doneNote = "";
    if (duty.completed && duty.completedBy) {
        const who = TEAM[duty.completedBy] ? TEAM[duty.completedBy].name : "a team member";
        doneNote = `<span>Completed by ${esc(who)}${duty.completedAt ? ", " + esc(fmtStamp(duty.completedAt)) : ""}</span>`;
    }

    const label = `${duty.completed ? "Reopen" : "Complete"}: ${duty.title}`;
    const tooltip = allowed ? "" : `title="Only ${esc(duty.role)}, Head Coordinators and the Campus Lead can update this"`;

    return `
        <li class="duty ${duty.completed ? "done" : ""}">
            <button class="check" data-action="toggle-duty" data-id="${esc(duty.id)}" aria-label="${esc(label)}" aria-pressed="${duty.completed ? "true" : "false"}" ${allowed ? "" : "disabled"} ${tooltip}>
                ${duty.completed ? icon("check", 14) : ""}
            </button>
            <div class="duty-body">
                <p class="duty-title">${esc(duty.title)}</p>
                <div class="duty-sub">
                    ${showEvent && ev ? `<span>${esc(ev.name)}</span>` : ""}
                    <span class="tag tag-${phaseClass(duty.phase)}">${esc(phaseShort(duty.phase))}</span>
                    ${duty.custom ? `<span class="tag">Custom</span>` : ""}
                    ${doneNote}
                </div>
            </div>
            <div class="duty-side">${badge}</div>
        </li>`;
}

function eventRow(ev) {
    const mine = liveDuties().filter(d => d.eventId === ev.id && d.role === S.user.role);
    const done = mine.filter(d => d.completed).length;
    const parts = dateParts(ev.date);
    const past = ev.date < todayStr();

    return `
        <li class="event-row">
            <button class="event-main" data-action="open-event" data-id="${esc(ev.id)}">
                <span class="datebox"><b>${parts.day}</b><i>${esc(parts.month)}</i></span>
                <span class="event-text">
                    <strong>${esc(ev.name)}</strong>
                    <span class="meta-line">
                        <span>${icon("clock", 14)}${esc(fmtTime(ev.time))}</span>
                        <span>${icon("pin", 14)}${esc(ev.venue)}</span>
                    </span>
                </span>
            </button>
            <div class="event-side">
                <span class="tag ${past ? "" : "tag-brand"}">${esc(past ? "Past" : relDay(ev.date))}</span>
                <span class="tag">${esc(ev.type)}</span>
                ${mine.length ? `
                    <span class="mini-progress" title="Your role's duties for this event">
                        <span class="bar"><i style="width:${pct(done, mine.length)}%"></i></span>${done}/${mine.length}
                    </span>` : ""}
                ${can.deleteEvent() ? `<button class="btn btn-danger btn-sm" data-action="delete-event" data-id="${esc(ev.id)}">${icon("trash", 15)}Delete</button>` : ""}
            </div>
        </li>`;
}

function logRow(entry) {
    const meta = ACTIONS[entry.action] || { label: entry.action };
    const member = TEAM[entry.userId];
    const init = member ? member.initials : initialsOf(entry.userName || "?");
    const detail = entry.detail ? ` <strong>"${esc(entry.detail)}"</strong>` : "";
    const onEvent = entry.eventName && entry.eventName !== entry.detail ? ` for ${esc(entry.eventName)}` : "";

    return `
        <li>
            <span class="avatar">${esc(init)}</span>
            <div class="log-text">
                <strong>${esc(entry.userName)}</strong> ${esc(meta.label)}${detail}${onEvent}
                <small>${esc(entry.role)}, ${esc(fmtStamp(entry.timestamp))}</small>
            </div>
        </li>`;
}

/* =====================================================
   DASHBOARD
===================================================== */

function renderHero(next) {
    if (!next) {
        return `
            <section class="hero hero-empty">
                <div>
                    <h2>No upcoming events</h2>
                    <p>${can.createEvent() ? "Create an event, then assign duties manually to each role." : "Events will show up here as soon as the team creates them."}</p>
                </div>
                ${can.createEvent() ? `<button class="btn" data-action="new-event">${icon("plus", 16)}Create event</button>` : ""}
            </section>`;
    }

    const mine = liveDuties().filter(d => d.eventId === next.id && d.role === S.user.role);
    const diff = daysBetween(todayStr(), next.date);
    const current = diff > 0 ? 0 : diff === 0 ? 1 : 2;

    const track = PHASES.map((phase, index) => {
        const list = mine.filter(d => d.phase === phase);
        const done = list.filter(d => d.completed).length;
        return `
            <div class="hero-phase ${index === current ? "current" : ""}">
                <b>${esc(phaseShort(phase))}<span>${list.length ? `${done} of ${list.length}` : "None"}</span></b>
                <div class="bar"><i style="width:${pct(done, list.length)}%"></i></div>
            </div>`;
    }).join("");

    return `
        <section class="hero">
            <div class="hero-top">
                <div>
                    <p class="hero-label">Next event</p>
                    <h2>${esc(next.name)}</h2>
                    <div class="hero-meta">
                        <span>${icon("events", 16)}${esc(displayDate(next.date))}</span>
                        <span>${icon("clock", 16)}${esc(fmtTime(next.time))}</span>
                        <span>${icon("pin", 16)}${esc(next.venue)}</span>
                    </div>
                </div>
                <div class="hero-when">
                    <strong>${esc(relDay(next.date))}</strong>
                    <span>${esc(next.type)}</span>
                    <div><button class="btn" data-action="open-event" data-id="${esc(next.id)}">View event</button></div>
                </div>
            </div>
            <div class="hero-track" aria-label="Your ${esc(S.user.role)} duties by phase">${track}</div>
        </section>`;
}

function renderDashboard() {
    const duties = myDuties();
    const stats = summarize(duties);
    const today = todayStr();

    const upcoming = sortEvents(S.events.filter(e => e.date >= today));
    const pending = duties.filter(d => !d.completed).sort(byDeadline).slice(0, 6);

    let side = `
        <section class="panel">
            <div class="panel-head">
                <h2>Upcoming events</h2>
                <button class="btn btn-secondary btn-sm" data-action="nav" data-page="events">View all</button>
            </div>
            ${upcoming.length ? `<ul class="rows">${upcoming.slice(0, 4).map(eventRow).join("")}</ul>` : emptyState("No upcoming events", "Nothing is scheduled yet.")}
        </section>`;

    if (can.viewActivity()) {
        const roleRows = ROLES.map(role => {
            const s = summarize(liveDuties().filter(d => d.role === role));
            return `
                <div>
                    <div class="line"><span>${esc(role)}</span><span>${s.completed} of ${s.total}${s.overdue ? `, ${s.overdue} overdue` : ""}</span></div>
                    <div class="bar"><i style="width:${pct(s.completed, s.total)}%"></i></div>
                </div>`;
        }).join("");

        side += `
            <section class="panel">
                <div class="panel-head"><h2>Team progress</h2></div>
                <div class="panel-body"><div class="team-progress">${roleRows}</div></div>
            </section>
            <section class="panel">
                <div class="panel-head">
                    <h2>Recent activity</h2>
                    <button class="btn btn-secondary btn-sm" data-action="nav" data-page="activity">Open log</button>
                </div>
                ${S.activity.length ? `<ul class="log">${S.activity.slice(0, 5).map(logRow).join("")}</ul>` : emptyState("No activity yet", "Actions will be listed here.")}
            </section>`;
    }

    return `
        ${actionButtons()}
        ${renderHero(upcoming[0])}

        <dl class="ledger">
            <div><dt>Events</dt><dd>${S.events.length}<small>Shared with the team</small></dd></div>
            <div><dt>My duties</dt><dd>${stats.total}<small>${esc(S.user.role)}</small></dd></div>
            <div><dt>Pending</dt><dd>${stats.pending}<small>Still to do</small></dd></div>
            <div><dt>Completed</dt><dd>${stats.completed}<small>${pct(stats.completed, stats.total)}% done</small></dd></div>
            <div class="${stats.overdue ? "is-bad" : ""}"><dt>Overdue</dt><dd>${stats.overdue}<small>Past deadline</small></dd></div>
        </dl>

        <div class="grid-2">
            <section class="panel">
                <div class="panel-head">
                    <h2>Pending responsibilities</h2>
                    <button class="btn btn-secondary btn-sm" data-action="nav" data-page="duties">View all</button>
                </div>
                ${pending.length
                    ? `<ul class="rows">${pending.map(d => dutyRow(d)).join("")}</ul>`
                    : emptyState("All caught up", duties.length ? "You have no pending duties." : "Duties appear here when an event is created.")}
            </section>
            <div class="stack">${side}</div>
        </div>

        </div>`;
}

/* =====================================================
   EVENTS
===================================================== */

function renderEventsPage() {
    const today = todayStr();
    const all = sortEvents(S.events);
    const upcoming = all.filter(e => e.date >= today);
    const past = all.filter(e => e.date < today).reverse();

    let list = upcoming;
    if (S.eventFilter === "past") list = past;
    if (S.eventFilter === "all") list = all;

    const chip = (key, label, count) =>
        `<button class="chip" data-action="filter-events" data-filter="${key}" aria-pressed="${S.eventFilter === key}">${label}<small>${count}</small></button>`;

    return `
        ${actionButtons()}
        <div class="chips">
            ${chip("upcoming", "Upcoming", upcoming.length)}
            ${chip("past", "Past", past.length)}
            ${chip("all", "All", all.length)}
        </div>
        <section class="panel">
            ${list.length
                ? `<ul class="rows">${list.map(eventRow).join("")}</ul>`
                : emptyState(S.events.length ? "No events in this view" : "No events yet",
                    can.createEvent() ? "Use Create event to add the first one." : "Events created by the team will appear here.")}
        </section>`;
}

/* =====================================================
   MY DUTIES
===================================================== */

function renderDutiesPage() {
    const duties = myDuties();
    const stats = summarize(duties);

    let filtered = duties;
    if (S.dutyFilter === "pending") filtered = duties.filter(d => dutyStatus(d) === "pending");
    if (S.dutyFilter === "overdue") filtered = duties.filter(d => dutyStatus(d) === "overdue");
    if (S.dutyFilter === "completed") filtered = duties.filter(d => d.completed);

    const chip = (key, label, count) =>
        `<button class="chip" data-action="filter-duties" data-filter="${key}" aria-pressed="${S.dutyFilter === key}">${label}<small>${count}</small></button>`;

    const phases = PHASES.map(phase => {
        const list = filtered.filter(d => d.phase === phase).sort(byDeadline);
        return `
            <section class="phase-block">
                <div class="phase-head">
                    <span class="phase-dot ${phaseClass(phase)}"></span>
                    <h2>${esc(phase)}</h2>
                    <span class="count">${list.length}</span>
                </div>
                <div class="panel">
                    ${list.length ? `<ul class="rows">${list.map(d => dutyRow(d)).join("")}</ul>` : emptyState("Nothing here", "No duties match this phase and filter.")}
                </div>
            </section>`;
    }).join("");

    return `
        ${actionButtons()}
        <p class="page-note">Duties belong to the ${esc(S.user.role)} role, so anyone in this role sees the same list.</p>
        <div class="chips">
            ${chip("all", "All", stats.total)}
            ${chip("pending", "Pending", stats.pending - stats.overdue)}
            ${chip("overdue", "Overdue", stats.overdue)}
            ${chip("completed", "Completed", stats.completed)}
        </div>
        ${phases}`;
}

/* =====================================================
   CALENDAR
===================================================== */

function renderCalendarPage() {
    const year = S.calendarDate.getFullYear();
    const month = S.calendarDate.getMonth();
    const monthName = S.calendarDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    const offset = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const today = todayStr();
    const open = myDuties().filter(d => !d.completed);

    let cells = "";
    for (let i = 0; i < offset; i++) cells += `<div class="cal-cell blank"></div>`;

    for (let day = 1; day <= days; day++) {
        const date = fmtDate(new Date(year, month, day));
        const events = sortEvents(S.events.filter(e => e.date === date));
        const due = open.filter(d => d.deadline === date);

        cells += `
            <div class="cal-cell">
                <span class="cal-num ${date === today ? "today" : ""}">${day}</span>
                ${events.map(e => `<button class="cal-event" data-action="open-event" data-id="${esc(e.id)}" title="${esc(e.name)}">${esc(e.name)}</button>`).join("")}
                ${due.length ? `<button class="cal-due ${date < today ? "late" : ""}" data-action="nav" data-page="duties">${due.length} ${plural(due.length, "deadline", "deadlines")}</button>` : ""}
            </div>`;
    }

    const filled = offset + days;
    const pad = (7 - (filled % 7)) % 7;
    for (let i = 0; i < pad; i++) cells += `<div class="cal-cell blank"></div>`;

    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const monthEvents = sortEvents(S.events.filter(e => e.date.startsWith(monthPrefix)));

    return `
        <div class="cal-head">
            <h2>${esc(monthName)}</h2>
            <div class="cal-nav">
                <button class="btn btn-secondary btn-sm" data-action="cal-prev" aria-label="Previous month">${icon("left", 16)}</button>
                <button class="btn btn-secondary btn-sm" data-action="cal-today">Today</button>
                <button class="btn btn-secondary btn-sm" data-action="cal-next" aria-label="Next month">${icon("right", 16)}</button>
            </div>
        </div>

        <div class="cal-grid">
            ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => `<div class="cal-dow">${d}</div>`).join("")}
            ${cells}
        </div>

        <section class="agenda">
            <div class="phase-head"><h2>Events in ${esc(S.calendarDate.toLocaleDateString("en-IN", { month: "long" }))}</h2><span class="count">${monthEvents.length}</span></div>
            <div class="panel">
                ${monthEvents.length ? `<ul class="rows">${monthEvents.map(eventRow).join("")}</ul>` : emptyState("No events this month", "Use the arrows to look at other months.")}
            </div>
        </section>`;
}

/* =====================================================
   TEAM
===================================================== */

function renderTeamPage() {
    const duties = liveDuties();

    const members = Object.keys(TEAM)
        .map(id => Object.assign({ id }, TEAM[id]))
        .sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role));

    const cards = members.map(member => {
        const stats = summarize(duties.filter(d => d.role === member.role));
        const shared = members.filter(m => m.role === member.role && m.id !== member.id);
        const active = !!S.users[member.id];
        const isMe = member.id === S.user.id;

        return `
            <article class="member ${isMe ? "me-card" : ""}">
                <div class="member-top">
                    <span class="avatar">${esc(member.initials)}</span>
                    <div>
                        <h3>${esc(member.name)}</h3>
                        <p>${esc(member.role)}</p>
                    </div>
                </div>
                <div class="member-tags">
                    ${isMe ? `<span class="tag tag-brand">You</span>` : ""}
                    ${active ? `<span class="tag tag-good">PIN set</span>` : `<span class="tag tag-warn">Not set up yet</span>`}
                    ${shared.length ? `<span class="tag">Shares role with ${esc(firstName(shared[0].name))}</span>` : ""}
                </div>
                <p class="member-desc">${esc(ROLE_INFO[member.role])}</p>
                <div class="member-stats">
                    <div><b>${stats.total}</b><span>Duties</span></div>
                    <div><b>${stats.completed}</b><span>Completed</span></div>
                    <div><b>${stats.pending}</b><span>Pending${stats.overdue ? `, ${stats.overdue} overdue` : ""}</span></div>
                </div>
                <div class="bar"><i style="width:${pct(stats.completed, stats.total)}%"></i></div>
            </article>`;
    }).join("");

    return `
        <p class="page-note">Duties belong to roles. Both Head Coordinators share one role, so they see and update the same duties.</p>
        <div class="team-grid">${cards}</div>`;
}

/* =====================================================
   ACTIVITY LOG
===================================================== */

function renderActivityPage() {
    const chip = (key, label) =>
        `<button class="chip" data-action="filter-activity" data-filter="${key}" aria-pressed="${S.activityFilter === key}">${label}</button>`;

    const list = S.activity.filter(a => {
        if (S.activityFilter === "all") return true;
        const meta = ACTIONS[a.action];
        return meta && meta.cat === S.activityFilter;
    });

    const canLoadMore = S.activity.length >= S.activityLimit;

    return `
        <div class="chips">
            ${chip("all", "Everything")}
            ${chip("access", "Logins and PINs")}
            ${chip("events", "Events")}
            ${chip("duties", "Duties")}
        </div>
        <section class="panel">
            ${list.length ? `<ul class="log">${list.map(logRow).join("")}</ul>` : emptyState("No activity to show", "Actions such as logins, events and duty updates are recorded here.")}
        </section>
        ${canLoadMore ? `<div class="page-actions" style="justify-content:center;margin-top:20px"><button class="btn btn-secondary" data-action="more-activity">Load older activity</button></div>` : ""}`;
}

/* =====================================================
   SETTINGS
===================================================== */

function renderSettingsPage() {
    const abilities = ROLE_ABILITIES[S.user.role] || ROLE_ABILITIES.default;

    const themeBtn = (key, label) =>
        `<button data-action="set-theme" data-theme="${key}" aria-pressed="${S.prefs.theme === key}">${label}</button>`;

    const toggleRow = (key, title, desc) => `
        <div class="setting-row">
            <div><strong>${title}</strong><small>${desc}</small></div>
            <button class="switch" role="switch" aria-checked="${S.prefs[key]}" aria-label="${title}" data-action="pref-toggle" data-key="${key}"></button>
        </div>`;

    let legacy = "";
    if (S.user.role === "Campus Lead" && S.legacy) {
        legacy = `
            <section class="panel setting" style="padding:20px">
                <h3>Data from the previous version</h3>
                <p>Found ${S.legacy.events.length} ${plural(S.legacy.events.length, "event", "events")} and ${S.legacy.duties.length} ${plural(S.legacy.duties.length, "duty", "duties")} saved in the old single-document format${S.legacy.hasPins ? ", along with old PINs stored as plain text" : ""}. Import them, then delete the old copy.</p>
                <div class="setting-actions">
                    <button class="btn btn-primary" data-action="import-legacy">Import earlier data</button>
                    <button class="btn btn-danger" data-action="delete-legacy">Delete old copy</button>
                </div>
            </section>`;
    }

    return `
        <div class="settings-grid">
            <section class="panel setting" style="padding:20px">
                <h3>My account</h3>
                <p>Who you are logged in as.</p>
                <div class="setting-row"><strong>Name</strong><span>${esc(S.user.name)}</span></div>
                <div class="setting-row"><strong>Role</strong><span>${esc(S.user.role)}</span></div>
                <div class="setting-row"><strong>PIN</strong><span>Protected</span></div>
            </section>

            <section class="panel setting" style="padding:20px">
                <h3>Security</h3>
                <p>Change the PIN you use to log in.</p>
                <div class="setting-actions">
                    <button class="btn btn-primary" data-action="change-pin">${icon("lock", 16)}Change PIN</button>
                    <button class="btn btn-secondary" data-action="logout">${icon("logout", 16)}Log out</button>
                </div>
            </section>

            <section class="panel setting" style="padding:20px">
                <h3>Appearance</h3>
                <p>Saved on this device only.</p>
                <div class="setting-row">
                    <div><strong>Theme</strong><small>Follow the device, or pick one</small></div>
                    <div class="segmented" role="group" aria-label="Theme">${themeBtn("system", "Auto")}${themeBtn("light", "Light")}${themeBtn("dark", "Dark")}</div>
                </div>
            </section>

            <section class="panel setting" style="padding:20px">
                <h3>Notifications</h3>
                <p>Saved on this device only.</p>
                ${toggleRow("remind", "Reminders", "Overdue duties, deadlines and upcoming events")}
                ${toggleRow("live", "Live alerts", "Pop-ups when teammates create events or update duties")}
            </section>

            <section class="panel setting" style="padding:20px">
                <h3>What ${esc(S.user.role)} can do</h3>
                <p>Enforced by Firebase security rules, not only by the interface.</p>
                <ul class="ability-list">
                    ${abilities.map(([yes, text]) => `<li class="${yes ? "" : "no"}">${icon(yes ? "check" : "no", 16)}<span>${esc(text)}</span></li>`).join("")}
                </ul>
            </section>

            ${legacy}
        </div>`;
}

/* =====================================================
   EVENT DETAILS
===================================================== */

function openEventDetails(id) {
    if (!eventById(id)) return;
    S.openEventId = id;
    renderEventDetails(id);
    openModal("detailsModal");
}

function renderEventDetails(id) {
    const ev = eventById(id);
    if (!ev) {
        closeModal("detailsModal");
        return;
    }

    const card = $("detailsModal").querySelector(".modal-card");
    const scroll = card.scrollTop;

    $("detailsTitle").textContent = ev.name;
    $("detailsSubtitle").textContent = `${displayDate(ev.date)} at ${fmtTime(ev.time)}`;

    const duties = liveDuties().filter(d => d.eventId === id);
    const orderedRoles = [S.user.role, ...ROLES.filter(r => r !== S.user.role)];

    const sections = orderedRoles.map(role => {
        const list = duties
            .filter(d => d.role === role)
            .sort((a, b) => PHASES.indexOf(a.phase) - PHASES.indexOf(b.phase) || a.deadline.localeCompare(b.deadline));
        if (!list.length) return "";

        const stats = summarize(list);
        return `
            <section class="role-section ${role === S.user.role ? "mine" : ""}">
                <div class="role-section-head">
                    <h3>${esc(role)}${role === S.user.role ? `<span class="tag tag-brand">Your role</span>` : ""}</h3>
                    <span class="mini-progress"><span class="bar"><i style="width:${pct(stats.completed, stats.total)}%"></i></span>${stats.completed}/${stats.total}</span>
                </div>
                <ul class="rows">${list.map(d => dutyRow(d, { showEvent: false })).join("")}</ul>
            </section>`;
    }).join("");

    $("eventDetailsContent").innerHTML = `
        <div class="detail-block">
            <p>${esc(ev.description || "No description provided.")}</p>
            <div class="detail-grid">
                <div><span>Date</span><strong>${esc(displayDate(ev.date))}</strong></div>
                <div><span>Time</span><strong>${esc(fmtTime(ev.time))}</strong></div>
                <div><span>Venue</span><strong>${esc(ev.venue)}</strong></div>
                <div><span>Type</span><strong>${esc(ev.type)}</strong></div>
                <div><span>Created by</span><strong>${esc(ev.createdByName || (TEAM[ev.createdBy] ? TEAM[ev.createdBy].name : "Unknown"))}</strong></div>
            </div>
        </div>
        ${can.deleteEvent() ? `<div class="detail-actions"><button class="btn btn-danger" data-action="delete-event" data-id="${esc(ev.id)}">${icon("trash", 16)}Delete event</button></div>` : ""}
        ${sections || emptyState("No duties", "This event has no duties.")}`;

    card.scrollTop = scroll;
}

/* =====================================================
   ACTIONS: EVENTS
===================================================== */

/* Duties are assigned manually after an event is created. */

function openEventModal() {
    if (!can.createEvent()) return toast("You do not have permission to create events.", "error");
    $("eventForm").reset();
    $("eventDate").value = todayStr();
    openModal("eventModal");
}

$("eventForm").addEventListener("submit", async event => {
    event.preventDefault();
    if (!can.createEvent()) return toast("You do not have permission to create events.", "error");

    const name = $("eventName").value.trim();
    const date = $("eventDate").value;
    const time = $("eventTime").value;
    const venue = $("eventVenue").value.trim();

    if (!name || !date || !time || !venue) return toast("Fill in the name, date, time and venue.", "error");

    const id = Backend.newId("events");
    const data = {
        name,
        date,
        time,
        venue,
        type: $("eventType").value,
        description: $("eventDescription").value.trim(),
        createdBy: S.user.id,
        createdByName: S.user.name
    };
    const duties = [];

    setBusy("eventSubmit", true, "Creating...");

    try {
        await Backend.createEvent(id, data, duties, { action: "event_created", detail: name, eventId: id, eventName: name });
        closeModal("eventModal");
        toast("Event created. Assign duties to each role manually.");
    } catch (err) {
        handleError(err, "Could not create the event. Try again.");
    } finally {
        setBusy("eventSubmit", false);
    }
});

async function deleteEvent(id) {
    if (!can.deleteEvent()) return toast("Only the Campus Lead or Outreach Lead can delete events.", "error");

    const ev = eventById(id);
    if (!ev) return toast("That event no longer exists.", "error");

    const count = S.duties.filter(d => d.eventId === id).length;
    const ok = await confirmDialog({
        title: `Delete "${ev.name}"?`,
        message: `This also deletes its ${count} ${plural(count, "duty", "duties")} for everyone on the team. It cannot be undone.`,
        confirmText: "Delete event"
    });
    if (!ok) return;

    try {
        await Backend.deleteEvent(id, { action: "event_deleted", detail: ev.name, eventName: ev.name });
        closeModal("detailsModal");
        toast("Event deleted.");
    } catch (err) {
        handleError(err, "Could not delete the event. Try again.");
    }
}

/* =====================================================
   ACTIONS: DUTIES
===================================================== */

async function toggleDuty(id, button) {
    const duty = S.duties.find(d => d.id === id);
    if (!duty || !can.toggleDuty(duty)) return;

    const ev = eventById(duty.eventId);
    const completing = !duty.completed;
    if (button) button.disabled = true;

    try {
        await Backend.setDutyCompleted(id, completing, S.user.id, {
            action: completing ? "duty_completed" : "duty_reopened",
            detail: duty.title,
            eventId: duty.eventId,
            eventName: ev ? ev.name : undefined
        });
        toast(completing ? "Duty completed." : "Duty reopened.");
    } catch (err) {
        handleError(err, "Could not update the duty. Try again.");
        if (button) button.disabled = false;
    }
}

function openDutyModal() {
    if (!can.addDuty()) return toast("Only the Campus Lead or Outreach Lead can add duties.", "error");
    if (!S.events.length) return toast("Create an event first, then add duties to it.", "error");

    $("dutyForm").reset();
    delete $("dutyDeadline").dataset.touched;

    const today = todayStr();
    const ordered = [...sortEvents(S.events.filter(e => e.date >= today)), ...sortEvents(S.events.filter(e => e.date < today)).reverse()];
    $("dutyEvent").innerHTML = ordered
        .map(e => `<option value="${esc(e.id)}">${esc(e.name)} (${esc(shortDate(e.date))})</option>`)
        .join("");

    suggestDeadline();
    openModal("dutyModal");
}

function suggestDeadline() {
    const deadline = $("dutyDeadline");
    if (deadline.dataset.touched) return;
    const ev = eventById($("dutyEvent").value);
    deadline.value = ev ? ev.date : todayStr();
}

$("dutyEvent").addEventListener("change", suggestDeadline);
$("dutyDeadline").addEventListener("input", () => { $("dutyDeadline").dataset.touched = "1"; });

$("dutyForm").addEventListener("submit", async event => {
    event.preventDefault();
    if (!can.addDuty()) return toast("Only the Campus Lead or Outreach Lead can add duties.", "error");

    const title = $("dutyName").value.trim();
    const eventId = $("dutyEvent").value;
    const deadline = $("dutyDeadline").value;
    const ev = eventById(eventId);

    if (!title || !ev || !deadline) return toast("Fill in the duty, event and deadline.", "error");

    const duty = {
        eventId,
        title,
        role: $("dutyRole").value,
        phase: $("dutyPhase").value,
        deadline,
        completed: false,
        completedAt: null,
        completedBy: null,
        custom: true,
        createdBy: S.user.id
    };

    setBusy("dutySubmit", true, "Adding...");

    try {
        await Backend.addDuty(duty, { action: "duty_added", detail: title, eventId, eventName: ev.name });
        closeModal("dutyModal");
        toast(`Duty added for ${duty.role}.`);
    } catch (err) {
        handleError(err, "Could not add the duty. Try again.");
    } finally {
        setBusy("dutySubmit", false);
    }
});

/* =====================================================
   LEGACY DATA IMPORT (Campus Lead)
===================================================== */

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

async function loadLegacy() {
    const data = await Backend.readLegacy();
    S.legacy = data && (data.events.length || data.duties.length || data.hasPins) ? data : null;
    if (S.page === "settings") scheduleRender();
}

async function importLegacyData() {
    if (!S.legacy || S.user.role !== "Campus Lead") return;

    const existingEvents = new Set(S.events.map(e => e.id));
    const existingDuties = new Set(S.duties.map(d => d.id));
    const events = [];
    const importedEventIds = new Set();

    S.legacy.events.forEach(e => {
        if (!e || !ID_PATTERN.test(e.id || "") || existingEvents.has(e.id)) return;
        if (!e.name || !DATE_PATTERN.test(e.date || "")) return;

        events.push({
            id: e.id,
            data: {
                name: String(e.name).slice(0, 120),
                date: e.date,
                time: /^\d{2}:\d{2}$/.test(e.time || "") ? e.time : "09:00",
                venue: String(e.venue || "To be announced").slice(0, 120) || "To be announced",
                type: EVENT_TYPES.includes(e.type) ? e.type : "Community Event",
                description: String(e.description || "").slice(0, 2000),
                createdBy: String(e.createdBy || "legacy").slice(0, 40),
                createdByName: TEAM[e.createdBy] ? TEAM[e.createdBy].name : ""
            }
        });
        importedEventIds.add(e.id);
    });

    const duties = [];
    S.legacy.duties.forEach(d => {
        if (!d || !ID_PATTERN.test(d.id || "") || existingDuties.has(d.id)) return;
        if (!ROLES.includes(d.role) || !PHASES.includes(d.phase) || !d.title || !DATE_PATTERN.test(d.deadline || "")) return;
        if (!importedEventIds.has(d.eventId) && !existingEvents.has(d.eventId)) return;

        const completedAt = d.completed && d.completedAt ? new Date(d.completedAt) : null;

        duties.push({
            id: d.id,
            completedAtDate: completedAt && !isNaN(completedAt) ? completedAt : null,
            data: {
                eventId: d.eventId,
                title: String(d.title).slice(0, 140),
                role: d.role,
                phase: d.phase,
                deadline: d.deadline,
                completed: !!d.completed,
                completedAt: null,
                completedBy: null,
                custom: false,
                createdBy: S.user.id
            }
        });
    });

    if (!events.length && !duties.length) {
        return toast("Everything from the old version is already here.");
    }

    const ok = await confirmDialog({
        title: "Import earlier data?",
        message: `This adds ${events.length} ${plural(events.length, "event", "events")} and ${duties.length} ${plural(duties.length, "duty", "duties")} from the previous version. Items already in the workspace are skipped.`,
        confirmText: "Import",
        danger: false
    });
    if (!ok) return;

    try {
        await Backend.importLegacy(events, duties, {
            action: "legacy_imported",
            detail: `${events.length} events, ${duties.length} duties`
        });
        toast("Earlier data imported.");
    } catch (err) {
        handleError(err, "Import failed. Nothing further was changed.");
    }
}

async function deleteLegacyData() {
    const ok = await confirmDialog({
        title: "Delete the old copy?",
        message: "This removes the previous single-document data, including the old PINs stored as plain text. Import first if you still need the events and duties.",
        confirmText: "Delete old copy"
    });
    if (!ok) return;

    try {
        await Backend.deleteLegacy();
        S.legacy = null;
        toast("Old copy deleted.");
        scheduleRender();
    } catch (err) {
        handleError(err, "Could not delete the old copy.");
    }
}

/* =====================================================
   SIDEBAR (mobile)
===================================================== */

function openSidebar() {
    $("sidebar").classList.add("open");
    $("sidebarBackdrop").classList.add("open");
}

function closeSidebar() {
    $("sidebar").classList.remove("open");
    $("sidebarBackdrop").classList.remove("open");
}

/* =====================================================
   EVENT DELEGATION
===================================================== */

const handlers = {
    "nav": data => goToPage(data.page),
    "logout": () => doLogout(),
    "open-sidebar": () => openSidebar(),
    "close-sidebar": () => closeSidebar(),
    "open-setup": () => openSetup(),
    "change-pin": () => openChangePin(),
    "new-event": () => openEventModal(),
    "new-duty": () => openDutyModal(),
    "open-event": data => openEventDetails(data.id),
    "delete-event": data => deleteEvent(data.id),
    "toggle-duty": (data, el) => toggleDuty(data.id, el),
    "close-modal": data => closeModal(data.modal),
    "confirm-yes": () => resolveConfirm(true),
    "confirm-no": () => resolveConfirm(false),
    "toggle-notifs": () => toggleNotifs(),
    "clear-notifs": () => { S.liveNotes = []; renderNotifPanel(); updateBell(); },
    "filter-events": data => { S.eventFilter = data.filter; renderPage(); },
    "filter-duties": data => { S.dutyFilter = data.filter; renderPage(); },
    "filter-activity": data => { S.activityFilter = data.filter; renderPage(); },
    "more-activity": () => { S.activityLimit += 200; startActivityWatch(); },
    "cal-prev": () => { S.calendarDate = new Date(S.calendarDate.getFullYear(), S.calendarDate.getMonth() - 1, 1); renderPage(); },
    "cal-next": () => { S.calendarDate = new Date(S.calendarDate.getFullYear(), S.calendarDate.getMonth() + 1, 1); renderPage(); },
    "cal-today": () => { S.calendarDate = firstOfMonth(new Date()); renderPage(); },
    "set-theme": data => { S.prefs.theme = data.theme; savePrefs(); applyTheme(); renderPage(); },
    "pref-toggle": data => { S.prefs[data.key] = !S.prefs[data.key]; savePrefs(); renderPage(); updateBell(); },
    "import-legacy": () => importLegacyData(),
    "delete-legacy": () => deleteLegacyData()
};

document.addEventListener("click", event => {
    const el = event.target.closest("[data-action]");

    if (S.notifOpen && !event.target.closest("#notifPanel") && !event.target.closest("#bellBtn")) {
        toggleNotifs(false);
    }

    if (!el) return;

    const fn = handlers[el.dataset.action];
    if (!fn) return;

    if (el.closest("#notifPanel") && el.dataset.action !== "clear-notifs") toggleNotifs(false);

    fn(el.dataset, el);
});

document.addEventListener("keydown", event => {
    const tag = document.activeElement && document.activeElement.tagName;
    if (event.key !== "Escape") return;

    if (!$("confirmModal").classList.contains("hidden")) return resolveConfirm(false);

    const open = [...document.querySelectorAll(".modal:not(.hidden)")].pop();
    if (open) return closeModal(open.id);

    if (S.notifOpen) toggleNotifs(false);
    closeSidebar();
});

/* =====================================================
   START
===================================================== */

function hydrateIcons() {
    document.querySelectorAll("[data-icon]").forEach(el => {
        el.innerHTML = icon(el.dataset.icon, 19);
        el.style.display = "inline-flex";
    });
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);

hydrateIcons();
applyTheme();


// Restores the Firebase session on reload; login and setup boot the app themselves.
Backend.onAuthChanged(async user => {
    if (authFlow) return;

    if (!user) {
        if (S.user) showLogin();
        else {
            $("loginScreen").classList.remove("hidden");
            hideBoot();
        }
        return;
    }

    if (S.user) return;

    try {
        await bootSession(user, { fresh: false });
    } catch (err) {
        console.error(err);
        try { await Backend.signOut(); } catch (e) { /* ignore */ }
        showLogin(err && err.code === "permission-denied"
            ? "Could not load your profile. Publish the latest firestore.rules in Firebase."
            : "Your session could not be restored. Please log in again.");
    }

    hideBoot();
});
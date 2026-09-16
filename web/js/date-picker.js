// ============================================================
// TODOIST-STYLE DATE / TIME PICKER
// Replaces native datetime-local inputs with a popup calendar:
// quick options (Today / Tomorrow / Next week / Weekend / No date)
// + month grid + optional time. The real value lives in a hidden
// input as "YYYY-MM-DD" (all day) or "YYYY-MM-DDTHH:mm" (with time)
// so existing save logic keeps working via parsePickerValue().
// ============================================================
(function () {
  const pad = (n) => String(n).padStart(2, "0");

  function startOfDay(d) {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
  }

  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }

  // "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm" (local) -> { date, hasTime }
  function parsePickerValue(str) {
    if (!str || !str.trim()) return { date: null, hasTime: false };
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(str.trim());
    if (!m) {
      const d = new Date(str);
      return isNaN(d.getTime()) ? { date: null, hasTime: false } : { date: d, hasTime: true };
    }
    const d = new Date(+m[1], +m[2] - 1, +m[3], m[4] !== undefined ? +m[4] : 0, m[5] !== undefined ? +m[5] : 0, 0, 0);
    return { date: d, hasTime: m[4] !== undefined };
  }

  function formatPickerValue(date, hasTime) {
    if (!date) return "";
    const ymd = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    if (!hasTime) return ymd;
    return `${ymd}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function nextMonday(from) {
    const d = startOfDay(from);
    const delta = ((1 + 7 - d.getDay()) % 7) || 7;
    d.setDate(d.getDate() + delta);
    return d;
  }

  function upcomingSaturday(from) {
    const today = startOfDay(new Date());
    const d = startOfDay(from);
    if (d.getDay() === 6) return d; // today is Saturday -> keep today
    d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
    return d;
  }

  // Human label for the trigger button, Todoist style
  function formatTriggerLabel(str) {
    const { date, hasTime } = parsePickerValue(str);
    if (!date) return "Date";
    const today = startOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    let dayPart;
    if (isSameDay(date, today)) dayPart = "Today";
    else if (isSameDay(date, tomorrow)) dayPart = "Tomorrow";
    else {
      const sameYear = date.getFullYear() === today.getFullYear();
      dayPart = date.toLocaleDateString(undefined, sameYear
        ? { weekday: "short", day: "numeric", month: "short" }
        : { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    }
    if (hasTime) {
      dayPart += " " + date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    }
    return dayPart;
  }

  function isOverdueDay(date) {
    return startOfDay(date) < startOfDay(new Date());
  }

  // ---- Registered trigger pairs: hidden input id -> button id ----
  const pairs = {}; // inputId -> { btnId, allowTime }

  function triggerBtn(inputId) {
    const p = pairs[inputId];
    return p ? document.getElementById(p.btnId) : null;
  }

  function sync(inputId) {
    const input = document.getElementById(inputId);
    const btn = triggerBtn(inputId);
    if (!input || !btn) return;
    const label = btn.querySelector(".date-trigger-label");
    const val = input.value;
    if (label) label.textContent = formatTriggerLabel(val);
    btn.classList.toggle("has-value", !!val);
    const { date } = parsePickerValue(val);
    btn.classList.toggle("is-overdue", !!date && isOverdueDay(date));
    const clear = btn.querySelector(".date-trigger-clear");
    if (clear) clear.classList.toggle("hidden", !val);
  }

  function syncAll() {
    Object.keys(pairs).forEach(sync);
  }

  function setValue(inputId, val) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.value = val || "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    sync(inputId);
  }

  // ---- Popup DOM (built once) ----
  let popup = null;
  let session = null; // { inputId, viewY, viewM, selDate, hasTime, timeStr }

  function ensurePopup() {
    if (popup) return popup;
    popup = document.createElement("div");
    popup.id = "datePickerPopup";
    popup.className = "date-picker hidden";
    popup.innerHTML = `
      <div class="dp-quick">
        <button type="button" class="dp-quick-btn" data-quick="today"><span class="dp-quick-icon">📅</span><span>Today</span><span class="dp-quick-day"></span></button>
        <button type="button" class="dp-quick-btn" data-quick="tomorrow"><span class="dp-quick-icon">☀️</span><span>Tomorrow</span><span class="dp-quick-day"></span></button>
        <button type="button" class="dp-quick-btn" data-quick="nextweek"><span class="dp-quick-icon">🗓️</span><span>Next week</span><span class="dp-quick-day"></span></button>
        <button type="button" class="dp-quick-btn" data-quick="weekend"><span class="dp-quick-icon">🛋️</span><span>Weekend</span><span class="dp-quick-day"></span></button>
        <button type="button" class="dp-quick-btn dp-quick-nodate" data-quick="nodate"><span class="dp-quick-icon">🚫</span><span>No date</span></button>
      </div>
      <div class="dp-month-row">
        <button type="button" class="dp-month-nav" data-nav="-1" aria-label="Previous month">‹</button>
        <span class="dp-month-label"></span>
        <button type="button" class="dp-month-nav" data-nav="1" aria-label="Next month">›</button>
      </div>
      <div class="dp-weekdays"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
      <div class="dp-grid"></div>
      <div class="dp-time-row">
        <button type="button" class="dp-time-toggle"><span class="dp-time-icon">🕐</span><span>Time</span></button>
        <input type="time" class="dp-time-input" />
      </div>
      <div class="dp-footer">
        <button type="button" class="dp-clear-btn">Clear</button>
        <button type="button" class="dp-save-btn">Save</button>
      </div>`;
    document.body.appendChild(popup);

    popup.querySelectorAll("[data-quick]").forEach(btn => {
      btn.addEventListener("click", () => onQuick(btn.dataset.quick));
    });
    popup.querySelectorAll("[data-nav]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        session.viewM += parseInt(btn.dataset.nav, 10);
        if (session.viewM < 0) { session.viewM = 11; session.viewY -= 1; }
        if (session.viewM > 11) { session.viewM = 0; session.viewY += 1; }
        renderGrid();
        renderMonthLabel();
      });
    });
    popup.querySelector(".dp-time-toggle").addEventListener("click", () => {
      session.hasTime = !session.hasTime;
      if (session.hasTime && !session.timeStr) session.timeStr = "09:00";
      if (session.hasTime && session.selDate) applyTimeToSel();
      renderTimeRow();
    });
    popup.querySelector(".dp-time-input").addEventListener("input", (e) => {
      session.timeStr = e.target.value;
      session.hasTime = !!e.target.value;
      if (session.hasTime && session.selDate) applyTimeToSel();
      renderTimeRow();
    });
    popup.querySelector(".dp-clear-btn").addEventListener("click", () => {
      commit("");
    });
    popup.querySelector(".dp-save-btn").addEventListener("click", () => {
      let d = session.selDate;
      if (!d && session.hasTime) {
        d = startOfDay(new Date());
        const [hh, mm] = (session.timeStr || "09:00").split(":").map(Number);
        d.setHours(hh || 0, mm || 0, 0, 0);
      }
      commit(formatPickerValue(d, session.hasTime));
    });
    popup.addEventListener("pointerdown", (e) => e.stopPropagation());

    document.addEventListener("pointerdown", (e) => {
      if (!session || popup.classList.contains("hidden")) return;
      if (popup.contains(e.target)) return;
      const btn = session.btn;
      if (btn && btn.contains(e.target)) return;
      close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && session && !popup.classList.contains("hidden")) close();
    });
    window.addEventListener("resize", () => {
      if (session && !popup.classList.contains("hidden")) positionPopup();
    });

    return popup;
  }

  function applyTimeToSel() {
    if (!session.selDate) session.selDate = startOfDay(new Date());
    const [hh, mm] = (session.timeStr || "09:00").split(":").map(Number);
    session.selDate.setHours(hh || 0, mm || 0, 0, 0);
  }

  function onQuick(kind) {
    const now = new Date();
    if (kind === "nodate") {
      commit("");
      return;
    }
    let d;
    if (kind === "today") d = startOfDay(now);
    else if (kind === "tomorrow") { d = startOfDay(now); d.setDate(d.getDate() + 1); }
    else if (kind === "nextweek") d = nextMonday(now);
    else if (kind === "weekend") d = upcomingSaturday(now);
    if (session.hasTime) {
      const [hh, mm] = (session.timeStr || "09:00").split(":").map(Number);
      d.setHours(hh || 0, mm || 0, 0, 0);
    }
    commit(formatPickerValue(d, session.hasTime));
  }

  function commit(val) {
    if (session) setValue(session.inputId, val);
    close();
  }

  function renderMonthLabel() {
    const label = popup.querySelector(".dp-month-label");
    const d = new Date(session.viewY, session.viewM, 1);
    label.textContent = d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }

  function renderQuickDays() {
    const now = new Date();
    const map = {
      today: startOfDay(now),
      tomorrow: (() => { const d = startOfDay(now); d.setDate(d.getDate() + 1); return d; })(),
      nextweek: nextMonday(now),
      weekend: upcomingSaturday(now),
    };
    popup.querySelectorAll("[data-quick]").forEach(btn => {
      const dayEl = btn.querySelector(".dp-quick-day");
      if (!dayEl) return;
      const d = map[btn.dataset.quick];
      dayEl.textContent = d ? d.toLocaleDateString(undefined, { weekday: "short" }) : "";
    });
  }

  function renderGrid() {
    const grid = popup.querySelector(".dp-grid");
    grid.innerHTML = "";
    // Monday-first offset
    const first = new Date(session.viewY, session.viewM, 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(session.viewY, session.viewM, 1 - offset);
    const today = startOfDay(new Date());
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "dp-day";
      cell.textContent = d.getDate();
      if (d.getMonth() !== session.viewM) cell.classList.add("is-other-month");
      if (isSameDay(d, today)) cell.classList.add("is-today");
      if (session.selDate && isSameDay(d, session.selDate)) cell.classList.add("is-selected");
      cell.addEventListener("click", () => {
        const picked = startOfDay(d);
        if (session.hasTime) {
          const [hh, mm] = (session.timeStr || "09:00").split(":").map(Number);
          picked.setHours(hh || 0, mm || 0, 0, 0);
        }
        session.selDate = picked;
        renderGrid();
      });
      grid.appendChild(cell);
    }
  }

  function renderTimeRow() {
    const pair = pairs[session.inputId];
    const row = popup.querySelector(".dp-time-row");
    const toggle = popup.querySelector(".dp-time-toggle");
    const input = popup.querySelector(".dp-time-input");
    if (pair && pair.allowTime === false) {
      row.classList.add("hidden");
      return;
    }
    row.classList.remove("hidden");
    toggle.classList.toggle("active", session.hasTime);
    input.classList.toggle("hidden", !session.hasTime);
    if (session.hasTime && document.activeElement !== input) {
      input.value = session.timeStr || "09:00";
    }
  }

  function positionPopup() {
    if (window.innerWidth <= 780) {
      popup.style.left = "";
      popup.style.top = "";
      return;
    }
    const btn = session.btn;
    popup.style.visibility = "hidden";
    popup.classList.remove("hidden");
    const pw = popup.offsetWidth || 300;
    const ph = popup.offsetHeight || 400;
    let left = 8;
    let top = 8;
    if (btn) {
      const r = btn.getBoundingClientRect();
      left = Math.min(Math.max(8, r.left), window.innerWidth - pw - 8);
      top = r.bottom + 6;
      if (top + ph > window.innerHeight - 8) {
        top = Math.max(8, r.top - ph - 6);
      }
    } else {
      left = Math.max(8, (window.innerWidth - pw) / 2);
      top = Math.max(8, (window.innerHeight - ph) / 2);
    }
    popup.style.left = left + "px";
    popup.style.top = top + "px";
    popup.style.visibility = "";
  }

  function open(inputId) {
    const input = document.getElementById(inputId);
    const pair = pairs[inputId];
    if (!input || !pair) return;
    ensurePopup();
    const { date, hasTime } = parsePickerValue(input.value);
    const base = date || startOfDay(new Date());
    session = {
      inputId,
      btn: document.getElementById(pair.btnId),
      viewY: base.getFullYear(),
      viewM: base.getMonth(),
      selDate: date ? new Date(date) : null,
      hasTime,
      timeStr: hasTime ? `${pad(base.getHours())}:${pad(base.getMinutes())}` : "",
    };
    renderMonthLabel();
    renderQuickDays();
    renderGrid();
    renderTimeRow();
    positionPopup();
    popup.classList.remove("hidden");
  }

  function close() {
    if (popup) popup.classList.add("hidden");
    session = null;
  }

  function isOpen() {
    return !!session && popup && !popup.classList.contains("hidden");
  }

  function attach(inputId, btnId, opts) {
    pairs[inputId] = { btnId, allowTime: !opts || opts.allowTime !== false };
    const btn = document.getElementById(btnId);
    if (btn && !btn.dataset.dpBound) {
      btn.dataset.dpBound = "1";
      btn.addEventListener("click", (e) => {
        if (e.target.closest(".date-trigger-clear")) {
          e.stopPropagation();
          setValue(inputId, "");
          return;
        }
        e.stopPropagation();
        if (session && session.inputId === inputId && isOpen()) close();
        else open(inputId);
      });
    }
    sync(inputId);
  }

  window.DatePicker = {
    attach,
    open,
    close,
    sync,
    syncAll,
    setValue,
    parsePickerValue,
    formatPickerValue,
    formatTriggerLabel,
  };
})();

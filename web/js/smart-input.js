// ============================================================
// SMART TEXT PARSING (tags, project, priority, recurrence, date, time)
// ============================================================
function parseSmartInput(raw) {
  let text = " " + raw + " ";
  let priority = null, project = null, recurrence = null;
  const tags = [];

  // Priority
  text = text.replace(/(?:^|\s)(?:p|priority:?\s*|prio:?\s*|!)([1-4])(?=\s|$)/gi, (m, n) => {
    priority = parseInt(n, 10);
    return " ";
  });
  text = text.replace(/(?:^|\s)(?:!|priority:?\s*)(urgent|high|med(?:ium)?|low)(?=\s|$)/gi, (m, lvl) => {
    lvl = lvl.toLowerCase();
    priority = (lvl === "urgent" || lvl === "high") ? 1 : (lvl === "low" ? 3 : 2);
    return " ";
  });

  // Tags
  text = text.replace(/(?:^|\s)@([a-zA-Z0-9_-]+)/g, (m, tag) => {
    tags.push(tag.toLowerCase());
    return " ";
  });
  text = text.replace(/(?:^|\s)tags?:([a-zA-Z0-9_-]+)/gi, (m, tag) => {
    tags.push(tag.toLowerCase());
    return " ";
  });

  // Project
  text = text.replace(/(?:^|\s)#([a-zA-Z0-9_-]+)/g, (m, p) => {
    project = p.charAt(0).toUpperCase() + p.slice(1);
    return " ";
  });
  text = text.replace(/(?:^|\s)(?:project|in|to):([a-zA-Z0-9_-]+)/gi, (m, p) => {
    project = p.charAt(0).toUpperCase() + p.slice(1);
    return " ";
  });

  // Recurrence
  const recurPatterns = [
    [/(?:\bevery\s+other\s+week\b|\bbi-?weekly\b|\bfortnightly\b|\bevery\s+2\s+weeks?\b|\bevery\s+two\s+weeks?\b|\bevery\s+second\s+week\b)/i, "biweekly"],
    [/(?:\bevery\s+other\s+month\b|\bbi-?monthly\b|\bevery\s+2\s+months?\b|\bevery\s+two\s+months?\b)/i, "bimonthly"],
    [/(?:\bquarterly\b|\bevery\s+quarter\b|\bevery\s+3\s+months?\b|\bevery\s+three\s+months?\b)/i, "every:3:months"],
    [/(?:\bsemi-?annually\b|\bevery\s+6\s+months?\b|\bevery\s+six\s+months?\b)/i, "every:6:months"],
    [/(?:\bevery\s+weekday\b|\bon\s+weekdays?\b|\bweekdays?\b|\bworkdays?\b|\bevery\s+work\s*day\b)/i, "weekday"],
    [/(?:\bevery\s+day\b|\bdaily\b|\beach\s+day\b)/i, "daily"],
    [/(?:\bevery\s+week\b|\bweekly\b|\beach\s+week\b|\bonce\s+a\s+week\b)/i, "weekly"],
    [/(?:\bevery\s+month\b|\bmonthly\b|\beach\s+month\b|\bonce\s+a\s+month\b)/i, "monthly"],
    [/(?:\bevery\s+year\b|\byearly\b|\bannually\b|\bannual\b|\beach\s+year\b|\bonce\s+a\s+year\b)/i, "yearly"],
    [/(?:\bevery\s+other\s+day\b)/i, "every:2:days"],
  ];

  for (const [re, rule] of recurPatterns) {
    if (re.test(text)) {
      recurrence = rule;
      text = text.replace(re, " ");
      break;
    }
  }

  const everyOtherDowPattern = /\bevery\s+other\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)\b/i;
  const everyOtherDowMatch = everyOtherDowPattern.exec(text);
  if (everyOtherDowMatch) {
    if (!recurrence) recurrence = "biweekly";
    text = text.replace(everyOtherDowPattern, everyOtherDowMatch[1]);
  }

  if (!recurrence) {
    const everyN = /\bevery\s+(\d+)\s+(day|week|month|year)s?\b/i.exec(text);
    if (everyN) {
      const num = parseInt(everyN[1], 10);
      const unit = everyN[2].toLowerCase();
      if (unit === "day") recurrence = num === 1 ? "daily" : (num === 2 ? "every:2:days" : `every:${num}:days`);
      else if (unit === "week") recurrence = num === 1 ? "weekly" : (num === 2 ? "biweekly" : `every:${num}:weeks`);
      else if (unit === "month") recurrence = num === 1 ? "monthly" : (num === 2 ? "bimonthly" : `every:${num}:months`);
      else if (unit === "year") recurrence = num === 1 ? "yearly" : `every:${num}:years`;
      text = text.replace(everyN[0], " ");
    }
  }

  const dowPattern = /\bevery\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)\b/i;
  const dowMatch = dowPattern.exec(text);
  if (dowMatch) {
    if (!recurrence) recurrence = "weekly";
    text = text.replace(dowPattern, dowMatch[1]);
  }

  text = text
    .replace(/\b(?:eod|end\s+of\s+(?:the\s+)?day)\b/gi, "5:00 pm")
    .replace(/\btmrw\b/gi, "tomorrow")
    .replace(/\btmw\b/gi, "tomorrow")
    .replace(/\btod\b/gi, "today")
    .replace(/\b(\d{1,2})\s*([ap])\b/gi, "$1$2m");

  let dueDate = null, hasTime = false;
  if (window.chrono) {
    const results = chrono.parse(text, new Date());
    if (results.length > 0) {
      let dateResult = null, timeResult = null, fullDateTimeResult = null;

      for (let j = 0; j < results.length; j++) {
        const r = results[j];
        const isDateCertain = r.start.isCertain("day") || r.start.isCertain("weekday") || r.start.isCertain("month");
        const isTimeCertain = r.start.isCertain("hour");
        if (isDateCertain && isTimeCertain) {
          fullDateTimeResult = r;
          break;
        }
        if (isDateCertain && !dateResult) dateResult = r;
        if (isTimeCertain && !timeResult) timeResult = r;
      }

      let chosen = null;
      if (fullDateTimeResult) {
        chosen = fullDateTimeResult.start.date();
        hasTime = true;
      } else if (dateResult && timeResult) {
        const d = new Date(dateResult.start.date().getTime());
        const t = timeResult.start.date();
        d.setHours(t.getHours(), t.getMinutes(), t.getSeconds(), 0);
        chosen = d;
        hasTime = true;
      } else if (timeResult) {
        chosen = timeResult.start.date();
        hasTime = true;
      } else if (dateResult) {
        chosen = dateResult.start.date();
        hasTime = false;
      } else if (results[0]) {
        chosen = results[0].start.date();
        hasTime = results[0].start.isCertain("hour");
      }

      dueDate = chosen;

      results.forEach(r => {
        const escaped = r.text.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
        const re = new RegExp("(?:\\b(?:around|about|approx|approximately|at|by|due\\s+on|due\\s+by|due|on|@|~)\\s+)?" + escaped + "(?:\\b|\\s|$)", "gi");
        text = text.replace(re, " ");
      });
    }
  }

  let cleanTitle = text
    .replace(/\b(?:around|about|approx|approximately|at|by|due\\s+on|due\\s+by|due|on|for|repeats?|eod|end\s+of\s+(?:the\s+)?day)\b/gi, " ")
    .replace(/[~@#!]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return { cleanTitle: cleanTitle || raw.trim(), project, tags, priority, recurrence, dueDate, hasTime };
}

function renderSmartPreview() {
  const parsed = parseSmartInput($("quickAddInput").value);
  const chips = [];
  if (parsed.dueDate) {
    const opts = parsed.hasTime
      ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
      : { month: "short", day: "numeric" };
    chips.push(`📅 ${parsed.dueDate.toLocaleString(undefined, opts)}`);
  }
  if (parsed.recurrence) chips.push(`🔁 ${getRecurLabel(parsed.recurrence)}`);
  if (parsed.priority) chips.push(`⚑ Priority ${parsed.priority}`);
  if (parsed.project) chips.push(`# ${parsed.project}`);
  parsed.tags.forEach(t => chips.push(`@${t}`));

  const el = $("smartPreview");
  if (!chips.length) {
    el.classList.add("hidden");
    el.innerHTML = "";
  } else {
    el.classList.remove("hidden");
    el.innerHTML = chips.map(c => `<span class="smart-chip">${c}</span>`).join("");
  }

  if (parsed.dueDate) {
    $("quickAddDate").value = toLocalDatetimeString(parsed.dueDate, parsed.hasTime);
  } else if (!$("quickAddInput").value.trim()) {
    $("quickAddDate").value = "";
  }

  if (parsed.recurrence) {
    let found = false;
    for (let opt of $("quickAddRecurrence").options) {
      if (opt.value === parsed.recurrence) {
        $("quickAddRecurrence").value = parsed.recurrence;
        found = true;
        break;
      }
    }
    if (!found) {
      const customOpt = new Option(getRecurLabel(parsed.recurrence), parsed.recurrence);
      $("quickAddRecurrence").add(customOpt);
      $("quickAddRecurrence").value = parsed.recurrence;
    }
  } else if (!$("quickAddInput").value.trim()) {
    $("quickAddRecurrence").value = "";
  }

  if (parsed.priority) {
    $("quickAddPriority").value = String(parsed.priority);
  } else if (!$("quickAddInput").value.trim()) {
    $("quickAddPriority").value = "4";
  }

  if (parsed.project) {
    let found = false;
    for (let opt of $("quickAddProject").options) {
      if (opt.value.toLowerCase() === parsed.project.toLowerCase()) {
        $("quickAddProject").value = opt.value;
        found = true;
        break;
      }
    }
    if (!found) {
      const opt = new Option(parsed.project, parsed.project);
      $("quickAddProject").add(opt);
      $("quickAddProject").value = parsed.project;
    }
  }

  if (parsed.tags && parsed.tags.length > 0) {
    $("quickAddTags").value = parsed.tags.join(", ");
  }

  return parsed;
}

(function () {
  /**
   * JMdict-eng partOfSpeech verb codes (v1, v5u, vk, vs-i, …).
   */
  function isVerbPOS(token) {
    if (!token || typeof token !== "string") return false;
    if (token === "aux-v") return true;
    if (token === "vk" || token === "vn" || token === "vr") return true;
    if (token.startsWith("vs")) return true;
    if (token.startsWith("vz")) return true;
    if (/^v[1-5]/.test(token)) return true;
    return false;
  }

  function entryHasVerbSense(entry) {
    const senses = entry.sense || [];
    for (let i = 0; i < senses.length; i++) {
      const pos = senses[i].partOfSpeech || [];
      for (let j = 0; j < pos.length; j++) {
        if (isVerbPOS(pos[j])) return true;
      }
    }
    return false;
  }

  function entryHasSuruSense(entry) {
    const senses = entry.sense || [];
    for (let i = 0; i < senses.length; i++) {
      const pos = senses[i].partOfSpeech || [];
      for (let j = 0; j < pos.length; j++) {
        const token = pos[j];
        if (typeof token === "string" && token.startsWith("vs")) return true;
      }
    }
    return false;
  }

  function shouldAppendSuru(entry, baseLemma) {
    if (!entryHasSuruSense(entry)) return false;
    const entryId = String((entry && entry.id) || "");
    if (entryId === "1157170") return false;
    if (baseLemma === "為る") return false;
    if (typeof baseLemma === "string" && baseLemma.endsWith("する")) return false;
    return true;
  }

  function entryVerbGroup(entry) {
    const senses = entry.sense || [];
    let hasGodan = false;
    for (let i = 0; i < senses.length; i++) {
      const pos = senses[i].partOfSpeech || [];
      for (let j = 0; j < pos.length; j++) {
        const token = pos[j];
        if (typeof token !== "string") continue;
        if (token.startsWith("v1")) return "ichidan";
        if (token.startsWith("v5")) hasGodan = true;
      }
    }
    if (hasGodan) return "godan";
    return "irregular";
  }

  function senseHasVerbPOS(sense) {
    const pos = (sense && sense.partOfSpeech) || [];
    for (let i = 0; i < pos.length; i++) {
      if (isVerbPOS(pos[i])) return true;
    }
    return false;
  }

  function hasKanji(s) {
    try {
      return /\p{Script=Han}/u.test(s);
    } catch (_) {
      return /[\u4e00-\u9fff]/.test(s);
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * Match lemma to the appropriate kana row (JMdict: appliesToKanji).
   * Prefers an entry that lists this lemma, else falls back to "*".
   */
  function readingForLemma(entry, lemma) {
    const kanaList = (entry.kana || []).filter(function (kn) {
      return kn.common;
    });
    if (!kanaList.length) return null;
    const kanjiList = entry.kanji || [];
    const knownKanji = new Set();
    for (let i = 0; i < kanjiList.length; i++) {
      if (kanjiList[i].text && kanjiList[i].common) {
        knownKanji.add(kanjiList[i].text);
      }
    }
    const lemmaIsSuru = typeof lemma === "string" && lemma.endsWith("する");
    const baseLemma = lemmaIsSuru ? lemma.slice(0, -2) : lemma;
    const surfaceIsKanji = knownKanji.has(lemma) || knownKanji.has(baseLemma);

    const explicit = [];
    for (let i = 0; i < kanaList.length; i++) {
      const kn = kanaList[i];
      const app = kn.appliesToKanji || [];
      if (
        app.indexOf(lemma) !== -1 ||
        (lemmaIsSuru && app.indexOf(baseLemma) !== -1)
      ) {
        explicit.push(kn);
      }
    }
    const pool =
      explicit.length > 0
        ? explicit
        : kanaList.filter(function (kn) {
            const app = kn.appliesToKanji || [];
            const appK = kn.appliesToKana || [];
            if (app.indexOf("*") !== -1 && surfaceIsKanji) return true;
            if (appK.indexOf(lemma) !== -1) return true;
            if (lemmaIsSuru && appK.indexOf(baseLemma) !== -1) return true;
            return false;
          });

    if (!pool.length) return null;
    const chosen = pool[0];
    const text = chosen.text || null;
    if (!text) return null;
    if (lemmaIsSuru && !text.endsWith("する")) {
      return text + "する";
    }
    return text;
  }

  /** HTML snippet: <ruby>…<rt>…</rt></ruby> when kanji + reading known. */
  function lemmaRubyHtml(entry, lemma) {
    if (!lemma) return "";
    if (!hasKanji(lemma)) {
      return escapeHtml(lemma);
    }
    const yomi = readingForLemma(entry, lemma);
    if (!yomi) {
      return escapeHtml(lemma);
    }
    return (
      '<ruby lang="ja">' +
      escapeHtml(lemma) +
      "<rt>" +
      escapeHtml(yomi) +
      "</rt></ruby>"
    );
  }

  /** Common kanji surface, else common kana; skip uncommon spellings. */
  function dictionaryForm(entry) {
    const kanji = entry.kanji || [];
    const commonK = kanji.find(function (k) {
      return k.common && k.text;
    });
    if (commonK && commonK.text) return commonK.text;
    const kana = entry.kana || [];
    const commonKn = kana.find(function (k) {
      return k.common && k.text;
    });
    if (commonKn && commonKn.text) return commonKn.text;
    return "";
  }

  function normalizeAnswer(s) {
    return String(s || "")
      .trim()
      .normalize("NFC");
  }

  function toHiragana(s) {
    return String(s || "").replace(/[\u30a1-\u30f6]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0x60);
    });
  }

  function normalizeKanaAnswer(s) {
    return toHiragana(normalizeAnswer(s));
  }

  function isCorrectUserAnswer(userAnswer, currentItem) {
    const expected = normalizeAnswer(currentItem.expected);
    if (userAnswer === expected) return true;

    const userKana = normalizeKanaAnswer(userAnswer);
    if (userKana === normalizeKanaAnswer(expected)) return true;

    const readingLemma = readingForLemma(currentItem.entry, currentItem.lemma);
    if (!readingLemma) return false;
    try {
      const readingExpected = conjugate(
        readingLemma,
        currentItem.group,
        currentItem.form,
      );
      return userKana === normalizeKanaAnswer(readingExpected);
    } catch (_) {
      return false;
    }
  }

  function glossaryText(g) {
    if (typeof g === "string") return g;
    if (g && typeof g.text === "string") return g.text;
    return "";
  }

  function verbGlossInfoText(entry) {
    const senses = (entry && entry.sense) || [];
    const lines = [];
    for (let i = 0; i < senses.length && lines.length < 2; i++) {
      const sense = senses[i];
      if (!senseHasVerbPOS(sense)) continue;
      const glosses = sense.gloss || [];
      const eng = [];
      for (let j = 0; j < glosses.length; j++) {
        const g = glosses[j];
        if (g && typeof g === "object" && g.lang && g.lang !== "eng") continue;
        const txt = glossaryText(g);
        if (txt) eng.push(txt);
      }
      if (!eng.length) continue;
      lines.push(eng.slice(0, 4).join("; "));
    }
    return lines.join(" | ");
  }

  const QUIZ_FORMS = [
    "polite",
    "politePast",
    "politeNegative",
    "politePastNegative",
    "politeVolitional",
    "te",
    "past",
    "negative",
    "pastNegative",
    "volitional",
    "potential",
    "passive",
    "causative",
    "causativePassive",
    "conditionalBa",
    "conditionalTara",
    "imperative",
    "imperativeNegative",
  ];

  const FORM_LABELS = {
    polite: "Polite non-past (〜ます)",
    politePast: "Polite past (〜ました)",
    politeNegative: "Polite negative (〜ません)",
    politePastNegative: "Polite past negative (〜ませんでした)",
    politeVolitional: "Polite volitional (〜ましょう)",
    te: "Te-form (〜て)",
    past: "Plain past (〜た)",
    negative: "Plain negative (〜ない)",
    pastNegative: "Plain past negative (〜なかった)",
    volitional: "Volitional plain (〜う / 〜よう)",
    potential: "Potential (〜られる / 〜れる)",
    passive: "Passive (〜られる / 〜れる)",
    causative: "Causative (〜させる / 〜せる)",
    causativePassive: "Causative-passive (〜させられる)",
    conditionalBa: "Conditional (〜ば)",
    conditionalTara: "Conditional (〜たら)",
    imperative: "Imperative (命令形)",
    imperativeNegative: 'Prohibitive (〜な, e.g. "don\'t …")',
  };

  const elLoading = document.getElementById("quiz-loading");
  const elError = document.getElementById("quiz-error");
  const elMain = document.getElementById("quiz-main");
  const elPrompt = document.getElementById("quiz-prompt");
  const elLemma = document.getElementById("quiz-lemma");
  const elFormName = document.getElementById("quiz-form-name");
  const elAnswer = document.getElementById("quiz-answer");
  const elFeedback = document.getElementById("quiz-feedback");
  const elVerbInfo = document.getElementById("quiz-verb-info");
  const elScore = document.getElementById("quiz-score");
  const btnCheck = document.getElementById("quiz-check");
  const btnNext = document.getElementById("quiz-next");

  let verbItems = [];
  let scoreCorrect = 0;
  let scoreTotal = 0;
  /** @type {{ lemma: string, group: string, entry: object, form: string, expected: string } | null} */
  let current = null;

  /**
   * JMdict entry ids: ある / できる / 分かる (incl. common kanji surfaces like 有る, 出来る).
   * Conjugator still produces あられる-style forms, but they are not taught as “potential” in the same way.
   */
  const POTENTIAL_EXCLUDED_ENTRY_IDS = new Set([
    "1296400",
    "1340450",
    "1606560",
  ]);

  const FORMS_EXCLUDE_HONORIFIC_VERBS = new Set([
    "passive",
    "causative",
    "causativePassive",
  ]);

  function shouldSkipVerbItemForForm(item, form) {
    if (form === "potential") {
      const id = String((item.entry && item.entry.id) || "");
      if (POTENTIAL_EXCLUDED_ENTRY_IDS.has(id)) return true;
    }
    if (FORMS_EXCLUDE_HONORIFIC_VERBS.has(form)) {
      if (typeof honorificEntry === "function" && honorificEntry(item.lemma)) {
        return true;
      }
    }
    return false;
  }

  /** Same lemma cannot repeat until more than this many other questions have been asked (FIFO size − 1). */
  const RECENT_LEMMA_SPACING = 21;
  /** @type {string[]} most recent question lemmas, oldest at front */
  let recentQuestionLemmas = [];

  /** Relative pick weight for する verbs vs all others (lower ⇒ less frequent). */
  const SURU_VERB_WEIGHT = 1;
  const NON_SURU_VERB_WEIGHT = 4;

  function randomPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function isSuruLemma(lemma) {
    return typeof lemma === "string" && lemma.endsWith("する");
  }

  /**
   * Uniform pick within the pool, but する lemmas are chosen less often when both kinds exist.
   */
  function randomPickVerbItem(pool) {
    const nonSuru = [];
    const suru = [];
    for (let i = 0; i < pool.length; i++) {
      const it = pool[i];
      if (isSuruLemma(it.lemma)) suru.push(it);
      else nonSuru.push(it);
    }
    if (!nonSuru.length) return randomPick(suru);
    if (!suru.length) return randomPick(nonSuru);
    const wNon = nonSuru.length * NON_SURU_VERB_WEIGHT;
    const wSuru = suru.length * SURU_VERB_WEIGHT;
    const r = Math.random() * (wNon + wSuru);
    return r < wNon ? randomPick(nonSuru) : randomPick(suru);
  }

  function recordQuestionLemma(lemma) {
    recentQuestionLemmas.push(lemma);
    if (recentQuestionLemmas.length > RECENT_LEMMA_SPACING) {
      recentQuestionLemmas.shift();
    }
  }

  /** Prefer verbs whose lemma was not used in the last {@link RECENT_LEMMA_SPACING} questions. */
  function pickVerbItemWeighted() {
    const blocked = new Set(recentQuestionLemmas);
    const fresh = verbItems.filter(function (it) {
      return !blocked.has(it.lemma);
    });
    return fresh.length ? fresh : verbItems;
  }

  const LS_QUIZ_FORMS = "nihongo-quiz-forms-v1";
  const LS_JMDICT = "nihongo-jmdict-sources-v1";

  /** @type {{ id: string, file: string }[]} */
  const JMDICT_SOURCES = [
    { id: "n5", file: "n5-jmdict.json" },
    { id: "n4", file: "n4-jmdict.json" },
    { id: "n3", file: "n3-jmdict.json" },
    { id: "n2", file: "n2-jmdict.json" },
    { id: "n1", file: "n1-jmdict.json" },
  ];

  function loadJmdictPrefs() {
    try {
      const raw = localStorage.getItem(LS_JMDICT);
      if (!raw) return { n5: true, n4: false, n3: false, n2: false, n1: false };
      const o = JSON.parse(raw);
      if (typeof o !== "object" || o === null) {
        return { n5: true, n4: false, n3: false, n2: false, n1: false };
      }
      const out = {
        n5: !!o.n5,
        n4: !!o.n4,
        n3: !!o.n3,
        n2: !!o.n2,
        n1: !!o.n1,
      };
      if (!out.n5 && !out.n4 && !out.n3 && !out.n2 && !out.n1) out.n5 = true;
      return out;
    } catch (_) {
      return { n5: true, n4: false, n3: false, n2: false, n1: false };
    }
  }

  function saveJmdictPrefs(map) {
    try {
      localStorage.setItem(LS_JMDICT, JSON.stringify(map));
    } catch (_) {}
  }

  function applyJmdictPrefsToUI() {
    const p = loadJmdictPrefs();
    for (let i = 0; i < JMDICT_SOURCES.length; i++) {
      const id = JMDICT_SOURCES[i].id;
      const el = document.getElementById("quiz-jmdict-" + id);
      if (el) el.checked = !!p[id];
    }
  }

  function readJmdictFromUI() {
    const o = { n5: false, n4: false, n3: false, n2: false, n1: false };
    for (let i = 0; i < JMDICT_SOURCES.length; i++) {
      const id = JMDICT_SOURCES[i].id;
      const el = document.getElementById("quiz-jmdict-" + id);
      if (el) o[id] = el.checked;
    }
    return o;
  }

  let formTogglesBuilt = false;

  function loadFormPrefs() {
    try {
      const raw = localStorage.getItem(LS_QUIZ_FORMS);
      if (!raw) return null;
      const o = JSON.parse(raw);
      return typeof o === "object" && o !== null ? o : null;
    } catch (_) {
      return null;
    }
  }

  function saveFormPrefs(map) {
    try {
      localStorage.setItem(LS_QUIZ_FORMS, JSON.stringify(map));
    } catch (_) {}
  }

  function collectPrefsFromCheckboxes() {
    const map = {};
    const nodes = document.querySelectorAll(
      "#quiz-form-toggles input[data-form]",
    );
    for (let i = 0; i < nodes.length; i++) {
      const cb = nodes[i];
      const key = cb.getAttribute("data-form");
      if (key) map[key] = cb.checked;
    }
    return map;
  }

  function applyPrefsToCheckboxes(prefs) {
    if (!prefs) return;
    const nodes = document.querySelectorAll(
      "#quiz-form-toggles input[data-form]",
    );
    for (let i = 0; i < nodes.length; i++) {
      const cb = nodes[i];
      const key = cb.getAttribute("data-form");
      if (!key) continue;
      if (Object.prototype.hasOwnProperty.call(prefs, key)) {
        cb.checked = !!prefs[key];
      }
    }
  }

  function getEnabledFormsList() {
    const out = [];
    const nodes = document.querySelectorAll(
      "#quiz-form-toggles input[data-form]",
    );
    for (let i = 0; i < nodes.length; i++) {
      const cb = nodes[i];
      if (cb.checked) {
        const key = cb.getAttribute("data-form");
        if (key) out.push(key);
      }
    }
    return out;
  }

  function buildFormToggles() {
    const container = document.getElementById("quiz-form-toggles");
    if (!container) return;
    container.innerHTML = "";
    for (let i = 0; i < QUIZ_FORMS.length; i++) {
      const key = QUIZ_FORMS[i];
      const labelText = FORM_LABELS[key] || key;
      const id = "quiz-form-cb-" + key;
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = id;
      input.setAttribute("data-form", key);
      input.checked = true;
      label.appendChild(input);
      const span = document.createElement("span");
      span.textContent = labelText;
      label.appendChild(span);
      container.appendChild(label);
    }
    const prefs = loadFormPrefs();
    if (prefs) applyPrefsToCheckboxes(prefs);
    container.addEventListener("change", function () {
      saveFormPrefs(collectPrefsFromCheckboxes());
    });
    const btnAll = document.getElementById("quiz-forms-all");
    const btnNone = document.getElementById("quiz-forms-none");
    if (btnAll) {
      btnAll.addEventListener("click", function () {
        const nodes = container.querySelectorAll("input[data-form]");
        for (let j = 0; j < nodes.length; j++) nodes[j].checked = true;
        saveFormPrefs(collectPrefsFromCheckboxes());
      });
    }
    if (btnNone) {
      btnNone.addEventListener("click", function () {
        const nodes = container.querySelectorAll("input[data-form]");
        for (let j = 0; j < nodes.length; j++) nodes[j].checked = false;
        saveFormPrefs(collectPrefsFromCheckboxes());
      });
    }
  }

  function buildVerbList(words) {
    const seen = new Set();
    const out = [];
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (!entryHasVerbSense(w)) continue;
      const baseLemma = dictionaryForm(w);
      if (!baseLemma) continue;
      const lemma = shouldAppendSuru(w, baseLemma)
        ? baseLemma + "する"
        : baseLemma;
      if (seen.has(lemma)) continue;
      const group = entryVerbGroup(w);
      try {
        conjugate(lemma, group, "te");
        seen.add(lemma);
        out.push({ lemma: lemma, group: group, entry: w });
      } catch (_) {
        /* skip lemmas our conjugator rejects */
      }
    }
    return out;
  }

  function showError(msg) {
    if (elLoading) elLoading.hidden = true;
    if (elMain) elMain.hidden = true;
    if (elError) {
      elError.hidden = false;
      elError.textContent = msg;
    }
  }

  function updateScore() {
    if (elScore) {
      elScore.textContent = String(scoreCorrect) + " / " + String(scoreTotal);
    }
  }

  function renderPrompt() {
    if (!current || !elPrompt || !elLemma || !elFormName) return;
    elLemma.innerHTML = lemmaRubyHtml(current.entry, current.lemma);
    elFormName.textContent = FORM_LABELS[current.form] || current.form;
    if (current.form != "conditionalBa" && current.form != "conditionalTara")
      elFormName.textContent = elFormName.textContent.replace(/\(.*?\)/g, ""); 
    elPrompt.hidden = false;
    if (elAnswer) {
      elAnswer.value = "";
      elAnswer.focus();
    }
    if (elFeedback) {
      elFeedback.textContent = "";
      elFeedback.className = "quiz-feedback";
    }
    if (elVerbInfo) {
      elVerbInfo.hidden = true;
      elVerbInfo.textContent = "";
    }
    if (btnNext) btnNext.hidden = true;
    if (btnCheck) btnCheck.hidden = false;
  }

  function nextQuestion() {
    if (!verbItems.length) return;
    const enabledForms = getEnabledFormsList();
    if (!enabledForms.length) {
      current = null;
      if (elPrompt) elPrompt.hidden = true;
      if (elFeedback) {
        elFeedback.textContent =
          "Select at least one conjugation type in the list above.";
        elFeedback.className = "quiz-feedback bad";
      }
      if (btnNext) btnNext.hidden = false;
      if (btnCheck) btnCheck.hidden = true;
      if (elAnswer) elAnswer.value = "";
      return;
    }
    const itemPool = pickVerbItemWeighted();
    let attempts = 0;
    while (attempts < 100) {
      attempts++;
      const item = randomPickVerbItem(itemPool);
      const form = randomPick(enabledForms);
      if (shouldSkipVerbItemForForm(item, form)) {
        continue;
      }
      try {
        const expected = conjugate(item.lemma, item.group, form);
        recordQuestionLemma(item.lemma);
        current = {
          lemma: item.lemma,
          group: item.group,
          entry: item.entry,
          form: form,
          expected: expected,
        };
        renderPrompt();
        return;
      } catch (_) {
        /* try another combo */
      }
    }
    showError("Could not generate a question — try reloading.");
  }

  function shakeAnswerInput() {
    if (!elAnswer) return;
    elAnswer.classList.remove("quiz-input-shake");
    void elAnswer.offsetWidth;
    elAnswer.classList.add("quiz-input-shake");
    function onEnd() {
      elAnswer.removeEventListener("animationend", onEnd);
      elAnswer.classList.remove("quiz-input-shake");
    }
    elAnswer.addEventListener("animationend", onEnd);
  }

  /** Replace ASCII romaji in the answer field with kana via global {@link toKana} from script.js. */
  function syncAnswerRomajiToKana() {
    if (!elAnswer || typeof toKana !== "function") return;
    const raw = elAnswer.value;
    const caret = elAnswer.selectionStart;
    const safeCaret =
      typeof caret === "number" && caret >= 0 ? caret : raw.length;
    const converted = toKana(raw);
    if (converted === raw) return;
    const prefix = raw.slice(0, safeCaret);
    const newCaret = Math.min(toKana(prefix).length, converted.length);
    elAnswer.value = converted;
    try {
      elAnswer.setSelectionRange(newCaret, newCaret);
    } catch (_) {}
  }

  function checkAnswer() {
    if (!current || !elAnswer || !elFeedback) return;
    const user = normalizeAnswer(elAnswer.value);
    if (!user) {
      shakeAnswerInput();
      return;
    }
    const ok = isCorrectUserAnswer(user, current);
    scoreTotal++;
    if (ok) scoreCorrect++;
    updateScore();
    elFeedback.textContent = ok
      ? "Correct!"
      : "Not quite. Expected: " + current.expected;
    elFeedback.className = "quiz-feedback " + (ok ? "ok" : "bad");
    if (elVerbInfo) {
      const gloss = verbGlossInfoText(current.entry);
      if (gloss) {
        elVerbInfo.textContent = "Meaning: " + gloss;
        elVerbInfo.hidden = false;
      } else {
        elVerbInfo.textContent = "";
        elVerbInfo.hidden = true;
      }
    }
    if (btnCheck) btnCheck.hidden = true;
    if (btnNext) btnNext.hidden = false;
  }

  async function loadQuizData() {
    if (typeof conjugate !== "function") {
      showError("conjugate() not loaded. Include script.js before quiz.js.");
      return;
    }
    if (typeof toKana !== "function") {
      showError("toKana() not loaded. Include script.js before quiz.js.");
      return;
    }

    if (elError) elError.hidden = true;
    if (elLoading) elLoading.hidden = false;
    if (elMain) elMain.hidden = true;

    const prefs = readJmdictFromUI();
    saveJmdictPrefs(prefs);

    const words = [];
    for (let s = 0; s < JMDICT_SOURCES.length; s++) {
      const src = JMDICT_SOURCES[s];
      if (!prefs[src.id]) continue;
      try {
        const res = await fetch(src.file);
        if (!res.ok) throw new Error(res.status + " " + res.statusText);
        const data = await res.json();
        const w = data.words;
        if (!Array.isArray(w)) throw new Error("missing words array");
        for (let j = 0; j < w.length; j++) words.push(w[j]);
      } catch (e) {
        const msg = e && e.message ? String(e.message) : "error";
        showError(
          "Could not load " +
            src.file +
            ". Serve this folder over HTTP (e.g. python -m http.server). " +
            msg,
        );
        return;
      }
    }

    if (!words.length) {
      showError("Enable at least one dictionary list above, then try again.");
      return;
    }

    verbItems = buildVerbList(words);
    if (!verbItems.length) {
      showError("No verbs found in the selected dictionary file(s).");
      return;
    }

    recentQuestionLemmas = [];

    if (!formTogglesBuilt) {
      buildFormToggles();
      formTogglesBuilt = true;
    }

    if (elLoading) elLoading.hidden = true;
    if (elMain) elMain.hidden = false;

    scoreCorrect = 0;
    scoreTotal = 0;
    updateScore();
    nextQuestion();
  }

  if (btnCheck) {
    btnCheck.addEventListener("click", checkAnswer);
  }
  if (btnNext) {
    btnNext.addEventListener("click", nextQuestion);
  }
  if (elAnswer) {
    let answerImeComposing = false;
    elAnswer.addEventListener("compositionstart", function () {
      answerImeComposing = true;
    });
    elAnswer.addEventListener("compositionend", function () {
      answerImeComposing = false;
      syncAnswerRomajiToKana();
    });
    elAnswer.addEventListener("input", function (ev) {
      if (answerImeComposing || ev.isComposing) return;
      syncAnswerRomajiToKana();
    });
    elAnswer.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") {
        if (btnNext && !btnNext.hidden) {
          nextQuestion();
        } else {
          checkAnswer();
        }
      }
    });
  }

  const elJmdictFieldset = document.getElementById("quiz-jmdict-fieldset");
  if (elJmdictFieldset) {
    elJmdictFieldset.addEventListener("change", function (ev) {
      const t = ev.target;
      if (!t || !t.getAttribute || t.getAttribute("data-jmdict") === null) return;
      let prefs = readJmdictFromUI();
      if (!prefs.n5 && !prefs.n4 && !prefs.n3 && !prefs.n2 && !prefs.n1) {
        t.checked = true;
        prefs = readJmdictFromUI();
      }
      saveJmdictPrefs(prefs);
      loadQuizData();
    });
  }

  applyJmdictPrefsToUI();
  loadQuizData();
})();

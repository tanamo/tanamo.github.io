(function () {
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

  function lemmaRubyHtml(entry, lemma) {
    if (!lemma) return "";
    if (!hasKanji(lemma)) return escapeHtml(lemma);
    const yomi = readingForLemma(entry, lemma);
    if (!yomi) return escapeHtml(lemma);
    return (
      '<ruby lang="ja">' +
      escapeHtml(lemma) +
      "<rt>" +
      escapeHtml(yomi) +
      "</rt></ruby>"
    );
  }

  function extractGlosses(entry) {
    const senses = entry.sense || [];
    const out = [];
    const seen = new Set();
    for (let i = 0; i < senses.length; i++) {
      const glosses = senses[i].gloss || [];
      for (let j = 0; j < glosses.length; j++) {
        const g = glosses[j];
        const isObj = g && typeof g === "object";
        if (isObj && g.lang && g.lang !== "eng") continue;
        const text = isObj ? g.text : g;
        if (!text || typeof text !== "string") continue;
        if (seen.has(text)) continue;
        seen.add(text);
        out.push(text);
      }
    }
    return out;
  }

  /** English number words → canonical digit token (match "7" with "seven"). */
  const EN_NUMBER_WORD = {
    zero: "0",
    one: "1",
    two: "2",
    three: "3",
    four: "4",
    five: "5",
    six: "6",
    seven: "7",
    eight: "8",
    nine: "9",
    ten: "10",
    eleven: "11",
    twelve: "12",
    thirteen: "13",
    fourteen: "14",
    fifteen: "15",
    sixteen: "16",
    seventeen: "17",
    eighteen: "18",
    nineteen: "19",
    twenty: "20",
    thirty: "30",
    forty: "40",
    fifty: "50",
    sixty: "60",
    seventy: "70",
    eighty: "80",
    ninety: "90",
    hundred: "100",
    thousand: "1000",
  };

  function normalizeEnglish(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .replace(/^to\s+/, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /** Lowercase + spacing + number words and digits unified for comparison. */
  function normalizeForMatch(s) {
    const base = normalizeEnglish(s);
    if (!base) return "";
    const tokens = base.split(" ");
    const out = [];
    for (let t = 0; t < tokens.length; t++) {
      const w = tokens[t];
      if (/^\d+$/.test(w)) {
        out.push(w);
        continue;
      }
      const num = EN_NUMBER_WORD[w];
      out.push(num !== undefined ? num : w);
    }
    return out.join(" ");
  }

  function levenshtein(a, b) {
    const m = a.length;
    const n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    let prev = new Array(n + 1);
    let cur = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      cur[0] = i;
      const ai = a.charCodeAt(i - 1);
      for (let j = 1; j <= n; j++) {
        const cost = ai === b.charCodeAt(j - 1) ? 0 : 1;
        cur[j] = Math.min(
          prev[j] + 1,
          cur[j - 1] + 1,
          prev[j - 1] + cost,
        );
      }
      const swap = prev;
      prev = cur;
      cur = swap;
    }
    return prev[n];
  }

  /** Allow small typos (edit distance) relative to string length. */
  function roughlySamePhrase(a, b) {
    if (a === b) return true;
    const maxLen = Math.max(a.length, b.length);
    if (maxLen < 3) return false;
    const d = levenshtein(a, b);
    if (maxLen <= 5) return d <= 1;
    if (maxLen <= 12) return d <= 2;
    return d <= Math.min(4, Math.floor(maxLen * 0.2));
  }

  function answerMatches(user, glosses) {
    const userN = normalizeForMatch(user);
    if (!userN) return false;
    for (let i = 0; i < glosses.length; i++) {
      const g = normalizeForMatch(glosses[i]);
      if (!g) continue;
      if (userN === g) return true;
      //if (roughlySamePhrase(userN, g)) return true;
      if (userN.length >= 3 && g.indexOf(userN) !== -1) return true;
    }
    return false;
  }

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
        return { n5: true, n4: false, n3: false };
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
      const el = document.getElementById("meaning-jmdict-" + id);
      if (el) el.checked = !!p[id];
    }
  }

  function readJmdictFromUI() {
    const o = { n5: false, n4: false, n3: false, n2: false, n1: false };
    for (let i = 0; i < JMDICT_SOURCES.length; i++) {
      const id = JMDICT_SOURCES[i].id;
      const el = document.getElementById("meaning-jmdict-" + id);
      if (el) o[id] = el.checked;
    }
    return o;
  }

  const elLoading = document.getElementById("meaning-loading");
  const elError = document.getElementById("meaning-error");
  const elMain = document.getElementById("meaning-main");
  const elPrompt = document.getElementById("meaning-prompt");
  const elWord = document.getElementById("meaning-word");
  const elAnswer = document.getElementById("meaning-answer");
  const elFeedback = document.getElementById("meaning-feedback");
  const elGloss = document.getElementById("meaning-gloss");
  const elScore = document.getElementById("meaning-score");
  const btnCheck = document.getElementById("meaning-check");
  const btnNext = document.getElementById("meaning-next");

  let items = [];
  let scoreCorrect = 0;
  let scoreTotal = 0;
  let current = null;

  /** Same lemma cannot repeat until more than this many other questions have been asked (FIFO size − 1). */
  const RECENT_LEMMA_SPACING = 21;
  /** @type {string[]} */
  let recentQuestionLemmas = [];

  function randomPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function recordQuestionLemma(lemma) {
    recentQuestionLemmas.push(lemma);
    if (recentQuestionLemmas.length > RECENT_LEMMA_SPACING) {
      recentQuestionLemmas.shift();
    }
  }

  function pickItemWeighted() {
    const blocked = new Set(recentQuestionLemmas);
    const fresh = items.filter(function (it) {
      return !blocked.has(it.lemma);
    });
    return fresh.length ? fresh : items;
  }

  function buildItems(words) {
    const out = [];
    const seenLemma = new Set();
    for (let i = 0; i < words.length; i++) {
      const entry = words[i];
      const lemma = dictionaryForm(entry);
      if (!lemma || seenLemma.has(lemma)) continue;
      const glosses = extractGlosses(entry);
      if (!glosses.length) continue;
      seenLemma.add(lemma);
      out.push({ lemma: lemma, entry: entry, glosses: glosses });
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
    if (elScore) elScore.textContent = scoreCorrect + " / " + scoreTotal;
  }

  function shakeAnswerInput() {
    if (!elAnswer) return;
    elAnswer.classList.remove("meaning-input-shake");
    void elAnswer.offsetWidth;
    elAnswer.classList.add("meaning-input-shake");
    function onEnd() {
      elAnswer.removeEventListener("animationend", onEnd);
      elAnswer.classList.remove("meaning-input-shake");
    }
    elAnswer.addEventListener("animationend", onEnd);
  }

  function renderPrompt() {
    if (!current || !elPrompt || !elWord) return;
    elWord.innerHTML = lemmaRubyHtml(current.entry, current.lemma);
    elPrompt.hidden = false;
    if (elAnswer) {
      elAnswer.value = "";
      elAnswer.focus();
    }
    if (elFeedback) {
      elFeedback.textContent = "";
      elFeedback.className = "quiz-feedback";
    }
    if (elGloss) {
      elGloss.hidden = true;
      elGloss.textContent = "";
    }
    if (btnCheck) btnCheck.hidden = false;
    if (btnNext) btnNext.hidden = true;
  }

  function nextQuestion() {
    if (!items.length) return;
    const pool = pickItemWeighted();
    current = randomPick(pool);
    recordQuestionLemma(current.lemma);
    renderPrompt();
  }

  function checkAnswer() {
    if (!current || !elAnswer || !elFeedback) return;
    const user = elAnswer.value.trim();
    if (!user) {
      shakeAnswerInput();
      return;
    }
    const ok = answerMatches(user, current.glosses);
    scoreTotal++;
    if (ok) scoreCorrect++;
    updateScore();
    if (ok) {
      elFeedback.textContent = "Correct!";
      elFeedback.className = "quiz-feedback ok";
    } else {
      elFeedback.textContent = "Not quite.";
      elFeedback.className = "quiz-feedback bad";
    }
    if (elGloss) {
      elGloss.textContent = "Accepted meaning(s): " + current.glosses.join("; ");
      elGloss.hidden = false;
    }
    if (btnCheck) btnCheck.hidden = true;
    if (btnNext) btnNext.hidden = false;
  }

  async function loadMeaningData() {
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

    items = buildItems(words);
    if (!items.length) {
      showError("No quiz items with English gloss found in the selected file(s).");
      return;
    }

    recentQuestionLemmas = [];

    if (elLoading) elLoading.hidden = true;
    if (elMain) elMain.hidden = false;

    scoreCorrect = 0;
    scoreTotal = 0;
    updateScore();
    nextQuestion();
  }

  if (btnCheck) btnCheck.addEventListener("click", checkAnswer);
  if (btnNext) btnNext.addEventListener("click", nextQuestion);
  if (elAnswer) {
    elAnswer.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") {
        if (btnNext && !btnNext.hidden) nextQuestion();
        else checkAnswer();
      }
    });
  }

  const elJmdictFieldset = document.getElementById("meaning-jmdict-fieldset");
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
      loadMeaningData();
    });
  }

  applyJmdictPrefsToUI();
  loadMeaningData();
})();

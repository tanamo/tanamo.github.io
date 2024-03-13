/**
 * Japanese verb conjugation from dictionary form (辞書形).
 *
 * @param {string} verb Dictionary form.
 * @param {"ichidan"|"godan"|"irregular"} [group] Verb class; omit for automatic detection.
 * @param {string} [form] Target form — default `"polite"`. Includes polite/plain/volitional,
 *   potential, passive, causative, causative-passive, conditionalBa, conditionalTara, imperative,
 *   imperativeNegative (prohibitive 辞書形+な) (see VALID_FORMS).
 *
 * Honorific ら行 verbs use `HONORIFIC_SPECIAL`; masu-forms use `stem + ます…`. Imperative defaults to `stem`
 * except `ござる` (`imperative`: ござれ).
 */

const GROUPS = ["ichidan", "godan", "irregular"];

/** @type {Record<string, string>} aliases → canonical form key */
const FORM_ALIASES = {
  masu: "polite",
  mashita: "politePast",
  masen: "politeNegative",
  masendeshita: "politePastNegative",
  mashou: "politeVolitional",
  ta: "past",
  nai: "negative",
  nakatta: "pastNegative",
  you: "volitional",
  ba: "conditionalBa",
  tara: "conditionalTara",
  command: "imperative",
  meirei: "imperative",
  prohibitive: "imperativeNegative",
  prohibition: "imperativeNegative",
};

const VALID_FORMS = [
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

/**
 * ら行尊敬語（dict → ます前の stem）。命令形は通常 stem と同じ — `ござる` だけ imperative を別指定。
 */
const HONORIFIC_SPECIAL = {
  くださる: { stem: "ください" },
  下さる: { stem: "下さい" },
  いらっしゃる: { stem: "いらっしゃい" },
  ござる: { stem: "ござい", imperative: "ござれ" },
  おっしゃる: { stem: "おっしゃい" },
  仰る: { stem: "仰い" },
  なさる: { stem: "なさい" },
  為さる: { stem: "為さい" },
};

function honorificEntry(v) {
  return HONORIFIC_SPECIAL[v];
}

function honorificStem(v) {
  return honorificEntry(v)?.stem ?? null;
}

function honorificImperativeSurface(v) {
  const h = honorificEntry(v);
  if (!h) return null;
  return h.imperative ?? h.stem;
}

const GODAN_TO_RENYOU = {
  う: "い",
  く: "き",
  ぐ: "ぎ",
  す: "し",
  つ: "ち",
  ぬ: "に",
  ぶ: "び",
  む: "み",
  る: "り",
};

/** て / た column (godan, dict-final kana → stem fragment; る = godan る) */
const GODAN_TO_TE_BODY = {
  う: "って",
  く: "いて",
  ぐ: "いで",
  す: "して",
  つ: "って",
  ぬ: "んで",
  ぶ: "んで",
  む: "んで",
  る: "って",
};

const GODAN_TO_TA_BODY = {
  う: "った",
  く: "いた",
  ぐ: "いだ",
  す: "した",
  つ: "った",
  ぬ: "んだ",
  ぶ: "んだ",
  む: "んだ",
  る: "った",
};

/** 未然形 a-row (ない) — dict-final → fragment before ない */
const GODAN_TO_NAI_STEM = {
  う: "わ",
  く: "か",
  ぐ: "が",
  す: "さ",
  つ: "た",
  ぬ: "な",
  ぶ: "ば",
  む: "ま",
  る: "ら",
};

/** Willing / volitional お段 + う */
const GODAN_TO_VOLITIONAL = {
  う: "おう",
  く: "こう",
  ぐ: "ごう",
  す: "そう",
  つ: "とう",
  ぬ: "のう",
  ぶ: "ぼう",
  む: "もう",
  る: "ろう",
};

/** え段（可能形の「〜える／〜ける」など）— dict-final kana → 直前に付ける音 */
const GODAN_TO_E = {
  う: "え",
  く: "け",
  ぐ: "げ",
  す: "せ",
  つ: "て",
  ぬ: "ね",
  ぶ: "べ",
  む: "め",
  る: "れ",
};

const GODAN_RU_VERBS = new Set([
  "帰る",
  "入る",
  "走る",
  "知る",
  "要る",
  "切る",
  "蹴る",
  "練る",
  "限る",
  "茂る",
  "嘲る",
  "交る",
  "混る",
  "散る",
  "返る",
]);

const I_ROW = new Set([..."いきぎしじちぢにひびぴみり"]);
const E_ROW = new Set([..."えけげせぜてでねへべぺめれ"]);

function normalizeForm(form) {
  if (form === undefined || form === null || form === "") {
    return "polite";
  }
  if (typeof form !== "string") {
    throw new TypeError("form must be a string");
  }
  const key = FORM_ALIASES[form] ?? form;
  if (!VALID_FORMS.includes(key)) {
    throw new TypeError(
      `form must be one of: ${VALID_FORMS.join(", ")} (or an alias such as masu, mashita, ta, nai)`,
    );
  }
  return key;
}

function toHiraganaKana(c) {
  const code = c.codePointAt(0);
  if (code === undefined) return c;
  if (code >= 0x30a1 && code <= 0x30f6) return String.fromCodePoint(code - 0x60);
  return c;
}

function ichidanStyleBeforeRu(kanaBeforeRu) {
  const h = toHiraganaKana(kanaBeforeRu);
  return I_ROW.has(h) || E_ROW.has(h);
}

function ikuForms(v, form) {
  const isIku = v.endsWith("行く") || v === "いく";
  if (!isIku) return null;
  const politeStem = v.endsWith("行く") ? v.slice(0, -1) + "き" : "いき";
  const teTaStem = v.endsWith("行く") ? v.slice(0, -1) + "っ" : "いっ";
  const stemKa = v.slice(0, -1);
  switch (form) {
    case "polite":
      return v.endsWith("行く") ? v.slice(0, -1) + "きます" : "いきます";
    case "politePast":
      return politeStem + "ました";
    case "politeNegative":
      return politeStem + "ません";
    case "politePastNegative":
      return politeStem + "ませんでした";
    case "politeVolitional":
      return politeStem + "ましょう";
    case "te":
      return teTaStem + "て";
    case "past":
      return teTaStem + "た";
    case "negative":
      return stemKa + "かない";
    case "pastNegative":
      return stemKa + "かなかった";
    case "volitional":
      return stemKa + "こう";
    case "potential":
      return stemKa + "ける";
    case "passive":
      return stemKa + "かれる";
    case "causative":
      return stemKa + "かせる";
    case "causativePassive":
      return stemKa + "かせられる";
    case "conditionalBa":
      return stemKa + "けば";
    case "imperative":
      return stemKa + "け";
    default:
      return null;
  }
}

function irregularConjugate(v, form) {
  if (v.endsWith("する")) {
    const stem = v.slice(0, -2);
    switch (form) {
      case "polite":
        return stem + "します";
      case "politePast":
        return stem + "しました";
      case "politeNegative":
        return stem + "しません";
      case "politePastNegative":
        return stem + "しませんでした";
      case "politeVolitional":
        return stem + "しましょう";
      case "te":
        return stem + "して";
      case "past":
        return stem + "した";
      case "negative":
        return stem + "しない";
      case "pastNegative":
        return stem + "しなかった";
      case "volitional":
        return stem + "しよう";
      case "potential":
        return stem + "できる";
      case "passive":
        return stem + "される";
      case "causative":
        return stem + "させる";
      case "causativePassive":
        return stem + "させられる";
      case "conditionalBa":
        return stem + "すれば";
      case "imperative":
        return stem + "しろ";
      default:
        return null;
    }
  }

  if (v === "来る" || v === "くる") {
    const politeStem = v === "来る" ? "来" : "き";
    switch (form) {
      case "polite":
        return v === "来る" ? "来ます" : "きます";
      case "politePast":
        return politeStem + "ました";
      case "politeNegative":
        return politeStem + "ません";
      case "politePastNegative":
        return politeStem + "ませんでした";
      case "politeVolitional":
        return politeStem + "ましょう";
      case "te":
        return v === "来る" ? "来て" : "きて";
      case "past":
        return v === "来る" ? "来た" : "きた";
      case "negative":
        return "こない";
      case "pastNegative":
        return "こなかった";
      case "volitional":
        return "こよう";
      case "potential":
      case "passive":
        return v === "来る" ? "来られる" : "こられる";
      case "causative":
        return v === "来る" ? "来させる" : "こさせる";
      case "causativePassive":
        return v === "来る" ? "来させられる" : "こさせられる";
      case "conditionalBa":
        return v === "来る" ? "来れば" : "くれば";
      case "imperative":
        return v === "来る" ? "来い" : "こい";
      default:
        return null;
    }
  }

  if (v.endsWith("ずる")) {
    const stem = v.slice(0, -2);
    switch (form) {
      case "polite":
        return stem + "じます";
      case "politePast":
        return stem + "じました";
      case "politeNegative":
        return stem + "じません";
      case "politePastNegative":
        return stem + "じませんでした";
      case "politeVolitional":
        return stem + "じましょう";
      case "te":
        return stem + "じて";
      case "past":
        return stem + "じた";
      case "negative":
        return stem + "じない";
      case "pastNegative":
        return stem + "じなかった";
      case "volitional":
        return stem + "じよう";
      case "potential":
      case "passive":
        return stem + "じられる";
      case "causative":
        return stem + "じさせる";
      case "causativePassive":
        return stem + "じさせられる";
      case "conditionalBa":
        return stem + "じれば";
      case "imperative":
        return stem + "じろ";
      default:
        return null;
    }
  }

  if (v === "ある") {
    switch (form) {
      case "polite":
        return "あります";
      case "politePast":
        return "ありました";
      case "politeNegative":
        return "ありません";
      case "politePastNegative":
        return "ありませんでした";
      case "politeVolitional":
        return "ありましょう";
      case "te":
        return "あって";
      case "past":
        return "あった";
      case "negative":
        return "ない";
      case "pastNegative":
        return "なかった";
      case "volitional":
        return "あろう";
      case "potential":
        return "ありえる";
      case "passive":
        return "あられる";
      case "causative":
        return "あらせる";
      case "causativePassive":
        return "あらせられる";
      case "conditionalBa":
        return "あれば";
      case "imperative":
        return "あれ";
      default:
        return null;
    }
  }

  const iku = ikuForms(v, form);
  if (iku !== null) return iku;

  return null;
}

function honorificPoliteChain(v, form) {
  const stem = honorificStem(v);
  if (!stem) return null;
  switch (form) {
    case "polite":
      return stem + "ます";
    case "politePast":
      return stem + "ました";
    case "politeNegative":
      return stem + "ません";
    case "politePastNegative":
      return stem + "ませんでした";
    case "politeVolitional":
      return stem + "ましょう";
    default:
      return null;
  }
}

function godanTeTa(v, kind) {
  const chars = [...v];
  const stem = chars.slice(0, -1).join("");
  const lastHira = toHiraganaKana(chars[chars.length - 1]);
  if (v.endsWith("行く")) {
    const s = v.slice(0, -1) + "っ";
    return kind === "te" ? s + "て" : s + "た";
  }
  if (v === "いく") {
    return kind === "te" ? "いって" : "いった";
  }
  const bodyMap = kind === "te" ? GODAN_TO_TE_BODY : GODAN_TO_TA_BODY;
  const body = bodyMap[lastHira];
  if (!body) return null;
  return stem + body;
}

function godanNegative(v, form) {
  const chars = [...v];
  const stem = chars.slice(0, -1).join("");
  const lastHira = toHiraganaKana(chars[chars.length - 1]);
  const frag = GODAN_TO_NAI_STEM[lastHira];
  if (!frag) return null;
  const base = stem + frag;
  return form === "negative" ? base + "ない" : base + "なかった";
}

function godanVolitional(v) {
  const chars = [...v];
  const stem = chars.slice(0, -1).join("");
  const lastHira = toHiraganaKana(chars[chars.length - 1]);
  const tail = GODAN_TO_VOLITIONAL[lastHira];
  if (!tail) return null;
  return stem + tail;
}

function godanPotential(v) {
  const chars = [...v];
  const stem = chars.slice(0, -1).join("");
  const lastHira = toHiraganaKana(chars[chars.length - 1]);
  const e = GODAN_TO_E[lastHira];
  if (!e) return null;
  return stem + e + "る";
}

function godanPassive(v) {
  const chars = [...v];
  const stem = chars.slice(0, -1).join("");
  const lastHira = toHiraganaKana(chars[chars.length - 1]);
  const frag = GODAN_TO_NAI_STEM[lastHira];
  if (!frag) return null;
  return stem + frag + "れる";
}

function godanCausative(v) {
  const chars = [...v];
  const stem = chars.slice(0, -1).join("");
  const lastHira = toHiraganaKana(chars[chars.length - 1]);
  const frag = GODAN_TO_NAI_STEM[lastHira];
  if (!frag) return null;
  return stem + frag + "せる";
}

function godanCausativePassive(v) {
  const chars = [...v];
  const stem = chars.slice(0, -1).join("");
  const lastHira = toHiraganaKana(chars[chars.length - 1]);
  const frag = GODAN_TO_NAI_STEM[lastHira];
  if (!frag) return null;
  return stem + frag + "せられる";
}

function godanConditionalBa(v) {
  const chars = [...v];
  const stem = chars.slice(0, -1).join("");
  const lastHira = toHiraganaKana(chars[chars.length - 1]);
  const e = GODAN_TO_E[lastHira];
  if (!e) return null;
  return stem + e + "ば";
}

/** 五段命令形（え段一字）：書け、話せ */
function godanImperative(v) {
  const chars = [...v];
  const stem = chars.slice(0, -1).join("");
  const lastHira = toHiraganaKana(chars[chars.length - 1]);
  const e = GODAN_TO_E[lastHira];
  if (!e) return null;
  return stem + e;
}

function ichidanBundle(stem, form) {
  switch (form) {
    case "polite":
      return stem + "ます";
    case "politePast":
      return stem + "ました";
    case "politeNegative":
      return stem + "ません";
    case "politePastNegative":
      return stem + "ませんでした";
    case "politeVolitional":
      return stem + "ましょう";
    case "te":
      return stem + "て";
    case "past":
      return stem + "た";
    case "negative":
      return stem + "ない";
    case "pastNegative":
      return stem + "なかった";
    case "volitional":
      return stem + "よう";
    case "potential":
    case "passive":
      return stem + "られる";
    case "causative":
      return stem + "させる";
    case "causativePassive":
      return stem + "させられる";
    case "conditionalBa":
      return stem + "れば";
    case "imperative":
      return stem + "ろ";
    default:
      return null;
  }
}

function godanPoliteBundle(v, form) {
  const chars = [...v];
  const stem = chars.slice(0, -1).join("");
  const lastHira = toHiraganaKana(chars[chars.length - 1]);
  const ikuEarly = ikuForms(v, form);
  if (ikuEarly !== null) return ikuEarly;
  const renyou = GODAN_TO_RENYOU[lastHira];
  if (!renyou) return null;
  const politeStem = stem + renyou;
  return ichidanBundle(politeStem, form);
}

function detectAuto(v, chars, lastHira, stem) {
  if (v.endsWith("する")) return "irregular";
  if (v === "来る" || v === "くる") return "irregular";
  if (v.endsWith("ずる")) return "irregular";
  if (v === "ある") return "irregular";
  if (v.endsWith("行く") || v === "いく") return "irregular";

  if (lastHira === "る" && chars.length >= 2) {
    const beforeRu = chars[chars.length - 2];
    if (GODAN_RU_VERBS.has(v) || !ichidanStyleBeforeRu(beforeRu)) {
      return "godan";
    }
    return "ichidan";
  }

  if (GODAN_TO_RENYOU[lastHira]) return "godan";
  return null;
}

/**
 * @param {string} verb
 * @param {"ichidan"|"godan"|"irregular"|undefined} group
 * @param {string} [form]
 */
function conjugate(verb, group, form) {
  if (typeof verb !== "string" || verb.length === 0) {
    throw new TypeError("conjugate expects a non-empty string");
  }

  const v = verb.trim();
  if (!v) throw new TypeError("conjugate expects a non-empty string");

  if (group !== undefined && !GROUPS.includes(group)) {
    throw new TypeError('group must be one of: "ichidan", "godan", "irregular"');
  }

  const f = normalizeForm(form);

  if (f === "conditionalTara") {
    return conjugate(verb, group, "past") + "ら";
  }

  if (f === "imperativeNegative") {
    return v + "な";
  }

  if (honorificEntry(v)) {
    const politeOnly = honorificPoliteChain(v, f);
    if (politeOnly) return politeOnly;
    if (f === "te") return godanTeTa(v, "te") ?? fail(v, f);
    if (f === "past") return godanTeTa(v, "past") ?? fail(v, f);
    if (f === "negative") return godanNegative(v, "negative") ?? fail(v, f);
    if (f === "pastNegative") return godanNegative(v, "pastNegative") ?? fail(v, f);
    if (f === "volitional") return godanVolitional(v) ?? fail(v, f);
    if (f === "potential") return godanPotential(v) ?? fail(v, f);
    if (f === "passive") return godanPassive(v) ?? fail(v, f);
    if (f === "causative") return godanCausative(v) ?? fail(v, f);
    if (f === "causativePassive") return godanCausativePassive(v) ?? fail(v, f);
    if (f === "conditionalBa") return godanConditionalBa(v) ?? fail(v, f);
    if (f === "imperative") {
      return honorificImperativeSurface(v) ?? godanImperative(v) ?? fail(v, f);
    }
  }

  const ir = irregularConjugate(v, f);
  if (ir !== null) return ir;
  if (group === "irregular") {
    throw new Error(`Not a recognized irregular verb: ${verb}`);
  }

  const chars = [...v];
  const lastChar = chars[chars.length - 1];
  const lastHira = toHiraganaKana(lastChar);
  const stem = chars.slice(0, -1).join("");

  const resolved =
    group ??
    detectAuto(v, chars, lastHira, stem) ??
    (() => {
      throw new Error(`Unsupported or unrecognized dictionary form: ${verb}`);
    })();

  if (resolved === "ichidan") {
    if (lastHira !== "る" || chars.length < 2) {
      throw new Error(`ichidan verbs must end in る: ${verb}`);
    }
    const out = ichidanBundle(stem, f);
    if (out) return out;
  }

  if (resolved === "godan") {
    const iku = ikuForms(v, f);
    if (iku !== null) return iku;

    if (["polite", "politePast", "politeNegative", "politePastNegative", "politeVolitional"].includes(f)) {
      const out = godanPoliteBundle(v, f);
      if (out) return out;
    }
    if (f === "te") return godanTeTa(v, "te") ?? fail(v, f);
    if (f === "past") return godanTeTa(v, "past") ?? fail(v, f);
    if (f === "negative" || f === "pastNegative") return godanNegative(v, f) ?? fail(v, f);
    if (f === "volitional") return godanVolitional(v) ?? fail(v, f);
    if (f === "potential") return godanPotential(v) ?? fail(v, f);
    if (f === "passive") return godanPassive(v) ?? fail(v, f);
    if (f === "causative") return godanCausative(v) ?? fail(v, f);
    if (f === "causativePassive") return godanCausativePassive(v) ?? fail(v, f);
    if (f === "conditionalBa") return godanConditionalBa(v) ?? fail(v, f);
    if (f === "imperative") return godanImperative(v) ?? fail(v, f);
  }

  throw new Error(`Could not conjugate ${verb} to ${f}`);
}

function fail(v, f) {
  throw new Error(`Could not conjugate ${v} to ${f}`);
}

function toMasuForm(verb, group) {
  return conjugate(verb, group, "polite");
}

/** Romaji (Hepburn-style) → one hiragana mora; keys longest-first for matching. */
const _ROMAJI_TO_HIRA = (() => {
  const raw = {
    kya: "きゃ",
    kyu: "きゅ",
    kyo: "きょ",
    gya: "ぎゃ",
    gyu: "ぎゅ",
    gyo: "ぎょ",
    sha: "しゃ",
    sya: "しゃ",
    shi: "し",
    shu: "しゅ",
    syu: "しゅ",
    sho: "しょ",
    syo: "しょ",
    cha: "ちゃ",
    cya: "ちゃ",
    chi: "ち",
    chu: "ちゅ",
    cyu: "ちゅ",
    cho: "ちょ",
    cyo: "ちょ",
    tsu: "つ",
    nya: "にゃ",
    nyu: "にゅ",
    nyo: "にょ",
    hya: "ひゃ",
    hyu: "ひゅ",
    hyo: "ひょ",
    bya: "びゃ",
    byu: "びゅ",
    byo: "びょ",
    pya: "ぴゃ",
    pyu: "ぴゅ",
    pyo: "ぴょ",
    mya: "みゃ",
    myu: "みゅ",
    myo: "みょ",
    rya: "りゃ",
    ryu: "りゅ",
    ryo: "りょ",
    ja:  "じゃ",
    jya: "じゃ",
    ju:  "じゅ",
    jyu: "じゅ",
    jo:  "じょ",
    jyo: "じょ",
    ka: "か",
    ki: "き",
    ku: "く",
    ke: "け",
    ko: "こ",
    ga: "が",
    gi: "ぎ",
    gu: "ぐ",
    ge: "げ",
    go: "ご",
    sa: "さ",
    su: "す",
    se: "せ",
    so: "そ",
    za: "ざ",
    ji: "じ",
    zu: "ず",
    ze: "ぜ",
    zo: "ぞ",
    ta: "た",
    te: "て",
    to: "と",
    da: "だ",
    de: "で",
    do: "ど",
    na: "な",
    ni: "に",
    nu: "ぬ",
    ne: "ね",
    no: "の",
    ha: "は",
    hi: "ひ",
    fu: "ふ",
    he: "へ",
    ho: "ほ",
    ba: "ば",
    bi: "び",
    bu: "ぶ",
    be: "べ",
    bo: "ぼ",
    pa: "ぱ",
    pi: "ぴ",
    pu: "ぷ",
    pe: "ぺ",
    po: "ぽ",
    ma: "ま",
    mi: "み",
    mu: "む",
    me: "め",
    mo: "も",
    ya: "や",
    yu: "ゆ",
    yo: "よ",
    ra: "ら",
    ri: "り",
    ru: "る",
    re: "れ",
    ro: "ろ",
    wa: "わ",
    wo: "を",
    a: "あ",
    i: "い",
    u: "う",
    e: "え",
    o: "お",
    // Alternates (2-letter) aligned with common IME input
    si: "し",
    ti: "ち",
    tu: "つ",
    hu: "ふ",
    wi: "うぃ",
    we: "うぇ",
    fa: "ふぁ",
    fi: "ふぃ",
    fe: "ふぇ",
    fo: "ふぉ",
    di: "ぢ",
    du: "づ",
  };
  return Object.entries(raw).sort((a, b) => b[0].length - a[0].length);
})();

function _isRomajiLetter(ch) {
  const o = ch.codePointAt(0);
  return (o >= 0x41 && o <= 0x5a) || (o >= 0x61 && o <= 0x7a);
}

function _hiraToKata(str) {
  return [...str]
    .map((c) => {
      const cp = c.codePointAt(0);
      if (cp >= 0x3041 && cp <= 0x3096) return String.fromCodePoint(cp + 0x60);
      return c;
    })
    .join("");
}

function _scriptKana(hiragana, asciiSlice) {
  const wantKata = [...asciiSlice].some((c) => c >= "A" && c <= "Z");
  return wantKata ? _hiraToKata(hiragana) : hiragana;
}

/**
 * Convert romaji to kana: lowercase letters → hiragana, any uppercase in a mora → katakana for that mora.
 * @param {string} input
 * @returns {string}
 */
function toKana(input) {
  const s = String(input ?? "");
  if (!s) return "";
  const lower = s.toLowerCase();
  let out = "";
  let i = 0;

  while (i < s.length) {
    const ch = s[i];
    if (ch === " " || ch === "\t") {
      out += ch;
      i += 1;
      continue;
    }
    if (ch === "-" || ch === "ー") {
      out += "ー";
      i += 1;
      continue;
    }
    if (!_isRomajiLetter(ch)) {
      out += ch;
      i += 1;
      continue;
    }

    const c0 = lower[i];
    const c1 = lower[i + 1];
    if (c1 && c0 === c1 && c0 !== "n" && _isRomajiLetter(s[i + 1])) {
      const slice = s.slice(i, i + 2);
      out += _scriptKana("っ", slice);
      i += 1;
      continue;
    }

    if (c0 === "n") {
      if (!c1) {
        /* Trailing single "n" stays ASCII; use "nn" for ん (e.g. sann→さん). */
        out += s[i];
        i += 1;
        continue;
      }
      if (c1 === "'") {
        out += _scriptKana("ん", s.slice(i, i + 2));
        i += 2;
        continue;
      }
      if (c1 === "n") {
        const after = lower[i + 2];
        const after2 = lower[i + 3];
        const vowelAfterNn =
          after &&
          ("aeiou".includes(after) ||
            (after === "y" && after2 && "aiueo".includes(after2)));
        if (vowelAfterNn) {
          out += _scriptKana("ん", s.slice(i, i + 1));
          i += 1;
          continue;
        }
        out += _scriptKana("ん", s.slice(i, i + 2));
        i += 2;
        continue;
      }
      if ("aeiou".includes(c1) || (c1 === "y" && "aiueo".includes(lower[i + 2] || ""))) {
        // fall through to table (na, ni, nya, …)
      } else {
        out += _scriptKana("ん", s.slice(i, i + 1));
        i += 1;
        continue;
      }
    }

    let matched = null;
    for (const [key, hira] of _ROMAJI_TO_HIRA) {
      if (lower.startsWith(key, i)) {
        matched = { key, hira, len: key.length };
        break;
      }
    }
    if (matched) {
      out += _scriptKana(matched.hira, s.slice(i, i + matched.len));
      i += matched.len;
      continue;
    }

    out += s[i];
    i += 1;
  }

  return out;
}

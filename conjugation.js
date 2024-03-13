

const GODAN   = 0x000001;
const ICHIDAN = 0x000002;
const SURU    = 0x000004;
const KURU    = 0x000008;
const ZURU    = 0x000010;

const GODAN_ARU   = 0x00000101;
const GODAN_KU_S  = 0x00000102;
const GODAN_U_S   = 0x00000104;
const GODAN_RU_I  = 0x00000108;

export const PRESENT          = 0x0001;
export const PAST             = 0x0002;
export const TE               = 0x0004;
export const VOLITIONAL       = 0x0008;
export const POTENTIAL        = 0x0010;
export const PASSIVE          = 0x0020;
export const CAUSATIVE        = 0x0040;
export const IMPERATIVE       = 0x0080;
export const CONDITIONAL      = 0x0100;
export const CONDITIONAL_TARA = 0x0200;

export const NEGATIVE         = 0x1000;
export const POLITE           = 0x2000;

const SUFFIX = new Map([
    [PRESENT | NEGATIVE, "ない"],
    [PRESENT | POLITE, "ます"],
    [PRESENT | POLITE | NEGATIVE, "ません"],

    [
        PAST, 
        new Map([
            [""  , "た" ],
            ["る", "った"],
            ["う", "った"],
            ["つ", "った"],

            ["す", "した"],
            ["く", "いた"],
            ["ぐ", "いだ"],

            ["ぬ", "んだ"],
            ["ぶ", "んだ"],
            ["む", "んだ"],
        ])
    ],
    [
        PAST | NEGATIVE, 
        new Map([
            ["", "なかった"]
        ])
    ],
    [PAST | POLITE, "ました"],
    [PAST | POLITE | NEGATIVE, "ませんでした"],

    [
        TE, 
        new Map([
            [""  , "て" ],
            ["る", "って"],
            ["う", "って"],
            ["つ", "って"],

            ["す", "して"],
            ["く", "いて"],
            ["ぐ", "いで"],

            ["ぬ", "んで"],
            ["ぶ", "んで"],
            ["む", "んで"],
        ])
    ],
    [
        TE | NEGATIVE, 
        new Map([
            ["", "なくて"]
        ])
    ],
]);

const GODAN_BASE = new Map([
    [
        "る",  
        new Map([
            [NEGATIVE, "ら"  ],
            [POLITE  , "り"  ],
        ])
    ],
    [
        "う",  
        new Map([
            [NEGATIVE, "わ"  ],
            [POLITE  , "い"  ],
        ])
    ],
    [
        "つ",  
        new Map([
            [NEGATIVE, "た"  ],
            [POLITE  , "ち"  ],
        ])
    ],
    [
        "す",  
        new Map([
            [NEGATIVE, "さ"  ],
            [POLITE  , "し"  ],
        ])
    ],
    [
        "く",  
        new Map([
            [NEGATIVE, "か"  ],
            [POLITE  , "き"  ],
        ])
    ],
    [
        "ぐ",  
        new Map([
            [NEGATIVE, "が"  ],
            [POLITE  , "ぎ"  ],
        ])
    ],
    [
        "ぬ",  
        new Map([
            [NEGATIVE, "な"  ],
            [POLITE  , "に"  ]
        ])
    ],
    [
        "ぶ",  
        new Map([
            [NEGATIVE, "ば"  ],
            [POLITE  , "び"  ],
        ])
    ],
    [
        "む",  
        new Map([
            [NEGATIVE, "ま"  ],
            [POLITE  , "み"  ],
        ])
    ],
]);

const KURU_KANJI = new Map([
    [PRESENT | NEGATIVE, "来ない"],
    [PRESENT | POLITE, "来ます"],
    [PRESENT | POLITE | NEGATIVE, "来ません"],

    [PAST, "来た"],
    [PAST | NEGATIVE, "来なかった"],
    [PAST | POLITE, "来ました"],
    [PAST | POLITE | NEGATIVE, "来ませんでした"],

    [TE, "来て"],
    [TE | NEGATIVE, "来なくて"]
]);

const KURU_KANA = new Map([
    [PRESENT | NEGATIVE, "こない"],
    [PRESENT | POLITE, "きます"],
    [PRESENT | POLITE | NEGATIVE, "きません"],

    [PAST, "きた"],
    [PAST | NEGATIVE, "こなかった"],
    [PAST | POLITE, "きました"],
    [PAST | POLITE | NEGATIVE, "きませんでした"],

    [TE, "きて"],
    [TE | NEGATIVE, "こなくて"]
]);

class Type {
    static get godan()   { return 0; }
    static get ichidan() { return 1; }
    static get suru()    { return 2; }
    static get kuru()    { return 3; }
    static get zuru()    { return 4; }
}

class SubType {
    static get ku_special()   { return 0; }
    static get aru()          { return 1; }
    static get u_special()    { return 2; }
    static get ru_irregular() { return 3; }
}

function masuStem(verb, type, subType = -1)
{
    let stem;
    if (type == Type.godan) {
        if (subType == SubType.aru) { // kudasaru, nasaru, etc...
            stem = verb.substr(0, verb.length - 1) + "い";
        } else {
            const lastChar = verb.substr(verb.length-1, 1);
            stem = verb.substr(0, verb.length - 1) + GODAN_BASE.get(lastChar).get(POLITE);
        }
    } else if (type == Type.suru) {
        stem = verb.substr(0, verb.length-2) + "し";
    } else if (type == Type.zuru) {
        stem = verb.substr(0, verb.length-2) + "じ";
    } else {
        stem = verb.substr(0, verb.length - 1);    
    }

    return stem;
}

function isValid(conjugation)
{
    let count = 0;
    count += conjugation & PRESENT ? 1 : 0;
    count += conjugation & PAST ? 1 : 0;
    count += conjugation & TE ? 1 : 0;
    return count == 1;
}

// pos is partOfSpeech from JMDict
export function conjugate(verb, conjugation, pos)
{
    if (!isValid(conjugation))
        return [];

    let result = [];
    let type = -1;
    let subType = -1;

    if (pos.startsWith("v5")) {
        type = Type.godan;
        if (pos.startsWith("v5u-s")) 
            subType = SubType.u_special;
        else if (pos.startsWith("v5aru"))
            subType = SubType.aru;
        else if (pos.startsWith("v5k-s"))
            subType = SubType.ku_special;    
        else if (pos.startsWith("v5r-i"))
            subType = SubType.ru_irregular;    
    }
    else if (pos.startsWith("v1")) {
        type = Type.ichidan;
    }
    else if (pos.startsWith("vs")) {
        type = Type.suru;
    }
    else if (pos.startsWith("vk")) {
        type = Type.kuru;
    }
    else if (pos.startsWith("vz")) {
        type = Type.zuru;
    }
   
    if (type == -1) {
        console.log("unknown type");
        return [];
    }

    if (type == Type.kuru) {
        const isKanji = verb == "来る";
        if (isKanji)
            result.push(KURU_KANJI.get(conjugation));
        else
            result.push(KURU_KANA.get(conjugation));
        return result;
    }
    
    if (conjugation & PRESENT) {
        const isNegative = conjugation & NEGATIVE;
        const isPolite = conjugation & POLITE;

        if (isPolite) {
            const stem = masuStem(verb, type, subType);
            result.push(stem + SUFFIX.get(conjugation));
        } else {
            if (isNegative) {
                let base;
                if (type == Type.godan) {
                    if (subType == SubType.ru_irregular) { // aru
                        base = "";
                    } else {
                        const lastChar = verb.substr(verb.length-1, 1);
                        base = verb.substr(0, verb.length - 1) + GODAN_BASE.get(lastChar).get(NEGATIVE);
                    }
                } else if (type == Type.suru) {
                    base = verb.substr(0, verb.length-2) + "し";
                } else if (type == Type.zuru) {
                    base = verb.substr(0, verb.length-2) + "じ";
                } else {
                    base = verb.substr(0, verb.length - 1);    
                }
                result.push(base + SUFFIX.get(conjugation));
            } else {
                result.push(verbDic);
            }
        }
    }

    if ((conjugation & PAST) || (conjugation & TE)) {
        const isPast = conjugation & PAST;
        const isNegative = conjugation & NEGATIVE;
        const isPolite = conjugation & POLITE;

        if (isPolite) {
            if (isPast) {
                const stem = masuStem(verb, type, subType);
                result.push(stem + SUFFIX.get(conjugation));
            } else {
                // TE | POLITE is not allowed
                console.log("error");
            }
        } else {
            let base;
            if (type == Type.godan) {
                const lastChar = verb.substr(verb.length-1, 1);
                if (isNegative) {
                    if (subType == SubType.ru_irregular) { // aru
                        base = "";
                    } else {
                        base = verb.substr(0, verb.length - 1) + GODAN_BASE.get(lastChar).get(NEGATIVE);
                    }
                    result.push(base + SUFFIX.get(conjugation).get(""));
                } else {
                    
                    if (subType == SubType.ku_special) // iku
                        base = verb.substr(0, verb.length - 1) + SUFFIX.get(conjugation).get("つ");
                    else if (subType == SubType.u_special) // kou, tou
                        base = verb + SUFFIX.get(conjugation).get("");
                    else
                        base = verb.substr(0, verb.length - 1) + SUFFIX.get(conjugation).get(lastChar);

                    result.push(base);
                }
            } else {
                if (type == Type.suru)
                    base = verb.substr(0, verb.length-2) + "し";
                else if (type == Type.zuru)
                    base = verb.substr(0, verb.length-2) + "じ";
                else
                    base = verb.substr(0, verb.length - 1);

                result.push(base + SUFFIX.get(conjugation).get(""));
            }
        }
    }

    if (conjugation & POTENTIAL) {
        const isNegative = conjugation & NEGATIVE;
        const isPolite = conjugation & POLITE;
    }
        
    if (conjugation & VOLITIONAL) {
        const isPolite = conjugation & POLITE;
    }

    if (conjugation & PASSIVE) {
        const isNegative = conjugation & NEGATIVE;
        const isPolite = conjugation & POLITE;
    }

    if (conjugation & CAUSATIVE) {
        const isNegative = conjugation & NEGATIVE;
        const isPolite = conjugation & POLITE;
    }

    if (conjugation & IMPERATIVE) {
        const isNegative = conjugation & NEGATIVE;
    }

    if (conjugation & CONDITIONAL) {
        const isNegative = conjugation & NEGATIVE;
    }

    if (conjugation & CONDITIONAL_TARA) {
        const isNegative = conjugation & NEGATIVE;
    }

    return result;
}

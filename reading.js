

// this is based from some codes from https://github.com/hexenq/kuroshiro/tree/master

const STR_TYPE_KANJI      = 0;
const STR_TYPE_KANJI_KANA = 1;
const STR_TYPE_KANA       = 2;
const STR_TYPE_OTHERS     = 3;

function getStrType(str)
{
    let hasKJ = false;
    let hasHK = false;
    for (let i = 0; i < str.length; i++) {
        if (wanakana.isKanji(str[i])) {
            hasKJ = true;
        }
        else if (wanakana.isHiragana(str[i]) || wanakana.isKatakana(str[i])) {
            hasHK = true;
        }
    }
    if (hasKJ && hasHK)
        return STR_TYPE_KANJI_KANA;
    if (hasKJ)
        return STR_TYPE_KANJI;
    if (hasHK)
        return STR_TYPE_KANA;

    return STR_TYPE_OTHERS;
};

// tokens from kuromoji must be passed here
export function getReading_kuromoji(tokens)
{
    let result = []; // [[text, reading],...]
    let kana_others = "";
    for (let token of tokens) {
        const strType = getStrType(token.surface_form);
        switch (strType)
        {
        case STR_TYPE_KANJI:

            if (kana_others.length > 0) {
                result.push([kana_others, ""]);
                kana_others = "";
            }

            result.push([token.surface_form, wanakana.toHiragana(token.reading)]);
            break;

        case STR_TYPE_KANJI_KANA:
            let pattern = "";
            let isLastTokenKanji = false;
            const subs = [];
            for (let i = 0; i < token.surface_form.length; i++) {
                if (wanakana.isKanji(token.surface_form[i])) {
                    if (!isLastTokenKanji) {
                        isLastTokenKanji = true;
                        pattern += "(.+)";
                        subs.push(token.surface_form[i]);
                    }
                    else {
                        subs[subs.length - 1] += token.surface_form[i];
                    }
                }
                else {
                    isLastTokenKanji = false;
                    subs.push(token.surface_form[i]);
                    pattern += wanakana.isKatakana(token.surface_form[i]) ? wanakana.toHiragana(token.surface_form[i]) : token.surface_form[i];
                }
            }
            const reg = new RegExp(`^${pattern}$`);
            const matches = reg.exec(wanakana.toHiragana(token.reading));
            if (matches) {
                let pickKanji = 1;
                for (let i = 0; i < subs.length; i++) {
                    if (wanakana.isKanji(subs[i][0])) {

                        if (kana_others.length > 0) {
                            result.push([kana_others, ""]);
                            kana_others = "";
                        }

                        result.push([subs[i], matches[pickKanji]]);
                        pickKanji += 1;
                    }
                    else {
                        kana_others += subs[i];
                    }
                }
            }
            else {

                if (kana_others.length > 0) {
                    result.push([kana_others, ""]);
                    kana_others = "";
                }

                result.push([token.surface_form, wanakana.toHiragana(token.reading)]);
            }
            break;

        case STR_TYPE_KANA:
        case STR_TYPE_OTHERS:
            kana_others += token.surface_form;
            break;
        }
    }

    if (kana_others.length > 0) {
        result.push([kana_others, ""]);
        kana_others = "";
    }

    return result;
}

export function getReading(token)
{
    let result = []; // [[text, reading],...]
    let kana_others = "";
    const strType = getStrType(token.kanji);
    switch (strType)
    {
    case STR_TYPE_KANJI:

        if (kana_others.length > 0) {
            result.push([kana_others, ""]);
            kana_others = "";
        }

        result.push([token.kanji, wanakana.toHiragana(token.kana)]);
        break;

    case STR_TYPE_KANJI_KANA:
        let pattern = "";
        let isLastTokenKanji = false;
        const subs = [];
        for (let i = 0; i < token.kanji.length; i++) {
            if (wanakana.isKanji(token.kanji[i])) {
                if (!isLastTokenKanji) {
                    isLastTokenKanji = true;
                    pattern += "(.+)";
                    subs.push(token.kanji[i]);
                }
                else {
                    subs[subs.length - 1] += token.kanji[i];
                }
            }
            else {
                isLastTokenKanji = false;
                subs.push(token.kanji[i]);
                pattern += wanakana.isKatakana(token.kanji[i]) ? wanakana.toHiragana(token.kanji[i]) : token.kanji[i];
            }
        }
        const reg = new RegExp(`^${pattern}$`);
        const matches = reg.exec(wanakana.toHiragana(token.kana));
        if (matches) {
            let pickKanji = 1;
            for (let i = 0; i < subs.length; i++) {
                if (wanakana.isKanji(subs[i][0])) {

                    if (kana_others.length > 0) {
                        result.push([kana_others, ""]);
                        kana_others = "";
                    }

                    result.push([subs[i], matches[pickKanji]]);
                    pickKanji += 1;
                }
                else {
                    kana_others += subs[i];
                }
            }
        }
        else {

            if (kana_others.length > 0) {
                result.push([kana_others, ""]);
                kana_others = "";
            }

            result.push([token.kanji, wanakana.toHiragana(token.kana)]);
        }
        break;

    case STR_TYPE_KANA:
    case STR_TYPE_OTHERS:
        kana_others += token.kanji;
        break;
    }

    if (kana_others.length > 0) {
        result.push([kana_others, ""]);
        kana_others = "";
    }

    return result;
}

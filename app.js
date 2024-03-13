
import van from "./van-1.5.3.js"
import * as reading from "./reading.js";
import { shake, Option, Group } from "./widgets.js";

import {PRESENT, PAST, TE, POTENTIAL, VOLITIONAL, CONDITIONAL, IMPERATIVE} from "./conjugation.js";
import {POLITE, NEGATIVE} from "./conjugation.js";
import {conjugate} from "./conjugation.js";

const {a, div, li, p, ul, input, ruby, rt, form, span, hr, ol} = van.tags;
const {svg, line} = van.tags("http://www.w3.org/2000/svg");

const N5 = 0;
const N4 = 1;
const N3 = 2;
const N2 = 3;
const N1 = 4;

class OptionConfig {
    constructor()
    {
        this.levels = [5];
        this.levels[N5] = true;
        this.levels[N4] = false;
        this.levels[N3] = false;
        this.levels[N2] = false;
        this.levels[N1] = false;

        this.forms = new Map([
            [PRESENT | NEGATIVE, false],
            [PRESENT | POLITE, false],
            [PRESENT | POLITE | NEGATIVE, false],
        
            [PAST, false],
            [PAST | NEGATIVE, false],
            [PAST | POLITE, false],
            [PAST | POLITE | NEGATIVE, false],
        
            [TE, true],
            [TE | NEGATIVE, false],

            [POTENTIAL, false],

            [VOLITIONAL, false],

            [CONDITIONAL, false],
            [CONDITIONAL | NEGATIVE, false],

            [IMPERATIVE, false],
            [IMPERATIVE | NEGATIVE, false],
        ]);
    }

    randomLevel()
    {
        let levels = [];
        for (let c in this.levels) {
            if (this.levels[c]) {
                levels.push(c);
            }
        }

        const index = Math.floor(Math.random() * levels.length);
        return levels[index];
    }

    randomForm()
    {
        let forms = [];
        for (const [key, value] of this.forms) {
            if (value) {
                forms.push(key);
            }
        }

        const index = Math.floor(Math.random() * forms.length);
        return forms[index];
    }

    updateLevel(level, checked)
    {
        this.levels[level] = checked;
        let count = 0;
        for (let c in this.levels) {
            if (this.levels[c]) {
                count++;
            }
        }

        if (count == 0)
            this.levels[level] = true;

        return this.levels[level];
    }

    updateForm(form, checked)
    {
        this.forms.set(form, checked);
        let count = 0;
        for (const [key, value] of this.forms) {
            if (value) {
                count++;
            }
        }
        if (count == 0)
            this.forms.set(form, true);

        return this.forms.get(form);
    }
};

// FIXME, too many globals
let OPTION = new OptionConfig();
let ENABLE_GLOBAL_RETURN_KEY = false;
let CURRENT_TOKEN = [];
let CURRENT_FORM = TE;
let MISTAKE_COUNT = 0;
let LAST_VERB_INDICES = [[], [], [], [], []];
let NON_SURU_COUNT = 0;
let MEANINGDLG_SIZE  = van.state([]);
let SIDEPANEL_VISIBLE = van.state(false);
let MEANINGDLG_VISIBLE = van.state(false);
let DETAILSBTN_VISIBLE = van.state(false);
let ANSWERBTN_VISIBLE = van.state(false);
let CURRENT_SCORE = van.state(0);
let BEST_SCORE = van.state(0);
let INPUT_CORRECT = van.state(false);
let CURRENT_FORM_TEXT = van.state("");
let HINT_TEXT = van.state("");
let MEANING_TEXT = van.state("");

const CONJUGATION_LABELS = new Map([
    [PRESENT | NEGATIVE, "Negative"],
    [PRESENT | POLITE, "Polite"],
    [PRESENT | POLITE | NEGATIVE, "Polite Negative"],

    [PAST, "Past"],
    [PAST | NEGATIVE, "Past Negative"],
    [PAST | POLITE, "Polite Past"],
    [PAST | POLITE | NEGATIVE, "Polite Past Negative"],

    [TE, "て-form"],
    [TE | NEGATIVE, "て-form Negative"],

    [POTENTIAL , "Potential"],

    [VOLITIONAL , "Volitional"],

    [CONDITIONAL , "Conditional"],
    [CONDITIONAL | NEGATIVE , "Conditional Negative"],

    [IMPERATIVE , "Imperative"],
    [IMPERATIVE | NEGATIVE , "Imperative Negative"],
]);

const POS_LABELS = new Map([
    ["v5b", "Godan verb"],
    ["v5g", "Godan verb"],
    ["v5k", "Godan verb"],
    ["v5k-s", "Godan verb"],
    ["v5m", "Godan verb"],
    ["v5n", "Godan verb"],
    ["v5r", "Godan verb"],
    ["v5r-i", "Godan verb"],
    ["v5s", "Godan verb"],
    ["v5t", "Godan verb"],
    ["v5u", "Godan verb"],
    ["v5u-s", "Godan verb"],
    ["aux-v", "Auxillary verb"],
    ["exp", "Expressions"],
    ["v5aru", "Godan verb ある special"],
    ["int", "Interjection"],
    ["suf", "Suffix"],
    ["vn", "Irregular ぬ verb"],
    ["vt", "Transitive verb"],
    ["vi", "Intransitive verb"],
    ["vs", "する verb"],
    ["vs-i", "する verb"],
    ["vs-s", "する verb"],
    ["v-unspec", "Verb unspecified"],
    ["vk", "くる verb"],
    ["v1", "Ichidan verb"],
    ["v1-s", "Ichidan verb - くれる special"],
    ["n", "Noun"],
    ["adj-na", "な-adjective"],
    ["adj-no", "の-adjective"],
    ["adj-f", "Noun or verb acting prenominally"],
    ["vz", "Ichidan verb - ずる verb"]
]);

const LEVEL_NAMES = ["n5", "n4", "n3", "n2", "n1"];

let LEVELS = {
    "n5" : {
        "nouns" : [],
        "verbs" : [],
        "adjectives" : [],
        "others" : [],
    },
    "n4" : {
        "nouns" : [],
        "verbs" : [],
        "adjectives" : [],
        "others" : [],
    },
    "n3" : {
        "nouns" : [],
        "verbs" : [],
        "adjectives" : [],
        "others" : [],
    },
    "n2" : {
        "nouns" : [],
        "verbs" : [],
        "adjectives" : [],
        "others" : [],
    },
    "n1" : {
        "nouns" : [],
        "verbs" : [],
        "adjectives" : [],
        "others" : [],
    },
};

const MainPanel = (question, textInput) => 
{
    let tabPage = van.state(0);
    
    return div(
        {
            style: () =>
                `
                background-color: #f4f1de;
                text-align:center;
                #width: 350px;
                height: 620px;
                width: 100%;
                #height: 100%;
                margin: auto;
                font-family: noto;
                `
        },
        div(
            {
                style: () =>
                    `
                    background-color:rgba(255, 255, 255, 1);
                    width: ${MEANINGDLG_SIZE.val[0] * 0.8}px;
                    height: ${MEANINGDLG_SIZE.val[1] * 0.5}px;
                    position: absolute;
                    display: inline-block;
                    visibility: ${MEANINGDLG_VISIBLE.val ? "visible" : "hidden"};
                    top: 50%;
                    left: 50%;
                    margin-top: -${MEANINGDLG_SIZE.val[1] * 0.5 * 0.5}px;
                    margin-left: -${MEANINGDLG_SIZE.val[0] * 0.8 * 0.5}px;
                    overflow-x: hidden;
                    border: 1px solid gray;
                    box-shadow: 5px 5px 5px rgba(0, 0, 0, 0.4);
                    z-index; 200;
                    `,
                id: "meaningdlg"
            },
            svg(
                {
                    width: "40",
                    height: "40",
                    style: () =>
                        `
                        position: absolute;
                        top: 0;
                        right: 0px;
                        cursor: pointer;
                        `,
                    onclick: toggleMeaningDialog
                },
                line({x1:"15", y1:"15", x2:"25", y2:"25", style:"stroke:black;stroke-width:2"}),
                line({x1:"25", y1:"15", x2:"15", y2:"25", style:"stroke:black;stroke-width:2"}),
            ),
            div(
                {id: "meaningdlg_contents"}
            )
        ),
        div(
            {
                style: () =>
                    `
                    background-color:rgb(200, 168, 116);
                    width: 320px;
                    height: 100%;
                    position: fixed;
                    z-index; 100;
                    top: 0;
                    left: ${SIDEPANEL_VISIBLE.val ? 0 : -350}px;
                    overflow-x: hidden;
                    transition: 0.3s;
                    padding-top: 5px;
                    border: 1px solid gray;
                    box-shadow: 5px 5px 5px rgba(0, 0, 0, 0.4);
                    `,
                id: "sidepanel"
            },
            svg(
                {
                    width: "40",
                    height: "40",
                    style: () =>
                        `
                        position: absolute;
                        top: 0;
                        right: 0px;
                        cursor: pointer;
                        `,
                    onclick: toggleSidePanel
                },
                line({x1:"15", y1:"15", x2:"25", y2:"25", style:"stroke:black;stroke-width:2"}),
                line({x1:"25", y1:"15", x2:"15", y2:"25", style:"stroke:black;stroke-width:2"}),
            ),
            div (
                {
                    style: () =>
                        `
                        display: flex;
                        flex-direction: row;
                        height: 40px;
                        font-size: 16px;
                        top: 0;
                        `
                },
                div (
                    {
                        style: () =>
                        `
                            width: 80px;
                            margin-left: 5px;
                            margin-right: 1px;
                            background-color: ${tabPage.val==0? " #f2cc8f": "rgb(240, 215, 180)"};
                            text-align: center;
                            padding-top: 5px;
                            cursor: pointer;
                            color: #000000;
                            border-radius: 5px;
                        `,
                        onclick: ()=> { tabPage.val = 0; }
                    },
                    "Levels"
                ),
                div(
                    {
                        style: () =>
                        `
                            width: 150px;
                            margin-left: 0px;
                            margin-right: 1px;
                            background-color: ${tabPage.val==1? " #f2cc8f": "rgb(240, 215, 180)"};
                            text-align: center;
                            padding-top: 5px;
                            cursor: pointer;
                            color: #000000;
                            border-radius: 5px;
                        `,
                        onclick: ()=> { tabPage.val = 1; }
                    },
                    "Conjugations"
                )
            ),
            div(
                {
                    style: () =>
                    `
                        position: absolute;
                        top: 42px;
                        left: 0px;
                        width: 100%;
                        height: 93%;
                        margin-left: 0px;
                        margin-right: 10px;
                        background-color: #f2cc8f;
                        text-align: center;
                        padding-top: 10px;
                        display: ${tabPage.val==0?"inline-block":"none"};
                    `
                },
                Group(
                    Option("N5", (checked)=>{ return OPTION.updateLevel(N5, checked); }, true),
                    Option("N4", (checked)=>{ return OPTION.updateLevel(N4, checked); }, false),
                    Option("N3", (checked)=>{ return OPTION.updateLevel(N3, checked); }, false),
                    Option("N2", (checked)=>{ return OPTION.updateLevel(N2, checked); }, false),
                    Option("N1", (checked)=>{ return OPTION.updateLevel(N1, checked); }, false),
                )
            ),
            div(
                {
                    style: () =>
                    `
                        position: absolute;
                        top: 42px;
                        left: 0px;
                        width: 100%;
                        height: 93%;
                        margin-left: 0px;
                        margin-right: 0px;
                        background-color: #f2cc8f;
                        text-align: center;
                        padding-top: 10px;
                        display: ${tabPage.val==1?"inline-block":"none"};
                    `
                },
                Group(
                    Option(CONJUGATION_LABELS.get(PRESENT | NEGATIVE),      
                        (checked)=>{ return OPTION.updateForm(PRESENT | NEGATIVE, checked);}, false),
                    Option(CONJUGATION_LABELS.get(PAST),        
                        (checked)=>{ return OPTION.updateForm(PAST, checked);}, false),
                    Option(CONJUGATION_LABELS.get(PAST | NEGATIVE), 
                        (checked)=>{ return OPTION.updateForm(PAST | NEGATIVE, checked);}, false),
                ),
                Group(
                    Option(CONJUGATION_LABELS.get(TE),
                        (checked)=>{ return OPTION.updateForm(TE, checked);}, true),
                    Option(CONJUGATION_LABELS.get(TE | NEGATIVE),
                        (checked)=>{ return OPTION.updateForm(TE | NEGATIVE, checked);}, false),
                ),

                Group(
                    Option(CONJUGATION_LABELS.get(PRESENT | POLITE),      
                        (checked)=>{ return OPTION.updateForm(PRESENT | POLITE, checked);}, false),
                    Option(CONJUGATION_LABELS.get(PRESENT | POLITE | NEGATIVE),      
                        (checked)=>{ return OPTION.updateForm(PRESENT | POLITE | NEGATIVE, checked);}, false),
                    Option(CONJUGATION_LABELS.get(PAST | POLITE),      
                        (checked)=>{ return OPTION.updateForm(PAST | POLITE, checked);}, false),
                    Option(CONJUGATION_LABELS.get(PAST | POLITE | NEGATIVE),      
                        (checked)=>{ return OPTION.updateForm(PAST | POLITE | NEGATIVE, checked);}, false),
                ),

                Group(
                    Option(CONJUGATION_LABELS.get(POTENTIAL),      
                        (checked)=>{ return OPTION.updateForm(POTENTIAL, checked);}, false),
                ),
                Group(
                    Option(CONJUGATION_LABELS.get(VOLITIONAL),      
                        (checked)=>{ return OPTION.updateForm(VOLITIONAL, checked);}, false),
                ),
                Group(
                    Option(CONJUGATION_LABELS.get(CONDITIONAL),      
                        (checked)=>{ return OPTION.updateForm(CONDITIONAL, checked);}, false),
                    Option(CONJUGATION_LABELS.get(CONDITIONAL | NEGATIVE),      
                        (checked)=>{ return OPTION.updateForm(CONDITIONAL | NEGATIVE, checked);}, false),
                ),
                Group(
                    Option(CONJUGATION_LABELS.get(IMPERATIVE),      
                        (checked)=>{ return OPTION.updateForm(IMPERATIVE, checked);}, false),
                    Option(CONJUGATION_LABELS.get(IMPERATIVE | NEGATIVE),      
                        (checked)=>{ return OPTION.updateForm(IMPERATIVE | NEGATIVE, checked);}, false),
                )
            ),
        ),
        question,
        div(
            {
                style: () =>
                    `
                    display: flex;
                    flex-direction: row;
                    margin-top: 10px;
                    margin-bottom: 10px;
                    height: 50px;
                    border: 1px red;
                    padding: 0px;
                    outline: 1px solid gray;
                    `,
                id: "inputContainer"
            },
            textInput,
            svg(
                {
                    style: () =>
                        `
                        cursor: pointer;
                        background-color: ${INPUT_CORRECT.val ? " #81b29a" : " #f4f1de"};
                        max-width: 40px;
                        min-width: 40px;
                        `,
                    onclick: () => { hideSidePanel(); hideMeaningDialog(); onEnterPressed();},
                },
                line(
                    {
                        style: () => 
                            `
                                stroke: ${INPUT_CORRECT.val ? " #f4f1de" : " #000000"};
                                stroke-width: 2;
                            `,
                        x1:"15", y1:"15", x2:"25", y2:"25"
                    }
                ),
                line(
                    {
                        style: () => 
                            `
                                stroke: ${INPUT_CORRECT.val ? " #f4f1de" : " #000000"};
                                stroke-width: 2;
                            `,
                        x1:"25", y1:"25", x2:"15", y2:"35"
                    }
                ),
            ),
        ),
        div(
            {
                style: () =>
                    `
                        display: flex;
                        flex-direction: row;
                        margin-top: 0px;
                        margin-bottom: 0px;
                    `
            },
            input(
                {
                    style: () =>
                        `
                        #display: inline-block;
                        #position: absolute;
                        #left: 0px;
                        #margin-left: 10px;
                        font-family: noto;
                        font-size: 20px;
                        color: rgb(42,42,42);
                        background-color:  #e07a5f; 
                        height: 40px;
                        width: 150px;
                        border: 1px;
                        #visibility: visible;
                        visibility: ${ANSWERBTN_VISIBLE.val ? "visible" : "hidden"};
                        outline: 1px solid gray;
                        border-radius: 2px;
                        text-align: center;
                        `,
                    type: "button",
                    value: "Answer",
                    id: "show answer",
                    disabled: () => {return !ANSWERBTN_VISIBLE.val;},
                    onclick: showAnswer
                }
            ),
            input(
                {
                    style: () =>
                        `
                        #display: inline-block;
                        #position: absolute;
                        #right: 0px;
                        #margin-right: 10px;
                        margin-left: auto;
                        #margin-left: 10px;
                        margin-top: 0px;
                        font-family: noto;
                        font-size: 20px;
                        background-color: #f2cc8f;
                        color: rgb(42,42,42);
                        height: 40px;
                        width: 150px;
                        border: 1px;
                        visibility: ${DETAILSBTN_VISIBLE.val ? "visible" : "hidden"};
                        outline: 1px solid gray;
                        border-radius: 2px;
                        `,
                    type: "button",
                    value: "Details",
                    id: "details",
                    onclick: ()=> { hideSidePanel(); toggleMeaningDialog(); },
                    disabled: () => {return !DETAILSBTN_VISIBLE.val;}
                }, "Details"
            ),
        ),
        div (
            {
                style: () => 
                `
                    width: 100%;
                    height: 35%;
                `,
                onclick: ()=> 
                    {
                        hideSidePanel();
                        hideMeaningDialog();
                    }
            }
        )
    );
}

function hideSidePanel()
{
    if (SIDEPANEL_VISIBLE.val)
        SIDEPANEL_VISIBLE.val = false;
}

function toggleSidePanel()
{
    if (!SIDEPANEL_VISIBLE.val) {
        setTimeout(
            () => {SIDEPANEL_VISIBLE.val = true;},
            100
        );
    } else {
        SIDEPANEL_VISIBLE.val = false;
    }
}

function toggleMeaningDialog()
{
    if (!MEANINGDLG_VISIBLE.val) {
        setTimeout(
            () => {MEANINGDLG_VISIBLE.val = true;},
            100
        );
    } else {
        MEANINGDLG_VISIBLE.val = false;
    }
}

function hideMeaningDialog()
{
    if (MEANINGDLG_VISIBLE.val)
        MEANINGDLG_VISIBLE.val = false;
}

function showAnswer(answer = "")
{
    if (TEXT_INPUT.readOnly)
        return;

    if (answer != TEXT_INPUT.value) {
        let verb = parseVerb(CURRENT_TOKEN);
        if (verb.pos.startsWith("vs") && !verb.kana.endsWith("する"))
            verb.kana += "する";

        answer = conjugate(verb.kana, CURRENT_FORM, verb.pos);
        TEXT_INPUT.value = answer;
    }

    INPUT_CORRECT.val = true;
    TEXT_INPUT.readOnly = true;
    setTimeout(
        () => { ENABLE_GLOBAL_RETURN_KEY = true; },
        100
    );

    DETAILSBTN_VISIBLE.val = true;
}

function onEnterPressed()
{
    if (TEXT_INPUT.readOnly) {
        nextQuestion();
        return;
    }

    let verb = parseVerb(CURRENT_TOKEN);
    let input = TEXT_INPUT.value;

    let answer;
    if (wanakana.isKana(TEXT_INPUT.value)) {
        if (verb.pos.startsWith("vs") && !verb.kana.endsWith("する"))
            verb.kana += "する";

        answer = conjugate(verb.kana, CURRENT_FORM, verb.pos);
        if (answer.length > 0)
            answer = wanakana.toRomaji(answer[0]);

        console.log("answer:" + answer);

        let txt = wanakana.toRomaji(TEXT_INPUT.value);
        input = "";
        for (let i = 0; i < txt.length; ++i) {
            if (txt[i] == '-')
                input += txt[i-1];
            else
            input += txt[i];
        }
    } else if (wanakana.isJapanese(TEXT_INPUT.value)) {
        if (verb.pos.startsWith("vs") && !verb.kanji.endsWith("する"))
            verb.kanji += "する";

        answer = conjugate(verb.kanji, CURRENT_FORM, verb.pos);
        if (answer.length > 0)
            answer = answer[0];
    }

    if (wanakana.isJapanese(TEXT_INPUT.value)) {
        if (input  == answer) {
            showAnswer(TEXT_INPUT.value);
            CURRENT_SCORE.val += 1;
        } else {
            ++MISTAKE_COUNT;
            CURRENT_SCORE.val = 0;
            shake(document.getElementById("inputContainer"), 100, 500);

            let hint = "";
            if (verb.pos.startsWith("v5")) {
                if (verb.pos.startsWith("v5u-s")) 
                    hint = "This is a godan verb with a special て-form and Past form.";   
                else if (verb.pos.startsWith("v5aru"))
                    hint = "This is a godan verb with a special ます-form.";
                else if (verb.pos.startsWith("v5k-s"))
                    hint = "This is a godan verb.";
                else
                    hint = "This is a godan verb.";
            }
            else if (verb.pos.startsWith("v1")) {
                hint = "This is an ichidan verb.";    
            }
            else if (verb.pos.startsWith("vs")) {
                hint = "This is an irregular verb.";    
            }
            else if (verb.pos.startsWith("vk")) {
                hint = "This is an irregular verb.";    
            }
            else if (verb.pos.startsWith("vz")) {
                hint = "This is an ichidan verb that ends in ずる";
            }

            HINT_TEXT.val = hint;
            if (MISTAKE_COUNT > 2)
                ANSWERBTN_VISIBLE.val = true;
        }

        if (CURRENT_SCORE.val > BEST_SCORE.val)
            BEST_SCORE.val = CURRENT_SCORE.val;

    } else {
        shake(document.getElementById("inputContainer"), 100, 500);
    }

    TEXT_INPUT.focus();
}

function parseVerb(verb)
{
    let pos = "";
    for (let s of verb["sense"]){
        const p = s["partOfSpeech"];
        for (let v of p) {
            if (v.startsWith("v5")) {
                pos = v;
                break;
            }
            if (v.startsWith("v1")) {
                pos = v;
                break;
            }
            if (v.startsWith("vs")) {
                pos = v;
                break;
            }
            if (v.startsWith("vk")) {
                pos = v;
                break;
            }
            if (v.startsWith("vz")) {
                pos = v;
                break;
            }
        }
    }

    let kana = verb["kana"];
    let kanji = verb["kanji"];
    return {"kana":kana[0], "pos": pos, "kanji":kanji.length > 0 ? kanji[0] : ""};
}

function nextQuestion()
{
    MISTAKE_COUNT = 0;
    ANSWERBTN_VISIBLE.val = false;
    hideMeaningDialog();
    INPUT_CORRECT.val = false;
    TEXT_INPUT.value = "";
    TEXT_INPUT.readOnly = false;
    ENABLE_GLOBAL_RETURN_KEY = false;
    HINT_TEXT.val = "";

    CURRENT_FORM = OPTION.randomForm();
    CURRENT_FORM_TEXT.val = CONJUGATION_LABELS.get(CURRENT_FORM);

    const levelIndex = OPTION.randomLevel();
    const verbs = LEVELS[LEVEL_NAMES[levelIndex]]["verbs"];
    let verbIndex = Math.floor(Math.random() * verbs.length);
    CURRENT_TOKEN = verbs.at(verbIndex);
    let verb = parseVerb(CURRENT_TOKEN);
    
    while(LAST_VERB_INDICES[levelIndex].find((elem) => elem == verbIndex) || 
          (verb.pos.startsWith("vs") && NON_SURU_COUNT < 10) || // do not show suru verb too much
          (verb.pos.length == 0) || // skip this
          (CURRENT_FORM == POTENTIAL && (verb.kana == "わかる" || verb.kana == "できる" || verb.kana == "ある" )) // skip for potential form
        ) {
        verbIndex = Math.floor(Math.random() * verbs.length);
        CURRENT_TOKEN = verbs.at(verbIndex);
        verb = parseVerb(CURRENT_TOKEN);
    }

    if (LAST_VERB_INDICES[levelIndex].length >= 50)
        LAST_VERB_INDICES[levelIndex].shift();
    LAST_VERB_INDICES[levelIndex].push(verbIndex);

    if (!verb.pos.startsWith("vs"))
        NON_SURU_COUNT++;
    else
        NON_SURU_COUNT = 0;

    let rubyText = div({id: "qt"});
    if (verb.kanji.length) {
        const tokens = reading.getReading(verb);
        for (const t of tokens) {
            if (t[1].length > 0) {
                van.add(rubyText, ruby(t[0], rt({style:`height: 20px;`},t[1])));
            } else {
                van.add(rubyText, ruby(t[0]));    
            }
        }
    } else {
        van.add(rubyText, ruby(verb.kana, rt({style:`height: 20px; visibility: hidden;`}, "x")));
    }

    if (verb.pos.startsWith("vs") && !verb.kana.endsWith("する"))
        van.add(rubyText, ruby("する"));

    document.getElementById("qt").replaceWith(rubyText);

    /// set meaning
    MEANING_TEXT.val = "";

    let meaningList = ul({id: "meaningdlg_contents"});
    let lastPos = "";
    let meaningHintSet = false;
    for (let s of CURRENT_TOKEN.sense) {
        let pos = div({
            style: 
            `
                text-align: left;
                font-size: 14px;
                color: #e07a5f;
            `
        });
        let currentPos = "";
        let setMeaningHint = 0;
        for (let [index, p] of s.partOfSpeech.entries()) {
            if (p.startsWith("v"))
                setMeaningHint++;

            if (POS_LABELS.has(p)) {
                currentPos += POS_LABELS.get(p);
            } else {
                currentPos += p + "(FIX)"
            }
            if (index < s.partOfSpeech.length - 1)
                currentPos += ", ";
        }

        if (currentPos != lastPos) {
            pos.innerHTML += currentPos;
            lastPos = currentPos;
        }

        let gloss = li({
            style: 
            `
                text-align: left;
                font-size: 15px;
                color: #000000ff;
                margin-right: 30px;
            `
        });
        let text = "";
        for (let [index, m]  of s.gloss.entries()) {
            if (setMeaningHint > 0 && !meaningHintSet) {
                meaningHintSet = true;
                MEANING_TEXT.val += m;
            }

            text += m;
            if (index < s.gloss.length - 1)
                text += "; ";
        }
        
        van.add(gloss, div({style:`color: #000000ff;`}, text));
        van.add(meaningList, pos, gloss);
    }
    document.getElementById("meaningdlg_contents").replaceWith(meaningList);

    DETAILSBTN_VISIBLE.val = false;
}

///// MAIN //////

let question = div(
    {
        style: () =>
            `
            background-color: #3d405b;
            display: flex;
            flex-direction: column;
            color: #f4f1de;
            width: 100%;
            min-height: 45%;
            height: 40vw;
            max-height: 360px;
            margin: auto;
            font-family: noto;
            #font-size: 45px;
            font-size: 11vmin;
            `,
        onclick: ()=> 
        {
            hideSidePanel();
            hideMeaningDialog();
        }
    },
    div(
        {
            style: () =>
                `
                display: flex;
                flex-direction: row;
                margin: 0px;
                padding: 0px;
                `
        },
        svg(
            {
                style: () =>
                    `
                    cursor: pointer;
                    max-width: 40px;
                    min-width: 40px;
                    height: 30px;
                    `,
                onclick: toggleSidePanel,
            },
            line({x1:"15", y1:"15", x2:"25", y2:"15", style:"stroke:#f4f1de;stroke-width:2"}),
            line({x1:"15", y1:"20", x2:"25", y2:"20", style:"stroke:#f4f1de;stroke-width:2"}),
            line({x1:"15", y1:"25", x2:"25", y2:"25", style:"stroke:#f4f1de;stroke-width:2"}),
        ),
        div(
            {
                style: () =>
                    `
                    display: flex;
                    flex-direction: column;
                    height: 30px;
                    right: 20px;
                    margin-top: 10px;
                    text-align: right;
                    position: absolute;
                    font-size: 15px;
                    `
            },
            div(
                () => 
                {
                    if (CURRENT_SCORE.val == BEST_SCORE.val)
                        return BEST_SCORE.val;
                    else
                        return CURRENT_SCORE.val + " (" + BEST_SCORE.val + ")";
                }
            )
        ),
    ),
    div(
        {
            style: () =>
                `
                margin-top: 0px;
                font-size: 20px;
                display: flex;
                flex-direction: row;
                text-align:center;
                margin-left: auto;
                margin-right: auto;
                `
        },
        div(
            "Convert to "
        ),
        div(
            {
                style:
                    `
                        margin-left: 5px;
                        color: #f2cc8f;
                    `,
                id: "currentQuestion"
            },
            () => CURRENT_FORM_TEXT.val
        )
    ),
    div(
        {
            style: () =>
                `
                margin-top: 20px;
                max-width: 1000px;
                margin-left: auto;
                margin-right: auto;
                `,
        },
        ruby({id: "qt"})
    ),
    div(
        {
            style: () =>
                `
                    display: flex;
                    flex-direction: row;
                    margin-left: auto;
                    margin-right: auto;
                `
        },
        div(
            {
                style: () =>
                    `
                    margin-top: 0px;
                    height: 20px;
                    #width: 99%;
                    font-size: 15px;
                    text-align: center;
                    margin-left: auto;
                    margin-right: auto;
                    `,
                id: "meaning"
            },
            () => MEANING_TEXT.val
        )
    ),
    div(
        {
            style: () =>
                `
                margin: auto;
                #height: 100%;
                font-size: 15px;
                visibility: ${HINT_TEXT.val == "" ? "hidden" : "visible"};
                color: #e07a5f;
                text-align: center;
                `,
            id: "hint"
        },
        () => HINT_TEXT.val
    ),
);

// FIXME avoid global DOM
let TEXT_INPUT = input(
    {
        style: () =>
            `
            background-color: ${INPUT_CORRECT.val ? " #81b29a": " #f4f1de" };
            color: ${INPUT_CORRECT.val ? " #f4f1de": " #000000" };
            width: 100%;
            font-family: noto;
            font-size: 20px;
            text-align: center;
            outline: none;
            border: none;
            border-radius: 0px;
            padding-left: 40px;
            `,
        type: "text",
        placeholder: "答え",
        onclick: () => { hideSidePanel(); hideMeaningDialog(); },
        onkeydown: (e) => 
        {
            if (e.key == "Enter" && !e.isComposing) {
                onEnterPressed();
            }
        }
    }
);

window.addEventListener("resize",
    () => 
    {
        const w = document.documentElement.clientWidth;
        const h = document.documentElement.clientHeight;
        MEANINGDLG_SIZE.val = [w, h];
    }
)

const w = document.documentElement.clientWidth;
const h = document.documentElement.clientHeight;
MEANINGDLG_SIZE.val = [w, h];

document.addEventListener(
    "keydown",
    function(e) {
        if (e.key == "Enter" && ENABLE_GLOBAL_RETURN_KEY) {
            onEnterPressed();
        }
    }
)

wanakana.bind(TEXT_INPUT);
van.add(document.body, MainPanel(question, TEXT_INPUT));

async function loadDB()
{
    //const posNames = ["nouns", "verbs", "adjectives", "others"];
    const posNames = ["verbs"];
    for (let level of LEVEL_NAMES) {
        for (let pos of posNames) {
            const dbFile = "./" + level + "_" + pos + "_db2.json";
            //const dbFile = "./test.json";       
            console.log("loading:" + dbFile);
            fetch(dbFile)
                .then(response => response.json())
                .then(data => {LEVELS[level][pos] = data; nextQuestion();})
                .catch(error => console.error('Error fetching JSON:', error));
        }
    }

    return true;
}

await loadDB();

//import {test} from "./test.js"
//test();

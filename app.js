
import van from "./van-1.5.3.js"
import * as reading from "./reading.js";
import { Shaker, Option } from "./widgets.js";

const {a, div, li, p, ul, input, ruby, rt, form, span, hr} = van.tags;
const {svg, line} = van.tags("http://www.w3.org/2000/svg");

const N5 = 0;
const N4 = 1;
const N3 = 2;
const N2 = 3;
const N1 = 4;

const GODAN = 0;
const ICHIDAN = 1;
const SURU = 2;
const KURU = 3;
const ARU = 4;
const ZURU = 5;
const GODAN_U_SPECIAL = 6;

const DICTIONARY_FORM         = -1;
const NEGATIVE_FORM           = 0;
const PAST_FORM               = 1;
const PAST_NEGATIVE_FORM      = 2;
const TE_FORM                 = 3;
const MASU_FORM               = 4;
const MASU_NEGATIVE_FORM      = 5;
const MASU_PAST_FORM          = 6;
const MASU_PAST_NEGATIVE_FORM = 7;

// FIXME, avoid duplicates
const conjugationRules = {
    godan : {
        "る": ["らない", "った", "らなかった", "って", "ります", "りません", "りました", "リませんでした"],
        "う": ["わない", "った", "わなかった", "って", "います", "いません", "いました", "いませんでした"],
        "つ": ["たない", "った", "たなかった", "って", "ちます", "ちません", "ちました", "ちませんでした"],
        "す": ["さない", "した", "さなかった", "して", "します", "しません", "しました", "しませんでした"],
        "く": ["かない", "いた", "かなかった", "いて", "きます", "きません", "きました", "きませんでした"],
        "ぐ": ["がない", "いだ", "がなかった", "いで", "ぎます", "ぎません", "ぎました", "ぎませんでした"],
        "ぬ": ["なない", "んだ", "ななかった", "んで", "にます", "にません", "にました", "にませんでした"],
        "ぶ": ["ばない", "んだ", "ばなかった", "んで", "びます", "びません", "びました", "びませんでした"],
        "む": ["まない", "んだ", "まなかった", "んで", "みます", "みません", "みました", "みませんでした"]
    },

    ichidan : ["ない", "た", "なかった", "て", "ます", "ません", "ました", "ませんでした"],

    suru : ["しない", "した", "しなかった", "して", "します", "しません", "しました", "しませんでした"],
    kuru_kanji : ["来ない","来た","来なかった", "来て", "来ます", "来ません", "来ました", "来ませんでした"],
    kuru_kana: ["こない","きた","こなかった", "きて", "きます", "きません", "きました", "きませんでした"],

    zuru : ["じない", "じた", "じなかった", "じて", "じます", "じません", "じました", "じませんでした"],
};

function conjugateVerb(verb, conjugation, type)
{
    if (conjugation == DICTIONARY_FORM)
        return verb;

    if (verb == "来る")
        return conjugationRules.kuru_kanji[conjugation];

    if (verb == "くる")
        return conjugationRules.kuru_kana[conjugation];

    if (verb == "為る" || verb == "する" || (type == SURU && verb.endsWith("する")))
        return verb.substr(0, verb.length-2) + conjugationRules.suru[conjugation];

    if ((verb == "いく" || verb == "行く") && conjugation == TE_FORM)
        return "いって"

    if ((verb == "いく" || verb == "行く") && conjugation == PAST_FORM)
        return "いった"

    if ((verb == "有る" || verb == "在る" || verb == "ある") && conjugation == NEGATIVE_FORM)
        return "ない";

    if ((verb == "有る" || verb == "在る" || verb == "ある") && conjugation == PAST_NEGATIVE_FORM)
        return "なかった";

    // special zuru verbs 
    if (type == ZURU)
        return verb.substr(0, verb.length-2) + conjugationRules.zuru[conjugation];
    
    // "v5u-s"
    if (type == GODAN_U_SPECIAL) {
        if (conjugation == TE_FORM || conjugation == PAST_FORM)
            return verb + conjugationRules.ichidan[conjugation];
        type = GODAN;
    }

    // special aru verbs, kudasaru, nasaru, etc...
    if (type == ARU) {
        if (conjugation == MASU_FORM || conjugation == MASU_PAST_FORM || conjugation == MASU_NEGATIVE_FORM || conjugation == MASU_PAST_NEGATIVE_FORM)
            return verb.substr(0, verb.length - 1) + "い" + conjugationRules.ichidan[conjugation];
        type = GODAN;
    }

    const lastChar = verb.substr(verb.length-1, 1);
    const table = type == GODAN ? conjugationRules.godan[lastChar] : conjugationRules.ichidan;
    return verb.substr(0, verb.length-1) + table[conjugation];
}

class OptionConfig {
    constructor()
    {
        this.levels = [5];
        this.levels[N5] = true;
        this.levels[N4] = false;
        this.levels[N3] = false;
        this.levels[N2] = false;
        this.levels[N1] = false;

        this.forms = [8];
        this.forms[NEGATIVE_FORM] = false;
        this.forms[PAST_FORM] = false;
        this.forms[PAST_NEGATIVE_FORM] = false;
        this.forms[TE_FORM] = true;
        this.forms[MASU_FORM] = false;
        this.forms[MASU_NEGATIVE_FORM] = false;
        this.forms[MASU_PAST_FORM] = false;
        this.forms[MASU_PAST_NEGATIVE_FORM] = false;
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
        for (let c in this.forms) {
            if (this.forms[c]) {
                forms.push(c);
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
        this.forms[form] = checked;
        let count = 0;
        for (let c in this.forms) {
            if (this.forms[c]) {
                count++;
            }
        }

        if (count == 0)
            this.forms[form] = true;

        return this.forms[form];
    }
};

let ENABLE_GLOBAL_RETURN_KEY = false;
let OPTION = new OptionConfig();
let CURRENT_TOKEN = [];
let CURRENT_FORM = TE_FORM;
let MISTAKE_COUNT = 0;
let LAST_VERB_INDICES = [[], [], [], [], []];
let IS_SIDE_PANEL_SHOWN = false;
let NON_SURU_COUNT = 0;
let CURRENT_SCORE = 0;
let BEST_SCORE = 0;

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
                    background-color:rgb(200, 168, 116);
                    #height: 600px;
                    width: 320px;
                    height: 100%;
                    position: fixed;
                    z-index; 100;
                    top: 0;
                    left: -322px;
                    overflow-x: hidden;
                    transition: 0.3s;
                    padding-top: 5px;
                    border: 1px solid gray;
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
                        height: 91%;
                        margin-left: 0px;
                        margin-right: 10px;
                        background-color: #f2cc8f;
                        text-align: center;
                        padding-top: 10px;
                        display: ${tabPage.val==0?"inline-block":"none"};
                    `
                },
                Option("N5", (checked)=>{ return OPTION.updateLevel(N5, checked); }, true),
                Option("N4", (checked)=>{ return OPTION.updateLevel(N4, checked); }, false),
                Option("N3", (checked)=>{ return OPTION.updateLevel(N3, checked); }, false),
                Option("N2", (checked)=>{ return OPTION.updateLevel(N2, checked); }, false),
                Option("N1", (checked)=>{ return OPTION.updateLevel(N1, checked); }, false),
            ),
            div(
                {
                    style: () =>
                    `
                        position: absolute;
                        top: 42px;
                        left: 0px;
                        width: 100%;
                        height: 91%;
                        margin-left: 0px;
                        margin-right: 0px;
                        background-color: #f2cc8f;
                        text-align: center;
                        padding-top: 10px;
                        display: ${tabPage.val==1?"inline-block":"none"};
                    `
                },
                Option("て-form",
                    (checked)=>{ return OPTION.updateForm(TE_FORM, checked);}, true),
                Option("Negative",      
                    (checked)=>{ return OPTION.updateForm(NEGATIVE_FORM, checked);}, false),
                Option("Past",        
                    (checked)=>{ return OPTION.updateForm(PAST_FORM, checked);}, false),
                Option("Past Negative", 
                    (checked)=>{ return OPTION.updateForm(PAST_NEGATIVE_FORM, checked);}, false),
                Option("Polite",      
                    (checked)=>{ return OPTION.updateForm(MASU_FORM, checked);}, false),
                Option("Polite Negative",      
                    (checked)=>{ return OPTION.updateForm(MASU_NEGATIVE_FORM, checked);}, false),
                Option("Polite Past",      
                    (checked)=>{ return OPTION.updateForm(MASU_PAST_FORM, checked);}, false),
                Option("Polite Past Negative",      
                    (checked)=>{ return OPTION.updateForm(MASU_PAST_NEGATIVE_FORM, checked);}, false),
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
                    z-index; 1;
                    `,
                id: "inputContainer"
            },
            textInput,
            svg(
                {
                    style: () =>
                        `
                        cursor: pointer;
                        background-color: #f4f1de;
                        max-width: 40px;
                        min-width: 40px;
                        `,
                    onclick: () => { hideSidePanel(); onEnterPressed();},
                    id: "inputButton"
                },
                line({x1:"15", y1:"15", x2:"25", y2:"25", style:"stroke:black;stroke-width:2", id: "inputButton1"}),
                line({x1:"25", y1:"25", x2:"15", y2:"35", style:"stroke:black;stroke-width:2", id: "inputButton2"}),
            ),
        ),
        input(
            {
                style: () =>
                    `
                    display: inline-block;
                    position: absolute;
                    left: 0px;
                    margin-left: 10px;
                    font-family: noto;
                    font-size: 20px;
                    background-color: #81b29a;
                    color: #f4f1de;
                    height: 40px;
                    width: 150px;
                    border: 1px;
                    visibility: hidden;
                    outline: 1px solid gray;
                    border-radius: 2px;
                    text-align: center;
                    `,
                type: "button",
                value: "Answer",
                id: "show answer",
                onclick: showAnswer
            }
        ),
        input(
            {
                style: () =>
                    `
                    display: inline-block;
                    position: absolute;
                    right: 0px;
                    margin-right: 10px;
                    font-family: noto;
                    font-size: 20px;
                    background-color: #e07a5f;
                    color: #f4f1de;
                    height: 40px;
                    width: 150px;
                    border: 1px;
                    visibility: hidden;
                    outline: 1px solid gray;
                    border-radius: 2px;
                    `,
                type: "button",
                value: "Skip",
                id: "skip",
                onclick: setQuestion
            }
        ),
        div (
            {
                style: () => 
                `
                    width: 100%;
                    height: 40%;
                `,
                onclick: ()=> 
                    {
                        if (IS_SIDE_PANEL_SHOWN)
                            hideSidePanel();
                    }
            }
        )
    );
}

function hideSidePanel()
{
    let sidePanel = document.getElementById("sidepanel");
    sidePanel.style.left = "-322px";
    sidePanel.style.zIndex = "100";
    IS_SIDE_PANEL_SHOWN = false;
}

function toggleSidePanel()
{
    let sidePanel = document.getElementById("sidepanel");
    if (sidePanel.style.left == "0px") {
        sidePanel.style.left = "-322px";
        sidePanel.style.zIndex = "100";
        IS_SIDE_PANEL_SHOWN = false;
    } else {
        sidePanel.style.left = "0px";
        sidePanel.style.zIndex = "100";
        setTimeout(
            () => {IS_SIDE_PANEL_SHOWN = true;},
            100
        );
    }
}

function setCurrentQuestion(question)
{
    document.getElementById("currentQuestion").innerHTML = question;
}

function setHint(hint)
{
    document.getElementById("hint").style.visibility = "visible";
    document.getElementById("hint").innerHTML = hint;
}

function resetHint()
{
    document.getElementById("hint").style.visibility = "hidden";
    document.getElementById("hint").innerHTML = "";
}

function showSkip()
{
    document.getElementById("skip").style.visibility = "visible";
    document.getElementById("show answer").style.visibility = "visible";
}

function hideSkip()
{
    document.getElementById("skip").style.visibility = "hidden";
    document.getElementById("show answer").style.visibility = "hidden";
}

function setInputColor(bgColor, textColor)
{
    textInput.style.backgroundColor = bgColor;
    document.getElementById("inputButton").style.backgroundColor = bgColor;

    textInput.style.color = textColor;
    document.getElementById("inputButton").style.color = textColor;
    document.getElementById("inputButton1").style.stroke = textColor;
    document.getElementById("inputButton2").style.stroke = textColor;
}

function showAnswer(answer = "")
{
    if (textInput.readOnly)
        return;

    if (answer != textInput.value) {
        let verb = parseVerb(CURRENT_TOKEN);
        if (verb.type == SURU && !verb.kana.endsWith("する"))
            verb.kana += "する";

        answer = conjugateVerb(verb.kana, CURRENT_FORM, verb.type);
        textInput.value = answer;
    }

    setInputColor("#81b29a", "#f4f1de");
    textInput.readOnly = true;
    //textInput.focus();
    setTimeout(
        () => { ENABLE_GLOBAL_RETURN_KEY = true; },
        100
    );
}

function updateScore()
{
    if (CURRENT_SCORE == BEST_SCORE)
        document.getElementById("score").innerHTML = CURRENT_SCORE;
    else
        document.getElementById("score").innerHTML = CURRENT_SCORE + "  (" + BEST_SCORE + ")";
}

function onEnterPressed()
{
    if (textInput.readOnly) {
        setQuestion();
        return;
    }

    let verb = parseVerb(CURRENT_TOKEN);
    let input = textInput.value;

    let answer;
    if (wanakana.isKana(textInput.value)) {
        if (verb.type == SURU && !verb.kana.endsWith("する"))
            verb.kana += "する";

        answer = conjugateVerb(verb.kana, CURRENT_FORM, verb.type);
        answer = wanakana.toRomaji(answer);

        let txt = wanakana.toRomaji(textInput.value);
        input = "";
        for (let i = 0; i < txt.length; ++i) {
            if (txt[i] == '-')
                input += txt[i-1];
            else
            input += txt[i];
        }
    } else if (wanakana.isJapanese(textInput.value)) {
        if (verb.type == SURU && !verb.kanji.endsWith("する"))
            verb.kanji += "する";

        answer = conjugateVerb(verb.kanji, CURRENT_FORM, verb.type);
    }

    if (wanakana.isJapanese(textInput.value)) {
        if (input  == answer) {
            showAnswer(textInput.value);
            CURRENT_SCORE++;
        } else {
            ++MISTAKE_COUNT;
            CURRENT_SCORE = 0;
            shaker.start();
            if (verb.type == GODAN)
                setHint("This is a godan verb.");
            else if (verb.type == ICHIDAN)
                setHint("This is an ichidan verb.");
            else if (verb.type == ARU)
                setHint("This is a godan verb with a special ます-form.");
            else if (verb.type == ZURU)
                setHint("This is an ichidan verb that ends in ずる.");
            else if (verb.type == GODAN_U_SPECIAL)
                setHint("This is a godan verb with a special て-form and Past form.");    
            else 
                setHint("This is an irregular verb.");    
            if (MISTAKE_COUNT > 2)
                showSkip();
        }

        if (CURRENT_SCORE > BEST_SCORE)
            BEST_SCORE = CURRENT_SCORE;

        updateScore();
    } else {
        shaker.start();
    }

    textInput.focus();
}

function parseVerb(verb)
{
    let result = -1;
    for (let s of verb["sense"]){
        const p = s["partOfSpeech"];
        for (let v of p) {
            if (v.startsWith("v5u-s")) {
                result = GODAN_U_SPECIAL;
                break;
            }
            if (v.startsWith("v5aru")) {
                result = ARU;
                break;
            }
            if (v.startsWith("v5")) {
                result = GODAN;
                break;
            }
            if (v.startsWith("v1")) {
                result = ICHIDAN;
                break;
            }
            if (v.startsWith("vs")) {
                result = SURU;
                break;
            }
            if (v.startsWith("vk")) {
                result = KURU;
                break;
            }
            if (v.startsWith("vz")) {
                result = ZURU;
                break;
            }
        }
    }

    let kana = verb["kana"];
    let kanji = verb["kanji"];
    return {"kana":kana[0], "type":result, "kanji":kanji.length > 0 ? kanji[0] : ""};
}

function setQuestion()
{
    MISTAKE_COUNT = 0;
    hideSkip();
    setInputColor("#f4f1de", "#000000");
    textInput.value = "";
    textInput.readOnly = false;
    ENABLE_GLOBAL_RETURN_KEY = false;
    resetHint();

    CURRENT_FORM = OPTION.randomForm();
    if (CURRENT_FORM == NEGATIVE_FORM)
        setCurrentQuestion("Negative Form");
    else if (CURRENT_FORM == PAST_FORM)
        setCurrentQuestion("Past Form");
    else if (CURRENT_FORM == PAST_NEGATIVE_FORM)
        setCurrentQuestion("Past Negative Form");
    else if (CURRENT_FORM == TE_FORM)
        setCurrentQuestion("て-Form");
    else if (CURRENT_FORM == MASU_FORM)
        setCurrentQuestion("Polite Form");
    else if (CURRENT_FORM == MASU_NEGATIVE_FORM)
        setCurrentQuestion("Polite Negative Form");
    else if (CURRENT_FORM == MASU_PAST_FORM)
        setCurrentQuestion("Polite Past Form");
    else if (CURRENT_FORM == MASU_PAST_NEGATIVE_FORM)
        setCurrentQuestion("Polite Past Negative Form");

    const levelIndex = OPTION.randomLevel();
    const verbs = LEVELS[LEVEL_NAMES[levelIndex]]["verbs"];
    let verbIndex = Math.floor(Math.random() * verbs.length);
    CURRENT_TOKEN = verbs.at(verbIndex);
    let verb = parseVerb(CURRENT_TOKEN);
    
    // do not show suru verb too much
    while(LAST_VERB_INDICES[levelIndex].find((elem) => elem == verbIndex) || (verb.type == SURU && NON_SURU_COUNT < 10)) {
        verbIndex = Math.floor(Math.random() * verbs.length);
        CURRENT_TOKEN = verbs.at(verbIndex);
        verb = parseVerb(CURRENT_TOKEN);
    }

    if (LAST_VERB_INDICES[levelIndex].length >= 50)
        LAST_VERB_INDICES[levelIndex].shift();
    LAST_VERB_INDICES[levelIndex].push(verbIndex);

    if (verb.type != SURU)
        NON_SURU_COUNT++;
    else
        NON_SURU_COUNT = 0;

    document.getElementById("meaning").innerHTML = "";
    let ok = false;
    for (let s of CURRENT_TOKEN.sense) {
        for (let m of s.gloss) {
            for (let pos of s.partOfSpeech) {
                if (pos.startsWith("v")) {
                    document.getElementById("meaning").innerHTML += m;
                    ok = true;
                    break;
                }
            }

            // FIXME
            if (ok)
                break;
        }

        // FIXME
        if (ok)
            break;
    }

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

    if (verb.type == SURU && !verb.kana.endsWith("する"))
        van.add(rubyText, ruby("する"));

    document.getElementById("qt").replaceWith(rubyText);
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
            max-height: 310px;
            margin: auto;
            font-family: noto;
            #font-size: 45px;
            font-size: 12vmin;
            `,
        onclick: ()=> 
        {
            if (IS_SIDE_PANEL_SHOWN)
                hideSidePanel();
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
                    #background-color: #3d405b;
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
                    #background-color: #3d405b;
                    #max-width: 40px;
                    #min-width: 40px;
                    height: 30px;
                    right: 20px;
                    margin-top: 10px;
                    text-align: right;
                    position: absolute;
                    font-size: 15px;
                    `,
                id: "score"
            },
            div(
                "0"
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
            }
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
                margin-top: 0px;
                height: 20px;
                width: 99%;
                font-size: 15px;
                text-align: center;
                margin-left: auto;
                margin-right: auto;
                `,
            id: "meaning"
        },
        ""
    ),
    div(
        {
            style: () =>
                `
                margin: auto;
                #height: 100%;
                font-size: 15px;
                visibility: hidden;
                color: #e07a5f;
                text-align: center;
                `,
            id: "hint"
        },
        "",
    )
);

let textInput = input(
    {
        style: () =>
            `
            background-color: #f4f1de;
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
        onclick: hideSidePanel,
        onkeydown: (e) => 
        {
            if (e.key == "Enter" && !e.isComposing) {
                onEnterPressed();
            }
        }
    }
);

document.addEventListener(
    "keydown",
    function(e) {
        if (e.key == "Enter" && ENABLE_GLOBAL_RETURN_KEY) {
            onEnterPressed();
        }
    }
)

wanakana.bind(textInput);
van.add(document.body, MainPanel(question, textInput));

const shaker = new Shaker(document.getElementById("inputContainer"), 100, 500);

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
const LEVEL_NAMES = ["n5", "n4", "n3", "n2", "n1"];

async function loadDB()
{
    //const posNames = ["nouns", "verbs", "adjectives", "others"];
    const posNames = ["verbs"];
    for (let level of LEVEL_NAMES) {
        for (let pos of posNames) {
            const dbFile = "./" + level + "_" + pos + "_db2.json";
            console.log("loading:" + dbFile);
            fetch(dbFile)
                .then(response => response.json())
                .then(data => {LEVELS[level][pos] = data; setQuestion();})
                .catch(error => console.error('Error fetching JSON:', error));
        }
    }

    return true;
}

await loadDB();




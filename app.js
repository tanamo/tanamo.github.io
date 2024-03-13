
let CURRENT_DICTIONARY = [];

const N5_INDEX = 0;
const N4_INDEX = 1;
const N3_INDEX = 2;
const N2_INDEX = 3;
const N1_INDEX = 4;

const NOUNS_INDEX = 0;
const VERBS_INDEX = 1;
const ADJECTIVES_INDEX = 2;
const OTHERS_INDEX = 3;

const GREEN = 0x669966;
const RED = 0xcc6666;
const BG = 0xf6f1e8;

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

const levelNames = ["n5", "n4", "n3", "n2", "n1"];
const posNames = ["nouns", "verbs", "adjectives", "others"];
for (let level of levelNames) {
    for (let pos of posNames) {
        const dbFile = "./" + level + "_" + pos + "_db2.json";
        console.log("loading:" + dbFile);
        fetch(dbFile)
            .then(response => response.json())
            .then(data => LEVELS[level][pos] = data)
            .catch(error => console.error('Error fetching JSON:', error));
    }
}

await PIXI.Assets.load("NotoSansJP-VariableFont_wght.ttf");

const ANSWER_TEXT_STYLE = new PIXI.TextStyle({
    fontFamily: 'Noto Sans JP Thin',
    fontSize: 20,
    fill: 0,
    align: 'center',
    wordWrap: true,
    wordWrapWidth: 280,
});

const QUESTION_TEXT_STYLE = new PIXI.TextStyle({
    fontFamily: 'Noto Sans JP Thin',
    fontSize: 22,
    fill: 0,
    align: 'center',
    wordWrap: true,
    wordWrapWidth: 280,
});

const APP_WIDTH = 350;
const APP_HEIGHT = 600;
const questionRectWidth = APP_WIDTH - 10;
const questionRectHeight = 145;
const questionRectFullHeight = APP_HEIGHT - 55;
const answerRectWidth = APP_WIDTH - 10;
const answerRectHeight = 75;

let NIHONGO_ANSWER = true;
let SHOW_ROMAJI = false;
let SCORE = 0;
let BEST_SCORE = 0;
let ANSWER_INDEX = -1;
let CURRENT_ANSWER_INDEXES = [];

function createKanjiKanaText(index)
{
    let text = "";
    let entry = CURRENT_DICTIONARY[index];
    for (let [index, val] of entry["kanji"].entries()) {
        if (index > 0)
            text += ", ";    
        text += val;
        if (index == 1)
            break;
    }
    if (entry["kanji"].length > 0)
        text += "\n";
    let kanaText = "";
    for (let [index, val] of entry["kana"].entries()) { 
        if (index > 0)
            text += ", ";   
        text += val;
        if (SHOW_ROMAJI) {
            if (index > 0)
                kanaText += ", ";   
            kanaText += wanakana.toRomaji(val);
        }
        if (index == 0)
            break;
    }
    if (SHOW_ROMAJI) {
        text += "\n";
        text += kanaText;
    }
    return text;
}

function getEnglishText(index)
{
    let texts = [];
    let pos = [];
    let entry = CURRENT_DICTIONARY[index];
    for (let se of entry["sense"]) {

        for (let p of se["partOfSpeech"]) { 
            pos.push(p);
        }

        const gloss = se["gloss"];
        for (let en of gloss) { 
            texts.push(en);
        }
    }

    return [pos, texts];
}


class OnOffButton {

    constructor()
    {
        this.m_on = false;
        this.m_rect  = new PIXI.Graphics()
            .roundRect(0, 0, this.width, 30, 20)
            .fill(RED)
            .stroke(1, 0x000000);
        this.m_rect.eventMode = "static";
        this.m_rect.on('pointerdown', function (e) {
            if (this.m_enable)
                this.on = !this.on;
        }.bind(this));

        this.m_green  = new PIXI.Graphics()
            .roundRect(0, 0, this.width, 30, 20)
            .fill(GREEN)
            .stroke(1, 0x000000);

        const s = 5;
        this.m_switch = new PIXI.Graphics()
            .roundRect(s, s, 30-s*2, 30-s*2, 20)
            .fill(0xfafafa)
            .stroke(1, 0x000000);

        this.m_rect.addChild(this.m_green);
        this.m_rect.addChild(this.m_switch);

        this.on = false;
        this.m_enable = true;
    }

    set on(value)
    {
        this.m_on = value;
        if (this.m_on)
            this.m_switch.x = 0;
        else
            this.m_switch.x = this.width - 30;
        this.m_green.visible = this.m_on;
    }

    get on()
    {
        return this.m_on;
    }

    set x(value)
    {
        this.m_rect.x = Math.floor(value);
    }

    set y(value)
    {
        this.m_rect.y = Math.floor(value);
    }

    get width()
    {
        return 60;
    }

    get height()
    {
        return 30;
    }
}


class Settings {

    constructor()
    {
        const SETTINGS_WIDTH = APP_WIDTH-10;
        const SETTINGS_HEIGHT = APP_HEIGHT-10;
        
        this.m_rect = new PIXI.Graphics()
            .roundRect(0, 0, SETTINGS_WIDTH, SETTINGS_HEIGHT, 10)
            .fill(0xf0f0f0)
            .stroke(1, 0x000000);
        this.m_rect.alpha = 0.95;
        this.m_rect.visible = true;
        this.m_rect.eventMode = "static";
        this.m_rect.on('pointerdown', function (e) {
        }.bind(this));

        let titleLbl = new PIXI.Text("Settings", ANSWER_TEXT_STYLE);
        const lblTm = PIXI.CanvasTextMetrics.measureText(titleLbl.text, ANSWER_TEXT_STYLE);
        titleLbl.x = 10;
        titleLbl.y = 10;
        this.m_rect.addChild(titleLbl);

        const closeBtnSize = 30;
        const closeBtnMargin = 5;
        let closeBtn = new PIXI.Graphics()
            .rect(0,0,closeBtnSize,closeBtnSize)
            .fill(0xf0f0f0)
            .moveTo(closeBtnMargin,closeBtnMargin)
            .lineTo(closeBtnSize-closeBtnMargin,closeBtnSize-closeBtnMargin)
            .stroke(1, 0x000000)
            .moveTo(closeBtnSize-closeBtnMargin,closeBtnMargin)
            .lineTo(closeBtnMargin,closeBtnSize-closeBtnMargin)
            .stroke(1, 0x000000);
        closeBtn.x = SETTINGS_WIDTH - closeBtnSize - 5;
        closeBtn.y = 5;
        closeBtn.eventMode = "static";
        closeBtn.on('pointerdown', function (e) {

            let filterOk = false;
            for (let f of this.m_filterBtns) {
                if (f.on) {
                    filterOk = true;
                    break;
                }
            }

            let levelOk = false;
            for (let f of this.m_levelBtns) {
                if (f.on) {
                    levelOk = true;
                    break;
                }
            }

            if (filterOk && levelOk) {
                SHOW_ROMAJI = this.showRomaji;
                NIHONGO_ANSWER = !this.englishAnswers;
                this.visible = false;
            }
        }.bind(this));

        this.m_rect.addChild(closeBtn);

        const filterText = ["Verbs", "Nouns", "Adjectives", "Others"];

        let lastY = 0;
        this.m_filterBtns = [];
        for (const [index, val] of filterText.entries() ) {
            let lbl = new PIXI.Text(val, ANSWER_TEXT_STYLE);
            const lblTm = PIXI.CanvasTextMetrics.measureText(lbl.text, ANSWER_TEXT_STYLE);
            lbl.x = Math.floor(SETTINGS_WIDTH/2 - lblTm.width);
            lbl.y = Math.floor(50 + index*40);

            let btn = new OnOffButton();
            btn.x = SETTINGS_WIDTH/2 + btn.width/2;
            btn.y =  lbl.y;

            this.m_filterBtns.push(btn);

            this.m_rect.addChild(btn.m_rect);
            this.m_rect.addChild(lbl);

            lastY = lbl.y;
        }

        let line = new PIXI.Graphics()
            .moveTo(30,lastY + 50)
            .lineTo(SETTINGS_WIDTH-30,lastY + 50)
            .stroke(1, 0x000000);

        this.m_rect.addChild(line);

        const levelText = ["N5", "N4", "N3", "N2", "N1"];
        this.m_levelBtns = [];

        let startY = lastY + 70;
        for (const [index, val] of levelText.entries() ) {
            let lbl = new PIXI.Text(val, ANSWER_TEXT_STYLE);
            const lblTm = PIXI.CanvasTextMetrics.measureText(lbl.text, ANSWER_TEXT_STYLE);
            lbl.x = Math.floor(SETTINGS_WIDTH/2 - lblTm.width);
            lbl.y = Math.floor(startY + index*40);

            let btn = new OnOffButton();
            btn.x = SETTINGS_WIDTH/2 + btn.width/2;
            btn.y =  lbl.y;

            this.m_levelBtns.push(btn);

            this.m_rect.addChild(btn.m_rect);
            this.m_rect.addChild(lbl);

            lastY = lbl.y;
        }
        
        app.stage.addChild(this.m_rect);
        let line2 = new PIXI.Graphics()
            .moveTo(30,lastY + 50)
            .lineTo(SETTINGS_WIDTH-30,lastY + 50)
            .stroke(1, 0x000000);

        this.m_rect.addChild(line2);

        const miscText = ["Show Romaji", "English answers"];
        this.m_miscBtns = [];

        startY = lastY + 70;
        for (const [index, val] of miscText.entries() ) {
            let lbl = new PIXI.Text(val, ANSWER_TEXT_STYLE);
            const lblTm = PIXI.CanvasTextMetrics.measureText(lbl.text, ANSWER_TEXT_STYLE);
            lbl.x = Math.floor(SETTINGS_WIDTH/2 - lblTm.width);
            lbl.y = Math.floor(startY + index*40);

            let btn = new OnOffButton();
            btn.x = SETTINGS_WIDTH/2 + btn.width/2;
            btn.y =  lbl.y;

            this.m_miscBtns.push(btn);

            this.m_rect.addChild(btn.m_rect);
            this.m_rect.addChild(lbl);
        }

        this.m_filterBtns[0].on = true;
        this.m_levelBtns[0].on = true;
        this.m_miscBtns[0].on = SHOW_ROMAJI;
        this.m_miscBtns[1].on = !NIHONGO_ANSWER;
    }

    levelEnabled(index)
    {
        return this.m_levelBtns[index].on;
    }

    get verbsEnabled()
    {
        return this.m_filterBtns[0].on;
    }

    get nounsEnabled()
    {
        return this.m_filterBtns[1].on;
    }

    get adjectivesEnabled()
    {
        return this.m_filterBtns[2].on;
    }

    get othersEnabled()
    {
        return this.m_filterBtns[3].on;
    }

    get showRomaji()
    {
        return this.m_miscBtns[0].on;
    }

    get englishAnswers()
    {
        return this.m_miscBtns[1].on;
    }

    set visible(value)
    {
        this.m_rect.visible = value;
    }

    set x(value)
    {
        this.m_rect.x = Math.floor(value);
    }

    set y(value)
    {
        this.m_rect.y = Math.floor(value);
    }
}

class Question {

    constructor()
    {
        
        this.m_text = new PIXI.Text("", QUESTION_TEXT_STYLE);
        this.m_rect  = new PIXI.Graphics()
            .roundRect(0, 0, questionRectWidth, questionRectHeight, 10)
            .fill(BG)
            .stroke(1, 0x000000);
        this.m_rect.eventMode = "static";
        this.m_rect.on('pointerdown', function (e) {
            
            if (this.m_shortText == "")
                return;
            this.setFullscreen(true);
            
        }.bind(this));

        this.m_fullRect = new PIXI.Graphics()
            .roundRect(0, 0, questionRectWidth, questionRectFullHeight, 10)
            .fill(BG)
            .stroke(1, 0x000000);
        this.m_fullRect.alpha = 0.95;
        this.m_fullRect.x = this.m_rect.x;
        this.m_fullRect.y = this.m_rect.y;
        this.m_fullRect.visible = false;
        this.m_fullRect.eventMode = "static";
        this.m_fullRect.on('pointerdown', function (e) {
            this.setFullscreen(false);
        }.bind(this));

        app.stage.addChild(this.m_fullRect);
        app.stage.addChild(this.m_rect);
        app.stage.addChild(this.m_text);
        
        this.m_fullText ="";
        this.m_shortText ="";
        this.m_showFull = false;

        this.m_icon = new PIXI.Graphics()
            .circle(questionRectWidth-15,questionRectHeight-15,3)
            .fill(0xffff66)
            .stroke(1, 0x000000);

        this.m_rect.addChild(this.m_icon);
    }

    setFullscreen(fs)
    {
        this.m_showFull = fs;
        if (fs)
        {
            this.m_rect.visible = false;
            this.m_fullRect.visible = true;
            this.setText(this.m_fullText);
        }
        else
        {
            this.m_rect.visible = true;
            this.m_fullRect.visible = false;
            this.setText(this.m_shortText);
        }
    }

    setQuestion(index)
    {
        this.m_fullText ="";
        this.m_shortText ="";
        this.m_text.text = "";
        this.m_showFull = false;
        if (!NIHONGO_ANSWER) {
            this.setText(createKanjiKanaText(index));
            this.m_icon.visible = false;
        } else {
            const enList = getEnglishText(index);
            const pos = enList[0];
            const gloss = enList[1];
            let stopAdding = false;

            for (const [index, val] of gloss.entries()) {

                if (!stopAdding) {
                    let st = this.m_shortText;
                    if (index > 0)
                        st += ", ";
                    st += val;

                    const stTextMetrics = PIXI.CanvasTextMetrics.measureText(st, QUESTION_TEXT_STYLE);
                    if (stTextMetrics.height <= questionRectHeight - 20)
                        this.m_shortText = st;
                    else
                        stopAdding = true;
                }

                let ft = this.m_fullText;
                if (index > 0)
                    ft += ", ";
                ft += val;

                const ftTextMetrics = PIXI.CanvasTextMetrics.measureText(ft, QUESTION_TEXT_STYLE);
                if (ftTextMetrics.height < questionRectFullHeight)
                    this.m_fullText = ft;
                else
                    break;
            }

            this.setText(this.m_shortText);
            if (this.m_shortText == this.m_fullText) {
                this.m_shortText = "";
            }

            this.m_icon.visible = this.m_shortText != "";
        }
    }

    setText(text)
    {
        this.m_text.text = text;
        const textMetrics = PIXI.CanvasTextMetrics.measureText(this.m_text.text, QUESTION_TEXT_STYLE);

        const height = this.m_showFull ? questionRectFullHeight : questionRectHeight;

        this.m_text.position.x = Math.floor(APP_WIDTH/2 - textMetrics.width/2);
        this.m_text.position.y = Math.floor(this.m_rect.y + height/2 - textMetrics.height/2);   
    }

    
    set x(value)
    {
        this.m_rect.x = Math.floor(value);
        this.m_fullRect.x = this.m_rect.x;
    }

    set y(value)
    {
        this.m_rect.y = Math.floor(value);
        this.m_fullRect.y = this.m_rect.y;
    }

    get bottom()
    {
        return this.m_rect.y + questionRectHeight;
    }
}



class Button {

    constructor()
    {
        this.m_text = new PIXI.Text("", ANSWER_TEXT_STYLE);
        this.m_rect = new PIXI.Graphics()
            .roundRect(0, 0, answerRectWidth, answerRectHeight, 10)
            .fill(0xfafafa)
            .stroke(1, 0x000000);
        this.m_rect.eventMode = "static";
        this.m_rect.x = APP_WIDTH/2 - answerRectWidth/2;
        this.m_rect.y = APP_HEIGHT/2 - answerRectHeight/2;
        this.m_rect.on('pointerdown', function (e) {
            if (!this.m_enableClick)
                return;
        
            if (this.m_answer) {
                SCORE += 1;
                showCorrect(this.m_index);
                readyNextQuestion(500);
            } else {
                if (SCORE > BEST_SCORE)
                    BEST_SCORE = SCORE;
                SCORE = 0;
                showCorrect(this.m_index);
                readyNextQuestion(2000);
            }
        }.bind(this));
        
        app.stage.addChild(this.m_rect);
        
        this.m_index = 0;
        this.m_answer = false;
        this.m_enableClick = false;
        this.m_green = new PIXI.Graphics()
            .roundRect(0, 0, answerRectWidth, answerRectHeight, 10)
            .fill(GREEN);
        this.m_green.visible = false;
        this.m_rect.addChild(this.m_green);

        this.m_red = new PIXI.Graphics()
            .roundRect(0, 0, answerRectWidth, answerRectHeight, 10)
            .fill(RED);
        this.m_red.visible = false;
        this.m_rect.addChild(this.m_red);
        this.m_rect.addChild(this.m_text);
    }

    showCorrect(clickedIndex)
    {
        if (!this.m_answer)
        {
            if (clickedIndex == this.m_index)
                this.m_red.visible = true;
            else
                this.setText("---");
        }
        else
        {
            this.m_green.visible = true;    
        }
    }

    setAnswer(index, answerIndex)
    {
        this.m_green.visible = false;
        this.m_red.visible = false;
        this.m_text.text = "";
        this.m_answer = answerIndex == index;
        if (NIHONGO_ANSWER) {
            this.setText(createKanjiKanaText(index));
        } else {
            const enList = getEnglishText(index);
            const pos = enList[0];
            const gloss = enList[1];
            let stopAdding = false;
            let text = "";
            for (const [index, val] of gloss.entries()) {

                if (!stopAdding) {
                    let st = text;
                    if (index > 0)
                        st += ", ";
                    st += val;

                    const stTextMetrics = PIXI.CanvasTextMetrics.measureText(st, ANSWER_TEXT_STYLE);
                    if (stTextMetrics.height <= answerRectHeight)
                        text = st;
                    else if (text == "") {
                        text = st;
                        break;
                    } else
                        break;
                }
            }

            this.setText(text);
        }
    }

    setText(text)
    {
        this.m_text.text = text;
        const textMetrics = PIXI.CanvasTextMetrics.measureText(this.m_text.text, ANSWER_TEXT_STYLE);
        this.m_text.position.x = Math.floor(answerRectWidth/2 - textMetrics.width/2);
        this.m_text.position.y = Math.floor(answerRectHeight/2- textMetrics.height/2);
    }

    set x(value)
    {
        this.m_rect.x = Math.floor(value);
    }

    set y(value)
    {
        this.m_rect.y = Math.floor(value);
    }

    get height()
    {
        return answerRectHeight;
    }

    get width()
    {
        return answerRectWidth;
    }

    get bottom()
    {
        return this.m_rect.y + answerRectHeight;
    }
}

function readyNextQuestion(timeout)
{
    btn0.m_enableClick = false;
    btn1.m_enableClick = false;
    btn2.m_enableClick = false;
    btn3.m_enableClick = false;
    btn4.m_enableClick = false;

    scoreText.text = SCORE + "";
    hiScoreText.text = "best: " + BEST_SCORE;
    const htm = PIXI.CanvasTextMetrics.measureText(hiScoreText.text, ANSWER_TEXT_STYLE);
    hiScoreText.x = APP_WIDTH/2 - htm.width/2;

    setTimeout(
        function()
        {
            nextQuestion();
        },
        timeout
    );
}

function showCorrect(clickedIndex)
{
    btn0.showCorrect(clickedIndex);
    btn1.showCorrect(clickedIndex);
    btn2.showCorrect(clickedIndex);
    btn3.showCorrect(clickedIndex);
    btn4.showCorrect(clickedIndex);
}

function shuffleArray(array) 
{
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}


function nextIndex(indexes)
{
    const wordCount = CURRENT_DICTIONARY.length;
    let res = Math.floor(Math.random()*wordCount);
    
    let ok = false;
    while(!ok) {
        ok = true;
        res = Math.floor(Math.random()*wordCount);
        for (let i of indexes) {
            if (i == res)  {
                ok = false;
                break;
            }

            const resEntry = CURRENT_DICTIONARY[res];
            const curEntry = CURRENT_DICTIONARY[i];

            for (let a of resEntry["sense"]) {
                for (let b of curEntry["sense"]) {
                    const glossA = a["gloss"];
                    const glossB = b["gloss"];
                    for (let enA of glossA) { 

                        for (let enB of glossB) {
                            if (enA == enB) {
                                ok = false;
                                break;
                            } 
                        }
                    }
                }
            }
        }
    }

    return res;
}

function nextQuestion()
{
    let dicArray = [];
    for (const [index, val] of levelNames.entries()) {
        if (settings.levelEnabled(index)) {
            if (settings.verbsEnabled)
                dicArray.push(LEVELS[val]["verbs"]);
            if (settings.nounsEnabled)
                dicArray.push(LEVELS[val]["nouns"]);
            if (settings.adjectivesEnabled)
                dicArray.push(LEVELS[val]["adjectives"]);
            if (settings.othersEnabled)
                dicArray.push(LEVELS[val]["others"]);
        }
    }

    const dicIndex = Math.floor(Math.random()*dicArray.length);
    CURRENT_DICTIONARY = dicArray[dicIndex];
    const wordCount = CURRENT_DICTIONARY.length;

    if (CURRENT_ANSWER_INDEXES.length >= 20) {
        CURRENT_ANSWER_INDEXES.splice(0, 5);
    }
    else if (CURRENT_ANSWER_INDEXES.length >= wordCount/3) {
        CURRENT_ANSWER_INDEXES = [];
        CURRENT_ANSWER_INDEXES.push(ANSWER_INDEX);
    }

    let temp = [];
    for (let i of CURRENT_ANSWER_INDEXES) {
        if (i < wordCount) {
            temp.push(i);
        }
    }
    CURRENT_ANSWER_INDEXES = temp;
    
    let a = 0;
    let b = 0;
    let c = 0;
    let d = 0;

    ANSWER_INDEX = nextIndex(CURRENT_ANSWER_INDEXES);
    question.setQuestion(ANSWER_INDEX);
    CURRENT_ANSWER_INDEXES.push(ANSWER_INDEX);
    
    a = nextIndex(CURRENT_ANSWER_INDEXES);
    CURRENT_ANSWER_INDEXES.push(a);

    b = nextIndex(CURRENT_ANSWER_INDEXES);
    CURRENT_ANSWER_INDEXES.push(b);

    c = nextIndex(CURRENT_ANSWER_INDEXES);
    CURRENT_ANSWER_INDEXES.push(c);

    d = nextIndex(CURRENT_ANSWER_INDEXES);
    CURRENT_ANSWER_INDEXES.push(d);

    let answers = [ANSWER_INDEX,a,b,c,d];
    shuffleArray(answers);

    btn0.setAnswer(answers[0], ANSWER_INDEX);
    btn1.setAnswer(answers[1], ANSWER_INDEX);
    btn2.setAnswer(answers[2], ANSWER_INDEX);
    btn3.setAnswer(answers[3], ANSWER_INDEX);
    btn4.setAnswer(answers[4], ANSWER_INDEX);

    btn0.m_enableClick = true;
    btn1.m_enableClick = true;
    btn2.m_enableClick = true;
    btn3.m_enableClick = true;
    btn4.m_enableClick = true;
}

////////////////////////////////

const app = new PIXI.Application();
app.init({ width: APP_WIDTH, height: APP_HEIGHT, background: 0xfafafa, antialias: true })
    .then(()=>
    {
        app.canvas.setAttribute("id", "gamecanvas");
        let gameCanvasContainer = document.getElementById("gamecanvas_container");
        gameCanvasContainer.appendChild(app.canvas);
        nextQuestion();
    });

let btn0 = new Button();
btn0.m_index = 0;
let btn1 = new Button();
btn1.m_index = 1;
let btn2 = new Button();
btn2.m_index = 2;
let btn3 = new Button();
btn3.m_index = 3;
let btn4 = new Button();
btn4.m_index = 4;

let question = new Question();
question.x = Math.floor(APP_WIDTH/2 - questionRectWidth/2);
question.y = 50;

let topPanel = new PIXI.Graphics()
    .roundRect(0,0,APP_WIDTH-10,40, 10)
    .fill(0xfafafa)
    .stroke(1, 0x000000);
topPanel.x = 5;
topPanel.y = 5;
app.stage.addChild(topPanel);

const iconR = 3;
let settingsIcon = new PIXI.Graphics()
    .rect(0,0,30,30)
    .fill(0xfafafa)
    .circle(30/2-iconR/2-iconR*3,15,iconR)
    .circle(30/2-iconR/2,15,iconR)
    .circle(30/2-iconR/2+iconR*3,15,iconR)
    .fill(0xfafafa)
    .stroke(1, 0x000000);
    
settingsIcon.eventMode = "static";
settingsIcon.on('pointerdown', function (e) {
    settings.visible = true;
});
settingsIcon.x = APP_WIDTH - 40;
settingsIcon.y = 10;

app.stage.addChild(settingsIcon);

let scoreText = new PIXI.Text("0", ANSWER_TEXT_STYLE);
scoreText.x = 20;
scoreText.y = 12;
app.stage.addChild(scoreText);

let hiScoreText = new PIXI.Text("best: 0", ANSWER_TEXT_STYLE);
const htm = PIXI.CanvasTextMetrics.measureText(hiScoreText.text, ANSWER_TEXT_STYLE);
hiScoreText.x = Math.floor(APP_WIDTH/2 - htm.width/2);
hiScoreText.y = 12;
app.stage.addChild(hiScoreText);

let settings = new Settings();
settings.x = 5;
settings.y = 5;
settings.visible = false;

const buttonX = APP_WIDTH/2 - btn0.width/2;
const startY = question.bottom + 5;
const buttonSpace = 5;

btn0.x = buttonX;
btn0.y = startY;

btn1.x = buttonX;
btn1.y = btn0.bottom + buttonSpace;

btn2.x = buttonX;
btn2.y = btn1.bottom + buttonSpace;

btn3.x = buttonX;
btn3.y = btn2.bottom + buttonSpace;

btn4.x = buttonX;
btn4.y = btn3.bottom + buttonSpace;



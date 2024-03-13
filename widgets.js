
import van from "./van-1.5.3.js"

const {a, div, li, p, ul, input, ruby, rt, form, span, hr} = van.tags;
const {svg, line} = van.tags("http://www.w3.org/2000/svg");

export class Shaker {
    constructor(dom, intervalMS, timeoutMS)
    {
        this.dom = dom;
        this.intervalMS = intervalMS;
        this.shakeCount = 0;
        this.timeoutMS = timeoutMS;
        this.intervalId = null;
        this.shakeLeft = true;
        this.running = false;
        this.caretColor = null;
    }

    start()
    {
        if (!this.active) {
            this.shakeCount = 0;
            this.shakeLeft = true;
            this.running = true;
            this.dom.style.transition = (this.intervalMS - 20) + "ms";

            this.caretColor = this.dom.style.caretColor;
            this.intervalId = setInterval(
                function()
                {
                    this.animate();
                }.bind(this),
                this.intervalMS
            );
        }
    }
 
    get active()
    {
        return this.running;
    }

    animate()
    {
        if (this.timeoutMS > this.shakeCount * this.intervalMS) {
            if (this.shakeLeft)
                this.dom.style.transform = "translate(-5px)";
            else
                this.dom.style.transform = "translate(5px)";
            this.dom.style.caretColor = "#00000000";
            this.shakeLeft = !this.shakeLeft;
            this.shakeCount += 1;
            
        } else {
            this.dom.style.transform = "translate(0px)";
            this.dom.style.zIndex = "1";
            this.dom.style.cursor = "auto";
            this.dom.style.caretColor = this.caretColor;
            
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.running = false;
        }
    }
}

export const Switch = (label, toggleFunc, initValue = false) =>  {
    let checked = van.state(initValue);
    let pos = van.state(initValue ? 32 : 2);
    let color = van.state(initValue? "#81b29a" : "#e07a5f");
    let shaker = null;
    return div(
        {
            style: ()=>
                `
                display: inline-block;
                position: relative;
                background-color: ${color.val};
                border-radius: 34px;
                width: 60px;
                height: 30px;
                `,
            onclick: () => 
            {
                checked.val = !checked.val;
                
                if (toggleFunc) {
                    let oldVal = checked.val;
                    checked.val = toggleFunc(checked.val);
                    if (oldVal != checked.val) {
                        if (shaker == null)
                            shaker = new Shaker(document.getElementById(label), 100, 300);
                        shaker.start();
                    }
                }

                if (checked.val) {
                    pos.val = 32;
                    color.val = "#81b29a";
                } else {
                    pos.val = 2;
                    color.val = "#e07a5f";
                }
            },
            id: label
        },
        div(
            {
                style: ()=>
                    `
                    position: absolute;
                    cursor: pointer;
                    background-color: #f4f1de;
                    border-radius: 35px;
                    height: 26px;
                    width: 26px;
                    top: 2px;
                    left: ${pos.val}px;
                    transition: 0.3s;
                    `
            }
        )
    );
}

export const Option = (label, toggleFunc, initValue) => {
    return div(
        {
            style: () =>
                `
                margin-left: 20px;
                margin-top: 8px;
                display: flex;
                flex-direction: row;
                `
        },
        div(
            { 
                style : () =>
                    `
                    color: #000000;
                    width: 200px;
                    font-family: noto;
                    font-size: 16px;
                    margin-right: 20px;
                    text-align:left;
                    margin-top: 5px;
                    `
            },
            label
        ),
        Switch(label, toggleFunc, initValue),
    );
}

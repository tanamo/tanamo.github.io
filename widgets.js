
import van from "./van-1.5.3.js"

const {a, div, li, p, ul, input, ruby, rt, form, span, hr} = van.tags;
const {svg, line} = van.tags("http://www.w3.org/2000/svg");

let DOMLIST = new Set();

export function shake(dom, intervalMS, timeoutMS)
{
    if (DOMLIST.has(dom))
        return;
    DOMLIST.add(dom);

    const tempColor = "#00000000";
 
    let shakeCount = 0;
    let shakeLeft = true;
    let caretColor = dom.style.caretColor;
    let intervalId;

    dom.style.transition = (Math.max(intervalMS-1, 10)) + "ms";
    
    const animate = () =>
    {
        if (timeoutMS > shakeCount * intervalMS) {
            if (shakeLeft)
                dom.style.transform = "translate(-5px)";
            else
                dom.style.transform = "translate(5px)";
            dom.style.caretColor = tempColor;
            shakeLeft = !shakeLeft;
            shakeCount += 1;
        } else {
            dom.style.transform = "";
            dom.style.cursor = "auto";
            dom.style.caretColor = caretColor;
            clearInterval(intervalId);
            DOMLIST.delete(dom);
        }
    }
    
    intervalId = setInterval(
        animate,
        intervalMS
    );
}

export const Switch = (label, toggleFunc, initValue = false) =>  {
    let checked = van.state(initValue);
    return div(
        {
            style: ()=>
                `
                display: inline-block;
                position: relative;
                background-color: ${checked.val ? " #81b29a" : " #e07a5f"};
                border-radius: 34px;
                width: 60px;
                height: 30px;
                `,
            onclick: () => 
            {
                checked.val = !checked.val;
                
                if (toggleFunc) {
                    const oldVal = checked.val;
                    checked.val = toggleFunc(checked.val);
                    if (oldVal != checked.val) {
                        shake(document.getElementById(label), 100, 500);
                    }
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
                    left: ${checked.val ? 32 : 2}px;
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

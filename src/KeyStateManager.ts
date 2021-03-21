import { exec } from "child_process";
import path from "path";
import fs from "fs";

enum KeyAction
{
    RELEASE = 1, 
    PRESS
};

class KeyStateManager 
{
    //#region Keys
    private ALT: boolean = false;
    private C: boolean = false;
    private S: boolean = false;
    private L: boolean = false;
    //#endregion

    //#region Commands
    private ALT_S: boolean = false;
    //#endregion

    private imgOutput: string;

    constructor(imgOutput: string)
    {
        if (!fs.lstatSync(imgOutput).isDirectory())
        {
            fs.mkdirSync(imgOutput);
        }

        this.imgOutput = imgOutput;
    }

    private formatInput(data: Buffer)
    {
        const str = data.toString("utf-8");

        const keyPress   = new RegExp(/^KeyPress\sevent/);
        const keyRelease = new RegExp(/^KeyRelease\sevent/);
        const keySym     = new RegExp(/\(keysym\s.*\)/);

        let res = str.split('\n')
                     .filter(v => keyPress.test(v) || keyRelease.test(v) || keySym.test(v))
                     .map(v => v.trim());

        if (!res || res.length <= 0)
        {
            return;
        }

        const keyArr = keySym.exec(res[1]);

        if (!keyArr)
        {
            return;
        }

        const key = keyArr[0].split(", ")[1]
                             .replace(')', '')
                             .trim()
                             .toUpperCase();

        const keyAction = res.length == 4 ? KeyAction.PRESS : KeyAction.RELEASE;

        return { key, keyAction };
    }

    private keyPressed(key: string)
    {
        switch (key)
        {
            case "C":
                {
                    if (this.C)
                    {
                        break;
                    }

                    this.C = true;

                    break;
                }
            case "S":
                {
                    if (this.S)
                    {
                        break;
                    }

                    this.S = true;
                    
                    break;
                }
            case "L":
                {
                    if (this.L)
                    {
                        break;
                    }

                    this.L = true;
                    
                    break;
                }
            case "ALT_L":
                {
                    if (this.ALT)
                    {
                        break;
                    }

                    this.ALT = true;

                    break;
                }
            default:
                {
                    break;
                }
        }
    }

    private keyReleased(key: string)
    {
        switch (key)
        {
            case "C":
                {
                    if (!this.C)
                    {
                        break;
                    }

                    this.C = false;

                    break;
                }
            case "S":
                {
                    if (!this.S)
                    {
                        break;
                    }

                    this.S = false;
                    
                    break;
                }
            case "L":
                {
                    if (!this.L)
                    {
                        break;
                    }

                    this.L = false;
                    
                    break;
                }
            case "ALT_L":
                {
                    if (!this.ALT)
                    {
                        break;
                    }

                    this.ALT = false;

                    break;
                }
            default:
                {
                    break;
                }
        }
    }

    private processCommands()
    {
        if(this.ALT && this.S && !this.ALT_S)
        {
            this.ALT_S = true;

            const screenshotCmd = "gnome-screenshot -a -c";

            exec(screenshotCmd, (err, stdout, stderr) => 
            {
                if (err)
                {
                    console.error(`SCREENSHOT FAILED: ${stderr}`, err);

                    this.ALT_S = false;

                    return;
                }

                const fileName = `${Date.now().valueOf()}.png`;

                const saveCmd = `xclip -sel c -t image/png -o > ${path.join(this.imgOutput, fileName)}`;

                exec(saveCmd, (err, stdout, stderr) => 
                {
                    if (err) 
                    {
                        console.error(`FAILED TO SAVE IMAGE: ${stderr}`, err);

                        this.ALT_S = false;

                        return;
                    }

                    console.log(`SAVED FILE: ${fileName}`);

                    this.ALT_S = false;
                });
            });
        }
    }

    public receivedData(data: Buffer)
    {
        const formatedData = this.formatInput(data);

        if (!formatedData)
        {
            return;
        }

        const { key, keyAction } = formatedData;

        if (keyAction === KeyAction.PRESS)
        {   
            this.keyPressed(key);
        }
        else if (keyAction === KeyAction.RELEASE)
        {
            this.keyReleased(key);
        }

        this.processCommands();
    }
}

export default KeyStateManager;
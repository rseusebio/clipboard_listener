import { exec, spawn } from "child_process";
import { stderr } from "process";
import { questionInt } from "readline-sync";
import util from "util";

const execAsync = util.promisify(exec);

const keyboardListener = (id: string) =>
{
    const xev = spawn("/usr/bin/xev", ["-id", id, "-event", "keyboard"]);

    const obj = {
        ALT: 0, 
        C: 0
    }

    const stdoutFunc = (data: Buffer) =>
    {
        const str = data.toString("utf-8");

        const keyPress   = new RegExp(/^KeyPress\sevent/);
        const keyRelease = new RegExp(/^KeyRelease\sevent/);
        const keySym     = new RegExp(/\(keysym\s.*\)/);

        let res = str.split('\n')
                     .filter(v => keyPress.test(v) || keyRelease.test(v) || keySym.test(v))
                     .map(v => v.trim());

        if(!res || res.length <= 0)
        {
            return;
        }

        const keyArr = keySym.exec(res[1]);

        if(!keyArr)
        {
            return;
        }

        const key = keyArr[0].split(", ")[1].replace(')', '').trim();

        if(res.length == 4)
        {
            // Key was pressed
            // console.info("Pressed: ", key);

            if(key == "c" && obj.C == 0)
            {
                obj.C += 1
            }
            else if(key == "Alt_L" && obj.ALT == 0)
            {
                obj.ALT += 1
            }

            if( obj.ALT == 1 && obj.C == 1)
            {
                console.info("clipboard");

                exec("xclip -sel p -o", 
                     (err, stdout, stderr) => 
                     {
                        if(stderr)
                        {
                            // should pop up something for the user;
                            console.info("clipboard failed", stderr);
                            console.info(err);
                            return;
                        }

                        console.info("retrieved from clipboard: ", stdout);

                     });
            }
        }
        else if(res.length == 2 )
        {
            // Key was released
            // console.info("Released: ", key);

            if(key == "c")
            {
                obj.C -= 1
            }
            else if(key == "Alt_L")
            {
                obj.ALT -= 1
            }

        }
    }

    xev.stdout.on('data', stdoutFunc);

    xev.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
    });

    xev.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
    });

    xev.on("exit", (code, signal) =>{
        console.info( "child process has desconnected: ", code, signal);
    });
}

const listOpenedWindows = async () => 
{
    const {stdout, stderr } = await execAsync("/usr/bin/wmctrl -l");

    if(stderr)
    {
        console.info("Failed to list opened windows");
        console.info(stderr);
        return null
    }

    if(!stdout)
    {
        return "";
    }

    let result: Array<string[]> = stdout.split("\n")
                                        .filter( s => !!s )
                                        .map( s => 
                                              { 
                                                let arr = s.split(" ");        
                                                //#region leave only name and id
                                                    arr.reverse();
                                                    let id = arr.pop();
                                                    for(let i = 0; i < 3; i++)
                                                    {
                                                        arr.pop();
                                                    }
                                                    arr.reverse();
                                                //#endregion      
                                                return [ id, arr.join(" ") ];
                                              }
                                            )
                                        .filter( v => !!v[1] );     
    return result;
}

const run = async () => 
{
    let windows = await listOpenedWindows();

    if( windows == null || !windows )
    {
        console.info("Exiting...");
        return;
    }

    console.info("Select a window (input the number):\n");

    let count = 1;

    for(let window of (windows as Array<string[]>))
    {
        const[ id, name ] = window;

        console.info(`${count++} - ${name}`);
    }

    let windowIndex = -1;

    do
    {
        windowIndex = questionInt("> ");
        if(windowIndex >= 1 && windowIndex <= windows.length)
        {
            break;
        }
        else
        {
            console.info("Out of range");
        }
    }
    while(true);

    const [ id ] = (windows[windowIndex - 1] as string[]);

    keyboardListener(id);
    
}

run().then((v)=>{console.info("received: ", v)})

export default keyboardListener;
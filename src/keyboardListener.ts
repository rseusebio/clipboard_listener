import { exec, spawn } from "child_process";
import { questionInt } from "readline-sync";
import util from "util";
import KeyStateManager from "./KeyStateManager";

const execAsync = util.promisify(exec);

const listOpenedWindows = async (): Promise<Array<string[]>> => 
{
    const { stdout, stderr } = await execAsync("/usr/bin/wmctrl -l");

    if(stderr)
    {
        console.info("Failed to list opened windows");

        console.info(stderr);

        return process.exit(-1);
    }

    if(!stdout)
    {
        console.info("No output. Probably no window is opened.");

        return process.exit(-1);
    }

    let windows: Array<string[]> =
        stdout.split("\n")
            .filter(s => !!s)
            .map(s => {
                let arr = s.split(" ");
                //#region leave only name and id
                arr.reverse();

                let id = arr.pop();

                for (let i = 0; i < 3; i++)
                    arr.pop();

                arr.reverse();
                //#endregion      
                return [id, arr.join(" ")];
            })
            .filter(v => !!v[1]);

    return windows;
}

const windowsSelection = async (): Promise<string> => 
{
    console.info("Retreiving opened windows...");

    let windows: Array<string[]> = await listOpenedWindows();

    if(!windows || windows.length <= 0)
    {
        console.info("No opened windows. Exiting...");

        return process.exit(-1);
    }

    console.info("Select a window (enter the number):\n");

    let index = 1;
    for(const window of windows)
    {
        const [id, name] = window;

        console.info(`${index++} - ${name}`);
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

    const [id] = windows[windowIndex - 1];

    return id;
}

const keyboardListener = (id: string): void =>
{
    const keyStates =
    {
        ALT: false,
        c: false,
        s: false,
        esc: false
    }

    const commandStates = 
    {
        ALT_S: false,
    }

    const turnOffCommand = (command: string) => 
    {
        switch(command)
        {
            case "ALT_S":
            {
                if(!keyStates.ALT && !keyStates.s)
                {
                    commandStates[command] = false;
                }
                
                break;
            }
        }
    }

    const dataHadler = async (data: Buffer) =>
    {
        const str = data.toString("utf-8");

        const keyPress   = new RegExp(/^KeyPress\sevent/);
        const keyRelease = new RegExp(/^KeyRelease\sevent/);
        const keySym     = new RegExp(/\(keysym\s.*\)/);

        let res = str.split('\n')
                     .filter(v => keyPress.test(v) || keyRelease.test(v) || keySym.test(v))
                     .map(v => v.trim());

        console.info(res);

        if(!res || res.length <= 0)
        {
            return;
        }

        const keyArr = keySym.exec(res[1]);

        if(!keyArr)
        {
            return;
        }

        const key = keyArr[0].split(", ")[1]
                             .replace(')', '')
                             .trim();

        if(res.length == 4)
        {
            if (key == "c" && !keyStates.c)
            {
                keyStates.c = true;
            }
            else if (key == "Alt_L" && !keyStates.ALT)
            {
                keyStates.ALT = true;
            }
            else if (key == "s" && !keyStates.s)
            {
                keyStates.s = true;
            }
            else if (key == "Espace" && !keyStates.esc)
            {
                keyStates.esc = true;
            }

            if (keyStates.ALT && keyStates.c)
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
            else if (keyStates.ALT && keyStates.s && !commandStates.ALT_S)
            {
                commandStates.ALT_S = true; 

                console.info("select and area");

                exec("gnome-screenshot -a -c", ( err, stdout, stderr)=>{
                    if(err)
                    {
                        console.info(`Error: `, stderr, err);
                        return;
                    }
                    else 
                    {
                        console.info("stdout: ", stdout);
                        const timeStamp = Date.now().valueOf();
                        exec(`xclip -sel c -t image/png -o > /home/rseusebio/Codes/clipboard_listener/.imgs/${timeStamp}.png`, 
                        (err, stdout, stderr) => {
                            if(err)
                            {
                                console.info("Erro (png)", stderr, err);

                                return;
                            }
                            else
                            {
                                console.info("png succeeded: ", stdout);
                            }
                        })
                    }
                });

                console.info("exited");
            }
        }
        else if(res.length == 2 )
        {
            if(key == "c")
            {
                keyStates.c = false;
            }
            else if(key == "Alt_L")
            {
                keyStates.ALT = false;

                turnOffCommand("ALT_S");
            }
            else if(key == "s")
            {
                keyStates.s = false;

                turnOffCommand("ALT_S");
            }
            else if (key == "Espace" && !keyStates.esc)
            {
                keyStates.esc = false;
            }
        }
    }

    const xev = spawn("/usr/bin/xev", ["-id", id, "-event", "keyboard"]);

    xev.stdout.on('data', dataHadler);

    xev.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    xev.on("error", (err) => {
        console.error("An error has occurred: ", err);
    });

    xev.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
    });

    xev.on("exit", (code, signal) => {
        console.info("child process has desconnected: ", code, signal);
    });
}


const run = async () => 
{   
    const id = await windowsSelection();

    keyboardListener(id);
}

run()
.then(v => console.info("received: ", v));

export default keyboardListener;
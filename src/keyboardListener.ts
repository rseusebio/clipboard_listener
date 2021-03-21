import { exec, spawn } from "child_process";
import { questionInt } from "readline-sync";
import KeyStateManager from "./KeyStateManager";
import util from "util";
import path from "path";

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
    const imgOutput = path.join(path.dirname(__dirname), ".imgs");

    const keyManager = new KeyStateManager(imgOutput);

    const xev = spawn("/usr/bin/xev", ["-id", id, "-event", "keyboard"]);

    xev.stdout.on('data', data => keyManager.receivedData(data));

    xev.stderr.on('data', data => console.error(`stderr: ${data}`));

    xev.on("error", err => console.error("An error has occurred: ", err));

    xev.on('close', code => console.log(`child process exited with code ${code}`));

    xev.on("exit", (code, signal) => console.info("child process has desconnected: ", code, signal));

    console.info("listening to window...");
}

const run = async () => 
{   
    const id = await windowsSelection();

    keyboardListener(id);
}

run();

export default keyboardListener;
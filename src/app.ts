import { EventEmitter } from "events";
import util             from "util";
import child_process    from "child_process";
import {v4}             from "uuid";
import os               from "os";
import cluster          from "cluster";
import showkey          from "./keyboardListener";

const keypress = require("keypress");

const asyncExec = util.promisify(child_process.exec);

class ClipboardListener extends EventEmitter { };


if( cluster.isMaster )
{
    for(let i = 0; i < 2; i++)
    {
        cluster.fork();
    }    
}
else if( cluster.worker.id == 1)
{
    const clip = new ClipboardListener();

    clip.on("text", (text) => { console.info("New Text:" + text ); } );
    clip.on("image", (img) => { console.info("New Image: " + img ); } );
    clip.on("err", (txt) => { console.info("Error: " + txt ); } );


    const clipboardLoop = ()=>
    {
        child_process.exec("echo \"\" | xclip -sel p");

        let lastValue = "";

        return async () => 
        {
            let { stdout, stderr } = await asyncExec("xclip -sel p -o");

            if(stderr)
            {
                return clip.emit("err", stderr);
            }

            if( stdout === lastValue )
            {
                return;
            }

            let value = stdout;

            const re1 = new RegExp( /screenshot/i );

            if( re1.exec(stdout) )
            {
                let { stdout, stderr } = await asyncExec("xclip -sel c -t TARGETS -o");

                const re2 = new RegExp( /image\/png/i );

                if( re2.test(stdout) )
                {
                    const img = `${v4()}.png`;

                    await asyncExec(`cd /home/rseusebio/Desktop && xclip -sel c -t image/png -o > ${img}`);
                    
                    lastValue = value;

                    return clip.emit("image", img);                
                }
            }

            lastValue = value;

            clip.emit("text", value);
        } 
    }

    setInterval(clipboardLoop(), 250);
}

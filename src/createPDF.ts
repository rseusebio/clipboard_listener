import { PDFDocument } from "pdf-lib";
import fs from "fs";
import {promisify} from "util";
import FileType from "file-type";
import path from "path";

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

const getPNGBuffer = async (filePath: string) => 
{
    const fileStat = fs.lstatSync(filePath);

    if (!fileStat.isFile())
    {
        throw new Error(`INVALID FILE PATH: ${filePath}`);
    }

    if (fileStat.size <= 0)
    {
        throw new Error("EMPTY IMAGE FILE");
    }

    const imgBuffer = await readFileAsync(filePath);

    if (!imgBuffer || imgBuffer.length <= 0 || imgBuffer.byteLength <= 0)
    {
        throw new Error(`FAIL TO READ FILE: length: ${imgBuffer.length}, byteLength: ${imgBuffer.byteLength}`);
    }

    const type = await FileType.fromBuffer(imgBuffer);

    if (type.ext !== "png")
    {
        throw new Error(`INVALID FILE TYPE: ${type.ext}`);
    }

    return imgBuffer;
}

const createPDF = async (filePath: string) => 
{   
    const buffer = await getPNGBuffer(filePath);

    const pdfDoc = await PDFDocument.create();

    const pdfImage = await pdfDoc.embedPng(buffer);

    const page = pdfDoc.addPage();    

    console.info("Page dimensions: ", page.getSize(), page.getHeight(), page.getWidth());

    console.info("Coordinates: ", page.getX(), page.getY());

    page.moveTo(0, page.getHeight() - pdfImage.height);

    page.drawImage(pdfImage, {
        width: pdfImage.width,
        height: pdfImage.height
    });
    console.info("Coordinates: ", page.getX(), page.getY());
    

    
    const pdfBytes = await pdfDoc.save();

    const arr = filePath.split('/').pop();

    await writeFileAsync(`${arr.replace(".png", '')}.pdf`, pdfBytes);
}

createPDF("/home/rseusebio/Codes/clipboard_listener/.imgs/1615993021272.png")
    .then(_ => "done")
    .catch(e => console.error("Error: ", e));
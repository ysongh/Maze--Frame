import express from 'express';
import cors from 'cors';
import satori from 'satori';
import fs from 'fs';
import { join } from 'path';
import { Resvg } from '@resvg/resvg-js';

import { createClient } from '@supabase/supabase-js';

const fontPath = join(process.cwd(), '/font/Roboto-Regular.ttf');
let fontData = fs.readFileSync(fontPath);

require('dotenv').config();

const supabaseUrl = 'https://upgezenvxnpwatlcuuob.supabase.co';
const supabase = createClient(supabaseUrl, process.env.SUPABASE_KEY || "string");

const app = express();
app.use(express.json());
app.use(cors({
    origin: '*'
}));

const port = 8080;

interface IFrameProps {
    frame?: string;
    imageUrl: string;
    buttons?: string[];
    postUrl?: string;
}

const grid = [
    [0, 1, 0, 0, 0, 1],
    [0, 1, 0, 1, 0, 1],
    [0, 1, 0, 1, 0, 1],
    [0, 1, 0, 1, 0, 0],
    [0, 0, 0, 1, 0, 0],
    [0, 0, 0, 1, 0, 1],
];

function getHTML(x: string, y: string): any {
    return {
        type: 'div',
        props: {
            children: [
                grid.map((r, i) => (
                    r.map((c, j) => (
                        {
                            type: 'div',
                            props: {
                                children: i === Number(x) && j == Number(y) ? "X" : "",
                                style : {
                                    background: c === 1 ? "black" : "yellow",
                                    width: "90px",
                                    height: "50px",
                                    margin: "2px",
                                    fontSize: "50px",
                                }
                            },
                        }
                    ))
                ))
            ],
            style: { 
                display: 'flex',
                alignItems: "center",
                flexWrap: "wrap",
            },
        },
        
    };
}


function generateFarcasterFrameMetaTag({ frame, imageUrl, postUrl, buttons }: IFrameProps): string {
    // Default to vNext
    if (!frame) {
        frame = "vNext"
    }
    // Ensure there are at most four buttons
    if (buttons && buttons.length > 4) {
        throw new Error("Maximum of four buttons are allowed per frame.");
    }

    // Generate Open Graph tags for image, redirect, and buttons
    let metaTag = `<meta property="fc:frame" content="${frame ? frame : "vNext"}" />\n`;
    metaTag += `<meta property="fc:frame:image" content="${imageUrl}" />\n`;

    if (buttons) {
        buttons.forEach((button, index) => {
            metaTag += `<meta property="fc:frame:button:${index + 1}" content="${button}" />\n`;
        });
    }

    // post URL if exists
    if (postUrl) {
        metaTag += `<meta property="fc:frame:post_url" content="${postUrl}" /> \n`
    }

    return metaTag;
}

function frameGenerator(frameProps: IFrameProps): string {

    const metaTag = generateFarcasterFrameMetaTag(frameProps);

    const html = `<!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <title>Maze</title>
                <meta property="og:title" content="Simple Maze Game" />
                <meta property="og:image" content="https://example.com/img.png" />
                ${metaTag}
            </head>
        </html>
    `;
    return html;
}

app.get('/frame', (req, res) => {

    const frameProps: IFrameProps = {
        imageUrl: 'https://images.unsplash.com/photo-1574390353491-92705370c72e?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bWF6ZXxlbnwwfDB8MHx8fDI%3D',
        buttons: ['get', 'button2'],
    };

    res.status(200).send(frameGenerator(frameProps));
});

// app.post('/frame', (req, res) => {

//     console.log(req.body)

//     const frameProps: IFrameProps = {
//         imageUrl:  'https://images.unsplash.com/photo-1625834384234-fd4eb7fe121f?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8bWF6ZXxlbnwwfDB8MHx8fDI%3D',
//         buttons: ['put', 'button2'],

//     };
    
//     res.status(200).send(frameGenerator(frameProps));
// });

app.post('/frame', async (req, res) => {
    let { data: user, error } = await supabase
        .from('user')
        .select('*');

    const newHTML = await getHTML(user![0].x, user![0].y);
    const svg = await satori(newHTML,
        {
          width: 600,
          height: 300,
          fonts: [
            {
                name: 'Inter',
                data: fontData,
                weight: 400,
                style: 'normal',
              },
            ],
        },
    )
    const newPNG = new Resvg(svg, {
        fitTo: {
          mode: 'original'
        }
      })
        .render()
        .asPng();

    let str = newPNG.toString('base64');

    const frameProps: IFrameProps = {
        imageUrl: `data:image/png;base64,${str}`,
        buttons: ['up', 'down', 'left', 'right'],
    };

    res.status(200).send(frameGenerator(frameProps));
});

app.get('/test/:type', async (req, res) => {
    const type = req.params.type;

    let { data: user, error } = await supabase
        .from('user')
        .select('*');
    
    if (type === "1") {
        const { data, error: insertError } = await supabase
            .from('user')
            .update({ y: user![0].y + 1 })
            .eq('id', '1')
            .select();
    }
    else if (type === "2") {
        const { data, error: insertError } = await supabase
            .from('user')
            .update({ y: user![0].y - 1 })
            .eq('id', '1')
            .select();
    }
    else if (type === "3") {
        const { data, error: insertError } = await supabase
            .from('user')
            .update({ x: user![0].x - 1 })
            .eq('id', '1')
            .select();
    }
    else if (type === "4") {
        const { data, error: insertError } = await supabase
            .from('user')
            .update({ x: user![0].x + 1 })
            .eq('id', '1')
            .select();
    }

    const newHTML = await getHTML(user![0].x, user![0].y);
    const svg = await satori(newHTML,
        {
          width: 600,
          height: 300,
          fonts: [
                {
                    name: 'Inter',
                    data: fontData,
                    weight: 400,
                    style: 'normal',
                },
            ],
        },
    )
    console.log(svg);
    const newPNG = new Resvg(svg, {
        fitTo: {
          mode: 'original'
        }
      })
        .render()
        .asPng();

    console.log(newPNG);

    let str = newPNG.toString('base64');
   
    console.log(str);

    res.status(200).send(`data:image/png;base64,${str}`);
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

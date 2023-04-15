import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import express from 'express';
import http from 'http';
import fs from 'fs';
import cors from 'cors';
import * as dotenv from "dotenv";
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import multer from 'multer';
import id3 from 'node-id3';
import mp3Duration from 'mp3-duration';
import yts from 'yt-search';
import YoutubeMp3Downloader from 'youtube-mp3-downloader';
// var YoutubeMp3Downloader = require("youtube-mp3-downloader");

// Set up express app and create HTTP server
const app = express();
app.use(express.json()); // use built-in json parser
const server = http.createServer(app);

// File path
const __dirname = dirname(fileURLToPath(import.meta.url));
const dbFile = join(__dirname, 'db.json')

dotenv.config({ path: __dirname+'/.env' });
const config = dotenv.config().parsed;

// Configure lowdb to write to JSONFile
const adapter = new JSONFile(dbFile)
const db = new Low(adapter)
await db.read()

// Set up the multer middleware to handle file uploads
const storage = multer.diskStorage({
    destination: './songs/', // Set the destination folder
    filename: function (req, file, cb) {
      // Set the filename to a custom name with the current timestamp
    //   const timestamp = Date.now();
    //   const extension = file.originalname.split('.').pop();
        console.log('file ', file)
        cb(null, file.originalname);
    }
  });
const upload = multer(storage);



//Configure YoutubeMp3Downloader with your settings
var YD = new YoutubeMp3Downloader({
    "ffmpegPath": "./ffmpeg",        // FFmpeg binary location
    "outputPath": "./songs",    // Output file location (default: the home directory)
    "youtubeVideoQuality": "highestaudio",  // Desired video quality (default: highestaudio)
    "queueParallelism": 2,                  // Download parallelism (default: 1)
    "progressTimeout": 2000,                // Interval in ms for the progress reports (default: 1000)
    "allowWebm": false                      // Enable download from WebM sources (default: false)
});


// Define route to serve the music player client-side code
app.use(express.static(__dirname + '/public'));

app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://muzikk.vercel.app'
    ],
}));

app.get('/', (req, res) => {
    res.json({ response: 'Success' })
});

// Token auth middleware
// app.use((req, res, next) => {
//     // console.log('Time:', Date.now())
//     if (!req.headers || !req.headers.authentication || req.headers.authentication !== config.AUTH_TOKEN) {
//         return res.status(401).json({ error: 'UNAUTHORIZED'});
//     }
//     next();
// })

// Define route to stream audio files
app.get('/song/:filename', (req, res) => {
    // Read audio file from disk

    const filePath = `./songs/${req.params.filename}`;
    const stat = fs.statSync(filePath);
    const audioFile = fs.createReadStream(filePath);

    // Create a lame encoder to convert audio to MP3
    // const encoder = new Lame({
    //     output: 'mp3',
    //     bitrate: 128,
    // });

    res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': stat.size
    });

    // Pipe the audio file to the encoder, and the encoder to the response
    audioFile.pipe(res);
});

app.get('/songs', (req, res) => {
    const { songs } = db.data;
    res.json({ data: songs });
});

// Handle the file upload request
app.post('/upload', upload.single('file'), (req, res) => {

    const artist = req.body.artist;
    const title = req.body.title;
    const releaseYear = req.body.releaseYear;
    const cover = req.body.cover;

    fs.writeFile(`./songs/${artist} - ${title}.mp3`, req.file.buffer, (err) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: 'Failed to upload file' });
        } else {
            // Get duration and write to db
            new Promise((resolve, reject) => {
                mp3Duration(`./songs/${artist} - ${title}.mp3`, function (err, duration) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(duration);
                    }
                });
            }).then((duration) => {
                const { songs } = db.data;
                songs.push({
                    file: `${artist} - ${title}.mp3`,
                    title,
                    artist,
                    duration,
                    releaseYear,
                    cover,
                    createdAt: new Date().toISOString(),
                });
                db.write();
                return res.json({ message: 'Song uploaded successfully' });
            }).catch((err) => {
                console.log(err);
                return res.status(500).json({ error: 'Failed to retrieve song duration' });
            });
        }
    });
});

app.get('/yt-search', (req, res) => {
    const query = req.query.q;

    yts(query).then(resp => {
        const videos = resp.videos.slice(0, 6)
        return res.json({ videos })
    })
});

app.post('/user-to-song', (req, res) => {

    const id = req.body.id;
    const user = req.body.user;

    const { songs } = db.data;
    const songToUpdate = songs.find(song => song.id === id);
    if (songToUpdate) {
        songToUpdate.users = [...songToUpdate.users, user];
        db.write();
        return res.json({ message: 'Added successfully' })
    }
    return res.json({ error: `Error: song with id ${id} not found` })
});

app.post('/yt-add', (req, res) => {

    const id = req.body.id;
    const url = req.body.url;
    const image = req.body.image;
    const duration = req.body.duration;
    const timestamp = req.body.timestamp;
    const artist = req.body.artist;
    const title = req.body.title;
    const releaseYear = req.body.releaseYear;
    const user = req.body.user;

    try {    
        YD.on("finished", function(err, data) {
            try {
                const { songs } = db.data;
                songs.push({
                    id,
                    file: `${artist} - ${title}.mp3`,
                    title,
                    artist,
                    duration,
                    timestamp,
                    image,
                    releaseYear,
                    users: [user],
                    createdAt: new Date().toISOString(),
                });
                db.write();
                res.json({ message: 'Successfully added to library' })
            } catch (e) {
                console.log('ERROR adding song - wrting to db: ');
                console.error(e)
            }
        });
        YD.on("error", function(error) {
            console.log('YTD Error: ');
            console.log(error);
            res.json({ error: 'YTD error' })
        });
        YD.download(id, `${artist} - ${title}.mp3`);
    } catch (e) {
        console.log('ERROR adding song: ');
        console.log(e);
    }    
});

// Change DB
// const { songs } = db.data;
// songs.forEach((song) => {
//   song.users = ['matija'];
// });
// db.write();

// Start server listening on port 3000
server.listen(3000, () => {
    console.log('Server listening on port 3000');
});
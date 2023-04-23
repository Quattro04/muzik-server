import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import express from 'express';
import http from 'http';
import fs from 'fs';
import cors from 'cors';
import morgan from 'morgan';
import * as dotenv from "dotenv";
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import multer from 'multer';
// import mp3Duration from 'mp3-duration';
import yts from 'yt-search';
// import YoutubeMp3Downloader from 'youtube-mp3-downloader';
// var YoutubeMp3Downloader = require("youtube-mp3-downloader");

import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
// import ffmpeg from 'ffmpeg-static';
import { PassThrough } from 'stream';
import { spawn } from 'child_process';

// Set up express app and create HTTP server
const app = express();
app.use(express.json()); // use built-in json parser
app.use(morgan('dev'));
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
// var YD = new YoutubeMp3Downloader({
//     "ffmpegPath": "./ffmpeg",        // FFmpeg binary location
//     "outputPath": "./songs",    // Output file location (default: the home directory)
//     "youtubeVideoQuality": "highestaudio",  // Desired video quality (default: highestaudio)
//     "queueParallelism": 2,                  // Download parallelism (default: 1)
//     "progressTimeout": 2000,                // Interval in ms for the progress reports (default: 1000)
//     "allowWebm": false                      // Enable download from WebM sources (default: false)
// });


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
// app.get('/song/:filename', (req, res) => {
//     // Read audio file from disk

//     const filePath = `./songs/${req.params.filename}`;
//     const stat = fs.statSync(filePath);
//     const audioFile = fs.createReadStream(filePath);

//     // Create a lame encoder to convert audio to MP3
//     // const encoder = new Lame({
//     //     output: 'mp3',
//     //     bitrate: 128,
//     // });

//     res.writeHead(200, {
//         'Content-Type': 'audio/mpeg',
//         'Content-Length': stat.size
//     });

//     // Pipe the audio file to the encoder, and the encoder to the response
//     audioFile.pipe(res);
// });

// const toAudioStream = (uri, res) => {
//     const opt = {
//         videoFormat: 'mp4',
//         quality: 'lowest',
//         audioFormat: 'mp3'
//     };

//     const video = ytdl(uri, opt);
//     const { audioFormat } = opt;
//     const stream = new PassThrough();
//     const ffmpeg = new FFmpeg(video);

//     process.nextTick(() => {
//         const output = ffmpeg.format(audioFormat).pipe(stream)
    
//         ffmpeg.once('error', error => stream.emit('error', error))
//         output.once('error', error => {
//             video.end()
//             stream.emit('error', error)
//         })
//     })

//     stream.video = video
//     stream.ffmpeg = ffmpeg

//     res.writeHead(200, {
//         'Content-Type': 'audio/mpeg',
//         'Content-Length': video.bytesWritten
//     });

//     stream.pipe(res).on('finish', () => {
//         let options = {
//             "stream_length": 0,
//             headers: {
//                 "content-type": 'image/jpeg',
//                 "content-length": file.bytesWritten
//             }
//         }

//         const readStream = fs.createReadStream(fileName);

//         // post the stream
//         needle('post', url, readStream, options)
//             .then(resp => {
//                 console.log("file length", resp.body.length);
//             })
//             .catch(err => {})
//             .finally(() => {
//                 // Remove the file from disk
//             });
//     })
// }

// const streamify = async (url, res) => {
    
//     toAudioStream(url).pipe(res);
// }

// app.get('/song/:ytId', (req, res) => {
//     const audioBitrate = '128k';
//     const videoUrl = `https://www.youtube.com/watch?v=${req.params.ytId}`;
//     const videoStream = ytdl(videoUrl, { filter: 'audioonly' });
//     const ffmpegProcess = spawn(ffmpeg, [
//       '-i', 'pipe:0',
//       '-b:a', audioBitrate,
//       '-f', 'mp3',
//       'pipe:1'
//     ]);

//     // res.setHeader('Content-Type', 'audio/mpeg');
//     videoStream.pipe(ffmpegProcess.stdin);

//     ffmpegProcess.on('error', (err) => {
//         console.error(err);
//         res.status(500).send('An error occurred');
//     });

//     ffmpegProcess.stderr.on('data', (data) => {
//         console.error(data.toString());
//     });

//     ffmpegProcess.stdout.pipe(res);

//     // res.on('headers', (headers) => {
//     //     console.log('headers');
//     //     res.setHeader('Content-Length', headers['content-length']);
//     // });

//     req.on('close', () => {
//       // Kill the FFmpeg process if the client cancels the request
//       ffmpegProcess.kill('SIGKILL');
//     });

// });

// app.get('/song/:ytId', async (req, res) => {
//     try {
//         const videoUrl = `https://www.youtube.com/watch?v=${req.params.ytId}`;
//         // const info = await ytdl.getInfo(videoUrl);
//         const audioStream = ytdl(videoUrl, { filter: 'audioonly' });
    
//         // console.log('asdasdasdasd ', info.videoDetails.title)

//         // res.on('error', (err) => {
//         //     console.error(err);
//         //     audioStream.destroy();
//         // });

//         // res.setHeader('Content-Type', 'audio/mpeg');
//         // res.setHeader('Content-Disposition', `attachment; filename="${info.videoDetails.title}.mp3"`);
//         // res.setHeader('Content-Length', info.videoDetails.lengthSeconds);    

//         const stream = ffmpeg(audioStream)
//             .audioBitrate(128)
//             .format('mp3')

//         stream.pipe(res);
            
//     } catch (error) {
//         console.log('ja tle')
//         console.error(error);
//         res.status(500).send('Internal Server Error');
//     }
//   });

app.get('/songdl/:ytId', async (req, res) => {
    const url = `https://www.youtube.com/watch?v=${req.params.ytId}`;
    const videoInfo = await ytdl.getInfo(url);
    const audioFormat = ytdl.chooseFormat(videoInfo.formats, { filter: 'audioonly' });
    const audioFilePath = join(__dirname, 'audio.m4a');

    const audioFile = fs.createWriteStream(audioFilePath);
    // ytdl(url, { format: audioFormat }).pipe(fs.createWriteStream('audio.m4a'));

    try {
        await new Promise((resolve, reject) => {
            ytdl(url, { format: audioFormat })
                .on('error', error => reject(error))
                .pipe(audioFile)
                .on('finish', () => resolve());
        });

        const audioFileStat = fs.statSync(audioFilePath);
        const fileSize = audioFileStat.size;

        res.setHeader('Content-Length', fileSize);
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `attachment; filename="${videoInfo.videoDetails.title}.m4a"`);
        const audioReadStream = fs.createReadStream(audioFilePath);
        audioReadStream.pipe(res);
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while processing your request.');
    } finally {
        // fs.unlinkSync(audioFilePath);
    }
});


app.get('/song/:ytId', async (req, res) => {

    const url = `https://www.youtube.com/watch?v=${req.params.ytId}`;
    const videoInfo = await ytdl.getInfo(url);
    const audioFormat = ytdl.chooseFormat(videoInfo.formats, { filter: 'audioonly' });
    const audioFilePath = join(__dirname, 'audio.m4a');
    const mp3FilePath = join(__dirname, 'audio.mp3');
    const audioFile = fs.createWriteStream(audioFilePath);

    try {
        await new Promise((resolve, reject) => {
            ytdl(url, { format: audioFormat })
                .on('error', error => reject(error))
                .pipe(audioFile)
                .on('finish', () => resolve());
        });

        // TODO: Dont convert if not listening from ios
        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(audioFilePath)
                .output(mp3FilePath)
                .audioCodec('libmp3lame')
                .on('error', error => reject(error))
                .on('end', () => resolve())
                .run();
        });

        const mp3FileStat = fs.statSync(mp3FilePath);
        const fileSize = mp3FileStat.size;

        res.setHeader('Content-Length', fileSize);
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `attachment; filename="${videoInfo.videoDetails.videoId}.mp3"`);
        const audioReadStream = fs.createReadStream(mp3FilePath);
        audioReadStream.pipe(res);
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while processing your request.');
    } finally {
        // fs.unlinkSync(audioFilePath);
        // fs.unlinkSync(mp3FilePath);
    }


    // TA V REDU

    // const videoUrl = `https://www.youtube.com/watch?v=${req.params.ytId}`;
    // res.header('Content-Disposition', `attachment; filename="video.mp3"`); // set the filename of the downloaded file
    // ytdl(videoUrl, { filter: 'audioonly' }).pipe(res); // download the audio-only stream and pipe it to the response

    // TA V REDU

    // -----------------------

    // OTHER SHIT

    // const videoUrl = `https://www.youtube.com/watch?v=${req.params.ytId}`;
    // const info = await ytdl.getInfo(videoUrl);
    // const audioStream = ytdl(videoUrl, { filter: 'audioonly' });

    // // Set the Content-Type header to audio/mpeg
    // res.setHeader('Content-Type', 'audio/mpeg');

    // // Set the Accept-Ranges header to bytes
    // res.setHeader('Accept-Ranges', 'bytes');


    // // Get the size of the audio stream
    // const audioStreamSize = parseInt(info.videoDetails.lengthSeconds) * parseInt(info.videoDetails.averageBitrate);
    // console.log(info.videoDetails.lengthSeconds, info.videoDetails.averageBitrate, audioStreamSize);
    // console.log('asdasd ', info.contentLength);

    // res.setHeader('Content-Type', 'audio/mpeg');
    // // res.setHeader('Content-Disposition', `attachment; filename="${info.videoDetails.title}.mp3"`);
    // res.setHeader('Content-Length', audioStreamSize);
    // // res.removeHeader('content-length');

    // audioStream.pipe(res);

    // var proc = new ffmpeg(audioStream)
    //     .outputOptions([
    //         '-i', 'pipe:0',
    //         '-b:a', '128',
    //         '-f', 'mp3',
    //         'pipe:1'
    //     ])
    //     .on('error', function(err,stdout,stderr) {
    //         console.log('an error happened: ' + err.message);
    //         console.log('ffmpeg stdout: ' + stdout);
    //         console.log('ffmpeg stderr: ' + stderr);
    //     })
    //     .on('end', function() {
    //         console.log('Processing finished !');
    //     })
    //     .on('progress', function(progress) {
    //         console.log('Processing: ' + progress.percent + '% done');
    //     })
    //     .pipe(res, {end: true});
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

    const songData = {
        id: req.body.id,
        file: `${req.body.artist} - ${req.body.title}.mp3`,
        title: req.body.title,
        artist: req.body.artist,
        duration: req.body.duration,
        timestamp: req.body.timestamp,
        image: req.body.image,
        releaseYear: req.body.releaseYear,
        users: [req.body.user],
        createdAt: new Date().toISOString()
    }

    // check if already in songs
    const { songs } = db.data;
    const song = songs.find(s => s.id === songData.id);
    if (song) {
        return res.json({ error: 'Error: Song already exists' })
    }

    try {
        songs.push(songData);
        db.write();
        return res.json({ message: 'Successfully added to library' })
    } catch (e) {
        console.log('ERROR adding song - wrting to db: ');
        console.error(e)
        return res.json({ error: 'ERROR adding song - wrting to db' })
    }
});

// Change DB
// const { songs } = db.data;
// songs.forEach((song) => {
//   song.users = ['matija'];
// });
// db.write();

server.listen(process.env.PORT || 3000, () => {
    console.log(`Server listening on port ${process.env.PORT || 3000}`);
});
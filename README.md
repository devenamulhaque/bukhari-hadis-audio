# বুখারী হাদিস অডিও — Bukhari Hadis Audio

A responsive Bengali Sahih al-Bukhari reading and listening website.

**Live website:** https://bukhari-hadis-audio.sunlithaven32.chatgpt.site/

## Features

- Human-recorded Bengali narration streamed from Audio Bangla Hadis / VIEW Foundation.
- 7,040 unique audio entries indexed across 86 source chapters, plus unclassified entries.
- Selected hadith text loaded from the same publisher and numbering scheme as the recording.
- Chapter selection, Bengali-number search, bookmarks and continuous playback.
- Compact mobile player with a settings popup for volume, mute, speed and voice selection.
- Mobile hadith selector in a modal; desktop sidebar remains visible.
- Only known male Bengali device voices are offered alongside the original recording. Availability depends on the device; this project does not provide four or five independent male recordings.
- A separate reading library retains the original Bengali dataset and its different numbering scheme.

## Run locally

No build step, dependencies, API key or account is required.

```sh
python3 -m http.server 8080 --directory dist
```

Open http://localhost:8080. Use an HTTP server rather than opening the HTML as a file, because the app uses modules and JSON fetches.

## Deploy

Publish the contents of `dist/` to any static HTTPS host. The existing live site uses Sites; its private hosting identifiers and Git credentials are intentionally excluded from this repository. This GitHub repository does not automatically update that deployment.

## Content sources and rights

- Recorded audio and the matching text endpoint: https://www.hadisbangla.com/ — VIEW Foundation / Audio Bangla Hadis. Project information: https://viewfoundationbd.org/audio-hadith-recording/
- `dist/recordings.json` contains source-provided audio URLs and identifiers. Audio files are not downloaded or redistributed here; playback streams directly from the publisher. Rights in recordings and publisher text remain with their respective owners. Public listening availability does not grant a blanket redistribution license.
- The separate reading dataset (`dist/bukhari.json`) is from https://github.com/fawazahmed0/hadith-api, Bengali Bukhari edition at https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/ben-bukhari.json. The upstream repository declares The Unlicense. It does not identify the Bengali translator; this repository makes no additional claim about translation rights or scholarly verification.
- That reading dataset has 7,589 entries, including 60 empty texts and 311 entries without chapter references. These are marked in the UI. Its hadith numbers must not be assumed to match the recorded edition.

## Limitations

Internet access is required to fetch publisher text and stream recordings. Publisher outages, removed files, CORS changes or unavailable browser voices can affect features. Device voices are synthesized and may mispronounce text. Audio quality varies between original recordings. Mobile background and lock-screen playback depends on the browser and operating system. Home-screen shortcuts are supported by browsers; this is not a native App Store or Play Store package.

## Structure

- `dist/index.html`, `recorded.js`, `recorded.css`: main reader and player.
- `dist/recording-core.mjs`: filtering, sequence and audio URL restrictions.
- `dist/voice-policy.mjs`: known male Bengali device-voice filtering.
- `dist/read.html`, `app.js`: separate reading-library interface.
- `dist/style.css`: shared layout and visual styling.
- JSON files: reading data, chapter labels and recorded-audio index.

## Validation

JavaScript syntax and data-index checks pass. Browser checks covered reading, original audio playback, continuous playback, mobile selector/settings modals, volume controls and 320px/390px layouts. All 7,040 recordings have not been individually listened to or verified.

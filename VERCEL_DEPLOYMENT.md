# Vercel Deployment Guide

This guide explains how to deploy the Gmail Account Generator to Vercel without WebVM integration.

## What's Different

The Vercel deployment uses:
- ✅ **Gmailnator API** - Quick email generation
- ✅ **Qwiklabs API** - Temporary Google accounts
- ❌ **WebVM** - Not included (removed for lighter deployment)

## Files for Vercel

- `index-vercel.html` - Main HTML file without WebVM
- `src/main-vercel.js` - JavaScript without WebVM code
- `vercel.json` - Vercel configuration

## Deployment Steps

### Option 1: Deploy via Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel --prod
```

### Option 2: Deploy via GitHub Integration

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Add New Project"
4. Import your GitHub repository
5. Configure:
   - **Build Command**: `npm run build:vercel`
   - **Output Directory**: `build`
   - **Install Command**: `npm install`
6. Click "Deploy"

### Option 3: Deploy via Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Upload your project folder
4. Configure build settings:
   - **Framework Preset**: Other
   - **Build Command**: `npm run build:vercel`
   - **Output Directory**: `build`
5. Click "Deploy"

## Build Process

The `build:vercel` script:
1. Copies `index-vercel.html` to `index.html` temporarily
2. Builds with Vite
3. Restores original files
4. Moves the built file to `build/index-vercel.html`

## Environment Variables

No environment variables are required for basic functionality. However, you may want to set:
- `VITE_GMAILNATOR_API_KEY` - Default RapidAPI key (optional)
- `VITE_QWIKLABS_LAB_ID` - Override default lab ID (optional)

## Features

### Gmailnator API
- Generate temporary emails
- Access inbox
- Set passwords
- Verify via inbox

### Qwiklabs API
- Uses lab ID: 32138 (A Tour of Google Cloud Sustainability)
- Extracts temporary Google account credentials
- Handles reCAPTCHA automatically

## Troubleshooting

### Build Fails
- Ensure `index-vercel.html` exists
- Check that `src/main-vercel.js` exists
- Verify `package.json` has `build:vercel` script

### CORS Issues
- Qwiklabs API requires being on Qwiklabs domain or proper CORS headers
- Gmailnator API should work from any domain

### reCAPTCHA Not Working
- Ensure reCAPTCHA script is loaded
- Check browser console for errors
- Verify site key detection logic

## Differences from GitHub Pages Version

| Feature | GitHub Pages | Vercel |
|---------|--------------|--------|
| WebVM | ✅ Yes | ❌ No |
| Gmailnator | ✅ Yes | ✅ Yes |
| Qwiklabs | ✅ Yes | ✅ Yes |
| Build Size | Larger | Smaller |
| Deployment | GitHub Actions | Vercel CLI/Dashboard |


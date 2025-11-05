# Auto Gmail Account Generator with WebVM

A web-based Google account generator that runs entirely in the browser using WebVM. This project integrates [Auto-Gmail-Creator](https://github.com/ai-to-ai/Auto-Gmail-Creator) with [WebVM](https://github.com/leaningtech/webvm) to allow users to create Gmail accounts directly from their browser without any server-side processing.

## Features

### Full Version (WebVM)
- 🚀 **Fully Client-Side**: Runs entirely in the browser using WebAssembly
- 🔒 **Secure**: No server-side account creation - everything happens in your browser
- 📱 **Modern UI**: Beautiful, responsive interface
- 📊 **JSON Output**: Account details displayed in structured JSON format
- 🖥️ **Terminal Access**: Full terminal access to the WebVM environment

### Simple Version (Gmailnator API) ⚡
- ⚡ **Instant**: Generate temporary Gmail addresses instantly
- 📧 **Inbox Access**: View and manage inbox messages
- 🔄 **Auto-Refresh**: Automatically refreshes inbox every 30 seconds
- 📋 **Easy Copy**: One-click copy email address
- 🎯 **Simple**: No complex setup required - just enter your API key

**Note**: The simple version uses Gmailnator API which provides **temporary/disposable email addresses**. These are for receiving emails only and cannot have passwords set/changed as they are temporary services.

## Two Ways to Use

### Option 1: Simple Version (Recommended for Quick Testing)
Use `simple.html` - A lightweight version using Gmailnator API:
- **No setup required** - Just enter your RapidAPI key
- **Instant email generation** - Get emails in seconds
- **Inbox access** - View messages directly
- **Perfect for testing** - Quick and easy to use

**Get your API key**: Visit [RapidAPI Gmailnator](https://rapidapi.com) and subscribe to the Gmailnator API

### Option 2: Full Version (WebVM)
Use `index.html` - Complete solution with WebVM:
1. **WebVM**: A virtual machine that runs in your browser using WebAssembly
2. **Dockerfile**: Custom Docker image that includes Auto-Gmail-Creator and all dependencies
3. **Web Interface**: User-friendly interface to input account details and view results
4. **GitHub Actions**: Automated build and deployment pipeline

## Setup & Deployment

### Prerequisites

- A GitHub account
- Fork this repository

### Deployment Steps

1. **Fork the Repository**
   - Click the "Fork" button on GitHub

2. **Enable GitHub Pages**
   - Go to your repository Settings
   - Navigate to Pages section
   - Select "GitHub Actions" as the source
   - Enable "Enforce HTTPS" if using a custom domain

3. **Run the Deployment Workflow**
   - Go to the Actions tab
   - Select the "Deploy WebVM Gmail Generator" workflow
   - Click "Run workflow"
   - Click "Run workflow" again in the dialog

4. **Wait for Deployment**
   - The workflow will:
     - Build the Docker image with Auto-Gmail-Creator
     - Convert it to a WebVM-compatible disk image
     - Build the web application
     - Deploy to GitHub Pages

5. **Access Your Site**
   - After deployment completes, your site will be available at:
     `https://[your-username].github.io/[repository-name]/`

## Local Development

### Prerequisites

- Node.js 18+ and npm
- A local disk image (or use the cloud-hosted one)

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/auto-gmail-generator-webvm.git
   cd auto-gmail-generator-webvm
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Update configuration**
   - Edit `src/config.js` to point to your disk image URL
   - Or use a local disk image path

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## Usage

1. **Open the website** in your browser
2. **Wait for VM initialization** (may take a few seconds)
3. **Enter account details**:
   - First Name (required)
   - Last Name (required)
   - Username (optional - will be auto-generated if not provided)
4. **Click "Generate Account"**
5. **View the generated account** in JSON format in the output panel
6. **Monitor the process** in the terminal panel

## Project Structure

```
.
├── dockerfiles/
│   └── gmail_generator          # Dockerfile for WebVM disk image
├── src/
│   ├── main.js                  # Main application logic
│   ├── config.js                # WebVM configuration
│   └── style.css                # Styling
├── .github/
│   └── workflows/
│       └── deploy.yml           # GitHub Actions deployment workflow
├── index.html                   # Main HTML file
├── package.json                 # Node.js dependencies
├── vite.config.js              # Vite build configuration
└── README.md                   # This file
```

## Customization

### Modify the Dockerfile

Edit `dockerfiles/gmail_generator` to:
- Add additional dependencies
- Modify the Auto-Gmail-Creator integration
- Change the default user setup

### Customize the UI

- Edit `src/style.css` for styling changes
- Modify `index.html` for layout changes
- Update `src/main.js` for functionality changes

## Important Notes

⚠️ **Legal & Ethical Considerations**:
- Automated account creation may violate Google's Terms of Service
- This project is for educational and research purposes only
- Use responsibly and in compliance with applicable laws and terms
- The authors are not responsible for misuse of this software

## Troubleshooting

### VM Not Initializing
- Check browser console for errors
- Ensure disk image URL is correct in `src/config.js`
- Verify GitHub Actions workflow completed successfully

### Account Generation Fails
- Check terminal output for error messages
- Verify Auto-Gmail-Creator script exists in the Docker image
- Ensure all dependencies are installed in the Dockerfile

### Build Errors
- Verify Node.js version is 18+
- Check that all dependencies are installed
- Review GitHub Actions logs for detailed error messages

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is provided for educational purposes. Please review and comply with:
- Google's Terms of Service
- WebVM's License (Apache 2.0)
- Auto-Gmail-Creator's License

## Acknowledgments

- [WebVM](https://github.com/leaningtech/webvm) by Leaning Technologies
- [Auto-Gmail-Creator](https://github.com/ai-to-ai/Auto-Gmail-Creator) by ai-to-ai
- [xterm.js](https://xtermjs.org/) for terminal emulation

## Support

For issues and questions:
- Open an issue on GitHub
- Check the WebVM documentation
- Review Auto-Gmail-Creator documentation

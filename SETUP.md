# Setup Guide

## Building the Disk Image

The WebVM disk image needs to be built from the Dockerfile. Here are the steps:

### Option 1: Using WebVM Build Action (Recommended)

If the `leaningtech/webvm-build-action` is available, the GitHub Actions workflow will automatically build the disk image.

### Option 2: Manual Build

1. **Build the Docker image:**
   ```bash
   docker build -f dockerfiles/gmail_generator -t gmail-generator-vm .
   ```

2. **Convert to WebVM disk image:**
   - Follow the WebVM documentation for converting Docker images to Ext2 disk images
   - Or use the WebVM build tools

3. **Upload the disk image:**
   - Upload to a web-accessible location (e.g., GitHub Releases, CDN)
   - Update the `diskImageUrl` in `public/config.js` or the GitHub Actions workflow

### Option 3: Use Pre-built Image

For testing, you can use a pre-built Debian image and manually add Auto-Gmail-Creator later through the terminal.

## Important Notes

1. **Auto-Gmail-Creator Compatibility**: The Auto-Gmail-Creator script may require browser automation (Selenium/Chrome), which may not work fully in WebVM's browser environment. You may need to:
   - Adapt the script to work without browser automation
   - Use alternative methods for account creation
   - Test and modify the script for WebVM compatibility

2. **Network Access**: WebVM has limited network access. Ensure any external API calls are compatible with WebVM's networking capabilities.

3. **Disk Image Size**: Keep the disk image size reasonable for faster loading. The current Dockerfile may create a large image - consider optimizing it.

## Testing Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Update `public/config.js` with your disk image URL (or use default for testing)

3. Run development server:
   ```bash
   npm run dev
   ```

4. Open browser to `http://localhost:8081`

## Deployment

1. Push to GitHub
2. Go to Actions tab
3. Run the "Deploy WebVM Gmail Generator" workflow
4. Wait for deployment to complete
5. Access your site at: `https://[username].github.io/[repo-name]/`

## Troubleshooting

- **VM not loading**: Check browser console, verify disk image URL is accessible
- **Script not found**: Verify Auto-Gmail-Creator is cloned in the Dockerfile
- **Build errors**: Check GitHub Actions logs for detailed error messages

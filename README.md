# Thumbnail Saver

A Chrome extension that allows you to save YouTube video thumbnails and titles to local storage. Built with TypeScript, React, and ShadCN UI.

## Features

- **Save Thumbnails**: Click a button on YouTube video pages to save thumbnails and titles
- **Grid View**: Browse all saved thumbnails in a beautiful grid layout
- **Tag Filtering**: Filter saved thumbnails by tags (auto-extracted from YouTube)
- **Title Toggle**: Show or hide video titles on thumbnails
- **Local Storage**: All data is stored locally on your device

## Development

### Prerequisites

- Node.js 18+
- pnpm (install with `npm install -g pnpm`)

### Setup

1. Install pnpm (if not already installed):
```bash
npm install -g pnpm
```

2. Install dependencies:
```bash
pnpm install
```

3. Generate extension icons (or create your own):
   ```bash
   pnpm run generate-icons
   ```
   This will create simple red square placeholder icons for testing. You can replace them with custom icons later if desired.

4. Build the extension:
```bash
pnpm run build
```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist` directory from this project

### Development Mode

For development with watch mode:
```bash
pnpm run dev
```

This will rebuild automatically when you make changes. You'll need to reload the extension in Chrome after each build.

## Project Structure

```
thumbnail-saver/
├── src/
│   ├── content/          # Content script for YouTube pages
│   ├── popup/            # React popup interface
│   ├── background/       # Service worker
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   ├── lib/              # ShadCN UI components
│   └── styles/           # Global styles
├── public/               # Static assets (icons)
├── manifest.json         # Extension manifest
└── dist/                 # Build output (generated)
```

## Usage

1. Visit any YouTube video page
2. Click the "Save Thumbnail" button that appears in the top right
3. Click the extension icon to view all saved thumbnails
4. Use the filter dropdown to filter by tags
5. Toggle "Show Title" to show/hide titles on thumbnails
6. Click any thumbnail to open the video in a new tab
7. Click the trash icon to delete saved thumbnails

## Building

The extension is built using Vite. The build process:
- Compiles TypeScript
- Bundles React components
- Processes CSS with Tailwind
- Outputs to the `dist` directory

After building, the `dist` directory contains all files needed to load the extension in Chrome.

## Technologies

- **TypeScript**: Type safety
- **React**: UI framework
- **ShadCN UI**: Component library
- **Tailwind CSS**: Styling
- **Vite**: Build tool
- **Chrome Extension APIs**: Storage, messaging, etc.

## License

MIT

import { copyFileSync, mkdirSync, existsSync, renameSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const distDir = 'dist';
const publicDir = 'public';

// Copy manifest.json
if (existsSync('manifest.json')) {
  copyFileSync('manifest.json', join(distDir, 'manifest.json'));
  console.log('✓ Copied manifest.json');
}

// Move HTML files from src locations to root and fix paths
const htmlFiles = [
  { src: join(distDir, 'src', 'popup', 'index.html'), dest: join(distDir, 'popup.html') },
  { src: join(distDir, 'src', 'viewer', 'index.html'), dest: join(distDir, 'viewer.html') },
];

htmlFiles.forEach(({ src, dest }) => {
  if (existsSync(src)) {
    let htmlContent = readFileSync(src, 'utf-8');
    // Fix relative paths: ../../assets/ -> ./assets/
    htmlContent = htmlContent.replace(/\.\.\/\.\.\/assets\//g, './assets/');
    writeFileSync(dest, htmlContent);
    const fileName = dest.split(/[/\\]/).pop();
    console.log(`✓ Moved ${fileName} to root and fixed asset paths`);
  } else {
    // Check if already in root
    const fileName = dest.split(/[/\\]/).pop();
    if (existsSync(dest)) {
      let htmlContent = readFileSync(dest, 'utf-8');
      htmlContent = htmlContent.replace(/\.\.\/\.\.\/assets\//g, './assets/');
      writeFileSync(dest, htmlContent);
      console.log(`✓ Fixed asset paths in ${fileName}`);
    } else {
      console.warn(`⚠ Warning: ${fileName} not found.`);
    }
  }
});

// Copy icons
const iconsDir = join(publicDir, 'icons');
const distIconsDir = join(distDir, 'icons');

if (existsSync(iconsDir)) {
  mkdirSync(distIconsDir, { recursive: true });
  const icons = ['icon16.png', 'icon48.png', 'icon128.png'];
  icons.forEach(icon => {
    const src = join(iconsDir, icon);
    const dest = join(distIconsDir, icon);
    if (existsSync(src)) {
      copyFileSync(src, dest);
      console.log(`✓ Copied ${icon}`);
    } else {
      console.warn(`⚠ Warning: ${icon} not found. Extension may not load properly.`);
    }
  });
} else {
  console.warn('⚠ Warning: icons directory not found. Extension may not load properly.');
}

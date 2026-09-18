import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('public/icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

// Create maskable SVG with full bleed background and safe margin (80% scale centered)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg-grad-m" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#1e3a8a" />
      <stop offset="100%" stopColor="#0f172a" />
    </linearGradient>
    <linearGradient id="logo-grad-m" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#60a5fa" />
      <stop offset="100%" stopColor="#2563eb" />
    </linearGradient>
  </defs>
  
  <!-- Full bleed background for Android maskable icon -->
  <rect width="512" height="512" fill="url(#bg-grad-m)"/>

  <!-- Content inside 75% safe area -->
  <g transform="translate(102, 102) scale(3.08)">
    <path 
      d="M50 5L90 27.5V72.5L50 95L10 72.5V27.5L50 5Z" 
      stroke="#60a5fa" 
      strokeWidth="5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      opacity="0.4"
    />
    
    <rect x="24" y="28" width="52" height="42" rx="5" fill="url(#logo-grad-m)" />
    <rect x="31" y="38" width="38" height="4" rx="2" fill="#ffffff" fill-opacity="0.9" />
    <rect x="31" y="48" width="28" height="4" rx="2" fill="#ffffff" fill-opacity="0.9" />
    <rect x="31" y="58" width="38" height="4" rx="2" fill="#ffffff" fill-opacity="0.9" />
    
    <circle 
      cx="66" 
      cy="66" 
      r="20" 
      stroke="#10b981" 
      strokeWidth="5" 
      fill="#ffffff" 
    />
    
    <path 
      d="M59 66L64 71L73 62" 
      stroke="#10b981" 
      strokeWidth="4.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    
    <path d="M14 34L14 24L24 24" stroke="#93c5fd" strokeWidth="2.5" stroke-linecap="round" />
    <path d="M86 66L86 76L76 76" stroke="#93c5fd" strokeWidth="2.5" stroke-linecap="round" />
  </g>
</svg>`;

async function generate() {
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile('public/pwa-192x192.png');
  console.log('Created public/pwa-192x192.png');

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/pwa-512x512.png');
  console.log('Created public/pwa-512x512.png');

  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile('public/pwa-maskable-512x512.png');
  console.log('Created public/pwa-maskable-512x512.png');

  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');
  console.log('Created public/apple-touch-icon.png');

  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile('public/favicon.ico');
  console.log('Created public/favicon.ico');
}

generate().catch(err => {
  console.error('Generation failed:', err);
  process.exit(1);
});

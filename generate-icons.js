// Run: node generate-icons.js
// Requires: npm install sharp --save-dev

const sharp = require('sharp');

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- Background circle -->
  <rect width="512" height="512" rx="100" fill="#2563EB"/>

  <!-- Pill shape (capsule) - rotated 45 degrees -->
  <g transform="translate(256,256) rotate(-45)">
    <!-- Left half (white) -->
    <rect x="-130" y="-52" width="130" height="104" rx="52" ry="52" fill="white" opacity="0.95"/>
    <!-- Right half (light blue) -->
    <rect x="0" y="-52" width="130" height="104" rx="52" ry="52" fill="#93C5FD" opacity="0.95"/>
    <!-- Center dividing line -->
    <rect x="-4" y="-52" width="8" height="104" fill="white" opacity="0.6"/>
  </g>

  <!-- Small dots for decoration (medicine look) -->
  <circle cx="256" cy="370" r="10" fill="white" opacity="0.5"/>
  <circle cx="230" cy="385" r="7" fill="white" opacity="0.4"/>
  <circle cx="282" cy="385" r="7" fill="white" opacity="0.4"/>
</svg>`;

async function generate() {
  const buf = Buffer.from(svgIcon);

  await sharp(buf).resize(192, 192).png().toFile('public/icon-192.png');
  console.log('✓ icon-192.png');

  await sharp(buf).resize(512, 512).png().toFile('public/icon-512.png');
  console.log('✓ icon-512.png');

  console.log('Done!');
}

generate().catch(console.error);

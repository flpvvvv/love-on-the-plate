import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import sharp from "sharp"

// Love color from design system
const LOVE_COLOR = "#D94B38"

// Read the original SVG and replace currentColor with love color
const svgPath = join(process.cwd(), "public", "logo.svg")
let svgContent = readFileSync(svgPath, "utf-8")

// Replace currentColor with the love color
svgContent = svgContent.replace(/currentColor/g, LOVE_COLOR)

// Write the colored SVG temporarily
const coloredSvgPath = join(process.cwd(), "public", "logo-colored.svg")
writeFileSync(coloredSvgPath, svgContent)

async function generateIcons() {
  const publicDir = join(process.cwd(), "public")

  // Generate 192x192 for Android
  await sharp(Buffer.from(svgContent))
    .resize(192, 192)
    .png()
    .toFile(join(publicDir, "icon-192.png"))
  console.log("✓ Generated icon-192.png")

  // Generate 512x512 for Android (high-res)
  await sharp(Buffer.from(svgContent))
    .resize(512, 512)
    .png()
    .toFile(join(publicDir, "icon-512.png"))
  console.log("✓ Generated icon-512.png")

  // Generate 180x180 for iOS (apple-touch-icon)
  // iOS requires solid background for touch icons
  const iosBackground = "#FFFBF8" // Canvas light color
  await sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: iosBackground,
    },
  })
    .composite([
      {
        input: await sharp(Buffer.from(svgContent)).resize(150, 150).png().toBuffer(),
        top: 15,
        left: 15,
      },
    ])
    .png()
    .toFile(join(publicDir, "apple-touch-icon.png"))
  console.log("✓ Generated apple-touch-icon.png")

  console.log("\nAll PWA icons generated successfully!")
}

generateIcons().catch(console.error)

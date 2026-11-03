// Rebuild small public assets from the preserved original PNGs.
const { createRequire } = require("node:module");
const path = require("node:path");
const requireNext = createRequire(require.resolve("next/package.json", { paths: [path.resolve(__dirname, "../apps/web")] }));
const sharp = requireNext("sharp");
const publicDir = path.resolve(__dirname, "../apps/web/public");
(async () => {
  await sharp(path.join(publicDir, "logo.png")).resize(256, 256, { fit: "inside" }).webp({ quality: 85 }).toFile(path.join(publicDir, "logo.webp"));
  for (const [name, size] of [["favicon.png", 48], ["apple-touch-icon.png", 180]]) {
    await sharp(path.join(publicDir, "logo.png")).resize(size, size, { fit: "contain", background: "#fbf8f2" }).png().toFile(path.join(publicDir, name));
  }
  for (const name of ["success_story_1", "success_story_2"]) {
    await sharp(path.join(publicDir, name + ".png")).resize({ width: 960, withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(publicDir, name + ".webp"));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

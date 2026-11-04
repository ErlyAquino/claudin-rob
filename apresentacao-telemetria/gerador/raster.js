const sharp = require("sharp"), fs = require("fs"), path = require("path");
const U = "D:/Projetos/claudin-rob/ferramentas/fritzing/user-parts/svg/user/breadboard/";
const C = "C:/Ferramentas/Fritzing/fritzing-parts/svg/core/breadboard/";
const OUT = path.join(__dirname, "..", "imagens", "pecas"); fs.mkdirSync(OUT, { recursive: true });
const pecas = {
  esp32: U + "esp32_p30_w11_9de09df6ee672a047957b8e804927eb5_1_breadboard.svg",
  mq: U + "MQ-5_1_breadboard.svg", dht22: U + "cria_dht22_fios_breadboard.svg", mhz19c: U + "cria_mhz19c_breadboard.svg",
  yfs201: U + "cria_yfs201_breadboard.svg", ads1115: U + "cria_ads1115_breadboard.svg", esp32cam: U + "ESP32-CAM_1_breadboard.svg",
  rele: U + "KY-019_097bf01b89c1d6e446e992937fa46cc9_2_breadboard.svg", ph: C + "prefix0000_1.svg", ds18b20: C + "DS18B20_breadboard.svg",
};
(async () => {
  for (const [n, f] of Object.entries(pecas)) {
    try { const b = await sharp(f, { density: 300 }).png().toBuffer(); const m = await sharp(b).metadata();
      await sharp(b).trim().resize({ width: 600, height: 600, fit: "inside" }).png().toFile(path.join(OUT, n + ".png")); console.log(n, m.width, m.height); }
    catch (e) { console.log("FALHA", n, e.message); }
  }
})();

// recortes para os slides: tira rótulos minúsculos (DHT22, YF-S201), a barra de rolagem do painel; diagrama com fundo no rótulo
(async () => {
  const crop = async (src, dst, fx, fy) => { const m = await sharp(src).metadata(); await sharp(src).extract({ left: 0, top: 0, width: Math.round(m.width * fx), height: Math.round(m.height * fy) }).png().toFile(dst); };
  await new Promise((r) => setTimeout(r, 4000));   // espera as pecas acima
  await crop(path.join(OUT, "dht22.png"), path.join(OUT, "dht22_corte.png"), 1, 0.55);
  await crop(path.join(OUT, "yfs201.png"), path.join(OUT, "yfs201_corte.png"), 1, 0.47);
  const pg = path.join(__dirname, "..", "imagens", "painel-geral.jpg"); const m = await sharp(pg).metadata();
  await sharp(pg).extract({ left: 0, top: 0, width: Math.round(m.width * 0.982), height: Math.round(m.height * 0.905) }).jpeg({ quality: 92 }).toFile(path.join(__dirname, "..", "imagens", "painel-geral-corte.jpg"));
  const a = await sharp(path.join(__dirname, "..", "imagens", "arquitetura.svg"), { density: 300 }).png().toBuffer(); await sharp(a).resize({ width: 2400 }).png().toFile(path.join(__dirname, "..", "imagens", "arquitetura.png"));
  console.log("recortes ok");
})();

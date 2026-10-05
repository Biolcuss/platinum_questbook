// =============================================================================
// Genera la versione "sito" del Platinum Questbook (per GitHub Pages)
// -----------------------------------------------------------------------------
// Crea la cartella docs/ con tutto quello che serve online (GitHub Pages la pubblica da lì):
//   - l'interfaccia (public/)
//   - le guide (data/guides/*.json)
//   - indice.json: l'elenco dei giochi, ricavato dalle guide presenti.
//     Perché esiste: un sito statico non può "elencare una cartella", quindi
//     l'elenco si crea qui. Così ogni nuova guida compare da sola.
//   - SOLO la copertina predefinita (covers/default.*): le altre sono immagini protette da copyright e non vanno nel repository
//
// Uso:  node tools/genera-sito.js
// Va rieseguito (e docs/ committata) ogni volta che cambiano guide o interfaccia: GitHub Pages pubblica quello che c'è in docs/.
// =============================================================================

const fs = require('fs');
const path = require('path');

const RADICE = path.join(__dirname, '..');
const USCITA = path.join(RADICE, 'docs');
const ESTENSIONI_IMMAGINI = ['.png', '.jpg', '.jpeg', '.webp'];

// docs/ contiene anche i documenti del progetto (ROADMAP.md, ecc.): tolgo solo i file generati dall'ultima volta
const FILE_GENERATI = ['index.html', 'style.css', 'app.js', 'archivio.js', 'fonts', 'data', 'covers', 'indice.json', '.nojekyll'];
for (const nome of FILE_GENERATI) fs.rmSync(path.join(USCITA, nome), { recursive: true, force: true });
fs.mkdirSync(USCITA, { recursive: true });

// 1. L'interfaccia
fs.cpSync(path.join(RADICE, 'public'), USCITA, { recursive: true });

// 2. Le guide
const cartellaGuide = path.join(RADICE, 'data', 'guides');
fs.cpSync(cartellaGuide, path.join(USCITA, 'data', 'guides'), { recursive: true });

// 3. Le copertine: solo quella predefinita
const cartellaCopertine = path.join(RADICE, 'covers');
const immagini = fs.existsSync(cartellaCopertine)
  ? fs.readdirSync(cartellaCopertine).filter((nome) => ESTENSIONI_IMMAGINI.includes(path.extname(nome).toLowerCase()) && path.parse(nome).name.toLowerCase() === 'default')
  : [];
fs.mkdirSync(path.join(USCITA, 'covers'), { recursive: true });
for (const nome of immagini) fs.copyFileSync(path.join(cartellaCopertine, nome), path.join(USCITA, 'covers', nome));

// Come nel server: la copertina di un gioco è covers/<id con "_" al posto di "-">.<estensione>; se manca vale covers/default.*
function cercaImmagine(nomeCercato) {
  return immagini.find((nome) => path.parse(nome).name.toLowerCase().replace(/_/g, '-') === nomeCercato) || null;
}

// 4. L'elenco dei giochi
const indice = fs.readdirSync(cartellaGuide).filter((f) => f.endsWith('.json')).map((nomeFile) => {
  const guida = JSON.parse(fs.readFileSync(path.join(cartellaGuide, nomeFile), 'utf8'));
  const file = cercaImmagine(guida.id) || cercaImmagine('default');
  return {
    id: guida.id,
    titolo: guida.titolo,
    piattaforma: guida.piattaforma,
    durata: guida.durata || null,
    copertina: file ? { url: 'covers/' + encodeURIComponent(file), predefinita: !cercaImmagine(guida.id) } : null,
  };
});
fs.writeFileSync(path.join(USCITA, 'indice.json'), JSON.stringify(indice, null, 2), 'utf8');

// Dice a GitHub Pages di non elaborare i file con Jekyll (non serve)
fs.writeFileSync(path.join(USCITA, '.nojekyll'), '');

console.log(`Sito generato in docs/ con ${indice.length} guide: ${indice.map((g) => g.id).join(', ')}`);

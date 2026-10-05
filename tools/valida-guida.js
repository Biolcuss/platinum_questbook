// =============================================================================
// Validatore delle guide
// -----------------------------------------------------------------------------
// Controlla che una guida in data/guides/ rispetti il formato descritto in
// docs/FORMATO-GUIDA.md. Uso:
//     node tools/valida-guida.js <id-gioco>
// Stampa gli errori trovati (o "nessun errore") e un riepilogo dei contenuti.
// =============================================================================

const fs = require('fs');
const path = require('path');

const id = process.argv[2];
if (!id) {
  console.error('Uso: node tools/valida-guida.js <id-gioco>');
  process.exit(1);
}

const percorso = path.join(__dirname, '..', 'data', 'guides', id + '.json');
if (!fs.existsSync(percorso)) {
  console.error('Guida non trovata: ' + percorso);
  process.exit(1);
}

let guida;
try {
  guida = JSON.parse(fs.readFileSync(percorso, 'utf8'));
} catch (errore) {
  console.error('Il file non è un JSON valido: ' + errore.message);
  process.exit(1);
}

const errori = [];
const avvisi = [];
const errore = (msg) => errori.push(msg);

// Controlla che un oggetto abbia tutti i campi indicati
function richiedi(oggetto, campi, dove) {
  for (const campo of campi) {
    if (oggetto[campo] === undefined || oggetto[campo] === '') errore(`${dove}: manca il campo "${campo}"`);
  }
}

// --- Gioco -------------------------------------------------------------------
richiedi(guida, ['id', 'titolo', 'piattaforma', 'versioneGuida', 'verificataIl', 'fonti', 'capitoli'], 'Gioco');
if (guida.id !== id) errore(`Gioco: l'id "${guida.id}" è diverso dal nome del file "${id}"`);
if (!Array.isArray(guida.fonti) || guida.fonti.length < 2) errore('Gioco: servono almeno 2 fonti');

// --- Durata (ore per finire il gioco, campo facoltativo) ---------------------
if (guida.durata) {
  for (const campo of ['storia', 'storiaExtra', 'completista']) {
    // ore come numero ("12") oppure intervallo ("8-9")
    if (!/^\d+(-\d+)?$/.test(String(guida.durata[campo] ?? ''))) errore(`Durata: "${campo}" deve essere un numero di ore o un intervallo (es. "8-9")`);
  }
  if (!guida.durata.fonte || !guida.durata.fonte.url) errore('Durata: manca la fonte (campo "fonte" con "nome" e "url")');
  if (guida.durata.daVerificare && !guida.durata.nota) errore('Durata: con "daVerificare" serve anche "nota"');
}

// Tutti gli id usati nei progressi devono essere unici (passi e trofei insieme)
const idUsati = new Set();
function registraId(idNuovo, dove) {
  if (idUsati.has(idNuovo)) errore(`${dove}: id duplicato "${idNuovo}"`);
  idUsati.add(idNuovo);
}

// --- Scelte del giocatore (es. la casa) -------------------------------------
const scelte = new Map(); // idScelta → Set di idOpzione
for (const scelta of guida.scelte || []) {
  richiedi(scelta, ['id', 'nome', 'opzioni'], `Scelta "${scelta.id}"`);
  const opzioni = new Set();
  for (const opzione of scelta.opzioni || []) {
    richiedi(opzione, ['id', 'nome'], `Scelta "${scelta.id}", opzione`);
    opzioni.add(opzione.id);
  }
  scelte.set(scelta.id, opzioni);
}
// Controlla che un "soloSe" faccia riferimento a scelte e opzioni esistenti
function controllaSoloSe(oggetto, dove) {
  for (const [idScelta, valori] of Object.entries(oggetto.soloSe || {})) {
    if (!scelte.has(idScelta)) { errore(`${dove}: soloSe usa la scelta inesistente "${idScelta}"`); continue; }
    for (const v of [].concat(valori)) {
      if (!scelte.get(idScelta).has(v)) errore(`${dove}: soloSe usa l'opzione inesistente "${v}" della scelta "${idScelta}"`);
    }
  }
}

// --- Categorie ---------------------------------------------------------------
const categorie = new Map(); // id → totale
for (const cat of guida.categorie || []) {
  richiedi(cat, ['id', 'nome', 'totale'], `Categoria "${cat.id}"`);
  categorie.set(cat.id, cat.totale);
}

// --- Trofei ------------------------------------------------------------------
const GRADI = ['platino', 'oro', 'argento', 'bronzo', 'obiettivo'];
const trofei = new Set();
for (const trofeo of guida.trofei || []) {
  const dove = `Trofeo "${trofeo.id}"`;
  richiedi(trofeo, ['id', 'nome', 'grado', 'descrizione'], dove);
  if (!String(trofeo.id).startsWith('tr-')) errore(`${dove}: l'id deve iniziare con "tr-"`);
  if (!GRADI.includes(trofeo.grado)) errore(`${dove}: grado non valido "${trofeo.grado}"`);
  if (trofeo.obiettivo) {
    const totale = categorie.get(trofeo.obiettivo.categoria);
    if (totale === undefined) errore(`${dove}: categoria "${trofeo.obiettivo.categoria}" inesistente`);
    else if (trofeo.obiettivo.quantita > totale) errore(`${dove}: quantità ${trofeo.obiettivo.quantita} maggiore del totale ${totale}`);
  }
  controllaSoloSe(trofeo, dove);
  if (trofeo.daVerificare && !trofeo.notaVerifica) errore(`${dove}: "daVerificare" senza "notaVerifica"`);
  registraId(trofeo.id, dove);
  trofei.add(trofeo.id);
}

// --- Capitoli e passi ----------------------------------------------------------
const TIPI = ['storia', 'collezionabile', 'raccolta', 'trofeo', 'secondaria'];
const conteggioCategorie = new Map();
const conteggioTipi = { storia: 0, collezionabile: 0, raccolta: 0, trofeo: 0, secondaria: 0 };
let daVerificare = 0;

(guida.capitoli || []).forEach((capitolo, indice) => {
  const doveCap = `Capitolo ${capitolo.numero ?? indice + 1} (${capitolo.id})`;
  richiedi(capitolo, ['id', 'nome', 'passi'], doveCap);
  controllaSoloSe(capitolo, doveCap);
  if (capitolo.ordinato !== undefined && typeof capitolo.ordinato !== 'boolean') errore(`${doveCap}: "ordinato" deve essere true o false`);
  registraId(capitolo.id, doveCap);
  if (!Array.isArray(capitolo.passi) || capitolo.passi.length === 0) errore(`${doveCap}: nessun passo`);

  for (const passo of capitolo.passi || []) {
    const dove = `${doveCap}, passo "${passo.id}"`;
    richiedi(passo, ['id', 'tipo', 'titolo'], dove);
    if (!TIPI.includes(passo.tipo)) errore(`${dove}: tipo non valido "${passo.tipo}"`);
    else conteggioTipi[passo.tipo]++;
    if (passo.id && !passo.id.startsWith(capitolo.id + '-')) avvisi.push(`${dove}: l'id non inizia con "${capitolo.id}-"`);
    registraId(passo.id, dove);

    if (passo.tipo !== 'storia' && !passo.dove) errore(`${dove}: i passi opzionali devono avere "dove"`);
    controllaSoloSe(passo, dove);
    if (passo.tipo === 'collezionabile' || passo.tipo === 'raccolta') {
      if (!categorie.has(passo.categoria)) errore(`${dove}: categoria "${passo.categoria}" inesistente`);
      let quanti = 1;
      if (passo.tipo === 'raccolta') {
        if (!Number.isInteger(passo.quantita) || passo.quantita < 1) errore(`${dove}: una raccolta richiede "quantita" (numero intero maggiore di 0)`);
        else quanti = passo.quantita;
      }
      conteggioCategorie.set(passo.categoria, (conteggioCategorie.get(passo.categoria) || 0) + quanti);
    }
    if (passo.tipo === 'trofeo' && !trofei.has(passo.trofeo)) errore(`${dove}: trofeo "${passo.trofeo}" inesistente`);
    if (passo.mancabile && !passo.notaMancabile) errore(`${dove}: "mancabile" senza "notaMancabile"`);
    if (passo.daVerificare) {
      daVerificare++;
      if (!passo.notaVerifica) errore(`${dove}: "daVerificare" senza "notaVerifica"`);
    }
  }
});

// I collezionabili trovati devono corrispondere ai totali dichiarati
for (const [idCat, totale] of categorie) {
  const trovati = conteggioCategorie.get(idCat) || 0;
  if (trovati !== totale) errore(`Categoria "${idCat}": dichiarati ${totale}, presenti nella timeline ${trovati}`);
}

// --- Risultato ---------------------------------------------------------------
console.log(`Guida: ${guida.titolo} (${guida.piattaforma}) – versione ${guida.versioneGuida}`);
console.log(`Capitoli: ${(guida.capitoli || []).length}`);
console.log(`Passi: storia ${conteggioTipi.storia}, collezionabili ${conteggioTipi.collezionabile}, raccolte ${conteggioTipi.raccolta}, trofei ${conteggioTipi.trofeo}, secondarie ${conteggioTipi.secondaria}`);
for (const [idCat, totale] of categorie) console.log(`  - ${idCat}: ${conteggioCategorie.get(idCat) || 0}/${totale}`);
console.log(`Trofei: ${trofei.size}`);
console.log(`Informazioni da verificare: ${daVerificare}`);
for (const avviso of avvisi) console.log('AVVISO: ' + avviso);

if (errori.length === 0) {
  console.log('\nNessun errore.');
} else {
  console.log(`\n${errori.length} errori:`);
  for (const e of errori) console.log(' - ' + e);
  process.exit(1);
}

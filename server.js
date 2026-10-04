// =============================================================================
// Game Tracker — server locale
// -----------------------------------------------------------------------------
// Questo programma fa due cose:
//   1. "serve" i file dell'interfaccia (cartella public/) al browser;
//   2. offre delle API, cioè indirizzi che l'interfaccia chiama per leggere le
//      guide e per leggere/salvare i progressi nei file JSON in data/.
//
// Usa solo moduli già inclusi in Node.js: non serve installare niente.
// Avvio:  node server.js          (poi aprire http://localhost:3000)
//         node server.js --apri   (apre anche il browser in automatico)
// =============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORTA = 3000;

// Percorsi delle cartelle, calcolati a partire dalla cartella di questo file
const CARTELLA_PUBLIC = path.join(__dirname, 'public');
const CARTELLA_GUIDE = path.join(__dirname, 'data', 'guides');
const CARTELLA_PROGRESSI = path.join(__dirname, 'data', 'progress');

// Tipi di file che il server sa inviare al browser
const TIPI_FILE = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// -----------------------------------------------------------------------------
// Funzioni di supporto
// -----------------------------------------------------------------------------

// Un id valido contiene solo lettere minuscole, numeri e trattini.
// Questo controllo impedisce che qualcuno usi un id come "../../file"
// per leggere o scrivere file fuori dalle cartelle previste.
function idValido(id) {
  return /^[a-z0-9-]+$/.test(id);
}

// Invia una risposta in formato JSON
function rispondiJson(res, codice, dati) {
  res.writeHead(codice, { 'Content-Type': TIPI_FILE['.json'] });
  res.end(JSON.stringify(dati));
}

// Legge un file JSON e lo trasforma in oggetto. Se il file non esiste restituisce null.
function leggiJson(percorso) {
  if (!fs.existsSync(percorso)) return null;
  return JSON.parse(fs.readFileSync(percorso, 'utf8'));
}

// Scrive un file JSON in modo "sicuro": prima scrive un file temporaneo, poi lo
// rinomina. Se il PC si spegne a metà, il file originale resta integro.
function scriviJsonSicuro(percorso, dati) {
  fs.mkdirSync(path.dirname(percorso), { recursive: true }); // se la cartella è stata cancellata, la ricrea
  const temporaneo = percorso + '.tmp';
  fs.writeFileSync(temporaneo, JSON.stringify(dati, null, 2), 'utf8');
  fs.renameSync(temporaneo, percorso);
}

// Progressi vuoti, usati quando l'utente non ha ancora iniziato un gioco
// Forma dei progressi:
//   completati: { idPasso: data }   passi spuntati
//   sonoQui:    idPasso | null      posizione nella storia
//   scelte:     { idScelta: idOpzione }   scelte del giocatore (es. la casa)
//   contatori:  { idPasso: numero }       avanzamento dei passi di tipo "raccolta"
function progressiVuoti() {
  return { completati: {}, sonoQui: null, scelte: {}, contatori: {} };
}

// Legge i progressi e aggiunge i campi mancanti (i file salvati con versioni precedenti non hanno scelte e contatori)
function leggiProgressi(id) {
  const salvati = leggiJson(path.join(CARTELLA_PROGRESSI, id + '.json')) || {};
  return { ...progressiVuoti(), ...salvati };
}

// Un passo (o capitolo) con "soloSe" vale solo per chi ha fatto quella scelta.
// Se la scelta non è ancora stata fatta, vale per tutti.
function applicabile(oggetto, scelte) {
  for (const [idScelta, valori] of Object.entries(oggetto.soloSe || {})) {
    const fatta = scelte[idScelta];
    if (fatta && ![].concat(valori).includes(fatta)) return false;
  }
  return true;
}

// Calcola le percentuali di completamento di un gioco:
// - storia: passi di tipo "storia" spuntati / totale passi di storia
// - totale: tutte le "unità" fatte / tutte le unità (un passo normale è 1 unità,
//   un passo di tipo "raccolta" ne vale tante quanti sono gli oggetti da trovare)
function calcolaCompletamento(guida, progressi) {
  let storiaTot = 0, storiaFatti = 0, tutti = 0, tuttiFatti = 0;
  for (const capitolo of guida.capitoli || []) {
    if (!applicabile(capitolo, progressi.scelte)) continue;
    for (const passo of capitolo.passi || []) {
      if (!applicabile(passo, progressi.scelte)) continue;
      if (passo.tipo === 'raccolta') {
        tutti += passo.quantita;
        tuttiFatti += Math.min(progressi.contatori[passo.id] || 0, passo.quantita);
        continue;
      }
      // Un passo di tipo "trofeo" usa come chiave l'id del trofeo (vedi docs/FORMATO-GUIDA.md)
      const chiave = passo.tipo === 'trofeo' ? passo.trofeo : passo.id;
      const fatto = Boolean(progressi.completati[chiave]);
      tutti++;
      if (fatto) tuttiFatti++;
      if (passo.tipo === 'storia') {
        storiaTot++;
        if (fatto) storiaFatti++;
      }
    }
  }
  const percentuale = (fatti, tot) => (tot === 0 ? 0 : Math.round((fatti / tot) * 100));
  return {
    storia: percentuale(storiaFatti, storiaTot),
    totale: percentuale(tuttiFatti, tutti),
  };
}

// Legge tutto il "corpo" di una richiesta (i dati inviati dal browser)
function leggiCorpo(req) {
  return new Promise((resolve, reject) => {
    let corpo = '';
    req.on('data', (pezzo) => {
      corpo += pezzo;
      // Limite di sicurezza: 5 MB sono molto più del necessario
      if (corpo.length > 5 * 1024 * 1024) {
        reject(new Error('Dati troppo grandi'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(corpo));
    req.on('error', reject);
  });
}

// -----------------------------------------------------------------------------
// API
// -----------------------------------------------------------------------------

// GET /api/giochi → elenco di tutti i giochi con le percentuali
function apiElencoGiochi(res) {
  const file = fs.readdirSync(CARTELLA_GUIDE).filter((f) => f.endsWith('.json'));
  const giochi = file.map((nomeFile) => {
    const guida = leggiJson(path.join(CARTELLA_GUIDE, nomeFile));
    return {
      id: guida.id,
      titolo: guida.titolo,
      piattaforma: guida.piattaforma,
      completamento: calcolaCompletamento(guida, leggiProgressi(guida.id)),
    };
  });
  giochi.sort((a, b) => a.titolo.localeCompare(b.titolo));
  rispondiJson(res, 200, giochi);
}

// GET /api/giochi/:id → la guida completa di un gioco
function apiGuida(res, id) {
  const guida = leggiJson(path.join(CARTELLA_GUIDE, id + '.json'));
  if (!guida) return rispondiJson(res, 404, { errore: 'Guida non trovata' });
  rispondiJson(res, 200, guida);
}

// GET /api/progressi/:id → i progressi dell'utente in quel gioco
function apiLeggiProgressi(res, id) {
  rispondiJson(res, 200, leggiProgressi(id));
}

// PUT /api/progressi/:id → salva i progressi inviati dal browser
async function apiSalvaProgressi(req, res, id) {
  if (!fs.existsSync(path.join(CARTELLA_GUIDE, id + '.json'))) {
    return rispondiJson(res, 404, { errore: 'Guida non trovata' });
  }
  let dati;
  try {
    dati = JSON.parse(await leggiCorpo(req));
  } catch {
    return rispondiJson(res, 400, { errore: 'Dati non validi' });
  }
  // Controllo che i dati abbiano la forma giusta prima di salvarli
  const eOggetto = (x) => typeof x === 'object' && x !== null && !Array.isArray(x);
  const formaGiusta =
    eOggetto(dati) && eOggetto(dati.completati) &&
    (dati.sonoQui === null || typeof dati.sonoQui === 'string') &&
    (dati.scelte === undefined || (eOggetto(dati.scelte) && Object.values(dati.scelte).every((v) => typeof v === 'string'))) &&
    (dati.contatori === undefined || (eOggetto(dati.contatori) && Object.values(dati.contatori).every((v) => Number.isInteger(v) && v >= 0)));
  if (!formaGiusta) return rispondiJson(res, 400, { errore: 'Formato dei progressi non valido' });

  const daSalvare = {
    completati: dati.completati,
    sonoQui: dati.sonoQui,
    scelte: dati.scelte || {},
    contatori: dati.contatori || {},
  };
  scriviJsonSicuro(path.join(CARTELLA_PROGRESSI, id + '.json'), daSalvare);
  rispondiJson(res, 200, { ok: true });
}

// -----------------------------------------------------------------------------
// File statici (l'interfaccia in public/)
// -----------------------------------------------------------------------------
function serviFileStatico(res, percorsoUrl) {
  if (percorsoUrl === '/') percorsoUrl = '/index.html';
  const percorso = path.join(CARTELLA_PUBLIC, decodeURIComponent(percorsoUrl));
  // Sicurezza: il file deve stare dentro public/
  if (!percorso.startsWith(CARTELLA_PUBLIC + path.sep)) {
    res.writeHead(403);
    return res.end('Accesso negato');
  }
  if (!fs.existsSync(percorso) || !fs.statSync(percorso).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('File non trovato');
  }
  const tipo = TIPI_FILE[path.extname(percorso).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': tipo });
  fs.createReadStream(percorso).pipe(res);
}

// -----------------------------------------------------------------------------
// Smistamento delle richieste: in base all'indirizzo decide quale funzione usare
// -----------------------------------------------------------------------------
async function gestisciRichiesta(req, res) {
  const url = new URL(req.url, `http://localhost:${PORTA}`);
  const parti = url.pathname.split('/').filter(Boolean); // es. ["api", "giochi", "uncharted"]

  try {
    if (parti[0] === 'api') {
      const [, risorsa, id] = parti;
      if (id !== undefined && !idValido(id)) return rispondiJson(res, 400, { errore: 'Id non valido' });

      if (risorsa === 'giochi' && !id && req.method === 'GET') return apiElencoGiochi(res);
      if (risorsa === 'giochi' && id && req.method === 'GET') return apiGuida(res, id);
      if (risorsa === 'progressi' && id && req.method === 'GET') return apiLeggiProgressi(res, id);
      if (risorsa === 'progressi' && id && req.method === 'PUT') return await apiSalvaProgressi(req, res, id);
      return rispondiJson(res, 404, { errore: 'API non trovata' });
    }
    if (req.method === 'GET') return serviFileStatico(res, url.pathname);
    res.writeHead(405);
    res.end();
  } catch (errore) {
    // Qualsiasi errore imprevisto: lo stampo nel terminale e rispondo con un messaggio
    console.error('Errore:', errore);
    rispondiJson(res, 500, { errore: 'Errore interno: ' + errore.message });
  }
}

// -----------------------------------------------------------------------------
// Avvio del server
// -----------------------------------------------------------------------------

// Mi assicuro che le cartelle dei dati esistano
fs.mkdirSync(CARTELLA_GUIDE, { recursive: true });
fs.mkdirSync(CARTELLA_PROGRESSI, { recursive: true });

const server = http.createServer(gestisciRichiesta);

server.on('error', (errore) => {
  if (errore.code === 'EADDRINUSE') {
    console.error(`La porta ${PORTA} è già occupata: forse il Game Tracker è già aperto in un'altra finestra?`);
  } else {
    console.error('Impossibile avviare il server:', errore.message);
  }
  process.exit(1);
});

// "127.0.0.1" = il server è raggiungibile solo da questo PC, non dalla rete
server.listen(PORTA, '127.0.0.1', () => {
  const indirizzo = `http://localhost:${PORTA}`;
  console.log(`Game Tracker avviato: ${indirizzo}`);
  console.log('Per fermarlo premi Ctrl+C (o chiudi questa finestra).');
  if (process.argv.includes('--apri')) exec(`start "" "${indirizzo}"`);
});

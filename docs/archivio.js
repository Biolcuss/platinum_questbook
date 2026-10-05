// =============================================================================
// Platinum Questbook — archivio dei dati
// -----------------------------------------------------------------------------
// app.js non sa da dove arrivano guide e progressi: li chiede a questo file.
// Ci sono due modi di funzionare, scelti da soli all'avvio:
//
//   • MODO SERVER (in locale con "node server.js"): guide e progressi passano
//     dalle API del server; i progressi sono file in data/progress/.
//   • MODO SITO (online, su GitHub Pages): non c'è nessun server, solo file.
//     Le guide si leggono dai file JSON e i progressi si salvano nel browser
//     (localStorage), separati per dispositivo. Con "Salvataggio" li si sposta a mano.
//
// Offre a app.js gli stessi dati in entrambi i modi:
//   archivio.avvia()               sceglie il modo (da chiamare una volta, all'inizio)
//   archivio.elenco()              elenco giochi con le percentuali di completamento
//   archivio.guida(id)             guida completa
//   archivio.progressi(id)         progressi dell'utente
//   archivio.salva(id, progressi)  salva i progressi
//   archivio.esporta(conCopertine) scarica il file di salvataggio (con le copertine, se true)
//   archivio.importa(testo, modo)  importa un file di salvataggio ('unisci' | 'sostituisci'); le copertine
//                                  contenute nel file (se ci sono) sostituiscono quelle attuali
//   archivio.salvaCopertina(id, tipo, file)  imposta la copertina di un gioco; restituisce { url, predefinita }
// =============================================================================

const FORMATO_SALVATAGGIO = 'platinum-questbook-salvataggio';

// --- Funzioni comuni (le stesse del server: in modo server servono solo "idValido"-like controlli lato app) ---

const eOggetto = (x) => typeof x === 'object' && x !== null && !Array.isArray(x);

// Controlla che dei progressi (dal browser o da un file importato) abbiano la forma giusta
function progressiValidi(dati) {
  return eOggetto(dati) && eOggetto(dati.completati) &&
    (dati.sonoQui === undefined || dati.sonoQui === null || typeof dati.sonoQui === 'string') &&
    (dati.scelte === undefined || (eOggetto(dati.scelte) && Object.values(dati.scelte).every((v) => typeof v === 'string'))) &&
    (dati.contatori === undefined || (eOggetto(dati.contatori) && Object.values(dati.contatori).every((v) => Number.isInteger(v) && v >= 0)));
}

// Completa i campi che mancano (i salvataggi di versioni precedenti non hanno scelte e contatori)
function normalizzaProgressi(dati) {
  return { completati: dati.completati || {}, sonoQui: dati.sonoQui ?? null, scelte: dati.scelte || {}, contatori: dati.contatori || {} };
}

// Unisce due progressi dello stesso gioco senza perdere niente:
// - passi completati: quelli di entrambi (resta la data del progresso attuale se c'è in entrambi);
// - contatori: il valore più alto; scelte: quelle attuali, con quelle importate solo dove mancano
function unisciProgressi(attuali, nuovi) {
  const contatori = { ...attuali.contatori };
  for (const [idPasso, numero] of Object.entries(nuovi.contatori)) contatori[idPasso] = Math.max(contatori[idPasso] || 0, numero);
  return {
    completati: { ...nuovi.completati, ...attuali.completati },
    sonoQui: null,
    scelte: { ...nuovi.scelte, ...attuali.scelte },
    contatori,
  };
}

// Scarica un file di testo (il file di salvataggio) dal browser
function scaricaFile(nome, testo) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([testo], { type: 'application/json' }));
  link.download = nome;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

// Tipi di immagine accettati per le copertine e controllo dei primi byte (come nel server)
const TIPI_COPERTINA = ['image/png', 'image/jpeg', 'image/webp'];
const LIMITE_COPERTINA = 10 * 1024 * 1024; // 10 MB
function formatoImmagineValido(tipo, byte) {
  const inizia = (...valori) => valori.every((v, i) => byte[i] === v);
  if (tipo === 'image/png') return inizia(0x89, 0x50, 0x4e, 0x47);
  if (tipo === 'image/jpeg') return inizia(0xff, 0xd8, 0xff);
  if (tipo === 'image/webp') return inizia(0x52, 0x49, 0x46, 0x46) && byte[8] === 0x57 && byte[9] === 0x45 && byte[10] === 0x42 && byte[11] === 0x50; // "RIFF" ... "WEBP"
  return false;
}

// Conversioni tra immagine (Blob) e testo base64, per metterla nel file di salvataggio
function blobInBase64(blob) {
  return new Promise((resolve, reject) => {
    const lettore = new FileReader();
    lettore.onload = () => resolve(String(lettore.result).split(',')[1]);
    lettore.onerror = () => reject(lettore.error);
    lettore.readAsDataURL(blob);
  });
}
function base64InByte(testo) {
  const binario = atob(testo);
  const byte = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) byte[i] = binario.charCodeAt(i);
  return byte;
}

const nomeFileSalvataggio = () => `platinum-questbook-salvataggio-${new Date().toISOString().slice(0, 10)}.json`;

// Legge e controlla il testo di un file di salvataggio
function leggiSalvataggio(testo) {
  let dati;
  try {
    dati = JSON.parse(testo);
  } catch {
    throw new Error('Il file non è un JSON valido');
  }
  if (!eOggetto(dati) || dati.formato !== FORMATO_SALVATAGGIO || !eOggetto(dati.giochi)) {
    throw new Error('Questo non sembra un file di salvataggio del Platinum Questbook');
  }
  return dati;
}

// -----------------------------------------------------------------------------
// MODO SERVER: tutto passa dalle API del server locale
// -----------------------------------------------------------------------------
const archivioServer = {
  salvaCopertina(id, tipo, file) {
    return fetch('api/copertine/' + id, { method: 'POST', headers: { 'Content-Type': tipo }, body: file })
      .then(async (risposta) => {
        const dati = await risposta.json().catch(() => ({}));
        if (!risposta.ok) throw new Error(dati.errore || 'errore ' + risposta.status);
        return dati.copertina;
      });
  },

  async chiedi(indirizzo, opzioni) {
    const risposta = await fetch(indirizzo, opzioni);
    const dati = await risposta.json().catch(() => ({}));
    if (!risposta.ok) throw new Error(dati.errore || 'Il server ha risposto con errore ' + risposta.status);
    return dati;
  },
  elenco() { return this.chiedi('api/giochi'); },
  guida(id) { return this.chiedi('api/giochi/' + id); },
  progressi(id) { return this.chiedi('api/progressi/' + id); },
  salva(id, progressi) {
    return this.chiedi('api/progressi/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(progressi) });
  },
  async esporta(conCopertine) {
    const risposta = await fetch('api/salvataggio' + (conCopertine ? '?copertine=1' : ''));
    scaricaFile(nomeFileSalvataggio(), await risposta.text());
  },
  importa(testo, modo) {
    return this.chiedi('api/salvataggio?modo=' + modo, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: testo });
  },
};

// -----------------------------------------------------------------------------
// MODO SITO: file statici + progressi nel browser
// -----------------------------------------------------------------------------
const PREFISSO_PROGRESSI = 'platinum-questbook:progressi:';

const archivioSito = {
  // Online la copertina scelta resta nel browser di questo dispositivo (IndexedDB, come quelle importate dal salvataggio)
  async salvaCopertina(id, tipo, file) {
    const byte = new Uint8Array(await file.arrayBuffer());
    if (!formatoImmagineValido(tipo, byte)) throw new Error("il file non è un'immagine valida");
    try {
      await this.sulleCopertine('readwrite', (deposito) => deposito.put({ id, immagine: new Blob([byte], { type: tipo }) }));
    } catch {
      throw new Error("il browser non permette di salvare l'immagine (navigazione privata?)");
    }
    this.indice = null;           // rileggo l'indice: la nuova copertina prende il posto della vecchia
    this.guideInMemoria = {};
    return { url: (await this.leggiIndice()).find((g) => g.id === id).copertina.url, predefinita: false };
  },
  indice: null,          // elenco dei giochi (indice.json), letto una volta
  guideInMemoria: {},    // guide già scaricate

  async leggiFile(indirizzo) {
    const risposta = await fetch(indirizzo);
    if (!risposta.ok) throw new Error('File non trovato (' + indirizzo + ', errore ' + risposta.status + ')');
    return risposta.json();
  },
  async leggiIndice() {
    if (!this.indice) {
      const indice = await this.leggiFile('indice.json');
      // Le copertine importate dal salvataggio (tenute nel browser) hanno la precedenza su quella predefinita
      for (const voce of indice) {
        const salvata = await this.leggiCopertinaSalvata(voce.id);
        if (salvata) voce.copertina = { url: URL.createObjectURL(salvata.immagine), predefinita: false };
      }
      this.indice = indice;
    }
    return this.indice;
  },

  // Copertine importate: le tengo in IndexedDB (il localStorage è troppo piccolo per le immagini).
  // Ogni voce: { id, immagine: Blob }. Se il browser non lo permette, si usa la copertina predefinita.
  apriDatabase() {
    return new Promise((resolve, reject) => {
      const richiesta = indexedDB.open('platinum-questbook', 1);
      richiesta.onupgradeneeded = () => richiesta.result.createObjectStore('copertine', { keyPath: 'id' });
      richiesta.onsuccess = () => resolve(richiesta.result);
      richiesta.onerror = () => reject(richiesta.error);
    });
  },
  // Esegue una operazione sul deposito delle copertine e restituisce il risultato
  async sulleCopertine(modo, operazione) {
    const db = await this.apriDatabase();
    try {
      return await new Promise((resolve, reject) => {
        const transazione = db.transaction('copertine', modo);
        const richiesta = operazione(transazione.objectStore('copertine'));
        transazione.oncomplete = () => resolve(richiesta.result);
        transazione.onerror = transazione.onabort = () => reject(transazione.error);
      });
    } finally {
      db.close();
    }
  },
  async leggiCopertinaSalvata(id) {
    try { return await this.sulleCopertine('readonly', (deposito) => deposito.get(id)); } catch { return null; }
  },
  async tutteLeCopertineSalvate() {
    try { return await this.sulleCopertine('readonly', (deposito) => deposito.getAll()); } catch { return []; }
  },

  // Progressi salvati nel browser. Se il browser non permette di salvare (es. navigazione privata) si avvisa
  leggiProgressiSalvati(id) {
    try {
      const testo = localStorage.getItem(PREFISSO_PROGRESSI + id);
      const dati = testo ? JSON.parse(testo) : {};
      return normalizzaProgressi(progressiValidi(dati) ? dati : {});
    } catch {
      return normalizzaProgressi({});
    }
  },
  scriviProgressiSalvati(id, progressi) {
    try {
      localStorage.setItem(PREFISSO_PROGRESSI + id, JSON.stringify(progressi));
    } catch {
      throw new Error('il browser non permette di salvare dati (navigazione privata?)');
    }
  },

  async guida(id) {
    if (!this.guideInMemoria[id]) {
      const indice = await this.leggiIndice();
      const voce = indice.find((g) => g.id === id);
      if (!voce) throw new Error('Guida non trovata');
      this.guideInMemoria[id] = { ...(await this.leggiFile('data/guides/' + id + '.json')), copertina: voce.copertina };
    }
    return this.guideInMemoria[id];
  },
  async progressi(id) { return this.leggiProgressiSalvati(id); },
  async salva(id, progressi) { this.scriviProgressiSalvati(id, progressi); },

  // Un passo (o capitolo) con "soloSe" vale solo per chi ha fatto quella scelta (come nel server)
  applicabile(oggetto, scelte) {
    for (const [idScelta, valori] of Object.entries(oggetto.soloSe || {})) {
      const fatta = scelte[idScelta];
      if (fatta && ![].concat(valori).includes(fatta)) return false;
    }
    return true;
  },
  // Percentuali di completamento (stesso calcolo del server): storia e totale
  calcolaCompletamento(guida, progressi) {
    let storiaTot = 0, storiaFatti = 0, tutti = 0, tuttiFatti = 0;
    for (const capitolo of guida.capitoli || []) {
      if (!this.applicabile(capitolo, progressi.scelte)) continue;
      for (const passo of capitolo.passi || []) {
        if (!this.applicabile(passo, progressi.scelte)) continue;
        if (passo.tipo === 'raccolta') {
          tutti += passo.quantita;
          tuttiFatti += Math.min(progressi.contatori[passo.id] || 0, passo.quantita);
          continue;
        }
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
    return { storia: percentuale(storiaFatti, storiaTot), totale: percentuale(tuttiFatti, tutti) };
  },

  async elenco() {
    const indice = await this.leggiIndice();
    const giochi = await Promise.all(indice.map(async (voce) => ({
      ...voce,
      completamento: this.calcolaCompletamento(await this.guida(voce.id), this.leggiProgressiSalvati(voce.id)),
    })));
    return giochi.sort((a, b) => a.titolo.localeCompare(b.titolo));
  },

  async esporta(conCopertine) {
    const giochi = {};
    for (const { id } of await this.leggiIndice()) {
      if (localStorage.getItem(PREFISSO_PROGRESSI + id)) giochi[id] = this.leggiProgressiSalvati(id);
    }
    const salvataggio = { formato: FORMATO_SALVATAGGIO, versione: 1, esportatoIl: new Date().toISOString(), giochi };
    if (conCopertine) {
      salvataggio.copertine = {};
      for (const { id, immagine } of await this.tutteLeCopertineSalvate()) {
        salvataggio.copertine[id] = { tipo: immagine.type, dati: await blobInBase64(immagine) };
      }
    }
    scaricaFile(nomeFileSalvataggio(), JSON.stringify(salvataggio, null, 2));
  },

  async importa(testo, modo) {
    const dati = leggiSalvataggio(testo);
    const indice = await this.leggiIndice();
    const importati = [];
    const ignorati = [];
    for (const [id, nuovi] of Object.entries(dati.giochi)) {
      const voce = indice.find((g) => g.id === id);
      // Ignoro i giochi senza guida qui e i dati malformati
      if (!voce || !progressiValidi(nuovi)) { ignorati.push(id); continue; }
      const nuoviNormali = normalizzaProgressi(nuovi);
      this.scriviProgressiSalvati(id, modo === 'sostituisci' ? nuoviNormali : unisciProgressi(this.leggiProgressiSalvati(id), nuoviNormali));
      importati.push(voce.titolo);
    }
    // Copertine (se il file le contiene): ognuna sostituisce quella attuale dello stesso gioco
    const copertineImportate = [];
    for (const [id, copertina] of Object.entries(eOggetto(dati.copertine) ? dati.copertine : {})) {
      const voce = indice.find((g) => g.id === id);
      try {
        if (!voce || !eOggetto(copertina) || !TIPI_COPERTINA.includes(copertina.tipo) || typeof copertina.dati !== 'string') throw new Error('non valida');
        const byte = base64InByte(copertina.dati);
        if (byte.length === 0 || byte.length > LIMITE_COPERTINA || !formatoImmagineValido(copertina.tipo, byte)) throw new Error('non valida');
        const immagine = new Blob([byte], { type: copertina.tipo });
        await this.sulleCopertine('readwrite', (deposito) => deposito.put({ id, immagine }));
        copertineImportate.push(voce.titolo);
      } catch {
        ignorati.push('copertina ' + id);
      }
    }
    // Rilego indice e guide, così le nuove copertine si vedono subito
    this.indice = null;
    this.guideInMemoria = {};
    return { ok: true, modo, importati, copertineImportate, ignorati };
  },
};

// -----------------------------------------------------------------------------
// Scelta del modo: se risponde il server locale uso quello, altrimenti il modo sito
// -----------------------------------------------------------------------------
let archivio = archivioSito;
async function avviaArchivio() {
  try {
    const risposta = await fetch('api/giochi');
    if ((risposta.headers.get('Content-Type') || '').includes('application/json')) archivio = archivioServer;
  } catch {
    // nessun server raggiungibile: resta il modo sito
  }
}

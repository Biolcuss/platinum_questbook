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
//   archivio.esporta()             scarica il file di salvataggio
//   archivio.importa(testo, modo)  importa un file di salvataggio ('unisci' | 'sostituisci')
//   archivio.copertineModificabili true solo in modo server (online non si può caricare un'immagine)
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
  copertineModificabili: true,

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
  async esporta() {
    const risposta = await fetch('api/salvataggio');
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
  copertineModificabili: false,
  indice: null,          // elenco dei giochi (indice.json), letto una volta
  guideInMemoria: {},    // guide già scaricate

  async leggiFile(indirizzo) {
    const risposta = await fetch(indirizzo);
    if (!risposta.ok) throw new Error('File non trovato (' + indirizzo + ', errore ' + risposta.status + ')');
    return risposta.json();
  },
  async leggiIndice() {
    if (!this.indice) this.indice = await this.leggiFile('indice.json');
    return this.indice;
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

  async esporta() {
    const giochi = {};
    for (const { id } of await this.leggiIndice()) {
      if (localStorage.getItem(PREFISSO_PROGRESSI + id)) giochi[id] = this.leggiProgressiSalvati(id);
    }
    scaricaFile(nomeFileSalvataggio(), JSON.stringify({ formato: FORMATO_SALVATAGGIO, versione: 1, esportatoIl: new Date().toISOString(), giochi }, null, 2));
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
    return { ok: true, modo, importati, ignorati };
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

// =============================================================================
// Game Tracker — interfaccia
// -----------------------------------------------------------------------------
// Questo file costruisce la pagina nel browser. Funziona così:
//   1. guarda l'indirizzo (la parte dopo il "#") per capire quale pagina mostrare:
//        #/                         → elenco dei giochi
//        #/gioco/<id>               → guida di un gioco (scheda "Guida")
//        #/gioco/<id>/trofei        → scheda "Trofei"   (oppure /info)
//   2. chiede al server i dati (guida + progressi) con fetch();
//   3. costruisce gli elementi HTML con la funzione el();
//   4. quando spunti qualcosa aggiorna i progressi e li salva sul server.
// =============================================================================

const radice = document.getElementById('app');

// -----------------------------------------------------------------------------
// Icone pixel art
// Ogni icona è una griglia di caratteri: '#' = pixel colorato, '.' = vuoto.
// Vengono disegnate come SVG con un quadratino per pixel e prendono il colore del testo.
// -----------------------------------------------------------------------------
const ICONE = {
  gemma: [
    '..#####..',
    '.#.###.#.',
    '#########',
    '.#######.',
    '..#####..',
    '...###...',
    '....#....',
  ],
  coppa: [
    '#########',
    '#.#####.#',
    '#.#####.#',
    '.#######.',
    '..#####..',
    '...###...',
    '...###...',
    '..#####..',
  ],
  punto: [ // punto esclamativo, come nelle missioni dei giochi di ruolo
    '.###.',
    '.###.',
    '.###.',
    '.###.',
    '.....',
    '.###.',
    '.###.',
  ],
  stella: [
    '...#...',
    '...#...',
    '#######',
    '.#####.',
    '..###..',
    '.##.##.',
    '##...##',
  ],
  clessidra: [
    '#######',
    '#.....#',
    '.#...#.',
    '..#.#..',
    '...#...',
    '..#.#..',
    '.#####.',
    '#######',
  ],
  attenzione: [
    '....#....',
    '...###...',
    '...#.#...',
    '..##.##..',
    '..##.##..',
    '.#######.',
    '.###.###.',
    '#########',
  ],
  destra: [
    '#....',
    '##...',
    '###..',
    '####.',
    '###..',
    '##...',
    '#....',
  ],
  sinistra: [
    '....#',
    '...##',
    '..###',
    '.####',
    '..###',
    '...##',
    '....#',
  ],
};

const SVG_NS = 'http://www.w3.org/2000/svg';

// Crea l'icona indicata; "scala" è la grandezza di ogni pixel (numero intero, così resta nitida)
function icona(nome, scala = 2) {
  const righe = ICONE[nome];
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${righe[0].length} ${righe.length}`);
  svg.setAttribute('width', righe[0].length * scala);
  svg.setAttribute('height', righe.length * scala);
  svg.setAttribute('class', 'icona');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('fill', 'currentColor');
  righe.forEach((riga, y) => {
    [...riga].forEach((carattere, x) => {
      if (carattere !== '#') return;
      const quadrato = document.createElementNS(SVG_NS, 'rect');
      quadrato.setAttribute('x', x);
      quadrato.setAttribute('y', y);
      quadrato.setAttribute('width', 1);
      quadrato.setAttribute('height', 1);
      svg.append(quadrato);
    });
  });
  return svg;
}

// -----------------------------------------------------------------------------
// Funzioni di supporto
// -----------------------------------------------------------------------------

// Crea un elemento HTML. Esempio: el('p', { class: 'nota' }, 'Ciao')  →  <p class="nota">Ciao</p>
// Il testo viene inserito come testo semplice (mai come HTML), quindi è sicuro.
function el(tag, attributi = {}, ...figli) {
  const nodo = document.createElement(tag);
  for (const [nome, valore] of Object.entries(attributi)) {
    if (nome === 'class') nodo.className = valore;
    else if (nome.startsWith('on')) nodo.addEventListener(nome.slice(2), valore); // es. onclick
    else if (valore === true) nodo.setAttribute(nome, '');
    else if (valore !== false && valore != null) nodo.setAttribute(nome, valore);
  }
  for (const figlio of figli.flat(Infinity)) { // flat(Infinity) appiattisce anche gli elenchi dentro gli elenchi
    if (figlio !== null && figlio !== undefined && figlio !== false) nodo.append(figlio);
  }
  return nodo;
}

// Una "finestra": riquadro con bordo a gradini (il bordo si colora con la variabile --bordo-finestra)
function finestra(...contenuto) {
  return el('div', { class: 'finestra' }, el('div', { class: 'finestra-in' }, contenuto));
}

// Mostra per qualche secondo un messaggio in basso (usato per gli errori)
let timerAvviso = null;
function mostraAvviso(testo) {
  const box = document.getElementById('avviso');
  box.textContent = testo;
  box.classList.remove('nascosto');
  clearTimeout(timerAvviso);
  timerAvviso = setTimeout(() => box.classList.add('nascosto'), 6000);
}

// Chiede dati al server e li restituisce come oggetto
async function chiediAlServer(indirizzo) {
  const risposta = await fetch(indirizzo);
  if (!risposta.ok) throw new Error('Il server ha risposto con errore ' + risposta.status);
  return risposta.json();
}

// -----------------------------------------------------------------------------
// Stato della pagina del gioco (le variabili che cambiano mentre usi l'app)
// -----------------------------------------------------------------------------
let guida = null;        // la guida completa del gioco
let progressi = null;    // { completati: { idPasso: data }, sonoQui: idPasso | null }
let scheda = 'guida';    // scheda aperta: 'guida' | 'trofei' | 'info'
const filtri = { tipo: 'tutto', nascondiCompletati: false }; // tipo: 'tutto' | 'storia' | 'opzionali'

// Riferimenti agli elementi creati, così possiamo aggiornarli senza ricostruire tutta la pagina
let righePassi = [];     // { passo, riga, casella, bottoneQui }
let capitoliVista = [];  // { capitolo, sezione, stato }
let righeTrofei = [];    // { trofeo, riga, casella, avanzamento }
let contenitoreRiepilogo = null;
let contenitoreAvviso = null;

// Tutti i passi della guida in ordine di timeline, con la loro posizione
let ordine = [];         // [{ passo, capitolo }]
let posizione = {};      // idPasso → numero d'ordine

// -----------------------------------------------------------------------------
// Logica dei progressi
// -----------------------------------------------------------------------------

// La "chiave" con cui un passo viene salvato nei progressi.
// Un passo di tipo "trofeo" usa l'id del trofeo (così è la stessa cosa spuntarlo lì o nell'elenco trofei).
function chiave(passo) {
  return passo.tipo === 'trofeo' ? passo.trofeo : passo.id;
}

function fatto(chiaveOId) {
  return Boolean(progressi.completati[chiaveOId]);
}

function preparaOrdine() {
  ordine = [];
  posizione = {};
  for (const capitolo of guida.capitoli) {
    for (const passo of capitolo.passi) {
      posizione[passo.id] = ordine.length;
      ordine.push({ passo, capitolo });
    }
  }
}

// Conta i passi fatti e totali che rispettano una condizione
function conta(condizione) {
  let tot = 0, ok = 0;
  for (const { passo } of ordine) {
    if (!condizione(passo)) continue;
    tot++;
    if (fatto(chiave(passo))) ok++;
  }
  return { ok, tot };
}

// Salva i progressi sul server. Se fallisce avvisa l'utente.
async function salva() {
  try {
    const risposta = await fetch('/api/progressi/' + guida.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(progressi),
    });
    if (!risposta.ok) throw new Error('errore ' + risposta.status);
  } catch (errore) {
    mostraAvviso('Impossibile salvare i progressi (' + errore.message + '). Controlla che il server sia ancora acceso, poi riprova.');
  }
}

// Spunta o toglie la spunta a un passo/trofeo
function impostaFatto(chiaveId, valore) {
  if (valore) progressi.completati[chiaveId] = new Date().toISOString();
  else delete progressi.completati[chiaveId];
  aggiornaVista();
  salva();
}

// "Sono qui" su un passo di storia
function impostaSonoQui(passo) {
  progressi.sonoQui = passo.id;

  // Se prima di questo punto ci sono passi di storia non spuntati, chiedo se segnarli come fatti
  const indice = posizione[passo.id];
  const daSegnare = ordine.filter(({ passo: p }, i) => i < indice && p.tipo === 'storia' && !fatto(chiave(p)));
  if (daSegnare.length > 0) {
    const conferma = window.confirm(
      `Vuoi segnare come completati i ${daSegnare.length} passi di storia precedenti?\n\n` +
      'Verranno spuntati solo i passi della storia. Collezionabili e trofei restano come sono.'
    );
    if (conferma) {
      const adesso = new Date().toISOString();
      for (const { passo: p } of daSegnare) progressi.completati[chiave(p)] = adesso;
    }
  }
  aggiornaVista();
  salva();
}

// -----------------------------------------------------------------------------
// Pagina iniziale: elenco dei giochi
// -----------------------------------------------------------------------------
async function mostraElenco() {
  guida = null;
  document.title = 'Game Tracker';
  radice.replaceChildren(el('main', { class: 'pagina', id: 'contenuto' }, el('p', { class: 'vuoto' }, 'Caricamento…')));
  let giochi;
  try {
    giochi = await chiediAlServer('/api/giochi');
  } catch (errore) {
    radice.replaceChildren(el('main', { class: 'pagina', id: 'contenuto' },
      el('p', { class: 'vuoto' }, 'Impossibile caricare i giochi: ' + errore.message + '. Controlla che il server sia acceso.')));
    return;
  }

  const lista = giochi.length === 0
    ? el('p', { class: 'vuoto' }, 'Nessuna guida presente. Chiedi a Claude di crearne una.')
    : el('div', { class: 'elenco-giochi' }, giochi.map((gioco) =>
        el('a', { class: 'scheda-gioco', href: '#/gioco/' + gioco.id },
          finestra(
            el('h2', {}, gioco.titolo),
            el('p', {}, gioco.piattaforma),
            el('div', { class: 'moduli' },
              el('span', { class: 'modulo m-storia' }, icona('stella'), 'Storia ', el('b', {}, gioco.completamento.storia + '%')),
              el('span', { class: 'modulo m-oro' }, icona('gemma'), 'Totale ', el('b', {}, gioco.completamento.totale + '%')))))));

  radice.replaceChildren(el('main', { class: 'pagina', id: 'contenuto' },
    el('h1', { class: 'titolo-app' }, 'Game Tracker'),
    el('p', { class: 'sottotitolo' }, 'Scegli un gioco per aprire la sua guida e spuntare i tuoi progressi.'),
    lista));
}

// -----------------------------------------------------------------------------
// Pagina del gioco
// -----------------------------------------------------------------------------
async function mostraGioco(id, nuovaScheda) {
  scheda = nuovaScheda;
  radice.replaceChildren(el('main', { class: 'pagina', id: 'contenuto' }, el('p', { class: 'vuoto' }, 'Caricamento…')));
  try {
    guida = await chiediAlServer('/api/giochi/' + id);
    progressi = await chiediAlServer('/api/progressi/' + id);
  } catch (errore) {
    guida = null;
    radice.replaceChildren(el('main', { class: 'pagina', id: 'contenuto' },
      el('p', { class: 'vuoto' }, 'Impossibile caricare la guida: ' + errore.message),
      el('a', { href: '#/' }, 'Torna all\'elenco dei giochi')));
    return;
  }
  document.title = guida.titolo + ' — Game Tracker';
  preparaOrdine();
  disegnaGioco();
  // All'apertura vado al punto in cui ero rimasto
  const qui = righePassi.find((r) => r.passo.id === progressi.sonoQui);
  if (qui) qui.riga.scrollIntoView({ block: 'center' });
}

const SCHEDE = [
  ['guida', 'Guida'],
  ['trofei', 'Trofei'],
  ['info', 'Info'],
];

// Costruisce la struttura della pagina del gioco: barra + titolo + scheda attiva
function disegnaGioco() {
  contenitoreRiepilogo = el('div', { class: 'moduli' });

  const barra = el('header', { class: 'barra' },
    el('div', { class: 'barra-in' },
      el('a', { href: '#/', class: 'btn indietro', 'aria-label': 'Torna all\'elenco dei giochi' }, icona('sinistra'), 'Giochi'),
      el('nav', { class: 'spazi', 'aria-label': 'Sezioni della guida' },
        SCHEDE.map(([nome, etichetta]) =>
          el('a', {
            class: 'spazio',
            href: `#/gioco/${guida.id}/${nome}`,
            'aria-current': nome === scheda ? 'page' : false,
          }, etichetta))),
      contenitoreRiepilogo));

  let corpo;
  if (scheda === 'guida') corpo = costruisciTimeline();
  else if (scheda === 'trofei') corpo = costruisciTrofei();
  else corpo = costruisciInfo();

  radice.replaceChildren(el('div', { class: 'pagina' },
    barra,
    el('main', { id: 'contenuto' },
      el('div', { class: 'titolo-gioco' },
        el('h1', {}, guida.titolo),
        el('p', {}, guida.piattaforma)),
      corpo)));
  aggiornaVista();
}

// ------------------------------------------------------------ Scheda "Guida"
function azzeraRiferimenti() {
  righePassi = [];
  capitoliVista = [];
  righeTrofei = [];
  contenitoreAvviso = null;
}

function costruisciTimeline() {
  azzeraRiferimenti();
  contenitoreAvviso = el('div');

  // Filtri
  const gruppoTipo = el('div', { class: 'gruppo', role: 'group', 'aria-label': 'Cosa mostrare' });
  for (const [valore, etichetta] of [['tutto', 'Tutto'], ['storia', 'Solo storia'], ['opzionali', 'Solo opzionali']]) {
    gruppoTipo.append(el('button', {
      class: 'btn',
      'aria-pressed': String(filtri.tipo === valore),
      onclick: (e) => {
        filtri.tipo = valore;
        for (const b of gruppoTipo.children) b.setAttribute('aria-pressed', String(b === e.currentTarget));
        aggiornaVista();
      },
    }, etichetta));
  }
  const casellaNascondi = el('input', {
    type: 'checkbox',
    class: 'spunta',
    onchange: (e) => { filtri.nascondiCompletati = e.target.checked; aggiornaVista(); },
  });
  casellaNascondi.checked = filtri.nascondiCompletati;

  const barraStrumenti = el('div', { class: 'strumenti' },
    gruppoTipo,
    el('label', {}, casellaNascondi, 'Nascondi completati'),
    el('div', { class: 'spazio-flex' },
      el('button', { class: 'btn', onclick: () => impostaCapitoliAperti(true) }, 'Apri tutti'),
      el('button', { class: 'btn', onclick: () => impostaCapitoliAperti(false) }, 'Chiudi tutti')));

  // Capitoli: apro quello del "Sono qui", altrimenti il primo non ancora finito
  const idCapitoloQui = progressi.sonoQui ? ordine[posizione[progressi.sonoQui]]?.capitolo.id : null;
  const primoIncompleto = guida.capitoli.find((c) => c.passi.some((p) => !fatto(chiave(p))));
  const idDaAprire = idCapitoloQui || (primoIncompleto && primoIncompleto.id);

  const capitoli = guida.capitoli.map((capitolo) => costruisciCapitolo(capitolo, capitolo.id === idDaAprire));
  return el('div', {}, barraStrumenti, contenitoreAvviso, capitoli);
}

function costruisciCapitolo(capitolo, aperto) {
  const stato = el('span', { class: 'mini' });
  const idCorpo = 'corpo-' + capitolo.id;
  const testata = el('button', {
    'aria-expanded': String(aperto),
    'aria-controls': idCorpo,
    onclick: () => {
      const apertoOra = sezione.classList.toggle('aperto');
      testata.setAttribute('aria-expanded', String(apertoOra));
    },
  },
    el('span', { class: 'freccia' }, icona('destra')),
    el('span', { class: 'numero' }, capitolo.numero + '.'),
    el('span', { class: 'nome' }, capitolo.nome),
    stato);

  const corpo = el('div', { class: 'corpo', id: idCorpo },
    capitolo.riepilogo ? el('p', { class: 'riepilogo-capitolo' }, capitolo.riepilogo) : null,
    capitolo.passi.map(costruisciPasso));

  const sezione = el('section', { class: 'capitolo' + (aperto ? ' aperto' : ''), id: 'cap-' + capitolo.id },
    finestra(el('h2', { class: 'testata' }, testata), corpo));
  capitoliVista.push({ capitolo, sezione, stato });
  return sezione;
}

// Etichetta e icona di ogni tipo di passo (la storia non ha etichetta: è il caso normale)
const TIPI_PASSO = {
  collezionabile: { nome: 'Collezionabile', icona: 'gemma' },
  trofeo: { nome: 'Trofeo', icona: 'coppa' },
  secondaria: { nome: 'Missione secondaria', icona: 'punto' },
};

function costruisciPasso(passo) {
  const k = chiave(passo);
  const idCasella = 'spunta-' + passo.id;
  const casella = el('input', {
    type: 'checkbox',
    class: 'spunta',
    id: idCasella,
    onchange: (e) => impostaFatto(k, e.target.checked),
  });

  const bottoneQui = passo.tipo === 'storia'
    ? el('button', { class: 'btn', onclick: () => impostaSonoQui(passo) }, 'Sono qui')
    : null;

  const tipo = TIPI_PASSO[passo.tipo];
  const contenuto = el('div', { class: 'contenuto' },
    tipo ? el('p', { class: 'tipo' }, icona(tipo.icona), tipo.nome) : null,
    // L'etichetta è collegata alla casella: cliccare sul titolo spunta il passo
    el('label', { class: 'titolo-passo', for: idCasella }, passo.titolo),
    passo.descrizione ? el('p', {}, passo.descrizione) : null,
    passo.dove ? el('p', { class: 'dove' }, el('b', {}, 'Dove: '), passo.dove) : null,
    passo.mancabile ? el('p', { class: 'avvertenza mancabile' }, icona('clessidra'), el('span', {}, 'Mancabile: ' + passo.notaMancabile)) : null,
    passo.daVerificare ? el('p', { class: 'avvertenza verifica' }, icona('attenzione'), el('span', {}, 'Da verificare: ' + passo.notaVerifica)) : null,
    passo.nota ? el('p', { class: 'nota' }, el('b', {}, 'Nota: '), passo.nota) : null,
    passo.soluzione
      ? el('details', { class: 'soluzione' },
          el('summary', {}, 'Mostra la soluzione (spoiler)'),
          el('p', {}, passo.soluzione))
      : null,
    bottoneQui ? el('div', { class: 'azioni-passo' }, bottoneQui) : null);

  const riga = el('div', { class: 'passo t-' + passo.tipo, id: 'passo-' + passo.id }, casella, contenuto);
  righePassi.push({ passo, riga, casella, bottoneQui });
  return riga;
}

function impostaCapitoliAperti(aperti) {
  for (const { sezione } of capitoliVista) {
    sezione.classList.toggle('aperto', aperti);
    sezione.querySelector('.testata button').setAttribute('aria-expanded', String(aperti));
  }
}

// ----------------------------------------------------------- Scheda "Trofei"
function costruisciTrofei() {
  azzeraRiferimenti();

  if (!guida.trofei || guida.trofei.length === 0) {
    return el('p', { class: 'vuoto' }, 'Questa guida non ha trofei.');
  }

  const carte = guida.trofei.map((trofeo) => {
    const idCasella = 'spunta-' + trofeo.id;
    const casella = el('input', {
      type: 'checkbox',
      class: 'spunta',
      id: idCasella,
      onchange: (e) => impostaFatto(trofeo.id, e.target.checked),
    });
    const avanzamento = trofeo.obiettivo ? el('p', { class: 'avanzamento' }) : null;
    const riga = el('div', { class: 'trofeo-card' },
      finestra(el('div', { class: 'riga-trofeo' }, casella,
        el('div', { class: 'contenuto' },
          el('label', { class: 'titolo-passo', for: idCasella }, trofeo.nome, el('span', { class: 'grado ' + trofeo.grado }, trofeo.grado)),
          el('p', {}, trofeo.descrizione),
          trofeo.suggerimento ? el('p', { class: 'nota' }, el('b', {}, 'Consiglio: '), trofeo.suggerimento) : null,
          trofeo.mancabile ? el('p', { class: 'avvertenza mancabile' }, icona('clessidra'), el('span', {}, 'Mancabile: ' + trofeo.notaMancabile)) : null,
          trofeo.daVerificare ? el('p', { class: 'avvertenza verifica' }, icona('attenzione'), el('span', {}, 'Da verificare: ' + trofeo.notaVerifica)) : null,
          avanzamento))));
    righeTrofei.push({ trofeo, riga, casella, avanzamento });
    return riga;
  });
  return el('div', {}, carte);
}

// ------------------------------------------------------------- Scheda "Info"
function costruisciInfo() {
  azzeraRiferimenti();

  return el('div', { class: 'capitolo' }, finestra(el('div', { class: 'info-testo' },
    guida.introduzione ? [el('h2', {}, 'Da sapere prima di iniziare'), el('ul', {}, guida.introduzione.map((t) => el('li', {}, t)))] : null,
    guida.percorsoConsigliato ? [el('h2', {}, 'Percorso consigliato'), el('ol', {}, guida.percorsoConsigliato.map((t) => el('li', {}, t)))] : null,
    el('h2', {}, 'Fonti della guida'),
    el('ul', {}, guida.fonti.map((f) => el('li', {}, el('a', { href: f.url, target: '_blank', rel: 'noopener noreferrer' }, f.nome)))),
    el('p', { class: 'nota' }, `Guida versione ${guida.versioneGuida}, verificata il ${guida.verificataIl}.`))));
}

// -----------------------------------------------------------------------------
// Aggiornamento della vista dopo ogni cambiamento
// (non ricostruisce la pagina: cambia solo classi e testi, così non perdi la posizione)
// -----------------------------------------------------------------------------
function aggiornaVista() {
  const idQui = progressi.sonoQui;
  const indiceQui = idQui !== null && posizione[idQui] !== undefined ? posizione[idQui] : -1;

  // Passi
  for (const { passo, riga, casella, bottoneQui } of righePassi) {
    const completato = fatto(chiave(passo));
    casella.checked = completato;
    riga.classList.toggle('fatto', completato);
    riga.classList.toggle('qui', passo.id === idQui);
    if (bottoneQui) bottoneQui.textContent = passo.id === idQui ? 'Sei qui' : 'Sono qui';

    const nascosto =
      (filtri.tipo === 'storia' && passo.tipo !== 'storia') ||
      (filtri.tipo === 'opzionali' && passo.tipo === 'storia') ||
      (filtri.nascondiCompletati && completato);
    riga.classList.toggle('nascosto', nascosto);
  }

  // Capitoli: contatori e segno "corrente/finito"
  for (const { capitolo, sezione, stato } of capitoliVista) {
    const storia = contaInCapitolo(capitolo, (p) => p.tipo === 'storia');
    const extra = contaInCapitolo(capitolo, (p) => p.tipo !== 'storia');
    const moduli = [el('span', { class: 'modulo' }, 'storia ', el('b', {}, `${storia.ok}/${storia.tot}`))];
    if (extra.tot > 0) moduli.push(el('span', { class: 'modulo' }, 'extra ', el('b', {}, `${extra.ok}/${extra.tot}`)));
    stato.replaceChildren(...moduli);
    sezione.classList.toggle('finito', storia.ok + extra.ok === storia.tot + extra.tot);
    sezione.classList.toggle('corrente', idQui !== null && ordine[indiceQui]?.capitolo.id === capitolo.id);
  }

  // Trofei
  for (const { trofeo, riga, casella, avanzamento } of righeTrofei) {
    const ottenuto = fatto(trofeo.id);
    casella.checked = ottenuto;
    riga.classList.toggle('fatto', ottenuto);
    let pronto = false;
    if (avanzamento) {
      const { categoria, quantita } = trofeo.obiettivo;
      const trovati = conta((p) => p.tipo === 'collezionabile' && p.categoria === categoria).ok;
      pronto = !ottenuto && trovati >= quantita;
      avanzamento.textContent = pronto
        ? `Hai già trovato ${trovati}: dovresti averlo ottenuto, spuntalo!`
        : `Avanzamento (secondo le tue spunte): ${Math.min(trovati, quantita)}/${quantita}`;
      avanzamento.classList.toggle('pronto', pronto);
    }
    riga.classList.toggle('pronto', pronto);
  }

  aggiornaRiepilogo();
  aggiornaAvvisoMancabili();
}

function contaInCapitolo(capitolo, condizione) {
  let tot = 0, ok = 0;
  for (const passo of capitolo.passi) {
    if (!condizione(passo)) continue;
    tot++;
    if (fatto(chiave(passo))) ok++;
  }
  return { ok, tot };
}

// Moduli della barra: storia, una voce per ogni categoria di collezionabili, trofei
function aggiornaRiepilogo() {
  const voci = [];
  const aggiungi = (nome, nomeIcona, classe, { ok, tot }) => voci.push(
    el('span', { class: 'modulo ' + classe + (tot > 0 && ok === tot ? ' completo' : '') },
      icona(nomeIcona), nome + ' ', el('b', {}, `${ok}/${tot}`)));

  aggiungi('Storia', 'stella', 'm-storia', conta((p) => p.tipo === 'storia'));
  for (const categoria of guida.categorie || []) {
    aggiungi(categoria.nome, 'gemma', 'm-oro', conta((p) => p.tipo === 'collezionabile' && p.categoria === categoria.id));
  }
  if (guida.trofei && guida.trofei.length > 0) {
    aggiungi('Trofei', 'coppa', 'm-trofeo', { ok: guida.trofei.filter((t) => fatto(t.id)).length, tot: guida.trofei.length });
  }
  contenitoreRiepilogo.replaceChildren(...voci);
}

// Avviso: collezionabili "mancabili" non ancora spuntati, rispetto al punto "Sono qui"
function aggiornaAvvisoMancabili() {
  if (!contenitoreAvviso) return;
  contenitoreAvviso.replaceChildren();
  const indiceQui = progressi.sonoQui !== null ? posizione[progressi.sonoQui] : undefined;
  if (indiceQui === undefined) return;

  const capitoloQui = ordine[indiceQui].capitolo.id;
  const mancanti = ordine
    .map((voce, indice) => ({ ...voce, indice }))
    .filter(({ passo }) => passo.mancabile && !fatto(chiave(passo)));

  const saltati = mancanti.filter(({ indice }) => indice < indiceQui);
  const inCorso = mancanti.filter(({ indice, capitolo }) => indice >= indiceQui && capitolo.id === capitoloQui);
  if (saltati.length === 0 && inCorso.length === 0) return;

  const lista = (voci) => el('ul', {}, voci.map(({ passo, capitolo }) =>
    el('li', {},
      el('a', { href: '#passo-' + passo.id, onclick: (e) => vaiAlPasso(e, passo.id) }, `${passo.titolo} (cap. ${capitolo.numero})`),
      ': ' + passo.notaMancabile)));

  contenitoreAvviso.append(el('section', { class: 'box-avviso', 'aria-label': 'Tesori mancabili' },
    finestra(
      el('h2', {}, icona('clessidra'), 'Attenzione ai tesori mancabili'),
      inCorso.length > 0 ? [el('p', {}, 'Nel capitolo in cui ti trovi, da non perdere:'), lista(inCorso)] : null,
      saltati.length > 0 ? [el('p', {}, 'Prima del punto in cui sei e non ancora spuntati (li hai saltati?):'), lista(saltati)] : null)));
}

// Apre il capitolo del passo e ci scorre fino
function vaiAlPasso(evento, idPasso) {
  evento.preventDefault();
  const voce = righePassi.find((r) => r.passo.id === idPasso);
  if (!voce) return;
  const capitolo = capitoliVista.find((c) => c.capitolo.id === ordine[posizione[idPasso]].capitolo.id);
  if (capitolo) {
    capitolo.sezione.classList.add('aperto');
    capitolo.sezione.querySelector('.testata button').setAttribute('aria-expanded', 'true');
  }
  voce.riga.classList.remove('nascosto');
  voce.riga.scrollIntoView({ block: 'center' });
}

// -----------------------------------------------------------------------------
// Scelta della pagina in base all'indirizzo
// -----------------------------------------------------------------------------
function instrada() {
  const indirizzo = location.hash || '#/';
  const corrispondenza = indirizzo.match(/^#\/gioco\/([a-z0-9-]+)(?:\/(guida|trofei|info))?$/);
  if (corrispondenza) {
    const [, id, nuovaScheda = 'guida'] = corrispondenza;
    if (guida && guida.id === id) {
      // Stesso gioco, cambia solo scheda: non serve ricaricare i dati
      scheda = nuovaScheda;
      disegnaGioco();
      window.scrollTo(0, 0);
    } else {
      mostraGioco(id, nuovaScheda);
    }
  } else if (indirizzo.startsWith('#passo-') || indirizzo === '#contenuto') {
    return; // link interni (avvisi, "Vai al contenuto"): nessun cambio pagina
  } else {
    mostraElenco();
  }
}

window.addEventListener('hashchange', instrada);
instrada();

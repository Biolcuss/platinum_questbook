// =============================================================================
// Game Tracker — interfaccia
// -----------------------------------------------------------------------------
// Questo file costruisce la pagina nel browser. Funziona così:
//   1. guarda l'indirizzo (la parte dopo il "#") per capire quale pagina mostrare:
//        #/                    → elenco dei giochi
//        #/gioco/<id-gioco>    → guida di un gioco
//   2. chiede al server i dati (guida + progressi) con fetch();
//   3. costruisce gli elementi HTML con la funzione el();
//   4. quando spunti qualcosa aggiorna i progressi e li salva sul server.
// =============================================================================

const radice = document.getElementById('app');

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
  for (const figlio of figli.flat()) {
    if (figlio !== null && figlio !== undefined && figlio !== false) nodo.append(figlio);
  }
  return nodo;
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
let scheda = 'timeline'; // scheda aperta: 'timeline' | 'trofei' | 'info'
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
    mostraAvviso('Impossibile salvare i progressi (' + errore.message + '). Il server è ancora acceso?');
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
  document.title = 'Game Tracker';
  radice.replaceChildren(el('div', { class: 'contenitore' }, el('p', { class: 'vuoto' }, 'Caricamento…')));
  let giochi;
  try {
    giochi = await chiediAlServer('/api/giochi');
  } catch (errore) {
    radice.replaceChildren(el('div', { class: 'contenitore' },
      el('p', { class: 'vuoto' }, 'Impossibile caricare i giochi: ' + errore.message)));
    return;
  }

  const lista = giochi.length === 0
    ? el('p', { class: 'vuoto' }, 'Nessuna guida presente. Chiedi a Claude di crearne una!')
    : el('div', { class: 'elenco-giochi' }, giochi.map((gioco) =>
        el('a', { class: 'scheda-gioco', href: '#/gioco/' + gioco.id },
          el('h2', {}, gioco.titolo),
          el('p', {}, `${gioco.piattaforma} · Storia ${gioco.completamento.storia}% · Completamento totale ${gioco.completamento.totale}%`))));

  radice.replaceChildren(el('div', { class: 'contenitore' },
    el('h1', { class: 'titolo-app' }, 'Game Tracker'),
    el('p', { class: 'sottotitolo' }, 'Scegli un gioco per vedere la guida e spuntare i tuoi progressi.'),
    lista));
}

// -----------------------------------------------------------------------------
// Pagina del gioco
// -----------------------------------------------------------------------------
async function mostraGioco(id) {
  radice.replaceChildren(el('div', { class: 'contenitore' }, el('p', { class: 'vuoto' }, 'Caricamento…')));
  try {
    guida = await chiediAlServer('/api/giochi/' + id);
    progressi = await chiediAlServer('/api/progressi/' + id);
  } catch (errore) {
    radice.replaceChildren(el('div', { class: 'contenitore' },
      el('p', { class: 'vuoto' }, 'Impossibile caricare la guida: ' + errore.message),
      el('a', { href: '#/' }, '← Torna all\'elenco')));
    return;
  }
  document.title = guida.titolo + ' — Game Tracker';
  scheda = 'timeline';
  preparaOrdine();
  disegnaGioco();
  // All'apertura vado al punto in cui ero rimasto
  const qui = righePassi.find((r) => r.passo.id === progressi.sonoQui);
  if (qui) qui.riga.scrollIntoView({ block: 'center' });
}

// Costruisce la struttura della pagina del gioco: intestazione + scheda attiva
function disegnaGioco() {
  contenitoreRiepilogo = el('div', { class: 'riepilogo' });
  const bottoniSchede = [
    ['timeline', 'Guida'],
    ['trofei', 'Trofei'],
    ['info', 'Info'],
  ].map(([nome, etichetta]) =>
    el('button', {
      class: 'scheda' + (nome === scheda ? ' attiva' : ''),
      onclick: () => { scheda = nome; disegnaGioco(); window.scrollTo(0, 0); },
    }, etichetta));

  const intestazione = el('div', { class: 'intestazione' },
    el('div', { class: 'riga-titolo' },
      el('a', { href: '#/', class: 'indietro' }, '← Giochi'),
      el('h1', {}, guida.titolo),
      el('span', { class: 'piattaforma' }, guida.piattaforma)),
    contenitoreRiepilogo,
    el('div', { class: 'schede' }, bottoniSchede));

  let corpo;
  if (scheda === 'timeline') corpo = costruisciTimeline();
  else if (scheda === 'trofei') corpo = costruisciTrofei();
  else corpo = costruisciInfo();

  radice.replaceChildren(el('div', { class: 'contenitore' }, intestazione, corpo));
  aggiornaVista();
}

// ------------------------------------------------------------ Scheda "Guida"
function costruisciTimeline() {
  righePassi = [];
  capitoliVista = [];
  righeTrofei = [];
  contenitoreAvviso = el('div');

  // Filtri
  const gruppoTipo = el('div', { class: 'gruppo' });
  for (const [valore, etichetta] of [['tutto', 'Tutto'], ['storia', 'Solo storia'], ['opzionali', 'Solo opzionali']]) {
    gruppoTipo.append(el('button', {
      class: filtri.tipo === valore ? 'attivo' : '',
      onclick: (e) => {
        filtri.tipo = valore;
        for (const b of gruppoTipo.children) b.classList.toggle('attivo', b === e.currentTarget);
        aggiornaVista();
      },
    }, etichetta));
  }
  const casellaNascondi = el('input', {
    type: 'checkbox',
    onchange: (e) => { filtri.nascondiCompletati = e.target.checked; aggiornaVista(); },
  });
  casellaNascondi.checked = filtri.nascondiCompletati;

  const barraFiltri = el('div', { class: 'filtri' },
    gruppoTipo,
    el('label', {}, casellaNascondi, 'Nascondi completati'),
    el('div', { class: 'spazio' },
      el('button', { onclick: () => impostaCapitoliAperti(true) }, 'Apri tutti'),
      el('button', { onclick: () => impostaCapitoliAperti(false) }, 'Chiudi tutti')));

  // Capitoli: apro quello del "Sono qui", altrimenti il primo non ancora finito
  const idCapitoloQui = progressi.sonoQui ? ordine[posizione[progressi.sonoQui]]?.capitolo.id : null;
  const primoIncompleto = guida.capitoli.find((c) => c.passi.some((p) => !fatto(chiave(p))));
  const idDaAprire = idCapitoloQui || (primoIncompleto && primoIncompleto.id);

  const capitoli = guida.capitoli.map((capitolo) => costruisciCapitolo(capitolo, capitolo.id === idDaAprire));
  return el('div', {}, barraFiltri, contenitoreAvviso, capitoli);
}

function costruisciCapitolo(capitolo, aperto) {
  const stato = el('span', { class: 'stato' });
  const testata = el('button', {
    class: 'testata-capitolo',
    'aria-expanded': String(aperto),
    onclick: () => {
      const apertoOra = sezione.classList.toggle('aperto');
      testata.setAttribute('aria-expanded', String(apertoOra));
    },
  },
    el('span', { class: 'freccia' }, '▶'),
    el('span', { class: 'numero' }, capitolo.numero + '.'),
    el('span', { class: 'nome' }, capitolo.nome),
    stato);

  const corpo = el('div', { class: 'corpo-capitolo' },
    capitolo.riepilogo ? el('p', { class: 'riepilogo-capitolo' }, capitolo.riepilogo) : null,
    capitolo.passi.map(costruisciPasso));

  const sezione = el('section', { class: 'capitolo' + (aperto ? ' aperto' : ''), id: 'cap-' + capitolo.id }, testata, corpo);
  capitoliVista.push({ capitolo, sezione, stato });
  return sezione;
}

const ETICHETTE_TIPO = {
  storia: 'Storia',
  collezionabile: '💎 Collezionabile',
  trofeo: '🏆 Trofeo',
  secondaria: '📜 Missione secondaria',
};

function costruisciPasso(passo) {
  const k = chiave(passo);
  const casella = el('input', {
    type: 'checkbox',
    'aria-label': 'Completato: ' + passo.titolo,
    onchange: (e) => impostaFatto(k, e.target.checked),
  });

  const bottoneQui = passo.tipo === 'storia'
    ? el('button', { onclick: () => impostaSonoQui(passo) }, 'Sono qui')
    : null;

  const contenuto = el('div', { class: 'contenuto' },
    passo.tipo !== 'storia' ? el('div', { class: 'etichetta' }, ETICHETTE_TIPO[passo.tipo]) : null,
    el('p', { class: 'titolo-passo' }, passo.titolo),
    passo.descrizione ? el('p', {}, passo.descrizione) : null,
    passo.dove ? el('p', { class: 'dove' }, el('b', {}, 'Dove: '), passo.dove) : null,
    passo.mancabile ? el('p', { class: 'nota-mancabile' }, '⏳ Mancabile: ' + passo.notaMancabile) : null,
    passo.daVerificare ? el('p', { class: 'nota-verifica' }, '⚠️ Da verificare: ' + passo.notaVerifica) : null,
    passo.nota ? el('p', { class: 'nota' }, el('b', {}, 'Nota: '), passo.nota) : null,
    passo.soluzione
      ? el('details', { class: 'soluzione' },
          el('summary', {}, 'Mostra soluzione (spoiler)'),
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
    sezione.querySelector('.testata-capitolo').setAttribute('aria-expanded', String(aperti));
  }
}

// ----------------------------------------------------------- Scheda "Trofei"
function costruisciTrofei() {
  righePassi = [];
  capitoliVista = [];
  righeTrofei = [];
  contenitoreAvviso = null;

  if (!guida.trofei || guida.trofei.length === 0) {
    return el('p', { class: 'vuoto' }, 'Questa guida non ha trofei.');
  }

  const righe = guida.trofei.map((trofeo) => {
    const casella = el('input', {
      type: 'checkbox',
      'aria-label': 'Ottenuto: ' + trofeo.nome,
      onchange: (e) => impostaFatto(trofeo.id, e.target.checked),
    });
    const avanzamento = trofeo.obiettivo ? el('p', { class: 'avanzamento' }) : null;
    const riga = el('div', { class: 'trofeo-riga' }, casella,
      el('div', { class: 'contenuto' },
        el('p', { class: 'titolo-passo' }, trofeo.nome, el('span', { class: 'grado ' + trofeo.grado }, trofeo.grado)),
        el('p', {}, trofeo.descrizione),
        trofeo.suggerimento ? el('p', { class: 'nota' }, el('b', {}, 'Consiglio: '), trofeo.suggerimento) : null,
        trofeo.mancabile ? el('p', { class: 'nota-mancabile' }, '⏳ Mancabile: ' + trofeo.notaMancabile) : null,
        trofeo.daVerificare ? el('p', { class: 'nota-verifica' }, '⚠️ Da verificare: ' + trofeo.notaVerifica) : null,
        avanzamento));
    righeTrofei.push({ trofeo, riga, casella, avanzamento });
    return riga;
  });
  return el('div', { class: 'info' }, righe);
}

// ------------------------------------------------------------- Scheda "Info"
function costruisciInfo() {
  righePassi = [];
  capitoliVista = [];
  righeTrofei = [];
  contenitoreAvviso = null;

  return el('div', { class: 'info' },
    guida.introduzione ? [el('h2', {}, 'Da sapere prima di iniziare'), el('ul', {}, guida.introduzione.map((t) => el('li', {}, t)))] : null,
    guida.percorsoConsigliato ? [el('h2', {}, 'Percorso consigliato'), el('ol', {}, guida.percorsoConsigliato.map((t) => el('li', {}, t)))] : null,
    el('h2', {}, 'Fonti della guida'),
    el('ul', {}, guida.fonti.map((f) => el('li', {}, el('a', { href: f.url, target: '_blank', rel: 'noopener noreferrer' }, f.nome)))),
    el('p', { class: 'nota' }, `Guida versione ${guida.versioneGuida}, verificata il ${guida.verificataIl}.`));
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
    if (bottoneQui) bottoneQui.textContent = passo.id === idQui ? '📍 Sei qui' : 'Sono qui';

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
    const parti = [`storia ${storia.ok}/${storia.tot}`];
    if (extra.tot > 0) parti.push(`extra ${extra.ok}/${extra.tot}`);
    stato.textContent = parti.join(' · ');
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
        ? `✔ Hai già trovato ${trovati}: dovresti averlo ottenuto, spuntalo!`
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

// Contatori in alto: storia, una voce per ogni categoria di collezionabili, trofei
function aggiornaRiepilogo() {
  const voci = [];
  const aggiungi = (nome, { ok, tot }) => voci.push(
    el('span', { class: 'contatore' + (tot > 0 && ok === tot ? ' completo' : '') },
      nome + ' ', el('strong', {}, `${ok}/${tot}`)));

  aggiungi('Storia', conta((p) => p.tipo === 'storia'));
  for (const categoria of guida.categorie || []) {
    aggiungi(categoria.nome, conta((p) => p.tipo === 'collezionabile' && p.categoria === categoria.id));
  }
  if (guida.trofei && guida.trofei.length > 0) {
    aggiungi('Trofei', { ok: guida.trofei.filter((t) => fatto(t.id)).length, tot: guida.trofei.length });
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

  contenitoreAvviso.append(el('div', { class: 'box-avviso' },
    el('h3', {}, '⏳ Attenzione ai tesori mancabili'),
    inCorso.length > 0 ? [el('p', {}, 'Nel capitolo in cui ti trovi, da non perdere:'), lista(inCorso)] : null,
    saltati.length > 0 ? [el('p', {}, 'Prima del punto in cui sei e non ancora spuntati (li hai saltati?):'), lista(saltati)] : null));
}

// Apre il capitolo del passo e ci scorre fino
function vaiAlPasso(evento, idPasso) {
  evento.preventDefault();
  const voce = righePassi.find((r) => r.passo.id === idPasso);
  if (!voce) return;
  const capitolo = capitoliVista.find((c) => c.capitolo.id === ordine[posizione[idPasso]].capitolo.id);
  if (capitolo) capitolo.sezione.classList.add('aperto');
  voce.riga.classList.remove('nascosto');
  voce.riga.scrollIntoView({ block: 'center' });
}

// -----------------------------------------------------------------------------
// Scelta della pagina in base all'indirizzo
// -----------------------------------------------------------------------------
function instrada() {
  const indirizzo = location.hash || '#/';
  const corrispondenza = indirizzo.match(/^#\/gioco\/([a-z0-9-]+)$/);
  if (corrispondenza) mostraGioco(corrispondenza[1]);
  else if (indirizzo.startsWith('#passo-')) return; // link interno agli avvisi: nessun cambio pagina
  else mostraElenco();
}

window.addEventListener('hashchange', instrada);
instrada();

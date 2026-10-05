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
  menu: [ // tre righe, per il pulsante Menu
    '#######',
    '.......',
    '#######',
    '.......',
    '#######',
  ],
  chiudi: [ // X, per chiudere le finestre
    '#.....#',
    '##...##',
    '.##.##.',
    '..###..',
    '.##.##.',
    '##...##',
    '#.....#',
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
  espandi: [ // due frecce in giù: apri tutti i capitoli
    '#.....#',
    '.#...#.',
    '..#.#..',
    '...#...',
    '.......',
    '#.....#',
    '.#...#.',
    '..#.#..',
    '...#...',
  ],
  comprimi: [ // due frecce in su: chiudi tutti i capitoli
    '...#...',
    '..#.#..',
    '.#...#.',
    '#.....#',
    '.......',
    '...#...',
    '..#.#..',
    '.#...#.',
    '#.....#',
  ],
  occhio: [ // per mostrare/nascondere i passi completati
    '..#####..',
    '.#.....#.',
    '#...#...#',
    '.#.....#.',
    '..#####..',
  ],
  giu: [ // piccola freccia verso il basso, per aprire un pannello
    '#.....#',
    '.#...#.',
    '..#.#..',
    '...#...',
  ],
  indietro: [ // freccia verso sinistra, per tornare all'elenco dei giochi
    '...#....',
    '..##....',
    '.#######',
    '########',
    '.#######',
    '..##....',
    '...#....',
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
  svg.setAttribute('class', 'icona icona-' + nome); // la classe permette di colorare una singola icona dal CSS
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

// Barra di progressione. "percentuale" è un numero da 0 a 100, "testo" la scritta a destra (es. 12/60).
// "classe" sceglie il colore (b-storia, b-totale). Ha il ruolo "progressbar" per i lettori di schermo.
// Se "nomeIcona" è indicato, al posto del nome scritto compare l'icona (il nome resta per i lettori di schermo).
function barraProgresso(nome, classe, percentuale, testo, nomeIcona = null) {
  return el('div', { class: 'progresso ' + classe + (nomeIcona ? ' solo-icona' : '') + (percentuale >= 100 ? ' completo' : '') },
    nomeIcona ? el('span', { class: 'progresso-nome', title: nome }, icona(nomeIcona, 2)) : el('span', { class: 'progresso-nome' }, nome),
    el('div', {
      class: 'progresso-barra', role: 'progressbar', 'aria-label': nome,
      'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(percentuale),
    }, el('div', { class: 'progresso-riempi', style: `width: ${percentuale}%` })),
    el('span', { class: 'progresso-valore' }, testo));
}

// -----------------------------------------------------------------------------
// Copertine
// L'immagine (da covers/) si mostra in una cornice verticale 2:3, come i poster: non viene tagliata
// se ha quella forma, altrimenti viene centrata e ritagliata ai bordi.
// -----------------------------------------------------------------------------
function applicaCopertina(nodo, c) {
  nodo.style.backgroundImage = `url("${c.url}")`;
  nodo.style.backgroundSize = 'cover';
  nodo.style.backgroundPosition = 'center';
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
let progressi = null;    // { completati: { idPasso: data }, scelte: {...}, contatori: {...} } (sonoQui non si usa più)
let scheda = 'guida';    // scheda aperta: 'guida' | 'trofei' | 'info'
// gruppi: i pulsanti della barra in alto (Storia, Secondarie, categorie di collezionabili, Trofei)
// attivi come filtro: se ce n'è almeno uno, nella guida restano solo i passi di quei gruppi (vedi gruppoDi).
const filtri = { gruppi: new Set(), nascondiCompletati: false };

// Riferimenti agli elementi creati, così possiamo aggiornarli senza ricostruire tutta la pagina
let righePassi = [];     // { passo, capitolo, riga, casella, campo }
let capitoliVista = [];  // { capitolo, sezione, stato }
let righeTrofei = [];    // { trofeo, riga, casella, avanzamento }
let barreScelte = [];    // { scelta, bottoni, aiuto }
let contenitoreRiepilogo = null;
let contenitoreBarre = null;
let copertinaBarra = null;   // l'immagine di copertina nella barra in alto (null se il gioco non ne ha)
let contenitoreAvviso = null;
let pannelloAperto = null;   // id del pannello delle sottocategorie aperto nella barra in alto (storia, secondarie, collezionabili) o null
let sezioneTrofei = null;    // in fondo alla Guida: i trofei che non sono legati a un punto della timeline (visibile col filtro Trofei)

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

// Il "gruppo" di un passo = il pulsante (o la voce del suo pannello) della barra in alto a cui appartiene.
// Storia e secondarie hanno un solo gruppo ('storia', 'secondarie'), oppure uno per sottocategoria
// ('storia:compiti') se la guida definisce guida.sottocategorie.<tipo> (vedi docs/FORMATO-GUIDA.md).
// Il gruppo è calcolato in preparaOrdine() e salvato in gruppiPassi.
let gruppiPassi = {};
function calcolaGruppo(passo, capitolo) {
  const sottocategorie = (tipo) => (guida.sottocategorie || {})[tipo] || [];
  if (passo.tipo === 'storia' || passo.tipo === 'secondaria') {
    const base = passo.tipo === 'storia' ? 'storia' : 'secondarie';
    const elenco = sottocategorie(base);
    if (elenco.length === 0) return base;
    // Senza indicazioni vale la prima sottocategoria; per la storia può essere indicata anche sul capitolo
    const sotto = passo.sotto ?? (passo.tipo === 'storia' ? capitolo.sotto : undefined) ?? elenco[0].id;
    return base + ':' + sotto;
  }
  if (passo.tipo === 'collezionabile' || passo.tipo === 'raccolta') return 'cat:' + passo.categoria;
  if (passo.tipo === 'trofeo') return 'trofei';
  return null;
}
function gruppoDi(passo) {
  return gruppiPassi[passo.id] ?? null;
}

function fatto(chiaveOId) {
  return Boolean(progressi.completati[chiaveOId]);
}

// Un capitolo, passo o trofeo con "soloSe" vale solo per chi ha fatto quella scelta
// (es. soloSe: { casa: "grifondoro" }). Se la scelta non è ancora stata fatta, vale per tutti.
function applicabile(oggetto) {
  for (const [idScelta, valori] of Object.entries(oggetto.soloSe || {})) {
    const fatta = progressi.scelte[idScelta];
    if (fatta && ![].concat(valori).includes(fatta)) return false;
  }
  return true;
}

// Quanti oggetti ha trovato l'utente in un passo di tipo "raccolta"
function quantiTrovati(passo) {
  return Math.min(progressi.contatori[passo.id] || 0, passo.quantita);
}

// Un passo è completato se è spuntato; una raccolta, quando ha trovato tutto
function passoFatto(passo) {
  return passo.tipo === 'raccolta' ? quantiTrovati(passo) >= passo.quantita : fatto(chiave(passo));
}

function preparaOrdine() {
  ordine = [];
  posizione = {};
  gruppiPassi = {};
  for (const capitolo of guida.capitoli) {
    for (const passo of capitolo.passi) {
      posizione[passo.id] = ordine.length;
      gruppiPassi[passo.id] = calcolaGruppo(passo, capitolo);
      ordine.push({ passo, capitolo });
    }
  }
}

// Conta le "unità" fatte e totali dei passi che rispettano una condizione.
// Un passo normale vale 1 unità; una raccolta vale tante unità quanti sono gli oggetti da trovare.
// I passi non validi per le scelte dell'utente (altre case, ecc.) non contano.
function conta(condizione) {
  let tot = 0, ok = 0;
  for (const { passo, capitolo } of ordine) {
    if (!condizione(passo) || !applicabile(capitolo) || !applicabile(passo)) continue;
    if (passo.tipo === 'raccolta') {
      tot += passo.quantita;
      ok += quantiTrovati(passo);
    } else {
      tot++;
      if (fatto(chiave(passo))) ok++;
    }
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

// Cambia il numero di oggetti trovati in un passo di tipo "raccolta" (tra 0 e il totale)
function impostaContatore(passo, valore) {
  const numero = Math.max(0, Math.min(passo.quantita, Math.floor(Number(valore)) || 0));
  if (numero === 0) delete progressi.contatori[passo.id];
  else progressi.contatori[passo.id] = numero;
  aggiornaVista();
  salva();
}

// Fa o toglie una scelta (es. la casa). Cliccando di nuovo sulla scelta attiva la si toglie.
function impostaScelta(idScelta, idOpzione) {
  if (progressi.scelte[idScelta] === idOpzione) delete progressi.scelte[idScelta];
  else progressi.scelte[idScelta] = idOpzione;
  aggiornaVista();
  salva();
}

// Il passo di storia "a cui sei arrivato": il primo non ancora completato (null se hai finito tutta la storia)
function passoCorrente() {
  for (const { passo, capitolo } of ordine) {
    if (passo.tipo === 'storia' && applicabile(capitolo) && applicabile(passo) && !fatto(chiave(passo))) return passo;
  }
  return null;
}

// Pulsante "Sono qui": segna come completati TUTTI i passi di storia fino a questo (compreso).
// È un'azione una tantum, non un interruttore. Collezionabili e trofei non vengono toccati.
function completaStoriaFinoA(passo) {
  const indice = posizione[passo.id];
  const daSegnare = ordine.filter(({ passo: p, capitolo: c }, i) =>
    i <= indice && p.tipo === 'storia' && !fatto(chiave(p)) && applicabile(c) && applicabile(p));
  if (daSegnare.length === 0) return;
  if (daSegnare.length > 1) {
    const conferma = window.confirm(
      `Vuoi segnare come completati ${daSegnare.length} passi di storia, fino a "${passo.titolo}"?\n\n` +
      'Collezionabili e trofei restano come sono. Per annullare dovrai togliere le spunte a mano.'
    );
    if (!conferma) return;
  }
  const adesso = new Date().toISOString();
  for (const { passo: p } of daSegnare) progressi.completati[chiave(p)] = adesso;
  aggiornaVista();
  salva();
}

// -----------------------------------------------------------------------------
// Menu: azzera i progressi (storia, collezionabili, trofei, tutto)
// -----------------------------------------------------------------------------
const AZZERAMENTI = [
  {
    id: 'storia', nome: 'Azzera la storia',
    descrizione: 'Toglie le spunte dai passi della storia.',
    elementi: () => ordine.filter(({ passo }) => passo.tipo === 'storia' && fatto(chiave(passo))).length,
    azzera: () => { for (const { passo } of ordine) if (passo.tipo === 'storia') delete progressi.completati[chiave(passo)]; },
  },
  {
    id: 'collezionabili', nome: 'Azzera i collezionabili',
    descrizione: 'Toglie le spunte dai collezionabili e azzera i contatori.',
    elementi: () => ordine.filter(({ passo }) =>
      (passo.tipo === 'collezionabile' && fatto(chiave(passo))) || (passo.tipo === 'raccolta' && quantiTrovati(passo) > 0)).length,
    azzera: () => {
      for (const { passo } of ordine) {
        if (passo.tipo === 'collezionabile') delete progressi.completati[chiave(passo)];
        if (passo.tipo === 'raccolta') delete progressi.contatori[passo.id];
      }
    },
  },
  {
    id: 'trofei', nome: 'Azzera i trofei',
    descrizione: 'Toglie la spunta da tutti i trofei e obiettivi.',
    elementi: () => (guida.trofei || []).filter((t) => fatto(t.id)).length,
    azzera: () => { for (const t of guida.trofei || []) delete progressi.completati[t.id]; },
  },
  {
    id: 'tutto', nome: 'Azzera tutto', pericolo: true,
    descrizione: 'Cancella ogni progresso di questo gioco, comprese le missioni secondarie. La scelta (es. la casa) resta.',
    elementi: () => Object.keys(progressi.completati).length + Object.keys(progressi.contatori).length,
    azzera: () => { progressi.completati = {}; progressi.contatori = {}; progressi.sonoQui = null; },
  },
];

function apriMenu() {
  const dialogo = el('dialog', { class: 'menu', 'aria-labelledby': 'titolo-menu' });
  const chiudi = () => dialogo.close();

  const righe = AZZERAMENTI.map((voce) => {
    const quanti = voce.elementi();
    return el('div', { class: 'voce-menu' },
      el('div', {},
        el('p', { class: 'titolo-voce' }, voce.nome),
        el('p', { class: 'nota' }, voce.descrizione + (quanti === 0 ? ' Non c\'è niente da azzerare.' : ' Hai ' + quanti + ' elementi con progressi.'))),
      el('button', {
        class: 'btn' + (voce.pericolo ? ' pericolo' : ''),
        disabled: quanti === 0,
        onclick: () => {
          const conferma = window.confirm(`${voce.nome}? Hai ${quanti} elementi con progressi.\n\nL'operazione non si può annullare.`);
          if (!conferma) return;
          voce.azzera();
          aggiornaVista();
          salva();
          chiudi();
        },
      }, 'Azzera'));
  });

  dialogo.append(el('div', { class: 'involucro-menu' }, finestra(
    el('div', { class: 'corpo-menu' },
      el('div', { class: 'testata-menu' },
        el('h2', { id: 'titolo-menu' }, 'Menu'),
        el('button', { class: 'btn btn-icona', 'aria-label': 'Chiudi il menu', title: 'Chiudi', onclick: chiudi }, icona('chiudi', 2))),
      el('p', {}, 'Azzera i progressi di questa guida. Le altre guide non vengono toccate.'),
      righe))));

  // Cliccando fuori dalla finestra (sullo sfondo scuro) il menu si chiude
  dialogo.addEventListener('click', (e) => { if (e.target === dialogo) chiudi(); });
  dialogo.addEventListener('close', () => dialogo.remove());
  document.body.append(dialogo);
  dialogo.showModal();
}

// Immagine di copertina in cima alla scheda del gioco (decorativa: il titolo è scritto sotto)
function copertinaScheda(c) {
  const nodo = el('div', { class: 'copertina', 'aria-hidden': 'true' });
  applicaCopertina(nodo, c);
  return nodo;
}

// Riga con le ore per finire il gioco (dal campo "durata" della guida). Null se la guida non lo ha.
function testoDurata(durata) {
  if (!durata) return null;
  const voce = (nome, ore) => el('span', { class: 'modulo' }, nome + ' ', el('b', {}, ore + ' h'));
  return el('div', { class: 'moduli durata', title: 'Ore stimate per finire il gioco' },
    icona('clessidra'),
    voce('Storia', durata.storia), voce('+ extra', durata.storiaExtra), voce('100%', durata.completista));
}

// -----------------------------------------------------------------------------
// Pagina iniziale: elenco dei giochi
// -----------------------------------------------------------------------------
async function mostraElenco() {
  guida = null;
  if (osservatore) osservatore.disconnect();
  document.documentElement.style.cssText = '';
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
          finestra(el('div', { class: 'scheda-riga' },
            gioco.copertina ? copertinaScheda(gioco.copertina) : null,
            el('div', { class: 'scheda-corpo' },
              el('h2', {}, gioco.titolo),
              el('p', {}, gioco.piattaforma),
              el('div', { class: 'barre' },
                barraProgresso('Storia Principale', 'b-storia', gioco.completamento.storia, gioco.completamento.storia + '%', 'stella'),
                barraProgresso('Completismo', 'b-totale', gioco.completamento.totale, gioco.completamento.totale + '%', 'coppa')),
              testoDurata(gioco.durata)))))));

  radice.replaceChildren(el('main', { class: 'pagina larga', id: 'contenuto' },
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
  progressi.scelte = progressi.scelte || {};
  progressi.contatori = progressi.contatori || {};
  preparaOrdine();
  filtri.gruppi.clear(); // i pulsanti-filtro di un altro gioco non valgono qui
  pannelloAperto = null;
  disegnaGioco();
  // All'apertura vado al prossimo passo da fare (solo se hai già completato qualcosa)
  const prossimo = passoCorrente();
  if (prossimo && Object.keys(progressi.completati).length > 0) {
    const voce = righePassi.find((r) => r.passo.id === prossimo.id);
    if (voce) voce.riga.scrollIntoView({ block: 'center' });
  }
}

const SCHEDE = [
  ['guida', 'Guida'],
  ['trofei', 'Trofei'],
  ['info', 'Info'],
];

// Costruisce la struttura della pagina del gioco: barra (titolo, schede, contatori) + scheda attiva
function disegnaGioco() {
  pannelloAperto = null;
  contenitoreRiepilogo = el('div', { class: 'moduli' });
  contenitoreBarre = el('div', { class: 'barre' });

  // Barra a tutta larghezza su due sezioni:
  //   in alto  → a sinistra "torna ai giochi", al centro titolo + versione e le schede
  //   sotto    → i contatori (storia, collezionabili, trofei…)
  // La copertina sta a sinistra del titolo, centrata in verticale nella barra
  copertinaBarra = null;
  if (guida.copertina) {
    copertinaBarra = el('div', { class: 'barra-copertina', 'aria-hidden': 'true' });
    applicaCopertina(copertinaBarra, guida.copertina);
  }
  // Su telefono la copertina della barra (assoluta) non c'è: ne uso una in fila, tra "Giochi" e il titolo
  let copertinaTelefono = null;
  if (guida.copertina) {
    copertinaTelefono = el('div', { class: 'copertina-telefono', 'aria-hidden': 'true' });
    applicaCopertina(copertinaTelefono, guida.copertina);
  }
  const barra = el('header', { class: 'barra' + (copertinaBarra ? ' con-copertina' : '') },
    copertinaBarra,
    el('div', { class: 'barra-contenuto' },
      el('div', { class: 'barra-riga barra-alto' },
        el('a', { href: '#/', class: 'btn btn-icona indietro', 'aria-label': 'Torna all\'elenco dei giochi' , title: 'Torna ai giochi' }, icona('indietro', 3)),
        copertinaTelefono,
        el('div', { class: 'barra-centro' },
          el('h1', {}, guida.titolo, el('span', { class: 'versione' }, guida.piattaforma)),
          el('nav', { class: 'spazi', 'aria-label': 'Sezioni della guida' },
            SCHEDE.map(([nome, etichetta]) =>
              el('a', {
                class: 'spazio',
                href: `#/gioco/${guida.id}/${nome}`,
                'aria-current': nome === scheda ? 'page' : false,
              }, etichetta))))),
      el('div', { class: 'barra-riga barra-sotto' }, contenitoreRiepilogo, contenitoreBarre)));

  let corpo;
  if (scheda === 'guida') corpo = costruisciTimeline();
  else if (scheda === 'trofei') corpo = costruisciTrofei();
  else corpo = costruisciInfo();

  radice.replaceChildren(barra, el('div', { class: 'pagina' + (scheda === 'guida' ? ' con-strumenti' : '') }, el('main', { id: 'contenuto' }, corpo)));
  aggiornaVista();
  osservaElementiFissi();
}

// Misura l'altezza degli elementi che restano fissi in alto (barra, strumenti, titolo del capitolo) e la
// passa al CSS: serve a posizionarli uno sotto l'altro e a non coprire ciò a cui si scorre.
// Se il CSS li ha resi non fissi (telefono) l'altezza vale 0.
let osservatore = null;
function misuraElementiFissi() {
  const altezza = (selettore) => {
    const nodo = document.querySelector(selettore);
    return nodo && getComputedStyle(nodo).position === 'sticky' ? Math.round(nodo.getBoundingClientRect().height) : 0;
  };
  const stile = document.documentElement.style;
  stile.setProperty('--alt-barra', altezza('.barra') + 'px');
  stile.setProperty('--alt-strumenti', altezza('.strumenti') + 'px');
  stile.setProperty('--alt-testata', altezza('.testata') + 'px');
}
function osservaElementiFissi() {
  if (osservatore) osservatore.disconnect();
  osservatore = new ResizeObserver(misuraElementiFissi); // si riesegue se barra o strumenti cambiano altezza
  for (const nodo of document.querySelectorAll('.barra, .strumenti, .testata')) osservatore.observe(nodo);
  misuraElementiFissi();
}

// ------------------------------------------------------------ Scheda "Guida"
function azzeraRiferimenti() {
  righePassi = [];
  capitoliVista = [];
  righeTrofei = [];
  barreScelte = [];
  contenitoreAvviso = null;
  sezioneTrofei = null;
}

// Testo "Solo Grifondoro" per un oggetto con "soloSe" (stringa vuota se vale per tutti)
function testoSolo(oggetto) {
  const parti = [];
  for (const [idScelta, valori] of Object.entries(oggetto.soloSe || {})) {
    const scelta = (guida.scelte || []).find((s) => s.id === idScelta);
    for (const v of [].concat(valori)) {
      const opzione = scelta && scelta.opzioni.find((o) => o.id === v);
      parti.push(opzione ? opzione.nome : v);
    }
  }
  return parti.length ? 'Solo ' + parti.join(' / ') : '';
}

// Riquadro con le scelte del giocatore (es. la casa): serve a nascondere ciò che non lo riguarda
function costruisciScelte() {
  if (!guida.scelte || guida.scelte.length === 0) return null;
  const blocchi = guida.scelte.map((scelta) => {
    const bottoni = {};
    const gruppo = el('div', { class: 'gruppo', role: 'group', 'aria-label': scelta.nome });
    for (const opzione of scelta.opzioni) {
      bottoni[opzione.id] = el('button', {
        class: 'btn',
        'aria-pressed': 'false',
        onclick: () => impostaScelta(scelta.id, opzione.id),
      }, opzione.nome);
      gruppo.append(bottoni[opzione.id]);
    }
    const aiuto = scelta.descrizione ? el('p', { class: 'nota' }, scelta.descrizione) : null;
    barreScelte.push({ scelta, bottoni, aiuto });
    return el('div', { class: 'scelta' }, el('h2', {}, scelta.nome), gruppo, aiuto);
  });
  return el('div', { class: 'blocco-scelte' }, finestra(el('div', { class: 'contenuto-scelte' }, blocchi)));
}

function costruisciTimeline() {
  azzeraRiferimenti();
  contenitoreAvviso = el('div');

  // Filtri
  // "Nascondi completati": pulsante con solo l'icona; acceso (ambra) quando i completati sono nascosti
  const bottoneNascondi = el('button', {
    class: 'btn btn-icona',
    'aria-label': 'Nascondi completati',
    title: 'Nascondi completati',
    'aria-pressed': String(filtri.nascondiCompletati),
    onclick: (e) => {
      filtri.nascondiCompletati = !filtri.nascondiCompletati;
      e.currentTarget.setAttribute('aria-pressed', String(filtri.nascondiCompletati));
      aggiornaVista();
    },
  }, icona('occhio', 3));

  const barraStrumenti = el('div', { class: 'strumenti' },
    el('div', { class: 'spazio-flex' },
      el('button', { class: 'btn btn-icona', 'aria-label': 'Apri tutti i capitoli', title: 'Apri tutti', onclick: () => impostaCapitoliAperti(true) }, icona('espandi', 2)),
      el('button', { class: 'btn btn-icona', 'aria-label': 'Chiudi tutti i capitoli', title: 'Chiudi tutti', onclick: () => impostaCapitoliAperti(false) }, icona('comprimi', 2)),
      bottoneNascondi,
      el('button', { class: 'btn btn-icona', 'aria-label': 'Menu', title: 'Menu', 'aria-haspopup': 'dialog', onclick: apriMenu }, icona('menu', 3))));

  // Capitoli: apro quello del prossimo passo di storia da fare
  const corrente = passoCorrente();
  const idDaAprire = corrente ? ordine[posizione[corrente.id]].capitolo.id : null;

  const capitoli = guida.capitoli.map((capitolo) => costruisciCapitolo(capitolo, capitolo.id === idDaAprire));
  // Trofei che non compaiono come passi nella timeline (es. tutti quelli di Uncharted): con il filtro Trofei
  // si vedono qui, in fondo alla guida, spuntabili come nella scheda Trofei
  const idTrofeiInTimeline = new Set(ordine.filter(({ passo }) => passo.tipo === 'trofeo').map(({ passo }) => passo.trofeo));
  const trofeiLiberi = (guida.trofei || []).filter((t) => !idTrofeiInTimeline.has(t.id));
  if (trofeiLiberi.length > 0) {
    sezioneTrofei = el('section', { class: 'sezione-trofei nascosto', 'aria-label': 'Trofei' },
      el('h2', {}, icona('coppa'), 'Trofei'),
      el('p', { class: 'nota' }, idTrofeiInTimeline.size > 0
        ? 'Questi trofei non sono legati a un punto preciso della guida (gli altri si trovano nei capitoli).'
        : 'I trofei di questo gioco non sono legati a un punto preciso della storia.'),
      trofeiLiberi.map(creaCartaTrofeo));
  }
  return el('div', {}, barraStrumenti, costruisciScelte(), contenitoreAvviso, capitoli, sezioneTrofei);
}

function costruisciCapitolo(capitolo, aperto) {
  const stato = el('span', { class: 'mini' });
  // Segni di completamento accanto al nome: ambra = storia, rosa = collezionabili e trofei, viola = secondarie.
  // Compaiono solo quando quella parte del capitolo è tutta completata (e solo se il capitolo la contiene).
  const ticks = {
    storia: el('span', { class: 'tick tick-storia', role: 'img', 'aria-label': 'Storia del capitolo completata', title: 'Storia completata' }),
    raccolta: el('span', { class: 'tick tick-raccolta', role: 'img', 'aria-label': 'Collezionabili e trofei del capitolo completati', title: 'Collezionabili e trofei completati' }),
    secondaria: el('span', { class: 'tick tick-secondaria', role: 'img', 'aria-label': 'Missioni secondarie del capitolo completate', title: 'Missioni secondarie completate' }),
  };
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
    capitolo.numero !== undefined ? el('span', { class: 'numero' }, capitolo.numero + '.') : null,
    el('span', { class: 'nome' }, capitolo.nome, ...Object.values(ticks)),
    stato);

  // Note sotto al titolo: livello consigliato, ordine libero, valido solo per una scelta
  const etichette = [];
  if (capitolo.livello) etichette.push(el('span', { class: 'modulo' }, 'livello ', el('b', {}, String(capitolo.livello))));
  if (capitolo.ordinato === false) etichette.push(el('span', { class: 'modulo libero' }, 'ordine libero'));
  const solo = testoSolo(capitolo);
  if (solo) etichette.push(el('span', { class: 'modulo' }, solo));

  const corpo = el('div', { class: 'corpo', id: idCorpo },
    capitolo.riepilogo || etichette.length
      ? el('div', { class: 'riepilogo-capitolo' },
          capitolo.riepilogo ? el('p', {}, capitolo.riepilogo) : null,
          etichette.length ? el('div', { class: 'mini' }, etichette) : null)
      : null,
    capitolo.passi.map((passo) => costruisciPasso(passo, capitolo)));

  const sezione = el('section', { class: 'capitolo' + (aperto ? ' aperto' : ''), id: 'cap-' + capitolo.id },
    finestra(el('h2', { class: 'testata' }, testata), corpo));
  capitoliVista.push({ capitolo, sezione, stato, ticks });
  return sezione;
}

// Etichetta e icona di ogni tipo di passo (la storia non ha etichetta: è il caso normale)
const TIPI_PASSO = {
  collezionabile: { nome: 'Collezionabile', icona: 'gemma' },
  raccolta: { nome: 'Raccolta', icona: 'gemma' },
  trofeo: { nome: 'Trofeo', icona: 'coppa' },
  secondaria: { nome: 'Missione secondaria', icona: 'punto' },
};

// Contatore "− 12 / 236 +" per i passi di tipo "raccolta"
function costruisciContatore(passo) {
  const campo = el('input', {
    type: 'number', class: 'num', min: '0', max: String(passo.quantita), inputmode: 'numeric',
    name: 'trovati-' + passo.id, autocomplete: 'off',
    'aria-label': 'Quanti ne hai trovati: ' + passo.titolo,
    onchange: (e) => impostaContatore(passo, e.target.value),
  });
  const cambia = (delta) => impostaContatore(passo, (progressi.contatori[passo.id] || 0) + delta);
  const nodo = el('div', { class: 'contatore' },
    el('button', { class: 'btn', 'aria-label': 'Uno in meno: ' + passo.titolo, onclick: () => cambia(-1) }, '−'),
    campo,
    el('span', { class: 'su-totale' }, '/ ' + passo.quantita),
    el('button', { class: 'btn', 'aria-label': 'Uno in più: ' + passo.titolo, onclick: () => cambia(1) }, '+'));
  return { nodo, campo };
}

function costruisciPasso(passo, capitolo) {
  const k = chiave(passo);
  const eRaccolta = passo.tipo === 'raccolta';
  const idCasella = 'spunta-' + passo.id;
  const casella = el('input', {
    type: 'checkbox',
    class: 'spunta',
    id: idCasella,
    // Per una raccolta, la casella significa "trovati tutti" (e toglierla azzera il contatore)
    onchange: (e) => (eRaccolta ? impostaContatore(passo, e.target.checked ? passo.quantita : 0) : impostaFatto(k, e.target.checked)),
  });

  // "Sono qui": a destra del passo di storia. Segna come completata la storia fino a questo passo.
  const bottoneQui = passo.tipo === 'storia'
    ? el('button', {
        class: 'btn azione-passo',
        title: 'Segna come completata la storia fino a questo passo',
        onclick: () => completaStoriaFinoA(passo),
      }, 'Sono qui')
    : null;
  const contatore = eRaccolta ? costruisciContatore(passo) : null;

  const tipo = TIPI_PASSO[passo.tipo];
  const solo = testoSolo(passo);
  const contenuto = el('div', { class: 'contenuto' },
    tipo || solo
      ? el('p', { class: 'tipo' },
          tipo ? [icona(tipo.icona), tipo.nome] : null,
          solo ? el('span', { class: 'modulo' }, solo) : null,
          passo.livello ? el('span', { class: 'modulo' }, 'livello ', el('b', {}, String(passo.livello))) : null)
      : null,
    // L'etichetta è collegata alla casella: cliccare sul titolo spunta il passo
    el('label', { class: 'titolo-passo', for: idCasella }, passo.titolo),
    passo.descrizione ? el('p', {}, passo.descrizione) : null,
    passo.dove ? el('p', { class: 'dove' }, el('b', {}, 'Dove: '), passo.dove) : null,
    contatore ? contatore.nodo : null,
    passo.mancabile ? el('p', { class: 'avvertenza mancabile' }, icona('clessidra'), el('span', {}, 'Mancabile: ' + passo.notaMancabile)) : null,
    passo.daVerificare ? el('p', { class: 'avvertenza verifica' }, icona('attenzione'), el('span', {}, 'Da verificare: ' + passo.notaVerifica)) : null,
    passo.nota ? el('p', { class: 'nota' }, el('b', {}, 'Nota: '), passo.nota) : null,
    passo.soluzione
      ? el('details', { class: 'soluzione' },
          el('summary', {}, 'Mostra la soluzione (spoiler)'),
          el('p', {}, passo.soluzione))
      : null);

  const riga = el('div', { class: 'passo t-' + passo.tipo + (bottoneQui ? ' con-azione' : ''), id: 'passo-' + passo.id },
    casella, contenuto, bottoneQui);
  righePassi.push({ passo, capitolo, riga, casella, campo: contatore ? contatore.campo : null });
  return riga;
}

function impostaCapitoliAperti(aperti) {
  for (const { sezione } of capitoliVista) {
    sezione.classList.toggle('aperto', aperti);
    sezione.querySelector('.testata button').setAttribute('aria-expanded', String(aperti));
  }
}

// ----------------------------------------------------------- Scheda "Trofei"
// Scheda di un singolo trofeo (usata nella scheda Trofei e, per quelli senza un punto preciso, in fondo alla Guida)
function creaCartaTrofeo(trofeo) {
  const idCasella = 'spunta-' + trofeo.id;
  const casella = el('input', {
    type: 'checkbox',
    class: 'spunta',
    id: idCasella,
    onchange: (e) => impostaFatto(trofeo.id, e.target.checked),
  });
  const avanzamento = trofeo.obiettivo ? el('p', { class: 'avanzamento' }) : null;
  const solo = testoSolo(trofeo);
  const grado = trofeo.grado === 'obiettivo' ? null : el('span', { class: 'grado ' + trofeo.grado }, trofeo.grado);
  // Se la descrizione contiene anticipazioni sulla storia, resta nascosta finché non la apri
  const descrizione = trofeo.spoiler
    ? el('details', { class: 'soluzione' }, el('summary', {}, 'Mostra la descrizione (spoiler)'), el('p', {}, trofeo.descrizione))
    : el('p', {}, trofeo.descrizione);
  const riga = el('div', { class: 'trofeo-card' },
    finestra(el('div', { class: 'riga-trofeo' }, casella,
      el('div', { class: 'contenuto' },
        solo ? el('p', { class: 'tipo' }, el('span', { class: 'modulo' }, solo)) : null,
        el('label', { class: 'titolo-passo', for: idCasella }, trofeo.nome, grado),
        descrizione,
        trofeo.suggerimento ? el('p', { class: 'nota' }, el('b', {}, 'Consiglio: '), trofeo.suggerimento) : null,
        trofeo.mancabile ? el('p', { class: 'avvertenza mancabile' }, icona('clessidra'), el('span', {}, 'Mancabile: ' + trofeo.notaMancabile)) : null,
        trofeo.daVerificare ? el('p', { class: 'avvertenza verifica' }, icona('attenzione'), el('span', {}, 'Da verificare: ' + trofeo.notaVerifica)) : null,
        avanzamento))));
  righeTrofei.push({ trofeo, riga, casella, avanzamento });
  return riga;
}

function costruisciTrofei() {
  azzeraRiferimenti();

  if (!guida.trofei || guida.trofei.length === 0) {
    return el('p', { class: 'vuoto' }, 'Questa guida non ha trofei.');
  }
  return el('div', {}, costruisciScelte(), guida.trofei.map(creaCartaTrofeo));
}

// ------------------------------------------------------------- Scheda "Info"
function costruisciInfo() {
  azzeraRiferimenti();

  return el('div', { class: 'capitolo' }, finestra(el('div', { class: 'info-testo' },
    guida.introduzione ? [el('h2', {}, 'Da sapere prima di iniziare'), el('ul', {}, guida.introduzione.map((t) => el('li', {}, t)))] : null,
    guida.percorsoConsigliato ? [el('h2', {}, 'Percorso consigliato'), el('ol', {}, guida.percorsoConsigliato.map((t) => el('li', {}, t)))] : null,
    guida.durata ? [
      el('h2', {}, 'Quanto dura'),
      testoDurata(guida.durata),
      el('p', { class: 'nota' }, 'Ore stimate: storia / storia + extra / completismo. ',
        guida.durata.nota ? guida.durata.nota + ' ' : '',
        el('a', { href: guida.durata.fonte.url, target: '_blank', rel: 'noopener noreferrer' }, guida.durata.fonte.nome)),
    ] : null,
    el('h2', {}, 'Fonti della guida'),
    el('ul', {}, guida.fonti.map((f) => el('li', {}, el('a', { href: f.url, target: '_blank', rel: 'noopener noreferrer' }, f.nome)))),
    el('p', { class: 'nota' }, `Guida versione ${guida.versioneGuida}, verificata il ${guida.verificataIl}.`))));
}

// -----------------------------------------------------------------------------
// Aggiornamento della vista dopo ogni cambiamento
// (non ricostruisce la pagina: cambia solo classi e testi, così non perdi la posizione)
// -----------------------------------------------------------------------------
function aggiornaVista() {
  const corrente = passoCorrente();           // prossimo passo di storia da fare
  const idQui = corrente ? corrente.id : null;
  const indiceQui = corrente ? posizione[corrente.id] : -1;

  // Scelte del giocatore (es. la casa)
  for (const { scelta, bottoni, aiuto } of barreScelte) {
    const fatta = progressi.scelte[scelta.id];
    for (const [idOpzione, bottone] of Object.entries(bottoni)) bottone.setAttribute('aria-pressed', String(idOpzione === fatta));
    if (aiuto) aiuto.classList.toggle('nascosto', Boolean(fatta));
  }

  // Passi
  for (const { passo, capitolo, riga, casella, campo } of righePassi) {
    const completato = passoFatto(passo);
    casella.checked = completato;
    if (campo) campo.value = quantiTrovati(passo);
    riga.classList.toggle('fatto', completato);
    riga.classList.toggle('qui', passo.id === idQui);

    const nascosto =
      !applicabile(passo) || !applicabile(capitolo) ||
      (filtri.gruppi.size > 0 && !filtri.gruppi.has(gruppoDi(passo))) ||
      (filtri.nascondiCompletati && completato);
    riga.classList.toggle('nascosto', nascosto);
  }

  // Capitoli: contatori e segno "corrente/finito"
  for (const { capitolo, sezione, stato, ticks } of capitoliVista) {
    // Con dei pulsanti-filtro attivi, i capitoli senza passi di quei gruppi spariscono
    const senzaRisultati = filtri.gruppi.size > 0 && !capitolo.passi.some((p) => filtri.gruppi.has(gruppoDi(p)) && applicabile(p));
    sezione.classList.toggle('nascosto', !applicabile(capitolo) || senzaRisultati);
    const storia = contaInCapitolo(capitolo, (p) => p.tipo === 'storia');
    const extra = contaInCapitolo(capitolo, (p) => p.tipo !== 'storia');
    const moduli = [];
    if (storia.tot > 0) moduli.push(el('span', { class: 'modulo' }, 'storia ', el('b', {}, `${storia.ok}/${storia.tot}`)));
    if (extra.tot > 0) moduli.push(el('span', { class: 'modulo' }, 'extra ', el('b', {}, `${extra.ok}/${extra.tot}`)));
    stato.replaceChildren(...moduli);
    const raccolta = contaInCapitolo(capitolo, (p) => ['collezionabile', 'raccolta', 'trofeo'].includes(p.tipo));
    const secondarie = contaInCapitolo(capitolo, (p) => p.tipo === 'secondaria');
    const completo = (c) => c.tot > 0 && c.ok === c.tot;
    ticks.storia.classList.toggle('on', completo(storia));
    ticks.raccolta.classList.toggle('on', completo(raccolta));
    ticks.secondaria.classList.toggle('on', completo(secondarie));
    sezione.classList.toggle('corrente', idQui !== null && ordine[indiceQui]?.capitolo.id === capitolo.id);
  }

  // Trofei (nella Guida, quelli senza un punto preciso si vedono solo col filtro Trofei)
  if (sezioneTrofei) sezioneTrofei.classList.toggle('nascosto', !filtri.gruppi.has('trofei'));
  for (const { trofeo, riga, casella, avanzamento } of righeTrofei) {
    const ottenuto = fatto(trofeo.id);
    casella.checked = ottenuto;
    riga.classList.toggle('fatto', ottenuto);
    riga.classList.toggle('nascosto', !applicabile(trofeo) || (scheda === 'guida' && filtri.nascondiCompletati && ottenuto));
    let pronto = false;
    if (avanzamento) {
      const { categoria, quantita } = trofeo.obiettivo;
      const nTrovati = conta((p) => (p.tipo === 'collezionabile' || p.tipo === 'raccolta') && p.categoria === categoria).ok;
      pronto = !ottenuto && nTrovati >= quantita;
      avanzamento.textContent = pronto
        ? `Hai già trovato ${nTrovati}: dovresti averlo ottenuto, spuntalo!`
        : `Avanzamento (secondo le tue spunte): ${Math.min(nTrovati, quantita)}/${quantita}`;
      avanzamento.classList.toggle('pronto', pronto);
    }
    riga.classList.toggle('pronto', pronto);
  }

  aggiornaRiepilogo();
  aggiornaAvvisoMancabili();
}

// Conta i passi (non le unità) di un capitolo: una raccolta vale 1 passo, fatto quando ha trovato tutto
function contaInCapitolo(capitolo, condizione) {
  let tot = 0, ok = 0;
  for (const passo of capitolo.passi) {
    if (!condizione(passo) || !applicabile(passo)) continue;
    tot++;
    if (passoFatto(passo)) ok++;
  }
  return { ok, tot };
}

// Moduli della barra, in quest'ordine: storia, secondarie (se ci sono), collezionabili (se ci sono, con il pannello
// delle sottocategorie), trofei. Nella scheda Guida sono anche pulsanti-filtro (toggle): attivandone uno, la guida
// mostra solo quel gruppo.
function aggiornaRiepilogo() {
  const voci = [];
  const interattivo = scheda === 'guida';
  const aggiungi = (gruppo, nome, nomeIcona, classe, { ok, tot }) => {
    // Un gruppo senza passi nella timeline non è filtrabile (tranne i trofei, che compaiono in fondo alla guida)
    const filtrabile = interattivo && (gruppo === 'trofei' || ordine.some(({ passo }) => gruppoDi(passo) === gruppo));
    const attributi = {
      class: 'modulo ' + classe + (tot > 0 && ok === tot ? ' completo' : '') + (filtrabile ? ' filtro' : ''),
      'data-focus': gruppo,
    };
    if (filtrabile) {
      attributi.type = 'button';
      attributi['aria-pressed'] = String(filtri.gruppi.has(gruppo));
      attributi.title = 'Mostra solo: ' + nome;
      attributi.onclick = () => {
        if (!filtri.gruppi.delete(gruppo)) {
          filtri.gruppi.add(gruppo);
          impostaCapitoliAperti(true); // apro i capitoli, così si vedono i risultati
        }
        aggiornaVista();
      };
    }
    voci.push(el(filtrabile ? 'button' : 'span', attributi, icona(nomeIcona), nome + ' ', el('b', {}, `${ok}/${tot}`)));
  };

  const sottocategorie = guida.sottocategorie || {};
  const senzaSotto = (gruppo, nome) => [{ gruppo, nome }]; // nessuna sottocategoria: un solo gruppo
  const voceStoria = creaVoceConPannello({
    id: 'storia', nome: 'Storia', nomeIcona: 'stella', classe: 'm-storia', interattivo, testoPannello: 'Scegli quali parti della storia mostrare nella guida:',
    elenco: sottocategorie.storia ? sottocategorie.storia.map((c) => ({ gruppo: 'storia:' + c.id, nome: c.nome })) : senzaSotto('storia', 'Storia'),
  });
  if (voceStoria) voci.push(voceStoria);
  const voceSecondarie = creaVoceConPannello({
    id: 'secondarie', nome: 'Secondarie', nomeIcona: 'punto', classe: 'm-secondaria', interattivo, testoPannello: 'Scegli quali missioni secondarie mostrare nella guida:',
    elenco: sottocategorie.secondarie ? sottocategorie.secondarie.map((c) => ({ gruppo: 'secondarie:' + c.id, nome: c.nome })) : senzaSotto('secondarie', 'Secondarie'),
  });
  if (voceSecondarie) voci.push(voceSecondarie);
  const voceCollezionabili = creaVoceConPannello({
    id: 'collezionabili', nome: 'Collezionabili', nomeIcona: 'gemma', classe: 'm-oro', interattivo, testoPannello: 'Scegli quali collezionabili mostrare nella guida:',
    elenco: (guida.categorie || []).map((c) => ({ gruppo: 'cat:' + c.id, nome: c.nome })),
  });
  if (voceCollezionabili) voci.push(voceCollezionabili);
  if (guida.trofei && guida.trofei.length > 0) {
    const validi = guida.trofei.filter(applicabile);
    aggiungi('trofei', 'Trofei', 'coppa', 'm-trofeo', { ok: validi.filter((t) => fatto(t.id)).length, tot: validi.length });
  }
  // I pulsanti vengono ricreati a ogni aggiornamento: rimetto il focus su quello che l'aveva (tastiera)
  const conFocus = document.activeElement?.dataset?.focus;
  contenitoreRiepilogo.replaceChildren(...voci);
  if (conFocus) contenitoreRiepilogo.querySelector(`[data-focus="${conFocus}"]`)?.focus();

  // Barre di progressione: storia e completismo (tutto: storia + extra + trofei)
  const percentuale = ({ ok, tot }) => (tot === 0 ? 0 : Math.round((ok / tot) * 100));
  const storia = conta((p) => p.tipo === 'storia');
  const totale = conta(() => true);
  contenitoreBarre.replaceChildren(
    barraProgresso('Storia Principale', 'b-storia', percentuale(storia), `${percentuale(storia)}% (${storia.ok}/${storia.tot})`),
    barraProgresso('Completismo', 'b-totale', percentuale(totale), `${percentuale(totale)}% (${totale.ok}/${totale.tot})`));
}

// Voce della barra in alto con un solo contatore (somma dei suoi gruppi) che fa da pulsante-filtro, e, se i gruppi sono
// più di uno, una freccia che apre un pannello per sceglierli (es. Treasures / Strange Relic, oppure Missioni principali / Compiti).
// Il filtro è l'insieme dei gruppi presenti in filtri.gruppi. Restituisce null se non c'è nessun passo.
//   elenco: [{ gruppo, nome }]   id: serve per il focus e per il pannello
function creaVoceConPannello({ id, nome, nomeIcona, classe, interattivo, testoPannello, elenco }) {
  const gruppi = elenco
    .map((voce) => ({ ...voce, conteggio: conta((p) => gruppoDi(p) === voce.gruppo) }))
    .filter(({ conteggio }) => conteggio.tot > 0);
  if (gruppi.length === 0) return null;

  const totale = gruppi.reduce((somma, { conteggio }) => ({ ok: somma.ok + conteggio.ok, tot: somma.tot + conteggio.tot }), { ok: 0, tot: 0 });
  const attivi = gruppi.filter(({ gruppo }) => filtri.gruppi.has(gruppo));
  const aggiornaDopo = (apriCapitoli) => {
    if (apriCapitoli) impostaCapitoliAperti(true);
    aggiornaVista();
  };

  const principale = el(interattivo ? 'button' : 'span', {
    class: 'modulo ' + classe + (totale.ok === totale.tot ? ' completo' : '') + (interattivo ? ' filtro' : ''),
    'data-focus': id,
    ...(interattivo ? {
      type: 'button',
      'aria-pressed': String(attivi.length > 0),
      title: 'Mostra solo: ' + nome,
      // Se c'è già qualche gruppo attivo li spegne tutti, altrimenti li accende tutti
      onclick: () => {
        for (const { gruppo } of gruppi) filtri.gruppi.delete(gruppo);
        if (attivi.length === 0) for (const { gruppo } of gruppi) filtri.gruppi.add(gruppo);
        aggiornaDopo(attivi.length === 0);
      },
    } : {}),
  }, icona(nomeIcona), nome + ' ', el('b', {}, `${totale.ok}/${totale.tot}`),
    // Se è attiva solo una parte dei gruppi lo dico accanto al contatore
    attivi.length > 0 && attivi.length < gruppi.length ? el('span', { class: 'parziale' }, ` (${attivi.length}/${gruppi.length})`) : null);

  // Fuori dalla scheda Guida, o con un solo gruppo, non serve il pannello
  if (!interattivo || gruppi.length < 2) return principale;

  const idPannello = 'pannello-' + id;
  const freccia = el('button', {
    type: 'button',
    class: 'modulo filtro freccia-filtro',
    'data-focus': 'freccia-' + id,
    'aria-expanded': String(pannelloAperto === id),
    'aria-controls': idPannello,
    'aria-label': 'Scegli le sottocategorie: ' + nome,
    title: 'Scegli le sottocategorie',
    'aria-pressed': 'false',
    onclick: () => { pannelloAperto = pannelloAperto === id ? null : id; aggiornaVista(); },
  }, icona('giu', 2));

  const pannello = el('div', {
    class: 'pannello-categorie' + (pannelloAperto === id ? '' : ' nascosto'),
    id: idPannello, role: 'group', 'aria-label': 'Sottocategorie: ' + nome,
  }, finestra(el('div', { class: 'contenuto-pannello' },
    el('p', { class: 'nota' }, testoPannello),
    gruppi.map(({ gruppo, nome: nomeGruppo, conteggio }) => {
      const idCasella = 'chk-' + id + '-' + gruppo.replace(/[^a-z0-9]/gi, '-');
      const casella = el('input', {
        type: 'checkbox', class: 'spunta', id: idCasella, 'data-focus': idCasella,
        onchange: (e) => {
          if (e.target.checked) filtri.gruppi.add(gruppo); else filtri.gruppi.delete(gruppo);
          aggiornaDopo(e.target.checked && attivi.length === 0);
        },
      });
      casella.checked = filtri.gruppi.has(gruppo);
      return el('label', { class: 'riga-categoria', for: idCasella }, casella, el('span', { class: 'nome-categoria' }, nomeGruppo),
        el('b', {}, `${conteggio.ok}/${conteggio.tot}`));
    }))));

  return el('div', { class: 'gruppo-pannello' }, principale, freccia, pannello);
}

// Il pannello aperto si chiude cliccando fuori o con Esc
document.addEventListener('click', (e) => {
  if (pannelloAperto && !e.target.closest('.gruppo-pannello')) {
    pannelloAperto = null;
    if (guida) aggiornaVista();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && pannelloAperto) {
    const id = pannelloAperto;
    pannelloAperto = null;
    aggiornaVista();
    document.querySelector(`[data-focus="freccia-${id}"]`)?.focus();
  }
});

// Avviso: collezionabili "mancabili" non ancora spuntati nel capitolo in cui ti trovi.
// Una volta superato il capitolo non si può più recuperarli, quindi l'avviso sparisce.
function aggiornaAvvisoMancabili() {
  if (!contenitoreAvviso) return;
  contenitoreAvviso.replaceChildren();
  const corrente = passoCorrente();
  if (!corrente) return; // storia finita: niente da avvisare
  const capitoloQui = ordine[posizione[corrente.id]].capitolo.id;
  const inCorso = ordine.filter(({ passo, capitolo }) =>
    capitolo.id === capitoloQui && passo.mancabile && applicabile(passo) && applicabile(capitolo) && !passoFatto(passo));
  if (inCorso.length === 0) return;

  const lista = el('ul', {}, inCorso.map(({ passo, capitolo }) =>
    el('li', {},
      el('a', { href: '#passo-' + passo.id, onclick: (e) => vaiAlPasso(e, passo.id) }, `${passo.titolo} (${capitolo.nome})`),
      ': ' + passo.notaMancabile)));

  contenitoreAvviso.append(el('section', { class: 'box-avviso', 'aria-label': 'Cose da non perdere' },
    finestra(
      el('h2', {}, icona('clessidra'), 'Attenzione a ciò che si può perdere'),
      el('p', {}, 'Nel capitolo in cui ti trovi, da non perdere:'),
      lista)));
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

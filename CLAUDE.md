# Game Tracker — Documento di contesto

Questo file viene letto automaticamente da Claude all'inizio di ogni sessione.
Contiene tutto quello che serve per riprendere il lavoro sul progetto. **Tenerlo aggiornato.**

## Scopo del progetto
App web **locale** per seguire i progressi nei videogiochi:
- si sceglie un gioco e si vede una **guida passo passo in ordine cronologico** (timeline);
- si spuntano i progressi; il pulsante "Sono qui" accanto a un passo di storia segna come completata tutta la storia fino a lì;
- i passi **obbligatori** (storia) sono distinti da quelli **opzionali** (collezionabili, trofei, missioni secondarie), ma tutti stanno nella **stessa timeline**, nel punto esatto del gioco in cui vanno fatti;
- per gli opzionali la guida dice **dove trovarli**; le cose **mancabili** (che si perdono superato un certo punto) sono segnalate in anticipo.

## L'utente
- È un **principiante** nella programmazione e vuole **imparare**: spiegare cosa si fa e perché, con parole semplici.
- Codice **semplice, leggibile e commentato** (commenti in italiano).
- **Non fare supposizioni**: in caso di dubbio, fare domande.
- Lingua delle conversazioni: italiano.

## Decisioni prese (non cambiarle senza chiedere)
| Tema | Scelta |
|---|---|
| Creazione guide | L'utente chiede la guida **in chat**; Claude fa una ricerca web approfondita e salva la guida come JSON in `data/guides/`. L'app **non** chiama API esterne. |
| Tecnologia | HTML + CSS + JavaScript **senza framework**; server **Node.js senza dipendenze** (solo moduli integrati `http`, `fs`, `path`). Niente npm install. |
| Salvataggio progressi | File JSON in `data/progress/<id-gioco>.json`, scritti dal server. |
| Lingua | Testi in **italiano**; nomi di capitoli, collezionabili e trofei in **inglese originale**, con eventuale traduzione tra parentesi. |
| Contenuti tracciati | Storia, collezionabili, trofei/obiettivi, missioni secondarie, avvisi "mancabili". |
| Piattaforma | Indicata **per ogni gioco** (chiederla sempre prima di creare una guida). |
| Ore di gioco | Campo `durata` nella guida, riempito da Claude in chat (HowLongToBeat non ha API ufficiale; niente chiamate dal vivo). |
| Partite | **Una partita per gioco** (più partite = possibile estensione futura). |

## Ambiente
- Windows 11, Node.js v24, Python 3.14, Git.
- Cartella: `D:\Biolcuss\Progetti\Game Tracker`

## Comandi
- Avvio: `node server.js` oppure doppio clic su `avvia.bat` → http://localhost:3000
- Validare una guida: `node tools/valida-guida.js <id-gioco>`

Per le ricerche: le wiki Fandom si leggono tramite API (dettagli in `docs/FORMATO-GUIDA.md`), molti altri siti bloccano la lettura automatica.

## Architettura
```
CLAUDE.md               documento di contesto (questo file)
docs/ROADMAP.md         fasi del progetto, stato, idee future
docs/FORMATO-GUIDA.md   schema JSON delle guide + procedura di ricerca dettagliata
server.js               server Node: serve public/ e le API
avvia.bat               avvio con doppio clic
public/                 interfaccia: index.html (guscio vuoto), style.css, app.js (costruisce tutta la pagina)
data/guides/            una guida per gioco (scritte da Claude)
data/progress/          progressi dell'utente (scritti dall'app)
tools/valida-guida.js   controllo automatico delle guide
```

**API del server**
- `GET /api/giochi` → elenco guide (id, titolo, piattaforma) + percentuali di completamento
- `GET /api/giochi/:id` → guida completa
- `GET /api/progressi/:id` → progressi `{ "completati": { "<idPasso>": "<data ISO>" }, "scelte": { "<idScelta>": "<idOpzione>" }, "contatori": { "<idPasso>": <numero> }, "sonoQui": null }` (`sonoQui` non è più usato: la posizione è calcolata come primo passo di storia non completato)
- `PUT /api/progressi/:id` → salva i progressi (scrittura sicura: file temporaneo + rinomina)

Guide e progressi sono **separati**: i progressi fanno riferimento agli `id` dei passi.
Un passo `tipo: "trofeo"` è salvato con l'id del **trofeo** (`passo.trofeo`), non con l'id del passo: così spuntarlo nella timeline o nella scheda Trofei è la stessa cosa.

**Stile (richiesta dell'utente)**: estetica retrò/pixel ispirata a Hyprland (tiling window manager): barra in alto a tutta larghezza su due sezioni (sopra: "Giochi" a sinistra, titolo + versione e schede Guida/Trofei/Info al centro; sotto: i contatori), capitoli = finestre con angoli a gradini e ombre dure, bordo ambra sul capitolo dove sei. **Palette** (richiesta dell'utente): grigio caldo scuro di base + ambra come colore principale (selezione, link, focus); le icone restano colorate (stella ciano, gemma rosa/magenta; la coppa dei trofei è sempre ambra, regola `svg.icona.icona-coppa`). La spunta dei passi completati e i collezionabili usano ambra e rosa: collezionabili = rosa come i trofei, spunta completata = ambra. Font Jersey 10 (titoli/interfaccia, un solo peso: niente grassetto) + JetBrains Mono (testo), scaricati in `public/fonts/` (funziona offline). Pixelify Sans è stato scartato perché la "c" si confondeva con la "o". Icone pixel art disegnate in codice (`ICONE` in app.js, niente emoji). Colori e dimensioni sono variabili all'inizio di `public/style.css`. Accessibilità: skip link, focus visibile, `prefers-reduced-motion` rispettato, etichette cliccabili, tab nell'indirizzo. Se cambi lo stile, rispetta questi punti.

**Interfaccia (public/app.js)**: pagina tramite hash (`#/` elenco, `#/gioco/<id>` guida). Tre schede (nell'indirizzo: `#/gioco/<id>/guida|trofei|info`): Guida (timeline), Trofei, Info.
Dopo ogni spunta si aggiornano solo classi e testi (`aggiornaVista()`), senza ricostruire la pagina. Il testo delle guide si inserisce sempre come testo semplice, mai come HTML.
"Sono qui" (a destra del passo di storia) è un'azione una tantum, non un interruttore: spunta tutti i passi di storia fino a quel passo compreso (con conferma se sono più di uno), senza toccare collezionabili e trofei. Il "punto in cui sei" è calcolato (`passoCorrente()`): il primo passo di storia non completato; è evidenziato e il suo capitolo ha il bordo ambra.
Nella barra degli strumenti "Apri tutti", "Chiudi tutti" e "Nascondi completati" sono pulsanti con sola icona (con `aria-label` e `title`).
Il pulsante "Menu" (solo icona, accanto ad "Apri tutti/Chiudi tutti"; si chiude con la X in alto a destra) apre una finestra `<dialog>` per azzerare Storia, Collezionabili, Trofei o Tutto (con conferma; "Tutto" mantiene le scelte come la casa).
Filtri della scheda Guida: Tutto/Solo storia/Solo opzionali + categoria di collezionabili (`filtri.categoria`; mostra solo i collezionabili di quella categoria e nasconde i capitoli senza). Barre di progressione "Storia Principale" e "Completismo" (`barraProgresso()`) nella barra del gioco; nelle schede dell'elenco solo icone (stella, coppa). Campo facoltativo `durata` (ore da HowLongToBeat, che non ha API: si cercano in chat e si salvano nella guida), mostrato in elenco e nella scheda Info.
Gli elementi fissi in alto (barra, strumenti con filtri/pulsanti, titolo del capitolo aperto) sono `position: sticky` e le loro altezze sono misurate da `misuraElementiFissi()` e passate al CSS (`--alt-barra`, `--alt-strumenti`, `--alt-testata`). Le ombre dei capitoli e dei trofei sono pseudo-elementi, NON `filter: drop-shadow` (rallentava lo scorrimento). Su telefono barra e strumenti non sono fissi.
Banner "mancabili": mostra solo i collezionabili `mancabile` non spuntati nel capitolo corrente; superato il capitolo non compare più (non sono più recuperabili).

## Procedura "crea la guida per un gioco"
Dettagli completi in `docs/FORMATO-GUIDA.md`. In breve:
1. Chiedere all'utente: gioco esatto, **piattaforma/versione**, eventuali DLC.
2. Ricerca web approfondita: capitoli, collezionabili con posizioni, trofei/obiettivi, missioni secondarie, mancabili.
3. **Verifica incrociata** con almeno 2 fonti indipendenti; i totali (es. numero di tesori) devono coincidere col numero di passi.
4. Informazioni discordanti → `"daVerificare": true` e segnalarle all'utente.
5. Salvare in `data/guides/<id>.json` ed eseguire il validatore.
6. Riepilogo all'utente: capitoli, collezionabili, trofei, punti dubbi.

**Segni di completamento dei capitoli** (accanto al nome): tick ambra = tutti i passi di storia fatti, tick rosa = tutti i collezionabili, raccolte e trofei del capitolo fatti, tick viola = tutte le missioni secondarie fatte. Ogni tick compare solo se il capitolo contiene quel tipo di passi.

## Limiti noti delle guide (da dire all'utente se rilevanti)
- **Hogwarts Legacy**: ha oltre mille posizioni di collezionabili (una guida dice 1428). Non sono elencate una per una perché non è possibile verificarle tutte: ci sono solo i contatori (Pagine Revelio, Prove di Merlino, Floo Flames, statue dei Demiguise). Per aggiungere posizioni per regione si può usare più passi `raccolta` con la stessa categoria.
- La fonte principale per le missioni di Hogwarts Legacy è una sola wiki (Fandom): la catena principale è confrontata con altre due guide, gli obiettivi con 4 fonti. Le missioni secondarie senza sblocco noto sono nel capitolo a ordine libero.
- I nomi italiani ufficiali di capitoli/missioni non sono stati trovati in modo affidabile: restano in inglese.

## Regole importanti
- `data/progress/` è in `.gitignore`: i progressi dell'utente **non** vanno nei commit (decisione dell'utente). Un export/import dei progressi è previsto in futuro.
- **Mai cambiare l'`id` di un passo** in una guida già esistente: le spunte dell'utente si perderebbero. Per correggere, modificare i testi; per aggiungere passi, usare nuovi id.
- I file del progetto possono avere terminazioni di riga Windows (CRLF): negli script di modifica normalizzare `
` prima di cercare/sostituire testo.
- Non modificare a mano `data/progress/` salvo richiesta esplicita dell'utente.
- A fine di ogni sessione di lavoro aggiornare `docs/ROADMAP.md` (e questo file se cambia qualcosa).

## Commit Git (richiesta dell'utente)
- Fare **un commit dopo ogni modifica**, con messaggi **chiari e semplici** in italiano.
- Se la modifica è piccola (es. un paio di valori), si può aspettare per un commit più completo:
  in quel caso **chiedere all'utente** se fare il commit subito o rimandarlo.

## Guide presenti
| Gioco | File | Piattaforma | Stato |
|---|---|---|---|
| Uncharted: Drake's Fortune | `uncharted-drakes-fortune.json` | PS3 originale | v3, 22 capitoli, 60 tesori + Strange Relic, 48 trofei; 3 punti da verificare (Gold Spanish Chalice, ordine dei pannelli del pozzo cap. 2, percorso delle due leve cap. 15). Soluzioni degli enigmi riscritte passo per passo |
| Hogwarts Legacy | `hogwarts-legacy.json` | PC (Steam) | v2, 54 capitoli (46 missioni principali + 12 compiti, 4 raccolte con contatore, 24 relazioni, 58 secondarie), 45 obiettivi Steam; 8 punti da verificare. Collezionabili solo come contatori (vedi limiti) |

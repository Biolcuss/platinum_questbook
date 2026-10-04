# Game Tracker — Documento di contesto

Questo file viene letto automaticamente da Claude all'inizio di ogni sessione.
Contiene tutto quello che serve per riprendere il lavoro sul progetto. **Tenerlo aggiornato.**

## Scopo del progetto
App web **locale** per seguire i progressi nei videogiochi:
- si sceglie un gioco e si vede una **guida passo passo in ordine cronologico** (timeline);
- si spuntano i progressi e si indica **a che punto si è** (pulsante "Sono qui");
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
| Partite | **Una partita per gioco** (più partite = possibile estensione futura). |

## Ambiente
- Windows 11, Node.js v24, Python 3.14, Git.
- Cartella: `D:\Biolcuss\Progetti\Game Tracker`

## Comandi
- Avvio: `node server.js` oppure doppio clic su `avvia.bat` → http://localhost:3000
- Validare una guida: `node tools/valida-guida.js <id-gioco>`

*(il validatore va ancora creato: vedi `docs/ROADMAP.md`)*

## Architettura
```
CLAUDE.md               documento di contesto (questo file)
docs/ROADMAP.md         fasi del progetto, stato, idee future
docs/FORMATO-GUIDA.md   schema JSON delle guide + procedura di ricerca dettagliata
server.js               server Node: serve public/ e le API
avvia.bat               avvio con doppio clic
public/                 interfaccia (index.html, style.css, app.js)
data/guides/            una guida per gioco (scritte da Claude)
data/progress/          progressi dell'utente (scritti dall'app)
tools/valida-guida.js   controllo automatico delle guide
```

**API del server**
- `GET /api/giochi` → elenco guide (id, titolo, piattaforma) + percentuali di completamento
- `GET /api/giochi/:id` → guida completa
- `GET /api/progressi/:id` → progressi `{ "completati": { "<idPasso>": "<data ISO>" }, "sonoQui": "<idPasso>" }`
- `PUT /api/progressi/:id` → salva i progressi (scrittura sicura: file temporaneo + rinomina)

Guide e progressi sono **separati**: i progressi fanno riferimento agli `id` dei passi.

## Procedura "crea la guida per un gioco"
Dettagli completi in `docs/FORMATO-GUIDA.md`. In breve:
1. Chiedere all'utente: gioco esatto, **piattaforma/versione**, eventuali DLC.
2. Ricerca web approfondita: capitoli, collezionabili con posizioni, trofei/obiettivi, missioni secondarie, mancabili.
3. **Verifica incrociata** con almeno 2 fonti indipendenti; i totali (es. numero di tesori) devono coincidere col numero di passi.
4. Informazioni discordanti → `"daVerificare": true` e segnalarle all'utente.
5. Salvare in `data/guides/<id>.json` ed eseguire il validatore.
6. Riepilogo all'utente: capitoli, collezionabili, trofei, punti dubbi.

## Regole importanti
- **Mai cambiare l'`id` di un passo** in una guida già esistente: le spunte dell'utente si perderebbero. Per correggere, modificare i testi; per aggiungere passi, usare nuovi id.
- Non modificare a mano `data/progress/` salvo richiesta esplicita dell'utente.
- A fine di ogni sessione di lavoro aggiornare `docs/ROADMAP.md` (e questo file se cambia qualcosa).

## Commit Git (richiesta dell'utente)
- Fare **un commit dopo ogni modifica**, con messaggi **chiari e semplici** in italiano.
- Se la modifica è piccola (es. un paio di valori), si può aspettare per un commit più completo:
  in quel caso **chiedere all'utente** se fare il commit subito o rimandarlo.

## Guide presenti
*(nessuna per ora — la prima prevista è Uncharted: Drake's Fortune; piattaforma da chiedere)*

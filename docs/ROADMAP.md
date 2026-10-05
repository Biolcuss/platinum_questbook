# Roadmap

Stato del progetto. Aggiornare a ogni sessione di lavoro.

## Fase 1 — Fondamenta ✅
- [x] Repository Git
- [x] `CLAUDE.md` (documento di contesto)
- [x] `docs/ROADMAP.md`
- [x] `docs/FORMATO-GUIDA.md`
- [x] `.gitignore`

## Fase 2 — Server ✅
- [x] `server.js`: serve i file di `public/`
- [x] API `GET /api/giochi`, `GET /api/giochi/:id`
- [x] API `GET` / `PUT /api/progressi/:id` con scrittura sicura
- [x] `PlatinumQuestbook.bat` (avvia il server e apre il browser)
- [x] Pagina provvisoria `public/index.html` (elenco guide) in attesa della fase 3

## Fase 3 — Interfaccia ✅
- [x] Pagina iniziale: elenco giochi con le percentuali di completamento (solo testo, niente barre: vedi idee future)
- [x] Pagina gioco: timeline per capitoli (comprimibili), con riepilogo del capitolo
- [x] Scheda "Info": introduzione, percorso consigliato, fonti
- [x] Soluzioni degli enigmi nascoste (clic per mostrarle), note e avvisi "da verificare"
- [x] Scheda "Trofei" spuntabile, con avanzamento per quelli con `obiettivo`
- [x] Spunte salvate subito sul file
- [x] Pulsante "Sono qui" + scorrimento automatico + "segna completati i precedenti" (con conferma)
- [x] Test automatico di 20 comportamenti con Chrome (spunte, salvataggio, filtri, avvisi, trofei, ricarica)

## Fase 3b — Nuovo stile ✅
- [x] Estetica retrò/pixel ispirata a Hyprland, accessibilità verificata con le Web Interface Guidelines
- [x] Indirizzo con la scheda (`#/gioco/<id>/trofei`)
- [ ] Filtri nell'indirizzo (oggi restano solo in memoria)

## Fase 3c — Formato esteso per i giochi open world ✅
- [x] Passi `raccolta` con contatore (+ −, casella "trovati tutti")
- [x] Scelte del giocatore (`scelte` / `soloSe`), es. la casa: nascondono ciò che non vale e non contano nei totali
- [x] Capitoli a ordine libero (`ordinato: false`) e livello consigliato (`livello`)
- [x] Trofei con descrizione nascosta (`spoiler`) e grado `obiettivo` per Steam/Xbox
- [x] Progressi: `scelte` e `contatori` (compatibili con i file vecchi)
- [x] Font Jersey 10 al posto di Pixelify Sans (leggibilità)

## Fase 3d — Barra e palette ✅
- [x] Barra a tutta larghezza su due sezioni: in alto indietro / titolo + versione + schede, sotto i contatori
- [x] Palette grigio caldo scuro + ambra (icone invariate)

## Fase 3e — Pulsante "Sono qui" e Menu ✅
- [x] "Sono qui" a destra del passo, azione una tantum che completa la storia fino a lì
- [x] Posizione calcolata in automatico (primo passo di storia non completato)
- [x] Menu con azzeramento di Storia, Collezionabili, Trofei e Tutto
- [x] Spunta completata color ambra; collezionabili rosa come i trofei

## Fase 3f — Icone e segni di completamento ✅
- [x] Menu e chiusura (X) solo con icona, con etichetta per i lettori di schermo
- [x] Tick ambra/rosa/viola accanto al nome del capitolo (storia / collezionabili e trofei / secondarie)

## Fase 4 — Validatore ✅
- [x] `tools/valida-guida.js`: id unici, campi obbligatori, totali coerenti, riferimenti ai trofei validi

## Fase 5 — Prima guida reale ✅ (in attesa di revisione dell'utente)
- [x] Piattaforma: PS3 (versione originale)
- [x] Uncharted: Drake's Fortune — ricerca, verifica incrociata, salvataggio, validazione
- [ ] Revisione dell'utente su struttura e contenuti
- [ ] 1 punto da verificare: Gold Spanish Chalice (cap. 13), le fonti non concordano sul lato della piazza
- [x] Soluzioni degli enigmi riscritte passo per passo (Uncharted cap. 2, 5, 6, 13, 14, 15 e Hogwarts "Solved by the Bell"); da verificare l'ordine dei pannelli del cap. 2 e il percorso delle leve del cap. 15

## Fase 5b — Seconda guida: Hogwarts Legacy (Steam) ✅ (in attesa di revisione dell'utente)
- [x] 46 missioni principali + 12 compiti (6 obbligatori), 24 missioni di relazione, 58 secondarie
- [x] 45 obiettivi Steam (nomi dalla pagina Steam, descrizioni da wiki + 3 guide)
- [x] Contatori per Revelio (150), Prove di Merlino (95), Floo Flames (83), Demiguise (33)
- [ ] Revisione dell'utente
- [ ] Posizioni dei collezionabili per regione (oltre i contatori)
- [ ] Nomi italiani ufficiali delle missioni, se trovabili in modo affidabile

## Fase 6 — Rifinitura
- [x] Filtri: pulsanti-toggle nella barra in alto (storia, secondarie, categorie, trofei) + nascondi completati
- [x] Filtro per categoria di collezionabile: ora sono i contatori della barra in alto, usati come pulsanti toggle (Storia, categorie, Trofei)
- [x] Barre di progressione (Storia e Totale) nella barra della pagina del gioco e nelle schede dell'elenco
- [x] Banner avviso mancabili
- [x] Contatori per categoria e trofei
- [x] Esporta / importa progressi (Salvataggio: unisci o sostituisci)
- [x] `data/progress/` escluso da Git (decisione dell'utente)
- [x] Restyling retrò/pixel in stile Hyprland (font locali, icone pixel, barra waybar, finestre a gradini)

## Fase 6b — Durata e barre ✅
- [x] HowLongToBeat non ha API ufficiale: scelta (utente) di salvare le ore nel campo `durata` della guida, senza chiamate dal vivo
- [x] `durata` mostrata nell'elenco giochi e nella scheda Info; controllata dal validatore
- [ ] Le ore di Uncharted e Hogwarts Legacy sono stime di siti terzi (`daVerificare`): da confrontare con HowLongToBeat
- [x] Barre rinominate "Storia Principale" e "Completismo"; nell'elenco solo icone (stella, coppa)

## Fase 6c — Scorrimento e barre fisse ✅
- [x] Scorrimento a scatti: tolto `drop-shadow` dai capitoli (ombra con pseudo-elemento)
- [x] Titolo del capitolo e barra degli strumenti fissi in alto mentre si scorre

## Fase 6d — Copertine ✅
- [x] Immagini in `covers/`, cornice verticale 2:3 a sinistra nelle schede dell'elenco
- [x] Editor di riposizionamento fatto e poi rimosso su richiesta dell'utente: le copertine si mostrano intere, centrate
- [x] Copertina anche nella barra della pagina del gioco (a tutta altezza, a sinistra)
- [ ] Copertine automatiche da un'API (IGDB/RAWG): opzionale, userebbe un'API esterna

## Fase 6e — Sottocategorie di missioni ✅
- [x] Pannello a casella per Storia e Secondarie, come per i collezionabili (`sottocategorie` nella guida)
- [x] Hogwarts Legacy: storia = missioni principali / compiti; secondarie = secondarie / relazioni / compiti facoltativi (classificate con le categorie della wiki)

## Fase 7 — Pubblicazione ✅
- [x] README, licenza MIT, copertine fuori da Git (`covers/` ignorata, istruzioni in `covers/README.md`)
- [x] Salvataggio (esporta/importa) per usare i progressi su più dispositivi, senza account
- [ ] Opzionali: cartella dati configurabile (per sincronizzarla con un cloud), profili multipli per installazione

## Fase 8 — Caricare le copertine dall'app ✅
- [x] Copertina predefinita `covers/default.*` per i giochi senza immagine
- [x] Pulsante menu sulla copertina (elenco e pagina del gioco) → carica un'immagine, che sostituisce quella vecchia

## Fase 9 — Sito online (GitHub Pages) ✅
- `public/archivio.js`: due modi, scelti da soli. Con il server locale usa le API; online (nessun server) legge i file JSON e salva i progressi nel `localStorage` del browser (separati per dispositivo). Esporta/Importa il salvataggio funzionano in entrambi i modi (è così che si spostano i progressi tra PC e telefono).
- `tools/genera-sito.js` crea `_site/` (interfaccia + guide + `indice.json`, l'elenco dei giochi ricavato dalle guide: ogni nuova guida compare da sola).
- `.github/workflows/pubblica-sito.yml` pubblica `_site/` ad ogni push su `main`.
- Online non si caricano copertine e compaiono solo quelle versionate in Git (la predefinita).

## Idee future (non ancora decise)
- Filtri nell'indirizzo (oggi restano in memoria)
- **Opzionali (idee valutate con l'utente):**
  - Statistiche e cronologia (grafici dai dati delle spunte, ritmo di gioco)
  - Ricerca di testo nella guida
  - Uso dal telefono (stessa rete Wi-Fi; attenzione alla sicurezza)
- Più partite per lo stesso gioco
- Note personali su ogni passo
- Immagini o link a video per le posizioni dei collezionabili

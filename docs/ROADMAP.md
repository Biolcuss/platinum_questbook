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
- [x] `avvia.bat` (avvia il server e apre il browser)
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

## Fase 4 — Validatore ✅
- [x] `tools/valida-guida.js`: id unici, campi obbligatori, totali coerenti, riferimenti ai trofei validi

## Fase 5 — Prima guida reale ✅ (in attesa di revisione dell'utente)
- [x] Piattaforma: PS3 (versione originale)
- [x] Uncharted: Drake's Fortune — ricerca, verifica incrociata, salvataggio, validazione
- [ ] Revisione dell'utente su struttura e contenuti
- [ ] 1 punto da verificare: Gold Spanish Chalice (cap. 13), le fonti non concordano sul lato della piazza

## Fase 5b — Seconda guida: Hogwarts Legacy (Steam) ✅ (in attesa di revisione dell'utente)
- [x] 46 missioni principali + 12 compiti (6 obbligatori), 24 missioni di relazione, 58 secondarie
- [x] 45 obiettivi Steam (nomi dalla pagina Steam, descrizioni da wiki + 3 guide)
- [x] Contatori per Revelio (150), Prove di Merlino (95), Floo Flames (83), Demiguise (33)
- [ ] Revisione dell'utente
- [ ] Posizioni dei collezionabili per regione (oltre i contatori)
- [ ] Nomi italiani ufficiali delle missioni, se trovabili in modo affidabile

## Fase 6 — Rifinitura
- [x] Filtri: tutto / solo storia / solo opzionali / nascondi completati
- [ ] Filtro per categoria di collezionabile (utile con più giochi/categorie)
- [x] Banner avviso mancabili
- [x] Contatori per categoria e trofei
- [ ] Esporta / importa progressi (backup)
- [x] `data/progress/` escluso da Git (decisione dell'utente)
- [x] Restyling retrò/pixel in stile Hyprland (font locali, icone pixel, barra waybar, finestre a gradini)

## Idee future (non ancora decise)
- **Barre di progressione** dentro la pagina del gioco: una per gli obiettivi principali (storia) e una per il completismo (tutto). *(richiesta dell'utente: da ignorare per ora; nella fase 3 si mostrano solo i contatori numerici)*
- **HowLongToBeat**: controllare o integrare i dati per sapere quante ore servono per finire un gioco (storia, storia + extra, completismo). *(richiesta dell'utente: da ignorare per ora; da verificare se esiste un'API ufficiale o un modo lecito di leggere i dati)*
- Filtri nell'indirizzo (oggi restano in memoria) e filtro per categoria
- Più partite per lo stesso gioco
- Note personali su ogni passo
- Immagini o link a video per le posizioni dei collezionabili

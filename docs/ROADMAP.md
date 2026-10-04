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

## Fase 4 — Validatore ✅
- [x] `tools/valida-guida.js`: id unici, campi obbligatori, totali coerenti, riferimenti ai trofei validi

## Fase 5 — Prima guida reale ✅ (in attesa di revisione dell'utente)
- [x] Piattaforma: PS3 (versione originale)
- [x] Uncharted: Drake's Fortune — ricerca, verifica incrociata, salvataggio, validazione
- [ ] Revisione dell'utente su struttura e contenuti
- [ ] 1 punto da verificare: Gold Spanish Chalice (cap. 13), le fonti non concordano sul lato della piazza

## Fase 6 — Rifinitura
- [x] Filtri: tutto / solo storia / solo opzionali / nascondi completati
- [ ] Filtro per categoria di collezionabile (utile con più giochi/categorie)
- [x] Banner avviso mancabili
- [x] Contatori per categoria e trofei
- [ ] Esporta / importa progressi (backup)
- [ ] Decidere se `data/progress/` va nei commit di Git o in `.gitignore`

## Idee future (non ancora decise)
- **Barre di progressione** dentro la pagina del gioco: una per gli obiettivi principali (storia) e una per il completismo (tutto). *(richiesta dell'utente: da ignorare per ora; nella fase 3 si mostrano solo i contatori numerici)*
- **HowLongToBeat**: controllare o integrare i dati per sapere quante ore servono per finire un gioco (storia, storia + extra, completismo). *(richiesta dell'utente: da ignorare per ora; da verificare se esiste un'API ufficiale o un modo lecito di leggere i dati)*
- Più partite per lo stesso gioco
- Note personali su ogni passo
- Immagini o link a video per le posizioni dei collezionabili

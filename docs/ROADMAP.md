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

## Fase 3 — Interfaccia
- [ ] Pagina iniziale: elenco giochi con barre di completamento
- [ ] Pagina gioco: timeline per capitoli (comprimibili), con riepilogo del capitolo
- [ ] Introduzione e percorso consigliato del gioco
- [ ] Soluzioni degli enigmi nascoste (clic per mostrarle), note e avvisi "da verificare"
- [ ] Elenco trofei spuntabile, con avanzamento automatico per quelli con `obiettivo`
- [ ] Spunte salvate subito sul file
- [ ] Pulsante "Sono qui" + scorrimento automatico + "segna completati i precedenti"

## Fase 4 — Validatore ✅
- [x] `tools/valida-guida.js`: id unici, campi obbligatori, totali coerenti, riferimenti ai trofei validi

## Fase 5 — Prima guida reale ✅ (in attesa di revisione dell'utente)
- [x] Piattaforma: PS3 (versione originale)
- [x] Uncharted: Drake's Fortune — ricerca, verifica incrociata, salvataggio, validazione
- [ ] Revisione dell'utente su struttura e contenuti
- [ ] 1 punto da verificare: Gold Spanish Chalice (cap. 13), le fonti non concordano sul lato della piazza

## Fase 6 — Rifinitura
- [ ] Filtri: tutto / solo storia / solo opzionali / nascondi completati / per categoria
- [ ] Banner avviso mancabili
- [ ] Contatori per categoria e trofei
- [ ] Esporta / importa progressi (backup)

## Idee future (non ancora decise)
- Più partite per lo stesso gioco
- Note personali su ogni passo
- Immagini o link a video per le posizioni dei collezionabili

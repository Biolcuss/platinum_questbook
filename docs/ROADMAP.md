# Roadmap

Stato del progetto. Aggiornare a ogni sessione di lavoro.

## Fase 1 — Fondamenta ✅
- [x] Repository Git
- [x] `CLAUDE.md` (documento di contesto)
- [x] `docs/ROADMAP.md`
- [x] `docs/FORMATO-GUIDA.md`
- [x] `.gitignore`

## Fase 2 — Server
- [ ] `server.js`: serve i file di `public/`
- [ ] API `GET /api/giochi`, `GET /api/giochi/:id`
- [ ] API `GET` / `PUT /api/progressi/:id` con scrittura sicura
- [ ] `avvia.bat` (avvia il server e apre il browser)

## Fase 3 — Interfaccia
- [ ] Guida finta di prova (2 capitoli) in `data/guides/`
- [ ] Pagina iniziale: elenco giochi con barre di completamento
- [ ] Pagina gioco: timeline per capitoli (comprimibili)
- [ ] Spunte salvate subito sul file
- [ ] Pulsante "Sono qui" + scorrimento automatico + "segna completati i precedenti"

## Fase 4 — Validatore
- [ ] `tools/valida-guida.js`: id unici, campi obbligatori, totali coerenti, riferimenti ai trofei validi

## Fase 5 — Prima guida reale
- [ ] Chiedere la piattaforma all'utente
- [ ] Uncharted: Drake's Fortune — ricerca, verifica incrociata, salvataggio, validazione

## Fase 6 — Rifinitura
- [ ] Filtri: tutto / solo storia / solo opzionali / nascondi completati / per categoria
- [ ] Banner avviso mancabili
- [ ] Contatori per categoria e trofei
- [ ] Esporta / importa progressi (backup)

## Idee future (non ancora decise)
- Più partite per lo stesso gioco
- Note personali su ogni passo
- Immagini o link a video per le posizioni dei collezionabili

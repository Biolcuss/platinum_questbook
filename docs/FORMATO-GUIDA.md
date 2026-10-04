# Formato delle guide

Ogni gioco ha un file `data/guides/<id>.json`. L'`id` è il nome del gioco in minuscolo con trattini
(es. `uncharted-drakes-fortune`) e coincide con il nome del file.

Esempio reale completo: `data/guides/uncharted-drakes-fortune.json`.

## Principi
1. **La timeline è l'ordine dei passi**: i passi di un capitolo sono nell'ordine in cui si incontrano giocando.
   Un collezionabile va inserito subito dopo il passo di storia in cui diventa raggiungibile.
2. **Storia = obbligatorio**, tutto il resto è opzionale ma sta comunque nella timeline.
3. **Niente spoiler di trama**: i passi descrivono cosa fare (dove andare, chi combattere), non cosa succede
   nella storia. Evitare nomi di personaggi quando rivelano colpi di scena (es. "il tuo alleato").
4. **Le soluzioni degli enigmi vanno nel campo `soluzione`**: l'app le nasconde finché l'utente non le apre.
5. **Testi in italiano, nomi propri in inglese originale** (capitoli, collezionabili, trofei, armi).
6. **Ogni informazione deve essere verificata** con almeno 2 fonti; se non è possibile → `daVerificare`.
7. **Non inventare mai un ordine**: se un contenuto non ha un punto fisso nella storia (mondo aperto), va in un capitolo con `"ordinato": false`, non sparso a caso nella timeline.
8. **Collezionabili in massa** (centinaia di oggetti): non elencarli uno per uno senza una posizione verificata; usare passi di tipo `raccolta` con un contatore.

## Struttura generale
```json
{
  "id": "uncharted-drakes-fortune",
  "titolo": "Uncharted: Drake's Fortune",
  "piattaforma": "PS3",
  "versioneGuida": 1,
  "verificataIl": "2026-10-04",
  "fonti": [ { "nome": "Uncharted Wiki – Treasure locations", "url": "https://..." } ],
  "introduzione": [ "Consiglio generale 1", "Consiglio generale 2" ],
  "percorsoConsigliato": [ "1ª partita: ...", "2ª partita: ..." ],
  "scelte": [ { "id": "casa", "nome": "La tua casa", "opzioni": [ { "id": "grifondoro", "nome": "Grifondoro" } ] } ],
  "categorie": [ { "id": "tesori", "nome": "Treasures", "totale": 60 } ],
  "trofei": [ { ... } ],
  "capitoli": [ { ... } ]
}
```

## Campi del gioco
| Campo | Obbligatorio | Significato |
|---|---|---|
| `id` | sì | Identificativo, uguale al nome del file |
| `titolo` | sì | Titolo ufficiale |
| `piattaforma` | sì | Piattaforma/versione su cui si basa la guida |
| `versioneGuida` | sì | Numero che aumenta a ogni correzione |
| `verificataIl` | sì | Data dell'ultima verifica (AAAA-MM-GG) |
| `fonti` | sì | Fonti usate (almeno 2): `{ "nome", "url" }` |
| `introduzione` | no | Consigli generali da leggere prima di iniziare (frasi brevi) |
| `percorsoConsigliato` | no | Ordine suggerito delle partite per completare tutto (es. per il Platino) |
| `scelte` | no | Scelte del giocatore che cambiano cosa vale per lui (es. la casa): `{ "id", "nome", "descrizione"?, "opzioni": [ { "id", "nome" } ] }`. Vedi sotto |
| `categorie` | no | Tipi di collezionabili: `{ "id", "nome", "totale", "descrizione"? }` |
| `trofei` | no | Elenco completo di trofei/obiettivi (vedi sotto) |
| `capitoli` | sì | I capitoli in ordine |

## Trofei
Tutti i trofei stanno nell'elenco `trofei` e si spuntano lì (l'id del trofeo è la chiave nei progressi).
```json
{ "id": "tr-relic-finder", "nome": "Relic Finder", "grado": "bronzo",
  "descrizione": "Trova la Strange Relic.",
  "suggerimento": "Capitolo 5, vedi il passo nella timeline.",
  "obiettivo": { "categoria": "reliquia", "quantita": 1 } }
```
| Campo | Obbligatorio | Significato |
|---|---|---|
| `id` | sì | Inizia con `tr-`, unico in tutta la guida |
| `nome` | sì | Nome originale inglese |
| `grado` | sì | `platino` · `oro` · `argento` · `bronzo` (PlayStation) oppure `obiettivo` (Steam/Xbox, nessun grado) |
| `descrizione` | sì | Requisito, tradotto in italiano |
| `suggerimento` | no | Come/dove ottenerlo più facilmente |
| `obiettivo` | no | Se dipende da un numero di collezionabili: `{ "categoria", "quantita" }`. L'app mostra l'avanzamento (es. 12/25) |
| `spoiler` | no | `true` se la descrizione rivela la trama: l'app la nasconde finché non viene aperta (regola pratica: su Steam/PSN le descrizioni nascoste dal gioco sono spoiler) |
| `soloSe` | no | Vale solo per chi ha fatto una scelta, es. `{ "casa": "grifondoro" }` |
| `mancabile`, `notaMancabile` | no | Come per i passi |
| `daVerificare`, `notaVerifica` | no | Come per i passi |

Se un trofeo si ottiene in un **punto preciso** della storia, si aggiunge anche un passo `tipo: "trofeo"` nella
timeline con `"trofeo": "<id>"`: spuntare il passo o il trofeo è la stessa cosa (stessa chiave nei progressi).

## Capitoli
```json
{ "id": "c02", "numero": 2, "nome": "The Search for El Dorado",
  "riepilogo": "Esplorazione di un tempio nella giungla, con il primo enigma.",
  "passi": [ ... ] }
```
| Campo | Obbligatorio | Significato |
|---|---|---|
| `id` | sì | `c` + numero a due cifre (`c01`, `c02`…) |
| `numero` | no | Numero del capitolo nel gioco (se il gioco non numera i capitoli, ometterlo) |
| `nome` | sì | Nome originale |
| `riepilogo` | no | Una frase senza spoiler su cosa si fa nel capitolo |
| `livello` | no | Livello consigliato (giochi di ruolo); l'app lo mostra nel capitolo |
| `ordinato` | no | `false` per un capitolo "a ordine libero" (mondo aperto: i passi non hanno una sequenza obbligata). Default: `true` |
| `soloSe` | no | Il capitolo vale solo per chi ha fatto una scelta |
| `passi` | sì | I passi in ordine di timeline |

## Passi
```json
{ "id": "c02-p06", "tipo": "storia", "titolo": "Risolvi l'enigma dei simboli nel pozzo",
  "descrizione": "Consulta il diario e premi i quattro blocchi nell'ordine giusto.",
  "soluzione": "Alto a destra, basso a sinistra, alto a sinistra, basso a destra." }

{ "id": "c03-t02", "tipo": "collezionabile", "categoria": "tesori",
  "titolo": "Gold and Turquoise Inca Earring",
  "dove": "Sulla punta anteriore del sottomarino, sul ponte.",
  "mancabile": true, "notaMancabile": "Prendilo prima di entrare nel sottomarino." }
```
| Campo | Obbligatorio | Significato |
|---|---|---|
| `id` | sì | Unico in tutta la guida. **Non va mai cambiato** dopo la pubblicazione |
| `tipo` | sì | `storia` (obbligatorio) · `collezionabile` · `raccolta` · `trofeo` · `secondaria` (opzionali) |
| `titolo` | sì | Storia: azione breve. Collezionabile/trofeo: nome originale |
| `descrizione` | no | Come fare (comandi, nemici, consigli di combattimento) |
| `dove` | per gli opzionali | Posizione precisa, con punti di riferimento, comprensibile senza video |
| `soluzione` | no | Soluzione di un enigma (nascosta di default nell'app) |
| `nota` | no | Avvisi utili (es. un bug noto, un limite di tempo) |
| `categoria` | per `collezionabile` e `raccolta` | Id di una voce in `categorie` |
| `quantita` | per `raccolta` | Quanti oggetti ci sono in questo passo (intero > 0) |
| `livello` | no | Livello consigliato per questo passo |
| `soloSe` | no | Il passo vale solo per chi ha fatto una scelta |
| `trofeo` | per `trofeo` | Id di una voce in `trofei` |
| `mancabile` | no | `true` se superato un certo punto non si può più tornare indietro **in questa partita** |
| `notaMancabile` | se `mancabile` | Quando si perde e se si può recuperare dopo (es. con la selezione capitolo) |
| `daVerificare` | no | `true` se le fonti non concordano |
| `notaVerifica` | se `daVerificare` | Cosa dicono le diverse fonti |

### Passi di tipo `raccolta` (collezionabili in massa)
Per decine o centinaia di oggetti dello stesso tipo si usa **un passo con un contatore** invece di un passo per oggetto:
```json
{ "id": "c04-r01", "tipo": "raccolta", "categoria": "prove", "quantita": 15, "titolo": "Prove di Merlino a nord",
  "dove": "Come riconoscerle e dove cercarle, in generale" }
```
L'app mostra `− 3 / 15 +` (la casella significa "trovati tutti"). Il progresso è salvato come numero. Si possono usare più passi con la stessa categoria (es. uno per regione): la somma delle `quantita` deve essere uguale al `totale` della categoria. Il passo va messo nel punto della timeline in cui diventa possibile raccogliere quegli oggetti.

### Scelte del giocatore (`scelte` e `soloSe`)
Quando il gioco cambia in base a una scelta (la casa, la fazione, la classe…) si dichiara la scelta nella guida e si marca ciò che vale solo per una opzione:
```json
"scelte": [ { "id": "casa", "nome": "La tua casa", "descrizione": "Scegli la tua: nasconde ciò che non ti riguarda.",
              "opzioni": [ { "id": "grifondoro", "nome": "Grifondoro" }, { "id": "serpeverde", "nome": "Serpeverde" } ] } ]
...
{ "id": "c05-p01", "tipo": "storia", "titolo": "...", "soloSe": { "casa": "grifondoro" } }
```
L'app mostra i pulsanti di scelta in cima; i capitoli, passi e trofei con `soloSe` diversi dalla scelta si nascondono e **non contano** nei totali. Finché l'utente non sceglie, si vede tutto.

### Convenzione per gli id dei passi
`cNN-pNN` storia · `cNN-tNN` collezionabile · `cNN-rNN` raccolta · `cNN-trNN` trofeo · `cNN-mNN` secondaria.
Se dopo la pubblicazione si aggiunge un passo in mezzo, usare un nuovo numero libero:
l'ordine lo dà la posizione nell'array, non il numero dell'id.

### Granularità dei passi di storia
Abbastanza fitti da poter dire "sono qui" con precisione (indicativamente un passo per ogni zona,
scontro importante o enigma), ma senza descrivere ogni singolo salto.

## Controlli automatici
`node tools/valida-guida.js <id>` verifica:
- campi obbligatori presenti, id unici, tipi validi;
- ogni `categoria` e ogni `trofeo` citati esistono;
- il numero di collezionabili di ogni categoria (1 per ogni `collezionabile`, `quantita` per ogni `raccolta`) è uguale al suo `totale`;
- ogni `soloSe` usa scelte e opzioni dichiarate in `scelte`;
- `obiettivo.quantita` non supera il totale della categoria.

## Procedura di ricerca
1. **Chiedere all'utente**: gioco esatto, piattaforma/versione (originale, remaster, collection, PC…), DLC inclusi o no.
   Attenzione: trofei e a volte i contenuti cambiano tra versioni.
2. **Struttura**: elenco ufficiale dei capitoli con nomi originali.
3. **Storia**: soluzione di ogni capitolo → passi di storia (senza spoiler), con le soluzioni degli enigmi.
4. **Collezionabili**: elenco completo per capitolo, con posizione descritta in modo che si trovi senza video.
5. **Trofei/obiettivi**: lista completa **per la piattaforma scelta**, con grado e requisito.
6. **Missioni secondarie e mancabili**: quando si sbloccano e quando si perdono.
7. **Verifica incrociata**: almeno 2 fonti indipendenti (wiki del gioco, PowerPyx, PSNProfiles,
   PlayStationTrophies, TrueAchievements, Push Square…). Controllare che nomi, ordine e totali coincidano.
8. Dove le fonti non concordano: `daVerificare: true` + `notaVerifica`, e dirlo all'utente.
9. Eseguire il validatore e correggere gli errori.
10. Riepilogo all'utente: numero di capitoli, collezionabili, trofei e punti dubbi.

**Giochi open world**: se ci sono centinaia di collezionabili, usare `raccolta` (contatori) e non inventare posizioni. Se una missione non ha un punto di sblocco confermato, metterla in un capitolo `ordinato: false` e dirlo.

**Suggerimento tecnico**: molti siti bloccano la lettura automatica. Le wiki Fandom si leggono bene tramite la
loro API, es. `https://<wiki>.fandom.com/api.php?action=parse&page=<Pagina>&prop=wikitext&format=json`.

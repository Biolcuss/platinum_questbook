# Formato delle guide

Ogni gioco ha un file `data/guides/<id>.json`. L'`id` è il nome del gioco in minuscolo con trattini
(es. `uncharted-drakes-fortune`) e coincide con il nome del file.

## Esempio completo
```json
{
  "id": "uncharted-drakes-fortune",
  "titolo": "Uncharted: Drake's Fortune",
  "piattaforma": "PS4 (Nathan Drake Collection)",
  "versioneGuida": 1,
  "verificataIl": "2026-10-04",
  "fonti": ["https://...", "https://..."],
  "categorie": [
    { "id": "tesori", "nome": "Treasures (Tesori)", "totale": 60 }
  ],
  "trofei": [
    { "id": "t-esempio", "nome": "Nome originale", "descrizione": "Come ottenerlo", "mancabile": false }
  ],
  "trofeiGlobali": ["t-esempio"],
  "capitoli": [
    {
      "id": "c01",
      "numero": 1,
      "nome": "Ambushed (Imboscata)",
      "passi": [
        { "id": "c01-p01", "tipo": "storia", "titolo": "...", "descrizione": "..." },
        { "id": "c01-t01", "tipo": "collezionabile", "categoria": "tesori",
          "titolo": "...", "dove": "...", "mancabile": true, "notaMancabile": "..." },
        { "id": "c01-tr01", "tipo": "trofeo", "trofeo": "t-esempio", "titolo": "...", "dove": "..." },
        { "id": "c01-m01", "tipo": "secondaria", "titolo": "...", "descrizione": "..." }
      ]
    }
  ]
}
```
*(I numeri nell'esempio sono solo dimostrativi: i dati reali vanno sempre verificati con la ricerca.)*

## Campi del gioco
| Campo | Obbligatorio | Significato |
|---|---|---|
| `id` | sì | Identificativo, uguale al nome del file |
| `titolo` | sì | Titolo ufficiale |
| `piattaforma` | sì | Piattaforma/versione su cui si basa la guida |
| `versioneGuida` | sì | Numero che aumenta a ogni correzione |
| `verificataIl` | sì | Data dell'ultima verifica (AAAA-MM-GG) |
| `fonti` | sì | Link alle fonti usate (almeno 2) |
| `categorie` | no | Tipi di collezionabili, con il `totale` ufficiale |
| `trofei` | no | Elenco completo di trofei/obiettivi |
| `trofeiGlobali` | no | Id dei trofei non legati a un punto preciso (es. "uccidi 50 nemici") |
| `capitoli` | sì | I capitoli in ordine |

## Campi di un passo
| Campo | Obbligatorio | Significato |
|---|---|---|
| `id` | sì | Unico in tutta la guida. **Non va mai cambiato** dopo la pubblicazione |
| `tipo` | sì | `storia` (obbligatorio) · `collezionabile` · `trofeo` · `secondaria` (opzionali) |
| `titolo` | sì | Testo breve |
| `descrizione` | no | Spiegazione di cosa fare |
| `dove` | per gli opzionali | Posizione precisa: come arrivarci, punti di riferimento |
| `categoria` | per `collezionabile` | Id di una voce in `categorie` |
| `trofeo` | per `trofeo` | Id di una voce in `trofei` |
| `mancabile` | no | `true` se si perde superato un certo punto |
| `notaMancabile` | se `mancabile` | Quando/perché si perde |
| `daVerificare` | no | `true` se le fonti non concordano |

## Regole
- **L'ordine dei passi nell'array è la timeline**: un opzionale va inserito subito dopo il passo di storia
  in cui diventa raggiungibile.
- Convenzione per gli id: `cNN-pNN` storia, `cNN-tNN` collezionabile, `cNN-trNN` trofeo, `cNN-mNN` secondaria.
  Se si aggiunge un passo in mezzo dopo la pubblicazione, usare un nuovo numero libero (l'ordine lo dà l'array, non l'id).
- Il numero di passi `collezionabile` di una categoria deve essere uguale al suo `totale`.

## Procedura di ricerca
1. **Chiedere all'utente**: gioco esatto, piattaforma/versione (remaster, collection, PC…), DLC inclusi o no.
2. **Struttura**: elenco ufficiale dei capitoli con nomi originali.
3. **Storia**: passi principali di ogni capitolo, abbastanza fitti da poter dire "sono qui" con precisione,
   ma senza spoiler inutili.
4. **Collezionabili**: elenco completo per capitolo, con posizione descritta in modo che si trovi senza video.
5. **Trofei/obiettivi**: lista completa per la piattaforma scelta; collocare nella timeline quelli legati a un punto preciso, gli altri in `trofeiGlobali`.
6. **Missioni secondarie e mancabili**: quando si sbloccano e quando si perdono.
7. **Verifica incrociata**: confrontare almeno 2 fonti indipendenti (wiki del gioco, PowerPyx, PSNProfiles,
   TrueAchievements, guide ufficiali…). Controllare che i totali coincidano.
8. Dove le fonti non concordano: `daVerificare: true` e dirlo all'utente.
9. Eseguire `node tools/valida-guida.js <id>` e correggere gli errori.
10. Riepilogo all'utente: numero di capitoli, collezionabili, trofei e punti dubbi.

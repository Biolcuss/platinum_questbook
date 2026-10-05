# Game Tracker

Un'app web **locale** per seguire i tuoi progressi nei videogiochi. Scegli un gioco, segui la **guida passo passo
in ordine cronologico** e spunta ciò che hai fatto: storia, missioni secondarie, collezionabili e trofei, ciascuno
nel punto esatto del gioco in cui va fatto. Le cose che si possono **perdere** (mancabili) sono segnalate in anticipo.

Niente account, niente cloud, niente dipendenze: è un piccolo server Node.js che gira sul tuo computer e salva i
progressi in file sul tuo disco.

## Come si avvia

Serve solo [Node.js](https://nodejs.org) (una versione recente; il progetto è sviluppato e provato con la v24). Non c'è nulla da installare.

```
node server.js
```

Poi apri **http://localhost:3000**. Su Windows puoi anche fare doppio clic su `GameTracker.bat`
(avvia il server e apre il browser). Per fermarlo: `Ctrl+C` o chiudi la finestra.

## Come si usa

- **Elenco dei giochi**: ogni scheda mostra copertina, barre di avanzamento (Storia Principale e Completismo) e ore stimate.
- **Guida**: i capitoli in ordine. Spunta un passo per completarlo. **Sono qui** segna come fatta tutta la storia
  fino a quel passo. Il passo evidenziato è il prossimo da fare.
- **Filtri**: i contatori in alto (Storia, Secondarie, Collezionabili, Trofei) sono pulsanti che mostrano solo quel
  gruppo; la freccia accanto apre le sottocategorie (es. missioni principali / compiti, tipi di collezionabili).
  Gli altri pulsanti nascondono i completati e aprono o chiudono tutti i capitoli.
- **Trofei** e **Info** (fonti e consigli) sono nelle schede in alto.
- **Menu** (nella pagina del gioco): azzera storia, collezionabili, trofei o tutto, e apre il Salvataggio.
- **Salvataggio** (anche nella pagina iniziale): **Esporta** scarica un file con i progressi di tutti i giochi,
  **Importa** lo carica su un altro dispositivo (*Unisci* aggiunge senza perdere nulla, *Sostituisci* usa solo il file).

I progressi sono solo tuoi: stanno in `data/progress/` (ignorata da Git). Chi clona il progetto parte da zero.

## Copertine

Le immagini dei giochi non sono incluse. Per aggiungerne una passa il mouse sulla copertina di un gioco, premi il pulsante
menu e scegli *Carica immagine…* (sostituisce quella vecchia). In alternativa vedi [covers/README.md](covers/README.md):
basta salvare un'immagine verticale in `covers/` con il nome dell'id del gioco. I giochi senza copertina usano `covers/default.png`; senza nemmeno quella l'app funziona lo stesso.

## Aggiungere un gioco

Ogni gioco è un file JSON in `data/guides/`. Il formato è descritto in [docs/FORMATO-GUIDA.md](docs/FORMATO-GUIDA.md);
per controllare un file: `node tools/valida-guida.js <id-gioco>`. Le guide incluse (Uncharted: Drake's Fortune e
Hogwarts Legacy) sono state compilate con ricerca web e verifica incrociata delle fonti, elencate nella scheda *Info*;
alcuni punti dubbi sono segnalati nella guida come *da verificare*. Possono contenere errori: segnalali o correggili.

## Struttura

```
server.js          server Node senza dipendenze: serve public/ e le API
public/            interfaccia (HTML, CSS, JavaScript senza framework)
data/guides/       le guide dei giochi
data/progress/     i tuoi progressi (creata all'uso, non versionata)
covers/            copertine scelte da te (non versionate)
tools/             validatore delle guide
docs/              formato delle guide e roadmap
```

## Licenza

Codice sotto [licenza MIT](LICENSE). I font in `public/fonts/` hanno le loro licenze (vedi `public/fonts/LICENZE.txt`).
I nomi e i contenuti dei giochi appartengono ai rispettivi proprietari; il progetto non è affiliato a nessuno di essi.

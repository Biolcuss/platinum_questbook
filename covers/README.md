# Copertine dei giochi

Qui metti le immagini di copertina che vuoi vedere nell'app. Le copertine **non fanno parte del progetto**
(sono artwork dei giochi) e questa cartella è ignorata da Git: ognuno usa le sue.

Il modo più semplice: nell'app passa il mouse sulla copertina di un gioco (nell'elenco o in cima alla pagina del gioco),
premi il pulsante menu che compare e scegli **Carica immagine…**. Il file (PNG, JPG o WebP, massimo 10 MB) viene
copiato qui con il nome giusto e sostituisce quello vecchio.

Oppure a mano. Come si aggiunge una copertina:
1. Scegli un'immagine **verticale** (rapporto 2:3, come un poster; es. 600×900). Formati: `.png`, `.jpg`, `.jpeg`, `.webp`.
2. Salvala in questa cartella con il nome dell'**id del gioco**, usando il trattino basso `_` al posto del trattino `-`.
   L'id è il nome del file della guida in `data/guides/`.
   - `data/guides/hogwarts-legacy.json` → `covers/hogwarts_legacy.webp`
   - `data/guides/uncharted-drakes-fortune.json` → `covers/uncharted_drakes_fortune.png`
3. Ricarica la pagina.

**Copertina predefinita**: il file `default.png` (o `.jpg`, `.jpeg`, `.webp`) in questa cartella è la copertina usata per
tutti i giochi che non ne hanno una propria. È l'unica immagine inclusa nel progetto. Se manca anche quella,
l'app funziona lo stesso, senza copertina.

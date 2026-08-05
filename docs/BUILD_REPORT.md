# ClearChoice MVP — Build Report

Data: 2026-08-05  
Versione candidata: 0.1.0  
Deploy pubblico: non autorizzato e non eseguito

## Implementazione completata

- PWA standalone senza dipendenze runtime esterne.
- Percorso guidato in cinque momenti.
- Sei stati finali deterministici più stop fuori perimetro.
- Nessun AI, scoring, ranking, account, backend o cloud.
- Persistenza locale con namespace `clearchoice:v1:decisions`.
- Nessun salvataggio di testo libero prima del superamento del pre-check.
- Riapertura soltanto dopo un cambiamento concreto validato.
- Export leggibile della scheda finale.
- Backup e ripristino manuali.
- Eliminazione singola e totale.
- Manifest e service worker indipendenti.
- Identità Quiet Clarity con font di sistema offline-safe.

## Repository GitHub

Repository separato pubblicato:

`robertoconoscenti-boop/clearchoice-app`

Branch: `main`

Commit candidato verificato:

`1d0d9f417293666ddc4fbda49ef16a0762500f3a` — `Publish tested ClearChoice MVP`

Verifica di identità del file principale:

- SHA-256 `app.js`: `b434f81fdc34e4281d8cb213f2685d00fa0b8f88188a9aaae24509d6a071be9b`;
- Git blob SHA: `7a69f4d5dabbf9fb8cdfaa35d528075e59a96efa`;
- il blob remoto coincide con il candidato locale.

## Verifiche eseguite

### GitHub Actions

Workflow di pubblicazione e verifica concluso con successo:

- ricostruzione esatta di `app.js`;
- verifica hash e dimensione;
- **11 test superati su 11**;
- controlli sintattici superati;
- commit del candidato su `main`;
- rimozione dei file temporanei di trasferimento e del workflow monouso.

### Test automatici

Comando:

```bash
npm test
```

Esito: **11 test superati su 11**.

Copertura funzionale:

- casi fuori perimetro;
- priorità della struttura;
- informazione determinante;
- rinvio;
- supporto esterno;
- trade-off;
- stato pronto a scegliere;
- riapertura controllata;
- validazione backup.

### Controlli statici

Comando:

```bash
npm run check
```

Esito: superato per `app.js`, motore decisionale, storage, export e service worker.

### Smoke test locale

- server HTTP locale avviato correttamente;
- `index.html` servito;
- manifest JSON servito e validato.

## Verifiche ancora aperte

La sessione browser automatizzata end-to-end non è stata completata perché il browser headless dell’ambiente blocca amministrativamente l’accesso a `localhost` (`ERR_BLOCKED_BY_ADMINISTRATOR`).

Resta quindi aperto il pass manuale documentato in Linear come `ROB-52`, comprendente:

- percorso completo mobile e desktop;
- verifica di tutti i sei esiti e dello stop fuori perimetro;
- tastiera, focus, dialog e messaggi di errore;
- service worker offline in browser reale;
- export, backup, ripristino e cancellazione;
- verifica visiva responsive e comportamento con tastiera mobile.

## Linear

Progetto: `APP-01 — ClearChoice MVP`

Stato: In Progress  
Milestone: `MVP locale candidato`

Issue completate:

- ROB-47 — PWA shell;
- ROB-48 — decision engine;
- ROB-49 — guided flow;
- ROB-50 — local data/export/backup;
- ROB-51 — automated checks;
- ROB-53 — repository GitHub creato e pubblicato.

Issue aperta:

- ROB-52 — manual responsive/accessibility pass.

## Gate successivo

Completare il test manuale in browser reale, registrare e correggere eventuali bug, quindi tornare alla chat master per il gate di deploy.

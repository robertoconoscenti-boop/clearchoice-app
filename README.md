# ClearChoice

ClearChoice è una PWA local-first che aiuta a chiudere un ciclo decisionale senza assegnare punteggi e senza scegliere al posto dell’utente.

## Stato

MVP candidato locale — nessun deploy pubblico autorizzato.

## Caratteristiche

- percorso guidato in cinque momenti;
- sei stati finali deterministici;
- nessun account, backend, AI o telemetria contenutistica;
- salvataggio locale;
- export leggibile e backup manuale;
- eliminazione singola e completa;
- service worker e manifest PWA;
- interfaccia mobile-first accessibile.

## Avvio locale

```bash
npm run serve
```

Aprire `http://localhost:4173`.

## Verifiche

```bash
npm test
npm run check
```

## Vincoli

Non usare ClearChoice per emergenze o decisioni mediche, legali, fiscali, finanziarie ad alto impatto o relative alla sicurezza.

## Privacy

I dati restano nel browser, salvo export o backup manuale avviato dall’utente. Prima del superamento del controllo di compatibilità non viene persistito testo libero.

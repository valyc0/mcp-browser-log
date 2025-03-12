# Guida all'Installazione e Utilizzo del Browser Logger MCP

## Indice
1. [Prerequisiti](#prerequisiti)
2. [Installazione](#installazione)
3. [Configurazione](#configurazione)
4. [Utilizzo](#utilizzo)
5. [Esempi Pratici](#esempi-pratici)
6. [Troubleshooting](#troubleshooting)

## Prerequisiti

- Node.js installato nel sistema
- VSCode con l'estensione roo-code installata
- Accesso ai permessi di scrittura nelle directory di configurazione

## Installazione



1. Clona o copia la cartella browser-logger:
```bash
# Se hai già il codice
cp -r /percorso/originale/browser-logger ~/Documents/Cline/MCP/
```

2. start il browser in modalità debug:
```bash
brave-portable.exe --remote-debugging-port=9222
```

2. cambiare indirizzo e porta eventuale del browser:
```bash
# Se hai già il codice
http.get('http://localhost:9222/json', (res) => {
```

2a. se su gitpod fare il tunnel per la porta:
```bash
# Se hai già il codice
ssh -R 9222:localhost:9222  '********.gitpod.io'
```

2. install
```bash
npm install
```

3. build:
```bash
npm run build
```

## Configurazione



1. Aggiungi la configurazione del browser-logger su vscode:
```json
{
  "mcpServers": {
    "browser-logger": {
      "command": "node",
      "args": ["~/Documents/Cline/MCP/browser-logger/build/index.js"],
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

3. Assicurati che il file build/index.js abbia i permessi di esecuzione:
```bash
chmod +x ~/Documents/Cline/MCP/browser-logger/build/index.js
```

## Utilizzo

Il browser-logger MCP fornisce tre comandi principali:

1. **Elencare i Target del Browser**
```javascript
<use_mcp_tool>
<server_name>browser-logger</server_name>
<tool_name>list_targets</tool_name>
<arguments>
{
  "refresh": true
}
</arguments>
</use_mcp_tool>
```

2. **Connettere a un Target**
```javascript
<use_mcp_tool>
<server_name>browser-logger</server_name>
<tool_name>connect_target</tool_name>
<arguments>
{
  "id": "ID_DEL_TARGET"
}
</arguments>
</use_mcp_tool>
```

3. **Ottenere i Log della Console**
```javascript
<use_mcp_tool>
<server_name>browser-logger</server_name>
<tool_name>get_logs</tool_name>
<arguments>
{
  "clear": false
}
</arguments>
</use_mcp_tool>
```

## Esempi Pratici

### Monitoraggio di una Pagina Web

1. Apri la pagina web che vuoi monitorare nel browser
2. In Claude, usa il comando `list_targets` per trovare l'ID della pagina
3. Usa `connect_target` con l'ID trovato
4. Usa `get_logs` per vedere i messaggi della console

### Esempio di Pagina di Test

```html
<!DOCTYPE html>
<html>
<head>
    <title>Test Console</title>
</head>
<body>
    <h1>Test Console</h1>
    <button onclick="console.log('Button clicked!')">
        Click Me
    </button>
    <script>
        console.log("Pagina caricata");
        console.warn("Questo è un warning");
        console.error("Questo è un errore");
    </script>
</body>
</html>
```

## Troubleshooting

### Problemi Comuni

1. **MCP Server non si avvia**
   - Verifica che Node.js sia installato
   - Controlla i permessi del file index.js
   - Verifica il percorso nel file di configurazione

2. **Nessun Target Trovato**
   - Assicurati che il browser sia aperto
   - Prova a refreshare la lista dei target
   - Verifica che non ci siano problemi di permessi

3. **Log non Visibili**
   - Conferma di essere connesso al target corretto
   - Prova a pulire i log con `clear: true`
   - Verifica che la pagina stia effettivamente generando log

### Tips

- Usa `refresh: true` quando cerchi nuovi target
- Conserva gli ID dei target più utilizzati
- Monitora regolarmente i log per debugging
- Usa `clear: true` per pulire i log vecchi

Per ulteriori informazioni o supporto, consulta la documentazione ufficiale di Model Context Protocol.

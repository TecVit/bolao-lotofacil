# Bilhetes do bolão

Coloque aqui **um arquivo JSON por bilhete** (`bilhete-1.json`, `bilhete-2.json`, …).
Todos os `*.json` desta pasta são carregados automaticamente, em ordem de `id`.

```json
{
  "id": 1,
  "nome": "Bilhete 1",
  "jogos": [
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    [...],
    [...]
  ]
}
```

- Cada jogo: **15 dezenas** diferentes, de 1 a 25 (pode ter 16–20 se for aposta maior).
- Campos extras (`codigo`, `compra`, `concursos`, `foto`) são só referência.
- As fotos originais ficam em `data/fotos/`.
- Depois de editar, rode `npm run validar` para conferir.

# Imagem da planta (Mapa da Planta)

Salve a ilustração da planta industrial **nesta pasta** com o nome:

```
public/mapa-planta.png
```

(aceita também `.jpg`, `.jpeg` ou `.webp` — o app tenta nessa ordem)

A tela **Ativos → Mapa da Planta** usa essa imagem como fundo e sobrepõe um
marcador de status vivo sobre cada máquina (posições em `src/pages/MapaPlanta.tsx`,
tabela `POS`). Não precisa reiniciar o servidor — o Vite serve `public/` na hora;
basta recarregar a página.

Dica para ajustar posições: em modo dev, **clique sobre o mapa** e o console do
navegador imprime as coordenadas `{ x, y }` em % daquele ponto — use para afinar a
tabela `POS`.

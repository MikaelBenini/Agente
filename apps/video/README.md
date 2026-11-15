# Vídeo do Pente Fino (Remotion)

Fora do workspace do pnpm, do build e do CI (`pnpm-workspace.yaml`: `!apps/video`). Usa npm próprio.

```bash
cd apps/video
npm install
npm run dados    # preço e "14 dias" de @pente-fino/shared (compile o shared antes)
npm run studio   # prévia
npm run render   # gera a trilha (public/trilha.wav) e out/apresentacao.mp4
npm run anuncios # os 6 anúncios de 15 s (9:16 e quadrado) em anuncios/
```

As fotos das telas (`public/telas`) saem de `apps/web/video/fotos-video.mjs`, com o banco limpo
da demonstração (`apps/web/video/banco.sh` e `servidores.sh`). Roteiro e levantamento em
`apps/web/video/`. Padrão da marca: skill `video-pente-fino`.

A duração de cada cena fica em `src/ritmo.json`, lida pelo vídeo e pelo `scripts/trilha.mjs`:
mudou a cena, a trilha acompanha.

Anúncios (`src/Anuncio.tsx`): gancho, uma função e o encerramento, em 1080 × 1920 e 1080 × 1080.
As funções ficam em `ANUNCIOS` (frase, selo e o recorte da foto que aparece); a duração, em
`src/ritmo-anuncio.json`, com a trilha própria (`public/trilha-anuncio.wav`, fora do git). No
9:16 os textos ficam entre os 12% de cima e os 20% de baixo. Para um anúncio novo, acrescente uma
entrada em `ANUNCIOS` e rode `npm run anuncios`.

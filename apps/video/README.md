# Vídeo do Pente Fino (Remotion)

Fora do workspace do pnpm, do build e do CI (`pnpm-workspace.yaml`: `!apps/video`). Usa npm próprio.

```bash
cd apps/video
npm install
npm run dados    # preço e "14 dias" de @pente-fino/shared (compile o shared antes)
npm run studio   # prévia
npm run render   # out/apresentacao.mp4
```

As fotos das telas (`public/telas`) saem de `apps/web/video/fotos-video.mjs`, com o banco limpo
da demonstração (`apps/web/video/banco.sh` e `servidores.sh`). Roteiro e levantamento em
`apps/web/video/`. Padrão da marca: skill `video-pente-fino`.

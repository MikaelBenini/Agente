---
name: modern-web-guidance
description: |
  Guias oficiais do Google Chrome (Modern Web Guidance, v1.0.0) com as boas práticas atuais de HTML, CSS e JavaScript no navegador, lidos daqui mesmo, sem npx. Use antes de criar ou mudar tela em apps/web: diálogos e popovers, tabelas, tema escuro, formulários (autofill, validação, máscara, OTP), acessibilidade, carrossel, abas, menus, transições de página, animações de rolagem, vídeo e imagem (LCP, lazy load, fetchpriority), INP e CLS, PWA (instalar o app), passkeys, sanitizar HTML, datas e fusos.
  Não use para backend (API, Prisma, SQL), infraestrutura, scripts, testes ou configuração de ferramentas.
---

# Modern Web Guidance (cópia local)

Cópia dos guias de https://github.com/GoogleChrome/modern-web-guidance (v1.0.0, Apache-2.0,
`LICENSE` nesta pasta), adaptada ao Pente Fino em 15/11/2026: **não rode `npx modern-web-guidance`**.
O original baixa e executa a última versão do pacote a cada consulta, sem versão fixa; aqui os
guias ficam no repositório e são lidos com as ferramentas de arquivo. Para atualizar, baixe uma
versão nova do repositório, confira o que mudou e troque a pasta `guides/` (anotar a versão aqui).

## Como usar

1. **Procure** o guia pelo que a tela precisa fazer, com 2 a 4 palavras em inglês (os guias são em
   inglês), por exemplo `dialog`, `autofill`, `lazy video`, `responsive table`:

   ```sh
   grep -ril "<termo>" .claude/skills/modern-web-guidance/guides | head
   ```

   Os nomes dos arquivos já dizem o assunto (`ls .claude/skills/modern-web-guidance/guides/*`).
   Cada pasta tem um guia geral com o nome dela (`forms/forms.md`, `css/css.md`,
   `performance/performance.md`, `accessibility/accessibility.md`, `security/security.md`).

2. **Leia** o guia específico e o geral da área com a ferramenta de leitura de arquivo. Quando um
   guia mandar rodar `npx -y modern-web-guidance@latest retrieve "<id>"`, leia
   `guides/<pasta>/<id>.md` no lugar.

3. **Confira** o código contra o guia antes de terminar: o padrão moderno aplicado e o plano B
   (fallback) que o guia pede para recurso que ainda não é "Baseline amplamente disponível".

4. **Diga** ao dono, numa linha simples e sem jargão, o que o guia mudou na tela (por exemplo:
   "o vídeo só carrega quando a pessoa chega nele, e a página abre mais rápido").

## Regras do projeto que valem junto

- Os guias são em HTML/CSS/JS puros: adapte ao Next.js e ao React sem perder o recurso moderno.
  Atributos novos que o `@types/react` ainda não conhece entram com spread
  (`{...({ popover: 'auto' } as Record<string, string>)}`); `window` e `document` só no cliente.
- Suporte de navegador: recursos "Baseline amplamente disponível" podem ser usados direto; os
  mais novos só com o plano B que o guia indica. O barbeiro usa celular Android comum e o
  Safari do iPhone.
- O padrão visual continua o do projeto (skill `frontend-design`, componentes de `@pente-fino/ui`
  e tokens de `globals.css`); o guia diz como fazer, não muda a marca.
- Fora daqui: o `legacy-scan` e o `chrome-extensions` do pacote original não foram copiados.

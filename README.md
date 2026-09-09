# MIX10 PRO — Portal de Revendedores

Plataforma completa para aquisição, cadastro e operação de revendedores MIX10 PRO. O projeto reúne landing page para tráfego pago, autenticação por código no e-mail, portal multiusuário, pedidos com cobrança Asaas, manual comercial, estoque, vendas, devoluções e fechamento administrativo.

## O que já está pronto

- Landing page responsiva com identidade visual do material comercial
- Espaço preparado para a futura VSL
- Captura de `utm_source`, `utm_medium`, `utm_campaign` e `utm_content`
- Login sem senha por código enviado via Resend
- Cadastro da revenda e convite de novos usuários
- Kits KIT20 e KIT30 com checkout Asaas
- Cobrança Pix com QR Code e checkout hospedado
- Webhook Asaas com autenticação e proteção contra eventos duplicados
- Histórico e acompanhamento dos pedidos
- Manual comercial de 10 páginas dentro do portal e PDF para download
- Registro de vendas, devoluções, entradas e saídas de estoque
- Bloqueio de venda sem estoque e de devolução acima do total vendido
- Painel administrativo consolidado e por revendedor
- Fechamento mensal com exportação CSV
- Alteração manual do status de pedidos pelo administrador

## Tecnologias

- React 19 + Next/Vinext
- Cloudflare Workers
- Cloudflare D1 + Drizzle ORM
- Asaas API v3
- Resend
- TypeScript + Tailwind CSS

## Rodar localmente

```bash
npm install
cp .env.example .env.local
npm run dev
```

Para validar o projeto:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Publicar no Cloudflare

Siga o passo a passo em [CONFIGURACAO-CLOUDFLARE.md](./CONFIGURACAO-CLOUDFLARE.md).

Resumo:

1. Crie o banco D1 `mix10-pro-revendedores-db`.
2. Coloque o ID real do banco em `wrangler.jsonc`.
3. Cadastre as variáveis e segredos no Worker.
4. Aplique as migrações da pasta `drizzle`.
5. Faça a implantação.
6. Cadastre no Asaas o webhook `/api/billing/webhook`.

## Primeiro administrador

Inclua um ou mais e-mails em `ADMIN_EMAILS`, separados por vírgula. Exemplo:

```text
financeiro@empresa.com.br,diretoria@empresa.com.br
```

O usuário entra pelo mesmo fluxo de código por e-mail e recebe acesso à área administrativa automaticamente.

## Cobrança

Comece com `ASAAS_ENVIRONMENT=sandbox`. Depois de homologar pedidos, Pix e webhooks, troque para `production` e substitua a chave por uma chave da conta real.

Nunca envie `.env`, chaves do Asaas, tokens de webhook ou segredos para o GitHub.


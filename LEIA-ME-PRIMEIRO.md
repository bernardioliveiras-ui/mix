# Publicação rápida

## 1. GitHub

Envie todo o conteúdo desta pasta para um repositório privado. O texto sugerido para o primeiro commit é:

```text
feat: cria portal MIX10 PRO para revendedores
```

Não envie `node_modules`, `.next`, `dist`, `.wrangler`, `.env` ou `.env.local`.

## 2. Banco D1

```bash
npx wrangler d1 create mix10-pro-revendedores-db
```

Copie o `database_id` retornado e substitua o UUID provisório de `wrangler.jsonc`.

Depois aplique:

```bash
npx wrangler d1 migrations apply mix10-pro-revendedores-db --remote
```

## 3. Variáveis do Worker

Cadastre em **Cloudflare > Worker > Configurações > Variáveis e segredos**:

| Nome | Tipo | Valor |
|---|---|---|
| `AUTH_SECRET` | Segredo | uma chave aleatória longa |
| `RESEND_API_KEY` | Segredo | chave da conta Resend |
| `EMAIL_FROM` | Texto | `MIX10 PRO <acesso@seu-dominio.com.br>` |
| `ADMIN_EMAILS` | Texto | e-mails dos admins separados por vírgula |
| `ASAAS_API_KEY` | Segredo | chave Sandbox inicialmente |
| `ASAAS_ENVIRONMENT` | Texto | `sandbox` inicialmente |
| `ASAAS_WEBHOOK_TOKEN` | Segredo | token longo criado por você |

## 4. Implantação

```bash
npm install
npm run build
npx wrangler deploy
```

## 5. Webhook Asaas

- URL: `https://SEU-DOMINIO/api/billing/webhook`
- Versão: `v3`
- Token: exatamente o mesmo valor de `ASAAS_WEBHOOK_TOKEN`
- Envio: sequencial
- Fila: ativa
- Eventos: eventos de cobrança/pagamento

## 6. Homologação antes do ambiente real

1. Entrar com o e-mail administrador.
2. Criar uma revenda de teste.
3. Convidar um segundo usuário.
4. Criar KIT20 via Pix no Sandbox.
5. Simular a confirmação do pagamento no Asaas.
6. Conferir a atualização do pedido e a entrada no estoque.
7. Registrar venda e devolução.
8. Exportar o fechamento mensal no administrativo.

Só depois disso altere `ASAAS_ENVIRONMENT` para `production` e cadastre a chave real.


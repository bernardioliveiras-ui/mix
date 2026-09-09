# Publicação do Portal MIX10 PRO

## O que já está pronto

- landing page para tráfego pago;
- espaço reservado para a futura VSL;
- login individual por código enviado por e-mail;
- conta de revenda com proprietário, gerente e vendedor;
- convites de equipe;
- pedidos KIT20 e KIT30;
- checkout seguro pelo Asaas;
- Pix com QR Code ou escolha de pagamento no ambiente do Asaas;
- atualização de pagamento por webhook;
- estoque calculado pelas caixas entregues, vendas, devoluções e ajustes;
- fechamento mensal e exportação CSV no administrativo;
- manual completo com os 10 módulos do PDF.

## 1. Criar o banco D1

No Cloudflare, crie um banco com o nome:

`mix10-pro-revendedores-db`

Copie o ID do banco e substitua o valor `00000000-0000-4000-8000-000000000000`
no arquivo `wrangler.jsonc`.

Depois, associe o banco ao Worker usando o nome de binding:

`DB`

## 2. Variáveis e segredos do Worker

Cadastre em **Configurações > Variáveis e segredos > Runtime**:

| Tipo | Nome | Valor |
| --- | --- | --- |
| Segredo | `AUTH_SECRET` | chave aleatória com pelo menos 32 caracteres |
| Segredo | `RESEND_API_KEY` | chave da conta Resend |
| Texto | `EMAIL_FROM` | `MIX10 PRO <acesso@mail.mix10pro.com.br>` |
| Texto | `ADMIN_EMAILS` | e-mails dos administradores separados por vírgula |
| Segredo | `ASAAS_API_KEY` | chave do Asaas Sandbox no primeiro teste |
| Texto | `ASAAS_ENVIRONMENT` | `sandbox` durante a homologação |
| Segredo | `ASAAS_WEBHOOK_TOKEN` | token forte e diferente da chave da API |

Use somente um registro `ADMIN_EMAILS`. Para mais de um administrador:

`admin1@dominio.com.br,admin2@dominio.com.br`

## 3. Aplicar o banco e publicar

No primeiro deploy, execute:

```bash
npm ci
npm run build
npx wrangler d1 migrations apply mix10-pro-revendedores-db --remote
npx wrangler deploy
```

Nos próximos deploys, mantenha `npm run build` antes de `npx wrangler deploy`.

## 4. Configurar o webhook no Asaas

Crie um webhook de cobranças com:

- URL: `https://SEU-DOMINIO/api/billing/webhook`
- versão: `v3`
- tipo de envio: `sequencial`
- token de autenticação: o mesmo valor de `ASAAS_WEBHOOK_TOKEN`
- eventos: `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `PAYMENT_REFUNDED`,
  `PAYMENT_DELETED` e `PAYMENT_CHARGEBACK_REQUESTED`.

O endpoint rejeita notificações sem o token e ignora eventos repetidos pelo ID.

## 5. Testar antes de usar dinheiro real

1. Mantenha `ASAAS_ENVIRONMENT=sandbox`.
2. Entre com um e-mail real e conclua o cadastro da revenda.
3. Faça um pedido KIT20 via Pix.
4. Confirme se o pedido aparece como aguardando pagamento.
5. Simule o pagamento no Sandbox.
6. Confirme se o webhook altera o pedido para pago.
7. Altere manualmente para entregue no administrativo.
8. Registre uma venda e confira estoque e fechamento.

Somente depois dessa sequência funcionar, troque a chave e defina
`ASAAS_ENVIRONMENT=production`.

## 6. Domínio recomendado

- landing e portal juntos: `revendedores.mix10pro.com.br`
- painel: `revendedores.mix10pro.com.br/painel`
- webhook: `revendedores.mix10pro.com.br/api/billing/webhook`

O domínio principal `mix10pro.com.br` pode continuar com o site institucional.

## 7. Inserir a VSL no futuro

O espaço está na seção `#vsl` da landing, no arquivo `app/page.tsx`.
Quando o vídeo estiver pronto, substitua o conteúdo de `vsl-placeholder` por um
`<video>` ou iframe do player escolhido, mantendo a proporção 16:9.

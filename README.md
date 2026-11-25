# ResetPet

## Executar localmente

Requer Node.js 22 ou superior e uma conta Stripe.

1. Instale as dependências com `npm install`.
2. Copie `.env.example` para `.env`.
3. No `.env`, informe a chave secreta de teste da Stripe em `STRIPE_SECRET_KEY`. Nunca publique essa chave nem a coloque no código do navegador.
4. Mantenha `APP_URL=http://localhost:3000` para testes locais.
5. Inicie o servidor com `npm start` e abra `http://localhost:3000`.

Para executar a suíte automatizada, use `npm test`.

Os dez produtos estão configurados a R$ 99,90 cada. Os valores usados no checkout são definidos e validados no servidor. Para publicar, configure `STRIPE_SECRET_KEY` e `APP_URL` como variáveis de ambiente no serviço de hospedagem; `APP_URL` deve ser a URL pública HTTPS do site.

## Contas e pedidos

Clientes podem criar uma conta com e-mail e senha de pelo menos 10 caracteres, entrar e consultar os pedidos associados à própria conta. O checkout exige login. As senhas são armazenadas com hash `scrypt`; a sessão usa cookie `HttpOnly` e expira após 14 dias.

As contas e os pedidos são armazenados em `data/resetpet.sqlite`, que não deve ser enviado ao GitHub. Em produção, use um volume persistente para esse arquivo. Configure também `STRIPE_WEBHOOK_SECRET` para registrar pagamentos mesmo quando o cliente não retornar do checkout. O endpoint é `/api/stripe-webhook` e deve receber os eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded` e `checkout.session.expired`.

Os planos de parceria exibidos no site ainda não são assinaturas Stripe vinculadas à conta. Recuperação de senha e verificação de e-mail exigem configurar um provedor de envio de e-mail antes da publicação.

## Organização do código

- `server.js` inicia o servidor HTTP.
- `server/` contém configuração, catálogo, preços e rotas separadas por domínio.
- `auth-store.js` centraliza o banco SQLite, senhas e sessões.
- `js/` contém módulos do navegador separados por funcionalidade; `js/main.mjs` inicializa a aplicação.
- `index.html` mantém a estrutura da página e `style.css` reúne os estilos por seção.
- `test/` contém testes de preço e de autenticação/privacidade dos pedidos.
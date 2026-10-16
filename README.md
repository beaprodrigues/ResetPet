# 🐾 ResetPet - E-commerce Platform

Plataforma completa de e-commerce desenvolvida para a **ResetPet**, uma marca de produtos naturais e moduladores biofísicos para pets. O projeto engloba desde uma interface de usuário moderna e fluida até um back-end seguro para gerenciamento de contas, carrinho de compras e processamento de pagamentos.

## 💻 Destaques Técnicos (Arquitetura e Decisões)

Este projeto foi construído sem o uso de frameworks pesados de front-end (como React ou Vue), focando em performance, acessibilidade e no domínio dos fundamentos da web. 

* **Front-end Modular:** JavaScript Vanilla organizado no padrão *Revealing Module Pattern* (ex: `CartModule`, `QuizModule`, `RevealModule`), garantindo isolamento de escopo e fácil manutenção.
* **Performance e UI/UX:** Uso intensivo de CSS Custom Properties (Variáveis), animações CSS otimizadas, manipulação limpa de DOM e `IntersectionObserver` para revelar elementos na rolagem e carregar estatísticas dinamicamente.
* **Autenticação Customizada:** Sistema de login e sessão construído do zero, utilizando a biblioteca nativa `node:crypto`. As senhas são protegidas com hash `scrypt` e `salt` dinâmico, e o gerenciamento de sessão é feito via cookies `HttpOnly` com validade de 14 dias.
* **Banco de Dados:** Utilização do SQLite (via `better-sqlite3`) com modo `WAL` habilitado para alta performance em leituras/escritas concorrentes, gerenciando usuários, sessões e histórico de pedidos.
* **Integração de Pagamentos:** Checkout seguro integrado à API da **Stripe**, incluindo o recebimento de Webhooks (`checkout.session.completed`, etc.) para atualização assíncrona do status dos pedidos.

## ✨ Funcionalidades

* **Catálogo e Carrinho Dinâmico:** Adição e remoção de produtos em tempo real com atualização de interface e cálculo de totais.
* **Quiz Interativo:** Questionário em 5 etapas para recomendar o melhor produto para o pet, com redirecionamento inteligente para o WhatsApp pré-preenchendo as respostas.
* **Área do Cliente:** Cadastro, login e consulta de histórico de pedidos integrado ao banco de dados.
* **Design Responsivo e Parallax:** Interface fluida que se adapta a qualquer tela, complementada com efeitos visuais modernos.

## 🛠️ Tecnologias Utilizadas

**Front-end:**
* HTML5 Semântico
* CSS3 (Grid, Flexbox, BEM methodology adaptada, Variáveis Globais)
* JavaScript Vanilla (ES6+ Modules)

**Back-end:**
* [Node.js](https://nodejs.org/) (v22+)
* [Express.js](https://expressjs.com/) (Roteamento e Rate Limiting)
* [SQLite3](https://sqlite.org/) + `better-sqlite3`
* [Stripe API](https://stripe.com/)

## 🚀 Como executar o projeto localmente

### Pré-requisitos
* Node.js (versão 22 ou superior)
* Conta de desenvolvedor na Stripe (para obter as chaves de API)

### Passo a passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/SEU_USUARIO/resetpet-site.git
   cd resetpet-site
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configuração das Variáveis de Ambiente:**
   Copie o arquivo de exemplo para criar o seu `.env`:
   ```bash
   cp .env.example .env
   ```
   Abra o arquivo `.env` e preencha as variáveis da Stripe:
   ```env
   STRIPE_SECRET_KEY=sk_test_sua_chave_aqui
   STRIPE_WEBHOOK_SECRET=whsec_seu_segredo_webhook_aqui
   APP_URL=http://localhost:3000
   PORT=3000
   ```
   *Nota: O banco de dados SQLite será gerado automaticamente na pasta `/data` na primeira execução.*

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm start
   ```

5. Acesse `http://localhost:3000` no seu navegador.

---
*Desenvolvido com ☕ e dedicação por [Seu Nome/Link do LinkedIn]*
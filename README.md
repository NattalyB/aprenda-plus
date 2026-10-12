# AprendaPlus 🎓

Plataforma web de **venda de cursos superiores e profissionalizantes**. Tem uma loja virtual e uma área do aluno para quem compra, e um painel administrativo para a equipe da instituição.

Projeto final do curso **Desenvolvimento Full Stack** do programa **+PraTi / Codifica**.

| | Link |
|---|---|
| 🌐 **Site (front-end)** | https://nattalyb.github.io/aprenda-plus/ |
| ⚙️ **API (back-end)** | https://aprenda-plus-backend.onrender.com |
| 🔐 **Painel administrativo** | https://nattalyb.github.io/aprenda-plus/#/admin/login |

> **Atenção:** o back-end está no plano gratuito do Render, que "adormece" o servidor depois de alguns minutos sem uso. Por isso, o primeiro acesso pode levar até 1 minuto para carregar os cursos. Depois disso, o site responde normalmente.

---

## 📑 Sumário

- [Funcionalidades](#-funcionalidades)
- [Fluxo da inscrição até a matrícula](#-fluxo-da-inscrição-até-a-matrícula)
- [Tecnologias](#-tecnologias)
- [Arquitetura](#-arquitetura)
- [Estrutura de pastas](#-estrutura-de-pastas)
- [Como rodar localmente](#-como-rodar-localmente)
- [Testes e cobertura](#-testes-e-cobertura)
- [Segurança](#-segurança)
- [Decisões de projeto](#-decisões-de-projeto)
- [Deploy](#-deploy)
- [Metodologia de trabalho](#-metodologia-de-trabalho)
- [Melhorias futuras](#-melhorias-futuras)
- [Equipe](#-equipe)

---

## ✨ Funcionalidades

### Parte I: Site da instituição

**Vitrine e busca**

- **Vitrine "Cursos mais vendidos"**, com imagem, nome, mensalidade e valor total de cada curso.
- **Busca de cursos** que ignora acentos e maiúsculas ("ciencia" encontra "Ciência de Dados"). Mostra **sugestões** enquanto o aluno digita e aceita navegação pelo teclado.
- **Detalhes do curso** em um modal: descrição, carga horária, modalidade, pré-requisitos e conteúdo programático em tópicos.
- **Preço em mensalidades:** cada curso mostra o valor mensal em destaque (ex.: *R$ 500,00/mês em 24x*) e o valor total logo abaixo.

**Cadastro e login**

- **Cadastro e login de alunos**, com validação de todos os campos (exceto o complemento do endereço).
- **Endereço preenchido pelo CEP:** ao digitar o CEP, rua, bairro, cidade e estado são preenchidos automaticamente pela API pública do ViaCEP.
- **Contas inativas ou bloqueadas** não conseguem entrar nem comprar. A tela explica o motivo.

**Carrinho e pagamento**

- **Carrinho de compras** com contador no topo da página, que se atualiza na hora.
- **Formas de pagamento:**
  - **Pix** à vista com **5% de desconto**;
  - **Cartão de crédito** e **boleto**, parcelados sem juros. Na compra de vários cursos juntos, vale o **maior** limite de parcelas entre os cursos do carrinho.
- **Conclusão da inscrição:** cria uma inscrição para cada curso na primeira turma aberta **com vaga**. Se todas as turmas abertas estiverem cheias, o aluno entra na **lista de espera** (veja o [fluxo](#-fluxo-da-inscrição-até-a-matrícula)). O valor de cada inscrição é **calculado pelo servidor** a partir do preço do curso, e não pelo navegador.

**Área do aluno: "Minhas inscrições"**

- Lista os cursos do aluno, com turma, horário, forma de pagamento, valor e status.
- **Troca de turma:** o aluno pode trocar para outra turma do mesmo curso que ainda tenha vaga, vendo o horário, a modalidade e as vagas restantes de cada uma.
- Para quem está na **lista de espera**, um aviso explica o que acontece quando uma vaga abrir.

**Geral**

- **Avisos visuais (toasts)** de sucesso, erro e alerta.
- **Layout responsivo** para celular, tablet e computador.

### Parte II: Painel administrativo

**Acesso e cadastros**

- **Login exclusivo para funcionários**, separado do login de alunos.
- **CRUD completo** de:
  - Alunos
  - Professores
  - Cursos (com número de parcelas e prévia da mensalidade)
  - Disciplinas
  - Períodos letivos
  - Turmas
  - Matrículas
  - **Funcionários do painel**
- **Funcionários do painel:** mais pessoas da equipe podem ter acesso ao painel. A senha é obrigatória no cadastro (mínimo de 6 caracteres) e, na edição, a atual é mantida se o campo ficar em branco. Funcionário inativo ou bloqueado não consegue entrar, e ninguém consegue excluir ou inativar a **própria** conta.

**Cursos, disciplinas e professores**

- **Disciplina em vários cursos:** a mesma disciplina pode fazer parte de mais de um curso (relação N:N), com a mesma carga horária em todos.
- **Professores × cursos e disciplinas:** no cadastro do professor, o admin marca os cursos que ele leciona e, dentro de cada curso, as disciplinas.
- **Total de horas do professor:** o sistema soma a carga horária das disciplinas do professor. Disciplinas **inativas** aparecem destacadas e não entram no total.

**Turmas e inscrições**

- **Status das turmas:**
  - Inscrições abertas
  - Inscrições encerradas
  - Em andamento
  - Concluída
  - Cancelada

  Só turmas com inscrições abertas recebem alunos.
- **Inscrições:** listagem com a forma de pagamento escolhida pelo aluno e troca de status direto na tabela. Ao **confirmar o pagamento**, a matrícula é criada automaticamente.
- **Notificações 🔔:** um sininho no topo do painel avisa quantas inscrições novas chegaram desde a última vez que o funcionário olhou. Ele confere a cada minuto, e cada funcionário tem a sua própria marcação de "vistas".

**Listas e mensagens**

- **Filtros em todas as listas:**
  - busca por nome (e por CPF em alunos, professores e matrículas);
  - filtros por categoria, curso ou status.
- **Ordenação em todas as listas:** basta clicar no nome da coluna (ID, nome de A-Z ou Z-A, valor, data, status...). Clicando de novo, a ordem inverte.
- **Mensagens de erro detalhadas:** quando o back-end recusa um dado, o formulário mostra exatamente qual campo está errado.
- **Exclusão segura:** não é possível excluir um registro que ainda está em uso (por exemplo, uma turma com inscrições). O painel explica o motivo, em vez de apagar e deixar dados "órfãos".

---

## 🔄 Fluxo da inscrição até a matrícula

```
                 compra no site
                       │
        ┌──────────────┴───────────────┐
   turma com vaga               todas as turmas cheias
        │                              │
        ▼                              ▼
 PENDENTE DE PAGAMENTO  ◀────  AGUARDANDO VAGA (lista de espera)
        │              abriu vaga     · não ocupa vaga
        │              (automático)   · ainda não paga
        ▼
 CONFIRMADA (admin aprova o pagamento)
        │
        └──▶ MATRÍCULA "ativa" criada automaticamente
```

- **Inscrição × matrícula:**
  - A **inscrição** é o pedido do aluno, com a forma de pagamento escolhida.
  - A **matrícula** é o vínculo oficial do aluno com a turma. Ela é criada **sozinha** quando o admin muda a inscrição para *Confirmada*, sem duplicar se já existir.
- **Lista de espera:** quem está *aguardando vaga* não ocupa vaga na turma. Quando uma vaga é liberada, a inscrição **mais antiga** da fila passa automaticamente para *pendente de pagamento*. Uma vaga é liberada quando:
  - o admin cancela ou exclui uma inscrição;
  - um aluno troca de turma.
- **Sair da fila pelo painel:** o admin só consegue tirar alguém da lista de espera se a turma tiver vaga. Se não tiver, o painel avisa: *"A turma X não tem vaga. A inscrição continua aguardando vaga."*
- **Cancelar ou concluir:** cancelar a inscrição também cancela a matrícula, e concluir a inscrição conclui a matrícula.
- **Troca de turma:** quem está na lista de espera e troca para uma turma com vaga sai da fila na hora. Se o aluno já tem matrícula, ela acompanha a inscrição para a nova turma.

---

## 🛠 Tecnologias

### Back-end

| Tecnologia | Uso |
|---|---|
| **Java 25** | Linguagem |
| **Spring Boot 4.1** | Framework da API REST (Web MVC, Data JPA, Validation, Actuator) |
| **PostgreSQL 17** | Banco de dados |
| **Hibernate / JPA** | Mapeamento objeto-relacional |
| **JJWT 0.12** | Geração e validação dos tokens JWT |
| **BCrypt** (Spring Security Crypto) | Criptografia das senhas |
| **Bean Validation** | Validação dos dados recebidos pela API |
| **JUnit 5 + Mockito + MockMvc** | Testes automatizados |
| **JaCoCo** | Relatório de cobertura de testes |
| **Maven** | Build e dependências |

### Front-end

| Tecnologia | Uso |
|---|---|
| **React 19** | Interface |
| **Vite 8** | Build e servidor de desenvolvimento |
| **React Router 7** | Navegação entre páginas |
| **Axios** | Comunicação com a API |
| **ViaCEP** | Preenchimento do endereço pelo CEP |
| **CSS puro** | Estilização e responsividade |
| **Jest 30 + Testing Library** | Testes automatizados e cobertura |

### Infraestrutura

| Serviço | Uso |
|---|---|
| **Render** | Hospedagem do back-end e do banco PostgreSQL |
| **GitHub Pages** | Hospedagem do front-end |
| **GitHub** | Versionamento e organização das tarefas |

---

## 🏗 Arquitetura

O sistema é dividido em duas aplicações independentes, que se comunicam por uma **API REST** em JSON:

```
┌────────────────────────┐         HTTPS + JSON          ┌────────────────────────┐        ┌──────────────┐
│   Front-end (React)    │  ───────────────────────────▶ │  Back-end (Spring Boot)│ ─────▶ │  PostgreSQL  │
│   GitHub Pages         │  ◀───────────────────────────  │  Render                │ ◀───── │  Render      │
│                        │   token JWT no cabeçalho      │                        │        │              │
└────────────────────────┘   Authorization: Bearer ...   └────────────────────────┘        └──────────────┘
```

### Camadas do back-end

```
Requisição ─▶ AuthInterceptor ─▶ Controller ─▶ Service ─▶ Repository ─▶ Banco
              (confere o token    (recebe e      (regras de   (acesso aos
               e as permissões)    valida os      negócio)     dados, JPA)
                                   dados)
```

- **Controller:** recebe as requisições HTTP e valida os dados com `@Valid`.
- **Service:** concentra as regras de negócio. Alguns exemplos:
  - criptografar senhas;
  - calcular o valor da inscrição com o desconto do Pix e conferir o limite de parcelas;
  - controlar as vagas e a lista de espera;
  - criar a matrícula ao confirmar o pagamento.
- **Repository:** interfaces do Spring Data JPA.
- **Entity:** classes que representam as tabelas do banco. As relações N:N (curso × disciplina, professor × curso, professor × disciplina) usam tabelas de ligação.
- **DTO:** respostas montadas sob medida para a tela, por exemplo as turmas disponíveis com as vagas restantes e as inscrições do aluno.
- **Security:** geração e validação do JWT, controle de acesso às rotas e conferência do status da conta (ativa, inativa, bloqueada).
- **Exception:** tratamento centralizado dos erros (`GlobalExceptionHandler`). Ele devolve respostas diferentes para cada tipo de erro:

| Tipo de erro | Resposta da API |
|---|---|
| Validação | Quais campos falharam |
| Regra de negócio (`RegraDeNegocioException`) | 400, com uma mensagem pronta para mostrar na tela |
| Conflito no banco (registro em uso ou dado repetido) | 409, com uma explicação clara |

### Organização do front-end

- **pages:** telas do site, a área do aluno e o painel admin.
- **components:** partes reutilizáveis, como:
  - cabeçalho e rodapé;
  - modal do curso, preço e campo de CEP;
  - avisos, sininho de notificações e colunas ordenáveis;
  - layout do admin.
- **services:** uma camada para cada recurso da API. O `api.js` envia o token automaticamente e trata a sessão expirada.
- **context:** estado compartilhado da busca de cursos.
- **utils:** funções de cálculo, formatação e ordenação (preço, mensalidade, imagens dos cursos, ordenar listas).

---

## 📁 Estrutura de pastas

```
aprenda-plus/
├── aprenda-plus-backend/
│   ├── database/                  # Scripts SQL (criação do banco e atualizações)
│   ├── src/main/java/com/aprendaplus/
│   │   ├── config/                # CORS e registro da proteção da API
│   │   ├── controller/            # Endpoints REST
│   │   ├── dto/                   # Respostas sob medida para as telas
│   │   ├── entity/                # Entidades JPA
│   │   ├── exception/             # Tratamento centralizado de erros
│   │   ├── repository/            # Acesso ao banco
│   │   ├── security/              # JWT, controle de acesso e status da conta
│   │   └── service/               # Regras de negócio
│   ├── src/main/resources/
│   │   └── application.properties
│   ├── src/test/java/com/aprendaplus/   # Testes (JUnit + Mockito)
│   └── pom.xml
│
├── aprenda-plus-frontend/
│   ├── src/
│   │   ├── assets/                # Logos e banners dos cursos
│   │   ├── components/            # Componentes reutilizáveis
│   │   │   └── admin/             # Componentes do painel (layout, sininho, ordenação)
│   │   ├── context/               # Contexto da busca
│   │   ├── pages/                 # Telas do site e "Minhas inscrições"
│   │   │   └── admin/             # Telas do painel administrativo
│   │   ├── services/              # Comunicação com a API
│   │   ├── utils/                 # Funções auxiliares
│   │   └── *.test.jsx             # Testes (ficam junto de cada arquivo)
│   ├── jest.config.cjs
│   ├── babel.config.cjs
│   └── package.json
│
└── docs/                          # Imagens usadas neste README
```

---

## 💻 Como rodar localmente

### Pré-requisitos

- **Java 25** (ou superior)
- **Node.js 22** (ou superior) e npm
- **PostgreSQL 17**
- **Git**

### 1. Clonar o repositório

```bash
git clone https://github.com/NattalyB/aprenda-plus.git
cd aprenda-plus
```

### 2. Criar o banco de dados

1. Crie um banco chamado `aprenda_plus` no PostgreSQL.
2. Execute os scripts da pasta `aprenda-plus-backend/database`. Eles criam as tabelas, os valores padrão e os gatilhos, e também aplicam as atualizações feitas ao longo do projeto. Por exemplo, com o `psql`:

```bash
psql -U postgres -d aprenda_plus -f aprenda-plus-backend/database/NOME_DO_SCRIPT.sql
```

> O back-end usa `spring.jpa.hibernate.ddl-auto=validate`: o Hibernate **não cria nem altera tabelas**, só confere se o banco está igual às entidades. Por isso, os scripts SQL precisam ser executados antes de subir a aplicação.

### 3. Configurar e rodar o back-end

As configurações ficam em `aprenda-plus-backend/src/main/resources/application.properties`. Ajuste o usuário e a senha do seu PostgreSQL local:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/aprenda_plus
spring.datasource.username=postgres
spring.datasource.password=SUA_SENHA
```

A chave que assina os tokens JWT vem da variável de ambiente `JWT_SECRET`. Se ela não existir, a aplicação usa uma chave de desenvolvimento, o que basta para rodar localmente.

```bash
cd aprenda-plus-backend
./mvnw spring-boot:run
```

A API fica disponível em `http://localhost:8080`.

### 4. Rodar o front-end

Em outro terminal:

```bash
cd aprenda-plus-frontend
npm install
npm run dev
```

O site abre em `http://localhost:5173/aprenda-plus/`.

O endereço da API é definido pelos arquivos de ambiente do Vite:

| Arquivo | Usado em | Valor |
|---|---|---|
| `.env.development` | `npm run dev` | `VITE_API_URL=http://localhost:8080` |
| `.env.production` | `npm run build` / deploy | `VITE_API_URL=https://aprenda-plus-backend.onrender.com` |

> Para rodar o front local conectado à API publicada no Render, basta apagar o `.env.development`.

---

## 🧪 Testes e cobertura

A meta do projeto era **cobertura mínima de 70%**. Os dois lados ficaram bem acima:

| | Testes | Cobertura | Ferramentas |
|---|---|---|---|
| **Back-end** | **349** | **99%** das instruções, 94% dos desvios (*branches*), 100% dos métodos e das classes | JUnit 5, Mockito, MockMvc, JaCoCo |
| **Front-end** | **377** | **99,7%** das instruções, 96,6% dos desvios (*branches*), 100% das funções | Jest, Testing Library |

### Back-end

```bash
cd aprenda-plus-backend
./mvnw clean test
```

O relatório de cobertura é gerado em `target/site/jacoco/index.html`.

O que é testado:

- **Services:** as regras de negócio. Destaques:
  - **cálculo do valor da inscrição:** desconto do Pix com arredondamento em centavos, valor cheio no cartão e no boleto, maior limite de parcelas do carrinho e formas de pagamento inválidas;
  - **vagas e lista de espera:** turma cheia leva à lista de espera, e o primeiro da fila sobe quando abre vaga;
  - **troca de turma:** só para turmas do mesmo curso, abertas e com vaga, e só das próprias inscrições do aluno;
  - **matrícula automática:** criada ao confirmar o pagamento, sem duplicar, e acompanhando a inscrição ao cancelar, concluir ou trocar de turma;
  - **disciplinas em vários cursos** e total de horas dos professores;
  - **funcionários do painel:** senha obrigatória e mínima, e senha mantida na edição.
- **Controllers:** todas as rotas (listar, buscar, criar, editar e excluir), a validação dos dados recebidos e as mensagens de erro.
- **Segurança:**
  - geração e validação do JWT, inclusive tokens adulterados ou assinados com outra chave;
  - as permissões de cada perfil;
  - contas inativas ou bloqueadas;
  - a regra de que o aluno só mexe no **próprio** carrinho e nas **próprias** inscrições;
  - a tentativa de criar uma inscrição adulterada (em nome de outro aluno, já confirmada ou pagando R$ 0,01).
- **Configuração e erros:** registro da proteção da API, liberação de CORS só para os endereços autorizados e as mensagens devolvidas quando o banco recusa uma exclusão ou um dado repetido.

> As entidades (classes só com getters e setters) ficam fora do cálculo de cobertura, por não terem lógica a testar.

![Cobertura do back-end](docs/cobertura-backend.jpeg)

### Front-end

```bash
cd aprenda-plus-frontend
npm test                # roda os testes
npm run test:coverage   # roda os testes e mede a cobertura
```

O relatório é gerado em `coverage/index.html`. Se a cobertura cair abaixo de 70%, o comando falha automaticamente.

O que é testado:

- **Services e utils:** todas as rotas da API, o envio automático do token, o logout quando a sessão expira, a busca de CEP, a ordenação das listas e os cálculos de preço e mensalidade.
- **Componentes:**
  - cabeçalho (busca, sugestões, teclado e contador do carrinho);
  - modal do curso, campo de CEP e avisos;
  - sininho de notificações e rota protegida do admin.
- **Páginas:**
  - Home, login e cadastro;
  - carrinho: Pix com desconto, cartão, boleto, limite de parcelas, lista de espera e mensagem de erro vinda do servidor;
  - "Minhas inscrições": troca de turma e turmas lotadas;
  - todas as listas e formulários do painel admin, incluindo ordenação por coluna, erro ao excluir um registro em uso, funcionários e aviso de matrícula criada.

![Cobertura do front-end](docs/cobertura-frontend.jpeg)

---

## 🔒 Segurança

- **Senhas criptografadas com BCrypt.** O hash da senha **nunca** é devolvido pela API (`@JsonProperty(access = WRITE_ONLY)`).
- **Autenticação com JWT:** no login, a API gera um token assinado que identifica o usuário e o seu papel (`ALUNO` ou `ADMIN`) e expira em **2 horas**.
- **Status da conta:** alunos e funcionários **inativos** ou **bloqueados** não conseguem fazer login. Se a conta for bloqueada com a sessão aberta, a compra também é recusada.
- **Controle de acesso por papel**, feito pelo `AuthInterceptor` antes de cada requisição:

| Quem | Pode acessar |
|---|---|
| **Visitante** | Ver cursos e turmas disponíveis, cadastrar-se e fazer login |
| **Aluno** | O próprio carrinho, a criação de inscrições, "Minhas inscrições" e a troca de turma das próprias inscrições |
| **Admin** | Todas as rotas |

- **Cada aluno só vê e altera o que é dele** (carrinho e inscrições). A identidade vem do token assinado pelo servidor, não de dados enviados pelo navegador. Se um aluno tentar trocar a turma da inscrição de outra pessoa, a API responde como se ela não existisse.
- **Inscrição à prova de adulteração:** quando um aluno finaliza a compra, o navegador só informa a **turma** e a **forma de pagamento**. Todo o resto é definido pelo servidor:
  - o **aluno** é sempre o do token (não dá para se inscrever em nome de outra pessoa);
  - o **status** começa como *pendente de pagamento* ou *aguardando vaga*, nunca *confirmada* (o aluno não consegue se autoconfirmar);
  - o **valor** é recalculado a partir do preço do curso gravado no banco, com o desconto do Pix aplicado no servidor;
  - o **número de parcelas** é conferido com o limite permitido. Se alguém tentar parcelar acima disso ou usar uma forma de pagamento inexistente, a API recusa com uma mensagem clara;
  - as **vagas** são conferidas no servidor, e o mesmo aluno não consegue se inscrever duas vezes no mesmo curso.

  Assim, mesmo que alguém altere a requisição pelas ferramentas do navegador (por exemplo, mudando o valor para R$ 0,01), a inscrição é gravada com o valor correto.
- **Chave secreta fora do código:** em produção, a chave que assina os tokens fica em uma variável de ambiente no Render (`JWT_SECRET`), já que o repositório é público.
- **CORS** liberado apenas para o site publicado e para o ambiente de desenvolvimento local.
- **Validação dupla:** os formulários validam no navegador, e a API valida de novo no servidor (Bean Validation), já que é possível chamar a API sem passar pelo site.
- **Sessão expirada:** quando o token expira, o front-end limpa o login e leva o usuário de volta para a tela de login automaticamente.

---

## 💡 Decisões de projeto

**Pagamento e preço**

- **Pagamento simulado.** A forma de pagamento escolhida pelo aluno é registrada na inscrição, mas nenhum pagamento real é processado: integrar um gateway (Mercado Pago, Stripe...) estava fora do escopo. Por isso, **o sistema não pede nem armazena dados de cartão**, já que guardar esses dados sem um gateway certificado violaria as normas de segurança do setor (PCI-DSS). A aprovação do pagamento é feita pela secretaria, no painel.
- **Mensalidade calculada, não digitada.** O admin cadastra o **valor total** e o **número de parcelas** do curso, e o sistema calcula a mensalidade. Assim, ela nunca fica diferente do valor total.
- **Desconto de 5% no Pix**, como é comum em instituições de ensino. O valor já é gravado com desconto na inscrição.
- **Parcelamento pelo maior limite do carrinho.** Quem compra vários cursos juntos pode parcelar até o maior limite entre eles. Por exemplo, um curso técnico de até 12x junto com uma graduação de até 36x pode ser pago em 36x.
- **O servidor é a fonte da verdade do preço.** O front-end calcula os valores só para mostrar ao aluno. O que vale é o valor calculado pelo back-end com `BigDecimal` (arredondamento em centavos), a partir do preço do curso no banco. Nunca se confia em um valor enviado pelo navegador.

**Inscrição e matrícula**

- **Inscrição × matrícula.** Primeiro o aluno se **inscreve** e escolhe como vai pagar. Quando a secretaria confirma o pagamento, a **matrícula** é criada automaticamente (veja o [fluxo](#-fluxo-da-inscrição-até-a-matrícula)). A tabela de pagamentos, ligada à matrícula, já está modelada para controlar as parcelas.
- **Lista de espera em vez de recusar a compra.** Turma cheia não perde o aluno: ele entra na fila, não paga enquanto espera e é chamado automaticamente quando abre uma vaga, por ordem de chegada.
- **Primeira turma disponível + troca depois.** Para a compra ser rápida, o aluno é colocado na primeira turma aberta com vaga. Se preferir outro turno, ele troca em "Minhas inscrições".

**Painel e banco de dados**

- **Admin com liberdade no painel.** O recálculo e as travas valem para as compras feitas pelos alunos. O admin continua podendo criar e editar inscrições, por exemplo para registrar uma negociação feita pela secretaria. Mesmo assim, ele não consegue tirar alguém da lista de espera sem vaga na turma.
- **Disciplina compartilhada entre cursos (N:N).** Uma disciplina como "Lógica de Programação" é cadastrada uma vez só e ligada a vários cursos, em vez de ser duplicada. Por isso, a carga horária é a mesma em todos eles.
- **`ddl-auto=validate`.** O banco tem valores padrão e gatilhos criados por scripts SQL. Para o Hibernate não alterar a estrutura sem ninguém saber, ele só confere se o banco está correto. Todas as alterações (novas colunas, tabelas de ligação, status) são feitas por script, guardados na pasta `database`.
- **Interceptor em vez do Spring Security completo.** O controle de acesso foi feito com um `HandlerInterceptor`: uma solução enxuta, fácil de entender e que não conflita com a configuração de CORS.
- **Notificações por consulta periódica.** O sininho do painel consulta a API a cada minuto. É mais simples de hospedar no plano gratuito do que uma conexão em tempo real (WebSocket) e atende bem ao volume do projeto.

**Front-end**

- **`HashRouter` no front-end.** O GitHub Pages não sabe lidar com as rotas do React (dar F5 em `/carrinho` daria erro 404). Com o `HashRouter`, as URLs ficam no formato `/#/carrinho` e funcionam em qualquer situação.
- **Busca tolerante.** A busca e a associação das imagens aos cursos ignoram acentos, maiúsculas e espaços extras, para que pequenas diferenças de digitação não atrapalhem.

---

## 🚀 Deploy

### Back-end (Render)

O serviço `aprenda-plus-backend` é atualizado automaticamente a cada `git push` na branch `main`. Variáveis de ambiente configuradas no Render:

| Variável | Descrição |
|---|---|
| `JWT_SECRET` | Chave secreta que assina os tokens |
| Dados de conexão do banco | Endereço, usuário e senha do PostgreSQL do Render |

> Quando uma atualização muda a estrutura do banco, o script SQL correspondente da pasta `database` é executado também no banco do Render, antes do deploy.

### Front-end (GitHub Pages)

```bash
cd aprenda-plus-frontend
npm run deploy
```

O comando gera a versão de produção e publica a pasta `dist` na branch `gh-pages`.

---

## 📋 Metodologia de trabalho

> ✏️ **A preencher pelo grupo:** como a equipe se organizou (reuniões, sprints, divisão de tarefas) e o link do quadro Kanban.

- **Metodologia:** _Kanban / Scrum (preencher)_
- **Quadro de tarefas:** _link do GitHub Projects (preencher)_
- **Rotina da equipe:** _ex.: reuniões semanais, divisão por funcionalidade... (preencher)_

---

## 🔭 Melhorias futuras

- Criar todas as inscrições do carrinho em uma única operação no servidor, para que um erro em um curso não deixe a compra pela metade.
- Integrar um gateway de pagamento real, confirmando a inscrição automaticamente quando o pagamento for aprovado, e gerar as parcelas na tabela de pagamentos.
- Avisar o aluno por e-mail quando ele sair da lista de espera ou quando a matrícula for criada.
- Permitir que o próprio aluno cancele uma inscrição em "Minhas inscrições".
- Mostrar as matrículas e os pagamentos também na área do aluno.
- Notificações do painel em tempo real (WebSocket), sem precisar consultar a API a cada minuto.
- Recuperação de senha por e-mail.
- Cadastrar a imagem do curso pelo painel admin, em vez de deixá-la no código.

---

## 👥 Equipe

> ✏️ **A preencher pelo grupo**

| Nome | GitHub | Principais contribuições |
|---|---|---|
| Nattaly Buralde Queiroz | [@NattalyB](https://github.com/NattalyB) | _preencher_ |
| _Nome_ | [@usuario](https://github.com/usuario) | _preencher_ |
| _Nome_ | [@usuario](https://github.com/usuario) | _preencher_ |
| _Nome_ | [@usuario](https://github.com/usuario) | _preencher_ |

---

Projeto desenvolvido para fins acadêmicos no programa **+PraTi / Codifica**, 2026.

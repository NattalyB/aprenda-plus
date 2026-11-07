-- AprendaPlus: chamados de suporte
-- Funcionários do painel e professores abrem chamados quando têm algum problema com o sistema.
-- Quem tem o módulo "Chamados" (o Master sempre tem) atende e responde no painel.
-- Pode rodar mais de uma vez sem duplicar nada.
-- IMPORTANTE: rode este script no banco ANTES de publicar o back-end novo
-- (o Spring está com ddl-auto=validate e não sobe se faltar tabela ou coluna).

-- ===== Chamado =====
-- Guarda também o nome e o e-mail de quem abriu: se a conta for excluída, o chamado continua legível.
CREATE TABLE IF NOT EXISTS chamado (
    id                  SERIAL PRIMARY KEY,
    assunto             VARCHAR(150) NOT NULL,
    categoria           VARCHAR(20)  NOT NULL DEFAULT 'erro',
    prioridade          VARCHAR(10)  NOT NULL DEFAULT 'media',
    status              VARCHAR(20)  NOT NULL DEFAULT 'aberto',
    tela                VARCHAR(200),                       -- onde aconteceu (ex.: Financeiro > Parcelas)
    tipo_solicitante    VARCHAR(12)  NOT NULL,              -- funcionario | professor
    funcionario_id      INTEGER      REFERENCES funcionario (id) ON DELETE SET NULL,
    professor_id        INTEGER      REFERENCES professor (id) ON DELETE SET NULL,
    nome_solicitante    VARCHAR(150) NOT NULL,
    email_solicitante   VARCHAR(150),
    responsavel_id      INTEGER      REFERENCES funcionario (id) ON DELETE SET NULL,  -- quem está atendendo
    ultima_mensagem_de  VARCHAR(12)  NOT NULL DEFAULT 'solicitante',                 -- solicitante | suporte
    criado_em           TIMESTAMP    NOT NULL DEFAULT NOW(),
    atualizado_em       TIMESTAMP    NOT NULL DEFAULT NOW(),
    resolvido_em        TIMESTAMP,
    CONSTRAINT chk_chamado_categoria CHECK (categoria IN ('erro', 'acesso', 'duvida', 'sugestao', 'outro')),
    CONSTRAINT chk_chamado_prioridade CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
    CONSTRAINT chk_chamado_status CHECK (status IN ('aberto', 'em_atendimento', 'resolvido', 'fechado')),
    CONSTRAINT chk_chamado_tipo CHECK (tipo_solicitante IN ('funcionario', 'professor')),
    CONSTRAINT chk_chamado_ultima CHECK (ultima_mensagem_de IN ('solicitante', 'suporte')),
    CONSTRAINT chk_chamado_um_solicitante CHECK (funcionario_id IS NULL OR professor_id IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_chamado_status ON chamado (status, atualizado_em DESC);
CREATE INDEX IF NOT EXISTS idx_chamado_funcionario ON chamado (funcionario_id);
CREATE INDEX IF NOT EXISTS idx_chamado_professor ON chamado (professor_id);

-- ===== Conversa do chamado =====
-- A primeira mensagem é a descrição do problema. Cada mensagem pode ter um anexo (print ou PDF, até 5 MB).
CREATE TABLE IF NOT EXISTS chamado_mensagem (
    id              SERIAL PRIMARY KEY,
    chamado_id      INTEGER      NOT NULL REFERENCES chamado (id) ON DELETE CASCADE,
    autor_tipo      VARCHAR(12)  NOT NULL,                  -- solicitante | suporte
    autor_id        INTEGER,                                -- id do funcionário ou do professor
    autor_nome      VARCHAR(150) NOT NULL,
    texto           TEXT         NOT NULL,
    anexo_nome      VARCHAR(200),
    anexo_tipo      VARCHAR(40),
    anexo_tamanho   INTEGER,
    anexo_conteudo  BYTEA,
    criado_em       TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_mensagem_autor CHECK (autor_tipo IN ('solicitante', 'suporte')),
    CONSTRAINT chk_mensagem_anexo_tipo CHECK (anexo_tipo IS NULL OR anexo_tipo IN ('application/pdf', 'image/png', 'image/jpeg')),
    CONSTRAINT chk_mensagem_anexo_tamanho CHECK (anexo_tamanho IS NULL OR anexo_tamanho BETWEEN 1 AND 5242880)
);

CREATE INDEX IF NOT EXISTS idx_mensagem_chamado ON chamado_mensagem (chamado_id, criado_em);

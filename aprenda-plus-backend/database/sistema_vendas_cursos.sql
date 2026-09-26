-- =========================================================
-- SISTEMA DE VENDA DE CURSOS SUPERIORES E PROFISSIONALIZANTES
-- Script de criação do banco de dados — PostgreSQL
-- =========================================================

CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- BLOCO 1: PESSOAS

CREATE TABLE aluno (
    id              SERIAL PRIMARY KEY,
    nome_completo   VARCHAR(150) NOT NULL,
    telefone        VARCHAR(20) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    data_nascimento DATE NOT NULL,
    cpf             VARCHAR(11) NOT NULL UNIQUE,
    senha_hash      VARCHAR(255) NOT NULL,
    rua             VARCHAR(150),
    numero          VARCHAR(10),
    complemento     VARCHAR(100),
    cep             VARCHAR(9),
    bairro          VARCHAR(100),
    cidade          VARCHAR(100),
    estado          VARCHAR(2),
    status          VARCHAR(20) NOT NULL DEFAULT 'ativo',
    criado_em       TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_aluno_cpf CHECK (cpf ~ '^[0-9]{11}$'),
    CONSTRAINT chk_aluno_status CHECK (status IN ('ativo', 'inativo', 'bloqueado'))
);

CREATE TRIGGER trg_aluno_atualizado
BEFORE UPDATE ON aluno
FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TABLE funcionario (
    id              SERIAL PRIMARY KEY,
    nome_completo   VARCHAR(150) NOT NULL,
    telefone        VARCHAR(20) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    cpf             VARCHAR(11) NOT NULL UNIQUE,
    data_nascimento DATE NOT NULL,
    data_admissao   DATE NOT NULL DEFAULT CURRENT_DATE,
    senha_hash      VARCHAR(255) NOT NULL,
    cargo           VARCHAR(50) NOT NULL DEFAULT 'administrativo',
    status          VARCHAR(20) NOT NULL DEFAULT 'ativo',
    rua             VARCHAR(150),
    numero          VARCHAR(10),
    complemento     VARCHAR(100),
    cep             VARCHAR(9),
    bairro          VARCHAR(100),
    cidade          VARCHAR(100),
    estado          VARCHAR(2),
    criado_em       TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_funcionario_cpf CHECK (cpf ~ '^[0-9]{11}$'),
    CONSTRAINT chk_funcionario_status CHECK (status IN ('ativo', 'inativo', 'bloqueado'))
);

CREATE TRIGGER trg_funcionario_atualizado
BEFORE UPDATE ON funcionario
FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TABLE professor (
    id              SERIAL PRIMARY KEY,
    nome_completo   VARCHAR(150) NOT NULL,
    telefone        VARCHAR(20),
    email           VARCHAR(150) NOT NULL UNIQUE,
    data_nascimento DATE,
    cpf             VARCHAR(11) NOT NULL UNIQUE,
    rua             VARCHAR(150),
    numero          VARCHAR(10),
    complemento     VARCHAR(100),
    cep             VARCHAR(9),
    bairro          VARCHAR(100),
    cidade          VARCHAR(100),
    estado          VARCHAR(2),
    status          VARCHAR(20) NOT NULL DEFAULT 'ativo',
    criado_em       TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_professor_cpf CHECK (cpf ~ '^[0-9]{11}$'),
    CONSTRAINT chk_professor_status CHECK (status IN ('ativo', 'inativo', 'bloqueado'))
);

CREATE TRIGGER trg_professor_atualizado
BEFORE UPDATE ON professor
FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- BLOCO 2: ESTRUTURA ACADÊMICA

CREATE TABLE curso (
    id                SERIAL PRIMARY KEY,
    nome              VARCHAR(150) NOT NULL,
    categoria         VARCHAR(30) NOT NULL,
    descricao         TEXT,
    conteudo          TEXT,
    carga_horaria     INTEGER NOT NULL,
    modalidade        VARCHAR(30) NOT NULL,
    pre_requisitos    TEXT,
    valor             NUMERIC(10,2) NOT NULL,
    formas_pagamento  VARCHAR(150),
    criado_em         TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em     TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_curso_categoria CHECK (categoria IN ('superior', 'profissionalizante')),
    CONSTRAINT chk_curso_carga_horaria CHECK (carga_horaria > 0),
    CONSTRAINT chk_curso_valor CHECK (valor >= 0)
);

CREATE TRIGGER trg_curso_atualizado
BEFORE UPDATE ON curso
FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TABLE disciplina (
    id              SERIAL PRIMARY KEY,
    curso_id        INTEGER NOT NULL REFERENCES curso(id) ON DELETE CASCADE,
    nome            VARCHAR(150) NOT NULL,
    descricao       TEXT,
    conteudo        TEXT,
    carga_horaria   INTEGER NOT NULL,
    modalidade      VARCHAR(30),
    pre_requisitos  TEXT,
    criado_em       TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_disciplina_carga_horaria CHECK (carga_horaria > 0)
);

CREATE TRIGGER trg_disciplina_atualizado
BEFORE UPDATE ON disciplina
FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TABLE periodo_letivo (
    id              SERIAL PRIMARY KEY,
    nome            VARCHAR(100) NOT NULL,
    data_inicio     DATE NOT NULL,
    data_fim        DATE NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'ativo',
    criado_em       TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_periodo_datas CHECK (data_fim >= data_inicio),
    CONSTRAINT chk_periodo_status CHECK (status IN ('ativo', 'encerrado', 'cancelado'))
);

CREATE TRIGGER trg_periodo_letivo_atualizado
BEFORE UPDATE ON periodo_letivo
FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TABLE turma (
    id                 SERIAL PRIMARY KEY,
    nome               VARCHAR(100) NOT NULL,
    periodo_letivo_id  INTEGER NOT NULL REFERENCES periodo_letivo(id),
    curso_id           INTEGER NOT NULL REFERENCES curso(id),
    carga_horaria      INTEGER,
    modalidade         VARCHAR(30),
    capacidade_maxima  INTEGER NOT NULL,
    dias_horarios      VARCHAR(150),
    status             VARCHAR(30) NOT NULL DEFAULT 'inscricoes_abertas',
    criado_em          TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em      TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_turma_carga_horaria CHECK (carga_horaria IS NULL OR carga_horaria > 0),
    CONSTRAINT chk_turma_capacidade CHECK (capacidade_maxima > 0),
    CONSTRAINT chk_turma_status CHECK (status IN ('inscricoes_abertas', 'inscricoes_encerradas', 'em_andamento', 'encerrada', 'cancelada'))
);

CREATE TRIGGER trg_turma_atualizado
BEFORE UPDATE ON turma
FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TABLE plano_de_aula (
    id                       SERIAL PRIMARY KEY,
    turma_id                 INTEGER NOT NULL REFERENCES turma(id) ON DELETE CASCADE,
    professor_responsavel_id INTEGER NOT NULL REFERENCES professor(id),
    criado_em                TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_plano_de_aula_atualizado
BEFORE UPDATE ON plano_de_aula
FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TABLE aula (
    id                   SERIAL PRIMARY KEY,
    plano_id             INTEGER NOT NULL REFERENCES plano_de_aula(id) ON DELETE CASCADE,
    numero_aula          INTEGER NOT NULL,
    data_aula            DATE,
    topico               VARCHAR(200) NOT NULL,
    conteudo_detalhado   TEXT,
    recursos_necessarios VARCHAR(200),
    tipo_aula            VARCHAR(30),
    CONSTRAINT chk_aula_numero CHECK (numero_aula > 0)
);

-- BLOCO 3: RELACIONAMENTOS N:N

CREATE TABLE curso_professor (
    curso_id     INTEGER NOT NULL REFERENCES curso(id) ON DELETE CASCADE,
    professor_id INTEGER NOT NULL REFERENCES professor(id) ON DELETE CASCADE,
    PRIMARY KEY (curso_id, professor_id)
);

CREATE TABLE disciplina_professor (
    disciplina_id INTEGER NOT NULL REFERENCES disciplina(id) ON DELETE CASCADE,
    professor_id  INTEGER NOT NULL REFERENCES professor(id) ON DELETE CASCADE,
    PRIMARY KEY (disciplina_id, professor_id)
);

CREATE TABLE turma_professor (
    turma_id     INTEGER NOT NULL REFERENCES turma(id) ON DELETE CASCADE,
    professor_id INTEGER NOT NULL REFERENCES professor(id) ON DELETE CASCADE,
    papel        VARCHAR(20) NOT NULL DEFAULT 'principal',
    PRIMARY KEY (turma_id, professor_id),
    CONSTRAINT chk_turma_professor_papel CHECK (papel IN ('principal', 'auxiliar', 'substituto'))
);

CREATE TABLE periodo_letivo_curso (
    periodo_letivo_id INTEGER NOT NULL REFERENCES periodo_letivo(id) ON DELETE CASCADE,
    curso_id          INTEGER NOT NULL REFERENCES curso(id) ON DELETE CASCADE,
    PRIMARY KEY (periodo_letivo_id, curso_id)
);

-- BLOCO 4: COMERCIAL / VENDAS

CREATE TABLE carrinho (
    id            SERIAL PRIMARY KEY,
    aluno_id      INTEGER NOT NULL REFERENCES aluno(id) ON DELETE CASCADE,
    criado_em     TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_carrinho_atualizado
BEFORE UPDATE ON carrinho
FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TABLE item_carrinho (
    id          SERIAL PRIMARY KEY,
    carrinho_id INTEGER NOT NULL REFERENCES carrinho(id) ON DELETE CASCADE,
    curso_id    INTEGER NOT NULL REFERENCES curso(id),
    UNIQUE (carrinho_id, curso_id)
);

CREATE TABLE inscricao (
    id               SERIAL PRIMARY KEY,
    aluno_id         INTEGER NOT NULL REFERENCES aluno(id),
    turma_id         INTEGER NOT NULL REFERENCES turma(id),
    data_inscricao   TIMESTAMP NOT NULL DEFAULT NOW(),
    status           VARCHAR(30) NOT NULL DEFAULT 'pendente_pagamento',
    forma_pagamento  VARCHAR(50),
    valor_total      NUMERIC(10,2) NOT NULL,
    observacoes      TEXT,
    criado_em        TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em    TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_inscricao_status CHECK (status IN ('pendente_pagamento', 'confirmada', 'cancelada', 'aguardando_vaga', 'concluida')),
    CONSTRAINT chk_inscricao_valor CHECK (valor_total >= 0)
);

CREATE TRIGGER trg_inscricao_atualizado
BEFORE UPDATE ON inscricao
FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TABLE matricula (
    id               SERIAL PRIMARY KEY,
    aluno_id         INTEGER NOT NULL REFERENCES aluno(id),
    turma_id         INTEGER NOT NULL REFERENCES turma(id),
    data_matricula   DATE NOT NULL DEFAULT CURRENT_DATE,
    status           VARCHAR(30) NOT NULL DEFAULT 'ativa',
    contrato_url     VARCHAR(255),
    plano_pagamento  VARCHAR(50),
    criado_em        TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em    TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (aluno_id, turma_id),
    CONSTRAINT chk_matricula_status CHECK (status IN ('ativa', 'trancada', 'concluida', 'cancelada'))
);

CREATE TRIGGER trg_matricula_atualizado
BEFORE UPDATE ON matricula
FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TABLE pagamento (
    id               SERIAL PRIMARY KEY,
    matricula_id     INTEGER NOT NULL REFERENCES matricula(id) ON DELETE CASCADE,
    numero_parcela   INTEGER NOT NULL DEFAULT 1,
    valor_parcela    NUMERIC(10,2) NOT NULL,
    data_vencimento  DATE NOT NULL,
    data_pagamento   DATE,
    forma_pagamento  VARCHAR(50),
    status           VARCHAR(20) NOT NULL DEFAULT 'pendente',
    criado_em        TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em    TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_pagamento_parcela CHECK (numero_parcela > 0),
    CONSTRAINT chk_pagamento_valor CHECK (valor_parcela > 0),
    CONSTRAINT chk_pagamento_status CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
    UNIQUE (matricula_id, numero_parcela)
);

CREATE TRIGGER trg_pagamento_atualizado
BEFORE UPDATE ON pagamento
FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- BLOCO 5: ÍNDICES ÚTEIS

CREATE INDEX idx_curso_nome ON curso(nome);
CREATE INDEX idx_curso_categoria ON curso(categoria);
CREATE INDEX idx_turma_curso ON turma(curso_id);
CREATE INDEX idx_turma_periodo ON turma(periodo_letivo_id);
CREATE INDEX idx_inscricao_aluno ON inscricao(aluno_id);
CREATE INDEX idx_inscricao_turma ON inscricao(turma_id);
CREATE INDEX idx_inscricao_status ON inscricao(status);
CREATE INDEX idx_matricula_aluno ON matricula(aluno_id);
CREATE INDEX idx_matricula_turma ON matricula(turma_id);
CREATE INDEX idx_matricula_status ON matricula(status);
CREATE INDEX idx_pagamento_status ON pagamento(status);
CREATE INDEX idx_pagamento_matricula ON pagamento(matricula_id);
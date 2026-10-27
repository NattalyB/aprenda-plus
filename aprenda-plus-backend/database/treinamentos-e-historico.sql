-- AprendaPlus: módulo Treinamentos (vídeos e PDFs de como usar o sistema)
-- e Histórico de alterações (quem cadastrou/alterou o quê, e quando).
-- Pode rodar mais de uma vez.

-- ===== Treinamentos =====
CREATE TABLE IF NOT EXISTS treinamento (
    id              SERIAL PRIMARY KEY,
    titulo          VARCHAR(150) NOT NULL,
    descricao       TEXT,
    video_url       VARCHAR(300),
    pdf_nome        VARCHAR(200),
    pdf_tamanho     INTEGER,
    pdf_conteudo    BYTEA,
    ordem           INTEGER      NOT NULL DEFAULT 0,
    criado_em       TIMESTAMP    NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_treinamento_pdf CHECK (pdf_tamanho IS NULL OR (pdf_tamanho > 0 AND pdf_tamanho <= 5242880))
);

-- ===== Histórico de alterações =====
CREATE TABLE IF NOT EXISTS registro_atividade (
    id            BIGSERIAL PRIMARY KEY,
    quando        TIMESTAMP    NOT NULL,
    usuario_tipo  VARCHAR(20)  NOT NULL,            -- funcionario | aluno | visitante
    usuario_id    INTEGER,
    usuario_nome  VARCHAR(150) NOT NULL,
    modulo        VARCHAR(40)  NOT NULL,
    acao          VARCHAR(20)  NOT NULL,            -- cadastrou | alterou | excluiu | importou ...
    descricao     VARCHAR(300) NOT NULL,
    alvo          VARCHAR(40),                      -- tipo do registro afetado (ex.: alunos, aulas)
    registro_id   INTEGER,                          -- id do registro afetado
    metodo        VARCHAR(10)  NOT NULL,
    caminho       VARCHAR(200) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_atividade_quando ON registro_atividade (quando DESC);
CREATE INDEX IF NOT EXISTS idx_atividade_alvo ON registro_atividade (alvo, registro_id);
CREATE INDEX IF NOT EXISTS idx_atividade_usuario ON registro_atividade (usuario_tipo, usuario_id);

-- Confere
SELECT
    (SELECT COUNT(*) FROM treinamento) AS treinamentos,
    (SELECT COUNT(*) FROM registro_atividade) AS registros_no_historico;

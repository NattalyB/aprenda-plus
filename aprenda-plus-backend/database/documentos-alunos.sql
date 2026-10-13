-- AprendaPlus: documento de escolaridade dos alunos
-- O certificado de conclusão (PDF, JPG ou PNG, até 5 MB) fica guardado no próprio banco.
-- Pode rodar mais de uma vez.

CREATE TABLE IF NOT EXISTS documento_aluno (
    id           SERIAL PRIMARY KEY,
    aluno_id     INTEGER      NOT NULL REFERENCES aluno (id) ON DELETE CASCADE,
    tipo         VARCHAR(40)  NOT NULL DEFAULT 'certificado_escolaridade',
    nome_arquivo VARCHAR(200) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    tamanho      INTEGER      NOT NULL,
    conteudo     BYTEA        NOT NULL,
    status       VARCHAR(20)  NOT NULL DEFAULT 'pendente',
    observacao   VARCHAR(500),
    enviado_em   TIMESTAMP    NOT NULL DEFAULT NOW(),
    revisado_em  TIMESTAMP,
    CONSTRAINT chk_documento_status CHECK (status IN ('pendente', 'aprovado', 'recusado')),
    CONSTRAINT chk_documento_tamanho CHECK (tamanho > 0 AND tamanho <= 5242880)
);

CREATE INDEX IF NOT EXISTS idx_documento_aluno ON documento_aluno (aluno_id);

-- Confere
SELECT COUNT(*) AS documentos FROM documento_aluno;

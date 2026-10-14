-- AprendaPlus: sala de aula EAD
-- Aulas com vídeo (YouTube), material e data de liberação, progresso do aluno,
-- mural de avisos da turma e certificado de conclusão com código de verificação.
-- Pode rodar mais de uma vez.

-- 1) Novas informações em cada aula
ALTER TABLE aula ADD COLUMN IF NOT EXISTS disciplina_id   INTEGER REFERENCES disciplina (id) ON DELETE SET NULL;
ALTER TABLE aula ADD COLUMN IF NOT EXISTS video_url       VARCHAR(300);
ALTER TABLE aula ADD COLUMN IF NOT EXISTS material_url    VARCHAR(300);
ALTER TABLE aula ADD COLUMN IF NOT EXISTS duracao_minutos INTEGER;
ALTER TABLE aula ADD COLUMN IF NOT EXISTS publicada       BOOLEAN NOT NULL DEFAULT TRUE;

-- Cada turma tem um único plano de aula (a "sala de aula" dela)
CREATE UNIQUE INDEX IF NOT EXISTS uq_plano_de_aula_turma ON plano_de_aula (turma_id);
CREATE INDEX IF NOT EXISTS idx_aula_plano ON aula (plano_id, numero_aula);

-- 2) Aulas que cada aluno já concluiu
CREATE TABLE IF NOT EXISTS aula_concluida (
    id           SERIAL PRIMARY KEY,
    aluno_id     INTEGER   NOT NULL REFERENCES aluno (id) ON DELETE CASCADE,
    aula_id      INTEGER   NOT NULL REFERENCES aula (id) ON DELETE CASCADE,
    concluida_em TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_aula_concluida UNIQUE (aluno_id, aula_id)
);

-- 3) Mural de avisos da turma
CREATE TABLE IF NOT EXISTS aviso_turma (
    id        SERIAL PRIMARY KEY,
    turma_id  INTEGER      NOT NULL REFERENCES turma (id) ON DELETE CASCADE,
    titulo    VARCHAR(120) NOT NULL,
    mensagem  TEXT         NOT NULL,
    autor     VARCHAR(150),
    fixado    BOOLEAN      NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aviso_turma ON aviso_turma (turma_id);

-- 4) Certificados emitidos (o código permite conferir a autenticidade no site)
CREATE TABLE IF NOT EXISTS certificado (
    id            SERIAL PRIMARY KEY,
    aluno_id      INTEGER     NOT NULL REFERENCES aluno (id) ON DELETE CASCADE,
    turma_id      INTEGER     NOT NULL REFERENCES turma (id) ON DELETE CASCADE,
    codigo        VARCHAR(20) NOT NULL UNIQUE,
    carga_horaria INTEGER,
    emitido_em    TIMESTAMP   NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_certificado_aluno_turma UNIQUE (aluno_id, turma_id)
);

-- Confere
SELECT
    (SELECT COUNT(*) FROM aula)           AS aulas,
    (SELECT COUNT(*) FROM aula_concluida) AS aulas_concluidas,
    (SELECT COUNT(*) FROM aviso_turma)    AS avisos,
    (SELECT COUNT(*) FROM certificado)    AS certificados;

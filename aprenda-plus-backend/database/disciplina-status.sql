-- Adiciona o status da disciplina (ativa / inativa).
-- Todas as disciplinas que já existem ficam "ativa".
-- Rode no banco LOCAL e no banco do RENDER antes de subir o back-end.
ALTER TABLE disciplina
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ativa';

ALTER TABLE disciplina
    DROP CONSTRAINT IF EXISTS disciplina_status_check;

ALTER TABLE disciplina
    ADD CONSTRAINT disciplina_status_check CHECK (status IN ('ativa', 'inativa'));

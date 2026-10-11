-- Uma disciplina passa a poder fazer parte de VÁRIOS cursos.
-- 1) Cria a tabela de ligação curso_disciplina
-- 2) Copia para ela o curso que cada disciplina já tinha (nada se perde)
-- 3) Remove a coluna antiga disciplina.curso_id
-- Rode no banco LOCAL e no banco do RENDER, logo antes de subir o back-end.

CREATE TABLE IF NOT EXISTS curso_disciplina (
    curso_id      INTEGER NOT NULL REFERENCES curso(id) ON DELETE CASCADE,
    disciplina_id INTEGER NOT NULL REFERENCES disciplina(id) ON DELETE CASCADE,
    PRIMARY KEY (curso_id, disciplina_id)
);

-- Só copia se a coluna antiga ainda existir (assim o script pode rodar mais de uma vez)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'disciplina' AND column_name = 'curso_id'
    ) THEN
        INSERT INTO curso_disciplina (curso_id, disciplina_id)
        SELECT curso_id, id FROM disciplina WHERE curso_id IS NOT NULL
        ON CONFLICT DO NOTHING;

        ALTER TABLE disciplina DROP COLUMN curso_id;
    END IF;
END $$;

-- Conferência: quantas ligações curso-disciplina existem agora
SELECT COUNT(*) AS ligacoes_curso_disciplina FROM curso_disciplina;

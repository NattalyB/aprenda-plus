-- AprendaPlus: níveis de acesso dos funcionários do painel
-- Cria a tabela de níveis, os níveis iniciais e liga cada funcionário a um nível.
-- Todos os funcionários que já existem viram Master, para ninguém perder o acesso.
-- Pode rodar mais de uma vez sem duplicar nada.

CREATE TABLE IF NOT EXISTS nivel_acesso (
    id      SERIAL PRIMARY KEY,
    nome    VARCHAR(50)  NOT NULL UNIQUE,
    modulos VARCHAR(500) NOT NULL DEFAULT '',
    master  BOOLEAN      NOT NULL DEFAULT FALSE
);

INSERT INTO nivel_acesso (nome, modulos, master) VALUES
    ('Master', '', TRUE),
    ('Administrativo', 'alunos,professores,cursos,disciplinas,periodos,turmas,inscricoes,matriculas', FALSE),
    ('Secretaria', 'alunos,turmas,inscricoes,matriculas', FALSE),
    ('Financeiro', 'inscricoes,matriculas', FALSE)
ON CONFLICT (nome) DO NOTHING;

ALTER TABLE funcionario ADD COLUMN IF NOT EXISTS nivel_id INTEGER REFERENCES nivel_acesso (id);

UPDATE funcionario
SET nivel_id = (SELECT id FROM nivel_acesso WHERE master LIMIT 1)
WHERE nivel_id IS NULL;

-- Confere o resultado
SELECT f.id, f.nome_completo, n.nome AS nivel
FROM funcionario f
LEFT JOIN nivel_acesso n ON n.id = f.nivel_id
ORDER BY f.id;

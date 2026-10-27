-- AprendaPlus: Portal do Professor
-- O professor entra no site com o e-mail do cadastro e uma senha criada por ele
-- (a secretaria envia um link de acesso pelo cadastro do professor).
-- Pode rodar mais de uma vez.

-- Senha do professor (fica vazia até ele criar pelo link de acesso)
ALTER TABLE professor ADD COLUMN IF NOT EXISTS senha_hash VARCHAR(255);

-- Links de "criar senha" agora também servem para professores
ALTER TABLE redefinicao_senha DROP CONSTRAINT IF EXISTS chk_redefinicao_tipo;
ALTER TABLE redefinicao_senha ADD CONSTRAINT chk_redefinicao_tipo
    CHECK (tipo IN ('aluno', 'funcionario', 'professor'));

-- Confere
SELECT COUNT(*) AS professores, COUNT(senha_hash) AS com_acesso_criado FROM professor;

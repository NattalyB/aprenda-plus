-- AprendaPlus: cor de cada nível de acesso
-- Cria a coluna "cor" e dá uma cor inicial para os níveis que ainda não têm.
-- Depois o Master troca as cores no módulo Sistema. Pode rodar mais de uma vez.

ALTER TABLE nivel_acesso ADD COLUMN IF NOT EXISTS cor VARCHAR(7);

UPDATE nivel_acesso SET cor = '#001e42' WHERE cor IS NULL AND master;
UPDATE nivel_acesso SET cor = '#7c3aed' WHERE cor IS NULL AND nome = 'Administrativo';
UPDATE nivel_acesso SET cor = '#0284c7' WHERE cor IS NULL AND nome = 'Secretaria';
UPDATE nivel_acesso SET cor = '#16a34a' WHERE cor IS NULL AND nome = 'Financeiro';
UPDATE nivel_acesso SET cor = '#64748b' WHERE cor IS NULL;

-- Confere o resultado
SELECT nome, cor FROM nivel_acesso ORDER BY master DESC, nome;

-- AprendaPlus: módulo Financeiro
-- Libera o novo módulo "financeiro" para os níveis Financeiro e Administrativo.
-- (O Master já tem acesso a tudo.) Pode rodar mais de uma vez.
-- A tabela "pagamento" já existe desde o script principal: não muda nada nela.

UPDATE nivel_acesso
SET modulos = CASE WHEN modulos = '' THEN 'financeiro' ELSE modulos || ',financeiro' END
WHERE nome IN ('Financeiro', 'Administrativo')
  AND modulos NOT LIKE '%financeiro%';

-- Confere o resultado
SELECT nome, modulos, master FROM nivel_acesso ORDER BY master DESC, nome;

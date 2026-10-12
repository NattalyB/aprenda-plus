-- AprendaPlus: cria as matrículas das inscrições que JÁ estavam confirmadas
-- antes da matrícula automática existir.
-- Pode rodar mais de uma vez: não duplica (só cria onde ainda não existe matrícula).

INSERT INTO matricula (aluno_id, turma_id, status, plano_pagamento)
SELECT i.aluno_id, i.turma_id, 'ativa', i.forma_pagamento
FROM inscricao i
WHERE i.status = 'confirmada'
  AND NOT EXISTS (
      SELECT 1 FROM matricula m
      WHERE m.aluno_id = i.aluno_id
        AND m.turma_id = i.turma_id
  );

-- Confere o resultado
SELECT m.id, a.nome_completo, t.nome AS turma, m.status, m.plano_pagamento
FROM matricula m
JOIN aluno a ON a.id = m.aluno_id
JOIN turma t ON t.id = m.turma_id
ORDER BY m.id;

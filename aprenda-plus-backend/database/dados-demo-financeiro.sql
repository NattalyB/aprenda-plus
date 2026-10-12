-- AprendaPlus: HISTÓRICO DE DEMONSTRAÇÃO para o financeiro (só para dados fictícios!)
--
-- Use DEPOIS de gerar as parcelas (botão "Gerar parcelas que faltam" na tela Financeiro).
-- Sem isto, todas as parcelas começam a vencer só a partir de hoje e os gráficos ficam vazios
-- no passado. O script "volta no tempo":
--   1) recua o calendário de cada matrícula entre 2 e 5 meses;
--   2) marca como pagas as parcelas que já venceram;
--   3) deixa algumas matrículas (id múltiplo de 3) com parcelas em atraso.
--
-- ATENÇÃO: rode UMA vez só. Cada execução recua as datas de novo.

BEGIN;

-- 1) Recua as datas (vencimento e, se houver, a data do pagamento)
UPDATE pagamento
SET data_vencimento = data_vencimento - make_interval(months => 2 + (matricula_id % 4)),
    data_pagamento  = data_pagamento  - make_interval(months => 2 + (matricula_id % 4))
WHERE status <> 'cancelado';

-- 2) O que já venceu foi pago (entre 0 e 4 dias antes do vencimento)
UPDATE pagamento
SET status = 'pago',
    data_pagamento = data_vencimento - ((id % 5) * INTERVAL '1 day')
WHERE status IN ('pendente', 'atrasado')
  AND data_vencimento < CURRENT_DATE
  AND matricula_id % 3 <> 0;

-- 3) As outras ficam em atraso
UPDATE pagamento
SET status = 'atrasado'
WHERE status = 'pendente'
  AND data_vencimento < CURRENT_DATE;

COMMIT;

-- Confere: quantas parcelas em cada situação
SELECT status, COUNT(*) AS parcelas, SUM(valor_parcela) AS total
FROM pagamento
GROUP BY status
ORDER BY status;

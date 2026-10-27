-- AprendaPlus: CONTAS A PAGAR DE DEMONSTRAÇÃO (opcional, só para a apresentação!)
-- Cria algumas despesas fixas dos últimos meses (já pagas) e dos próximos (em aberto),
-- para o gráfico do fluxo de caixa não ficar vazio.
-- Rode DEPOIS do financeiro-completo.sql e UMA vez só (cada execução cria as contas de novo).

BEGIN;

INSERT INTO conta_pagar (descricao, categoria, fornecedor, valor, data_vencimento, data_pagamento, forma_pagamento, status)
SELECT d.descricao || ' — ' || to_char(m.mes, 'MM/YYYY'),
       d.categoria,
       d.fornecedor,
       d.valor,
       (m.mes + (d.dia - 1) * INTERVAL '1 day')::date,
       CASE WHEN m.mes < date_trunc('month', CURRENT_DATE) THEN (m.mes + (d.dia - 1) * INTERVAL '1 day')::date END,
       CASE WHEN m.mes < date_trunc('month', CURRENT_DATE) THEN d.forma END,
       CASE WHEN m.mes < date_trunc('month', CURRENT_DATE) THEN 'pago' ELSE 'pendente' END
FROM (VALUES
        ('Aluguel da sede',   'Aluguel',             'Imobiliária Canoas', 3500.00, 10, 'Boleto bancário'),
        ('Energia elétrica',  'Energia',             'CEEE Equatorial',     620.00, 15, 'Boleto bancário'),
        ('Internet fibra',    'Internet e telefone', 'Provedor Net Sul',    249.90, 20, 'Pix'),
        ('Plataforma de vídeos', 'Sistemas e softwares', 'Hospedagem EAD',  189.00, 5,  'Cartão de crédito'),
        ('Anúncios nas redes', 'Marketing',          'Meta Ads',            800.00, 25, 'Cartão de crédito')
     ) AS d(descricao, categoria, fornecedor, valor, dia, forma)
CROSS JOIN generate_series(date_trunc('month', CURRENT_DATE) - INTERVAL '4 months',
                           date_trunc('month', CURRENT_DATE) + INTERVAL '3 months',
                           INTERVAL '1 month') AS m(mes);

COMMIT;

SELECT categoria, COUNT(*) AS contas, SUM(valor) AS total FROM conta_pagar GROUP BY categoria ORDER BY total DESC;

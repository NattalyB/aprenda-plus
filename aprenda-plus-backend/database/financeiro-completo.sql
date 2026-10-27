-- AprendaPlus: Financeiro completo
--   1) multa, juros e desconto de pontualidade nas parcelas;
--   2) contas a pagar (despesas) para o fluxo de caixa;
--   3) valor da hora-aula dos professores (o pagamento vira uma conta a pagar).
-- Pode rodar mais de uma vez.

-- ===== 1) Regras de cobrança (uma linha só) =====
CREATE TABLE IF NOT EXISTS configuracao_financeira (
    id                                INTEGER      PRIMARY KEY,
    multa_percentual                  NUMERIC(5,2) NOT NULL DEFAULT 2.00,
    juros_mes_percentual              NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    desconto_pontualidade_percentual  NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    dias_carencia                     INTEGER      NOT NULL DEFAULT 0,
    atualizado_em                     TIMESTAMP,
    CONSTRAINT chk_configuracao_financeira_unica CHECK (id = 1)
);

-- Começa com multa de 2% e juros de 1% ao mês (dá para mudar na tela Financeiro > Regras de cobrança)
INSERT INTO configuracao_financeira (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- O que foi cobrado em cada baixa (parcelas antigas ficam vazias e valem pelo valor da parcela)
ALTER TABLE pagamento ADD COLUMN IF NOT EXISTS valor_multa    NUMERIC(10,2);
ALTER TABLE pagamento ADD COLUMN IF NOT EXISTS valor_juros    NUMERIC(10,2);
ALTER TABLE pagamento ADD COLUMN IF NOT EXISTS valor_desconto NUMERIC(10,2);
ALTER TABLE pagamento ADD COLUMN IF NOT EXISTS valor_pago     NUMERIC(10,2);

-- ===== 2) Contas a pagar =====
CREATE TABLE IF NOT EXISTS conta_pagar (
    id               SERIAL        PRIMARY KEY,
    descricao        VARCHAR(150)  NOT NULL,
    categoria        VARCHAR(40)   NOT NULL,
    fornecedor       VARCHAR(150),
    valor            NUMERIC(10,2) NOT NULL CHECK (valor > 0),
    data_vencimento  DATE          NOT NULL,
    data_pagamento   DATE,
    forma_pagamento  VARCHAR(50),
    status           VARCHAR(20)   NOT NULL DEFAULT 'pendente'
                     CHECK (status IN ('pendente', 'pago', 'cancelado')),
    observacao       VARCHAR(500),
    professor_id     INTEGER       REFERENCES professor(id) ON DELETE SET NULL,
    referencia       VARCHAR(7),   -- mês do pagamento do professor, ex.: 2026-10
    horas            NUMERIC(6,2),
    valor_hora       NUMERIC(10,2),
    criado_em        TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conta_pagar_vencimento ON conta_pagar (data_vencimento);
CREATE INDEX IF NOT EXISTS idx_conta_pagar_professor ON conta_pagar (professor_id, referencia);

-- ===== 3) Valor da hora-aula de cada professor =====
CREATE TABLE IF NOT EXISTS professor_hora_aula (
    professor_id  INTEGER       PRIMARY KEY REFERENCES professor(id) ON DELETE CASCADE,
    valor_hora    NUMERIC(10,2) NOT NULL CHECK (valor_hora > 0)
);

-- Confere
SELECT * FROM configuracao_financeira;
SELECT COUNT(*) AS contas_a_pagar FROM conta_pagar;

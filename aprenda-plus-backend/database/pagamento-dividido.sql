-- AprendaPlus: pagamento dividido em duas formas (ex.: dois cartões, ou parte no Pix e parte no cartão)
-- 1) Cada parte do pagamento de uma inscrição (forma, parcelas e valor)
-- 2) Texto da forma de pagamento maior, para caber "Cartão · 10x (R$ ...) + Boleto · 3x (R$ ...)"
-- Pode rodar mais de uma vez.
-- IMPORTANTE: rode este script no banco ANTES de publicar o back-end novo
-- (o Spring está com ddl-auto=validate e não sobe se faltar a tabela).

-- ===== 1) Partes do pagamento =====
-- Só existe para inscrições pagas com mais de uma forma.
-- valor = quanto DESTA inscrição é pago nesta forma, já com o desconto do Pix.
CREATE TABLE IF NOT EXISTS inscricao_pagamento (
    id            SERIAL PRIMARY KEY,
    inscricao_id  INTEGER       NOT NULL REFERENCES inscricao (id) ON DELETE CASCADE,
    ordem         INTEGER       NOT NULL,                -- 1 = primeira forma, 2 = segunda
    forma         VARCHAR(10)   NOT NULL,                -- pix | cartao | boleto
    parcelas      INTEGER       NOT NULL,
    valor         NUMERIC(10,2) NOT NULL,
    CONSTRAINT chk_parte_forma CHECK (forma IN ('pix', 'cartao', 'boleto')),
    CONSTRAINT chk_parte_parcelas CHECK (parcelas BETWEEN 1 AND 120),
    CONSTRAINT chk_parte_valor CHECK (valor >= 0),
    CONSTRAINT uq_parte_ordem UNIQUE (inscricao_id, ordem)
);

-- ===== 2) Texto da forma de pagamento =====
ALTER TABLE inscricao ALTER COLUMN forma_pagamento TYPE VARCHAR(255);
ALTER TABLE matricula ALTER COLUMN plano_pagamento TYPE VARCHAR(255);

-- Confere
SELECT
    (SELECT COUNT(*) FROM inscricao_pagamento) AS partes_de_pagamento,
    (SELECT character_maximum_length FROM information_schema.columns
      WHERE table_name = 'inscricao' AND column_name = 'forma_pagamento') AS tamanho_forma_pagamento;

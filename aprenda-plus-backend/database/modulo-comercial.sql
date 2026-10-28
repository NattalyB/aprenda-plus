-- AprendaPlus: módulo Comercial
-- 1) Eventos de navegação do site (buscas, cursos vistos, cursos postos no carrinho)
-- 2) Consentimento do aluno para receber ofertas (LGPD)
-- 3) Data em que cada curso entrou no carrinho (para saber há quanto tempo está parado)
-- 4) Contatos feitos pela equipe comercial com cada aluno
-- 5) Nível de acesso "Comercial" (só enxerga o módulo Comercial)
-- Pode rodar mais de uma vez sem duplicar nada.
-- IMPORTANTE: rode este script no banco ANTES de publicar o back-end novo
-- (o Spring está com ddl-auto=validate e não sobe se faltar tabela ou coluna).

-- ===== 1) Eventos de navegação =====
-- Visitante não logado fica anônimo: só um código de sessão aleatório gerado no navegador,
-- sem nome, e-mail ou IP. Quando a pessoa está logada como aluno, guarda o id dela.
CREATE TABLE IF NOT EXISTS evento_navegacao (
    id          BIGSERIAL PRIMARY KEY,
    quando      TIMESTAMP    NOT NULL DEFAULT NOW(),
    tipo        VARCHAR(20)  NOT NULL,                 -- BUSCA | VISUALIZACAO | CARRINHO
    sessao      VARCHAR(36)  NOT NULL,                 -- código aleatório do navegador (UUID)
    aluno_id    INTEGER      REFERENCES aluno (id) ON DELETE SET NULL,
    curso_id    INTEGER      REFERENCES curso (id) ON DELETE CASCADE,
    termo       VARCHAR(100),                          -- o que foi digitado na busca
    resultados  INTEGER,                               -- quantos cursos a busca encontrou
    CONSTRAINT chk_evento_tipo CHECK (tipo IN ('BUSCA', 'VISUALIZACAO', 'CARRINHO')),
    CONSTRAINT chk_evento_resultados CHECK (resultados IS NULL OR resultados >= 0)
);

CREATE INDEX IF NOT EXISTS idx_evento_quando ON evento_navegacao (quando DESC);
CREATE INDEX IF NOT EXISTS idx_evento_tipo_quando ON evento_navegacao (tipo, quando DESC);
CREATE INDEX IF NOT EXISTS idx_evento_curso ON evento_navegacao (curso_id);

-- ===== 2) Consentimento para ofertas =====
-- Quem já tinha cadastro fica como "não aceitou" (consentimento precisa ser dado pela pessoa)
ALTER TABLE aluno ADD COLUMN IF NOT EXISTS aceita_marketing BOOLEAN NOT NULL DEFAULT FALSE;

-- ===== 3) Quando o curso entrou no carrinho =====
-- Os itens que já existem recebem a data de criação do carrinho (melhor estimativa possível)
ALTER TABLE item_carrinho ADD COLUMN IF NOT EXISTS adicionado_em TIMESTAMP;
UPDATE item_carrinho i
SET adicionado_em = c.criado_em
FROM carrinho c
WHERE c.id = i.carrinho_id AND i.adicionado_em IS NULL;
ALTER TABLE item_carrinho ALTER COLUMN adicionado_em SET DEFAULT NOW();
UPDATE item_carrinho SET adicionado_em = NOW() WHERE adicionado_em IS NULL;
ALTER TABLE item_carrinho ALTER COLUMN adicionado_em SET NOT NULL;

-- ===== 4) Contatos da equipe comercial =====
CREATE TABLE IF NOT EXISTS contato_comercial (
    id                SERIAL PRIMARY KEY,
    aluno_id          INTEGER      NOT NULL REFERENCES aluno (id) ON DELETE CASCADE,
    funcionario_id    INTEGER      REFERENCES funcionario (id) ON DELETE SET NULL,
    funcionario_nome  VARCHAR(150) NOT NULL,
    quando            TIMESTAMP    NOT NULL DEFAULT NOW(),
    canal             VARCHAR(20)  NOT NULL,           -- whatsapp | telefone | email
    resultado         VARCHAR(30)  NOT NULL,           -- sem_resposta | interessado | retornar_depois | sem_interesse | matriculou
    observacao        VARCHAR(500),
    CONSTRAINT chk_contato_canal CHECK (canal IN ('whatsapp', 'telefone', 'email')),
    CONSTRAINT chk_contato_resultado CHECK (resultado IN
        ('sem_resposta', 'interessado', 'retornar_depois', 'sem_interesse', 'matriculou'))
);

CREATE INDEX IF NOT EXISTS idx_contato_aluno ON contato_comercial (aluno_id, quando DESC);

-- ===== 5) Nível de acesso Comercial =====
INSERT INTO nivel_acesso (nome, modulos, master, cor)
VALUES ('Comercial', 'comercial', FALSE, '#db2777')
ON CONFLICT (nome) DO NOTHING;

-- Confere
SELECT
    (SELECT COUNT(*) FROM evento_navegacao)  AS eventos,
    (SELECT COUNT(*) FROM contato_comercial) AS contatos,
    (SELECT modulos FROM nivel_acesso WHERE nome = 'Comercial') AS modulos_do_comercial;

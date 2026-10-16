-- AprendaPlus: "Esqueci minha senha" (aluno e funcionário do painel)
-- Guarda só o resumo (hash SHA-256) do link enviado por e-mail, que vale por 1 hora e só pode ser usado uma vez.
-- Pode rodar mais de uma vez.

CREATE TABLE IF NOT EXISTS redefinicao_senha (
    id         SERIAL PRIMARY KEY,
    tipo       VARCHAR(12) NOT NULL,
    usuario_id INTEGER     NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    criado_em  TIMESTAMP   NOT NULL DEFAULT NOW(),
    expira_em  TIMESTAMP   NOT NULL,
    usado_em   TIMESTAMP,
    CONSTRAINT chk_redefinicao_tipo CHECK (tipo IN ('aluno', 'funcionario'))
);

CREATE INDEX IF NOT EXISTS idx_redefinicao_usuario ON redefinicao_senha (tipo, usuario_id);

-- Confere
SELECT COUNT(*) AS pedidos_de_nova_senha FROM redefinicao_senha;

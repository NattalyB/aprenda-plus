-- AprendaPlus: atualizações do sistema
-- Linha do tempo do que mudou no sistema (novidades, melhorias, correções) e avisos de manutenção programada.
-- Toda a equipe do painel vê; só o Master publica, edita e exclui. Manutenções também aparecem no Portal do Professor.
-- Pode rodar mais de uma vez sem duplicar nada.
-- IMPORTANTE: rode este script no banco ANTES de publicar o back-end novo
-- (o Spring está com ddl-auto=validate e não sobe se faltar tabela ou coluna).

CREATE TABLE IF NOT EXISTS atualizacao_sistema (
    id                  SERIAL PRIMARY KEY,
    titulo              VARCHAR(150) NOT NULL,
    descricao           TEXT         NOT NULL,
    tipo                VARCHAR(20)  NOT NULL,              -- novidade | melhoria | correcao | manutencao
    versao              VARCHAR(20),                        -- ex.: v1.9 (opcional)
    publicado_em        TIMESTAMP    NOT NULL DEFAULT NOW(),
    inicio_manutencao   TIMESTAMP,                          -- só para manutenção
    fim_manutencao      TIMESTAMP,
    criado_por_id       INTEGER      REFERENCES funcionario (id) ON DELETE SET NULL,
    atualizado_em       TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_atualizacao_tipo CHECK (tipo IN ('novidade', 'melhoria', 'correcao', 'manutencao')),
    CONSTRAINT chk_atualizacao_manutencao CHECK (tipo <> 'manutencao' OR (inicio_manutencao IS NOT NULL AND fim_manutencao IS NOT NULL)),
    CONSTRAINT chk_atualizacao_periodo CHECK (inicio_manutencao IS NULL OR fim_manutencao IS NULL OR fim_manutencao > inicio_manutencao)
);

CREATE INDEX IF NOT EXISTS idx_atualizacao_publicado ON atualizacao_sistema (publicado_em DESC);

-- ===== Histórico real do projeto (só entra se ainda não existir) =====
INSERT INTO atualizacao_sistema (titulo, descricao, tipo, versao, publicado_em)
SELECT v.titulo, v.descricao, v.tipo, v.versao, v.publicado_em::timestamp
FROM (VALUES
    ('Correções no carrinho e no login',
     E'O parcelamento passa a usar o maior limite entre os cursos do carrinho.\nContas inativas ou bloqueadas não conseguem mais entrar nem comprar.',
     'correcao', 'v0.9', '2026-10-11 18:00'),
    ('Lançamento do painel administrativo',
     E'Cadastros de alunos, professores, cursos, disciplinas, períodos letivos e turmas.\nNíveis de acesso por módulo, controlados pelo Master em Sistema.\nMódulo Financeiro com parcelas automáticas, baixa, indicadores e avisos no sininho.',
     'novidade', 'v1.0', '2026-10-12 09:00'),
    ('Sala de aula EAD e certificado de conclusão',
     E'Aulas com vídeo, leitura e atividades, mural de avisos e progresso de cada aluno.\nCom 100% das aulas concluídas, o aluno emite o certificado com código de verificação.',
     'novidade', 'v1.1', '2026-10-13 09:00'),
    ('Listas com paginação, máscaras e "Esqueci minha senha"',
     E'Paginação em todas as listas do painel, máscaras de CPF e telefone, mostrar e confirmar senha e recuperação de senha por e-mail.',
     'melhoria', 'v1.2', '2026-10-16 09:00'),
    ('Importação por planilha e notificações por nível',
     E'Alunos, professores, cursos, disciplinas e aulas podem ser cadastrados por planilha, com prévia antes de gravar.\nO sininho mostra só o que o nível de acesso de cada pessoa pode resolver.',
     'novidade', 'v1.3', '2026-10-20 09:00'),
    ('Assistente virtual com IA no site',
     E'O botão "Dúvidas? Fale comigo" responde sobre cursos, preços, turmas e vagas usando os dados reais do sistema, com opção de falar com um atendente.',
     'novidade', 'v1.4', '2026-10-25 09:00'),
    ('Treinamentos, Histórico de alterações e Portal do Professor',
     E'Vídeos e manuais para a equipe, registro de quem alterou cada informação e um portal próprio para os professores cuidarem das suas turmas.',
     'novidade', 'v1.5', '2026-10-27 09:00'),
    ('Financeiro completo',
     E'Multa, juros e desconto nas regras de cobrança, contas a pagar, fluxo de caixa com previsão e pagamento da hora-aula dos professores.',
     'melhoria', 'v1.6', '2026-10-27 18:00'),
    ('Módulo Comercial e banco de dados em novo servidor',
     E'Funil de vendas, leads para recuperar (com mensagem pronta para o WhatsApp) e os cursos mais procurados.\nO banco de dados passou para o Neon, mais estável e sem prazo de expiração.',
     'novidade', 'v1.7', '2026-10-28 09:00'),
    ('Pagamento em duas formas',
     E'No carrinho, o aluno pode dividir o valor em duas formas de pagamento (por exemplo, Pix + cartão ou dois cartões), e o restante é calculado sozinho.',
     'novidade', 'v1.8', '2026-11-03 09:00'),
    ('Chamados de suporte',
     E'A equipe e os professores abrem chamados quando algo não funciona, com print, e acompanham a resposta. O módulo Chamados atende por prioridade.',
     'novidade', 'v1.9', '2026-11-07 09:00'),
    ('Tema claro, escuro e alto contraste',
     E'Seletor de tema em todo o sistema. O alto contraste ajuda pessoas com baixa visão: fundo preto, texto branco, destaques em amarelo e foco bem visível.',
     'melhoria', 'v1.9', '2026-11-07 09:30'),
    ('Atualizações do sistema',
     E'Esta área! Aqui a equipe acompanha o que mudou no sistema e as manutenções programadas, que também aparecem numa faixa no topo do painel.',
     'novidade', 'v2.0', '2026-11-09 21:00')
) AS v (titulo, descricao, tipo, versao, publicado_em)
WHERE NOT EXISTS (SELECT 1 FROM atualizacao_sistema a WHERE a.titulo = v.titulo);

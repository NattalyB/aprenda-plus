package com.aprendaplus.service;

import java.lang.reflect.Method;
import java.util.Map;

// Transforma uma requisição (método + caminho) em uma linha legível do histórico,
// ex.: PUT /alunos/12 -> módulo "Alunos", ação "alterou", "Alterou aluno #12".
// Não depende do Spring nem do banco.
public final class AtividadeTexto {

    private AtividadeTexto() {
    }

    public static final String CADASTROU = "cadastrou";
    public static final String ALTEROU = "alterou";
    public static final String EXCLUIU = "excluiu";
    public static final String IMPORTOU = "importou";

    // modulo: nome do módulo como aparece na tela; acao: cadastrou/alterou/excluiu/importou;
    // alvo + registroId: o registro afetado (para mostrar "última alteração" no formulário);
    // idDaResposta: true quando o id só aparece na resposta (cadastro novo).
    public record Descricao(String modulo, String acao, String texto, String alvo, Integer registroId,
                            boolean idDaResposta) {
    }

    private record Recurso(String modulo, String singular, String getterId) {
    }

    private static final Map<String, Recurso> RECURSOS = Map.ofEntries(
            Map.entry("alunos", new Recurso("Alunos", "aluno", "IdAluno")),
            Map.entry("professores", new Recurso("Professores", "professor", "IdProfessor")),
            Map.entry("curso-professor", new Recurso("Professores", "vínculo de professor e curso", null)),
            Map.entry("disciplina-professor", new Recurso("Professores", "vínculo de professor e disciplina", null)),
            Map.entry("turma-professor", new Recurso("Professores", "vínculo de professor e turma", null)),
            Map.entry("cursos", new Recurso("Cursos", "curso", "IdCurso")),
            Map.entry("disciplinas", new Recurso("Disciplinas", "disciplina", "IdDisciplina")),
            Map.entry("periodos-letivos", new Recurso("Períodos letivos", "período letivo", "IdPeriodoLetivo")),
            Map.entry("periodo-letivo-curso", new Recurso("Períodos letivos", "vínculo de período e curso", null)),
            Map.entry("turmas", new Recurso("Turmas", "turma", "IdTurma")),
            Map.entry("aulas", new Recurso("Turmas", "aula presencial", "IdAula")),
            Map.entry("planos-de-aula", new Recurso("Sala de aula (EAD)", "sala de aula", "IdPlano")),
            Map.entry("inscricoes", new Recurso("Inscrições", "inscrição", "IdInscricao")),
            Map.entry("matriculas", new Recurso("Matrículas", "matrícula", "IdMatricula")),
            Map.entry("pagamentos", new Recurso("Financeiro", "pagamento", "IdPagamento")),
            Map.entry("financeiro", new Recurso("Financeiro", "parcela", null)),
            Map.entry("funcionarios", new Recurso("Funcionários", "funcionário", "IdFuncionario")),
            Map.entry("niveis-acesso", new Recurso("Sistema", "nível de acesso", "IdNivel")),
            Map.entry("documentos", new Recurso("Alunos", "documento", null)),
            Map.entry("treinamentos", new Recurso("Treinamentos", "treinamento", "IdTreinamento")),
            Map.entry("sala", new Recurso("Sala de aula (EAD)", "certificado", null)));

    // Nomes das planilhas importadas
    private static final Map<String, String> PLANILHAS = Map.of(
            "alunos", "alunos", "professores", "professores", "cursos", "cursos", "disciplinas", "disciplinas");

    // Rotas que não entram no histórico: login, chat, carrinho e marcar aula como vista (muito repetitivo)
    static boolean ignorar(String metodo, String caminho, String query) {
        if (metodo == null || caminho == null) return true;
        if (!"POST".equals(metodo) && !"PUT".equals(metodo) && !"PATCH".equals(metodo) && !"DELETE".equals(metodo)) {
            return true;
        }
        if (caminho.startsWith("/auth/") || caminho.equals("/chat") || caminho.startsWith("/error")
                || caminho.startsWith("/actuator") || caminho.startsWith("/carrinhos")
                || caminho.startsWith("/itens-carrinho") || caminho.matches("/sala/aulas/\\d+/concluida")) {
            return true;
        }
        // Importação: a prévia (confirmar=false) não grava nada, então não registra
        return caminho.endsWith("/importacao") && (query == null || !query.matches("(?:.*&)?confirmar=true(?:&.*)?"));
    }

    // null = não registra
    public static Descricao descrever(String metodo, String caminho, String query, String usuarioTipo) {
        if (ignorar(metodo, caminho, query)) return null;
        // Portal do Professor: as mesmas ações da sala de aula do painel
        // (/docente/turmas/5/aulas -> /planos-de-aula/turma/5/aulas)
        if (caminho.startsWith("/docente/")) {
            caminho = "/planos-de-aula/" + caminho.substring("/docente/".length()).replaceFirst("^turmas/", "turma/");
        }
        String[] p = caminho.replaceAll("^/+|/+$", "").split("/");
        Recurso recurso = RECURSOS.get(p[0]);
        if (recurso == null) {
            return new Descricao("Outros", acaoDoMetodo(metodo), verbo(acaoDoMetodo(metodo)) + " " + caminho,
                    null, null, false);
        }
        String base = p[0];
        String modulo = recurso.modulo();
        Integer num1 = p.length > 1 ? numero(p[1]) : null;

        // ===== Casos especiais =====
        if (caminho.endsWith("/importacao")) {
            if (base.equals("planos-de-aula") && p.length > 2) {
                return new Descricao(modulo, IMPORTOU, "Importou planilha de aulas na turma #" + p[2],
                        "turmas", numero(p[2]), false);
            }
            return new Descricao(modulo, IMPORTOU, "Importou planilha de " + PLANILHAS.getOrDefault(base, base), null, null, false);
        }
        switch (base) {
            case "alunos" -> {
                if ("POST".equals(metodo) && (p.length == 1 || "com-documento".equals(p[1]))) {
                    boolean peloSite = !"funcionario".equals(usuarioTipo);
                    String texto = peloSite ? "Novo cadastro de aluno pelo site" : "Cadastrou aluno";
                    return new Descricao(modulo, CADASTROU, texto, "alunos", null, true);
                }
            }
            case "documentos" -> {
                if ("POST".equals(metodo)) {
                    return new Descricao(modulo, CADASTROU, "Enviou documento de escolaridade", null, null, false);
                }
                if (p.length > 2 && "revisao".equals(p[2])) {
                    return new Descricao(modulo, ALTEROU, "Revisou documento #" + p[1], "documentos", num1, false);
                }
            }
            case "financeiro" -> {
                if (p.length > 1 && "gerar-parcelas".equals(p[1])) {
                    return new Descricao(modulo, CADASTROU, "Gerou parcelas", null, null, false);
                }
                if (p.length > 3 && "parcelas".equals(p[1])) {
                    String texto = "estorno".equals(p[3]) ? "Estornou parcela #" + p[2] : "Registrou pagamento da parcela #" + p[2];
                    return new Descricao(modulo, ALTEROU, texto, "parcelas", numero(p[2]), false);
                }
            }
            case "inscricoes" -> {
                if (p.length > 2 && "turma".equals(p[2])) {
                    return new Descricao(modulo, ALTEROU, "Trocou a turma da inscrição #" + p[1], "inscricoes", num1, false);
                }
                if ("POST".equals(metodo) && p.length == 1 && !"funcionario".equals(usuarioTipo)) {
                    return new Descricao(modulo, CADASTROU, "Fez inscrição em curso pelo site", "inscricoes", null, true);
                }
            }
            case "professores" -> {
                if (p.length > 2 && "acesso".equals(p[2])) {
                    return new Descricao(modulo, ALTEROU, "Enviou o acesso ao Portal do Professor para o professor #" + p[1],
                            "professores", num1, false);
                }
                if (p.length > 2 && "vinculos".equals(p[2])) {
                    return new Descricao(modulo, ALTEROU, "Alterou cursos e disciplinas do professor #" + p[1],
                            "professores", num1, false);
                }
            }
            case "sala" -> {
                if (p.length > 3 && "certificado".equals(p[3])) {
                    return new Descricao(modulo, CADASTROU, "Emitiu certificado da turma #" + p[2], null, null, false);
                }
            }
            case "planos-de-aula" -> {
                Descricao sala = salaDeAula(metodo, p, modulo);
                if (sala != null) return sala;
            }
            default -> {
                // segue para a regra geral
            }
        }

        // ===== Regra geral: POST /x, PUT /x/{id}, DELETE /x/{id} =====
        String acao = acaoDoMetodo(metodo);
        if ("POST".equals(metodo) && p.length == 1) {
            return new Descricao(modulo, CADASTROU, "Cadastrou " + recurso.singular(), base, null, recurso.getterId() != null);
        }
        if (num1 != null) {
            return new Descricao(modulo, acao, verbo(acao) + " " + recurso.singular() + " #" + num1, base, num1, false);
        }
        return new Descricao(modulo, acao, verbo(acao) + " " + recurso.singular(), null, null, false);
    }

    // /planos-de-aula/turma/{t}/aulas, /planos-de-aula/aulas/{id}, /planos-de-aula/avisos/{id}...
    private static Descricao salaDeAula(String metodo, String[] p, String modulo) {
        if (p.length >= 4 && "turma".equals(p[1])) {
            Integer turma = numero(p[2]);
            String t = " da turma #" + p[2];
            return switch (p[3]) {
                case "aulas" -> p.length > 4 && "excluir".equals(p[4])
                        ? new Descricao(modulo, EXCLUIU, "Excluiu aulas EAD" + t, "turmas", turma, false)
                        : new Descricao(modulo, CADASTROU, "Cadastrou aula EAD" + t, "turmas", turma, false);
                case "avisos" -> new Descricao(modulo, CADASTROU, "Publicou aviso no mural" + t, "turmas", turma, false);
                case "copiar" -> new Descricao(modulo, CADASTROU, "Copiou aulas de outra turma para a turma #" + p[2],
                        "turmas", turma, false);
                case "professor" -> new Descricao(modulo, ALTEROU, "Definiu o professor da sala" + t, "turmas", turma, false);
                default -> null;
            };
        }
        if (p.length >= 3 && ("aulas".equals(p[1]) || "avisos".equals(p[1]))) {
            Integer id = numero(p[2]);
            String coisa = "aulas".equals(p[1]) ? "aula EAD #" : "aviso do mural #";
            String alvo = "aulas".equals(p[1]) ? "aulas-ead" : "avisos";
            if (p.length > 3 && "mover".equals(p[3])) {
                return new Descricao(modulo, ALTEROU, "Mudou a ordem da " + coisa + p[2], alvo, id, false);
            }
            String acao = acaoDoMetodo(metodo);
            return new Descricao(modulo, acao, verbo(acao) + " " + coisa + p[2], alvo, id, false);
        }
        return null;
    }

    static String acaoDoMetodo(String metodo) {
        return switch (metodo) {
            case "POST" -> CADASTROU;
            case "DELETE" -> EXCLUIU;
            default -> ALTEROU;
        };
    }

    static String verbo(String acao) {
        return switch (acao) {
            case CADASTROU -> "Cadastrou";
            case EXCLUIU -> "Excluiu";
            case IMPORTOU -> "Importou";
            default -> "Alterou";
        };
    }

    static Integer numero(String texto) {
        if (texto == null || !texto.matches("\\d{1,9}")) return null;
        return Integer.valueOf(texto);
    }

    // Id do registro recém-cadastrado, lido da resposta (ex.: getIdAluno() do aluno salvo)
    public static Integer idDaResposta(Object corpo, String alvo) {
        if (corpo == null || alvo == null) return null;
        Recurso recurso = RECURSOS.get(alvo);
        if (recurso == null || recurso.getterId() == null) return null;
        String campo = recurso.getterId();
        String accessorDeRecord = Character.toLowerCase(campo.charAt(0)) + campo.substring(1);
        for (String nome : new String[]{"get" + campo, accessorDeRecord}) {
            try {
                Method metodo = corpo.getClass().getMethod(nome);
                Object valor = metodo.invoke(corpo);
                if (valor instanceof Number n) return n.intValue();
            } catch (ReflectiveOperationException | RuntimeException ignorado) {
                // tenta o próximo nome
            }
        }
        return null;
    }
}

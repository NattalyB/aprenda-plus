package com.aprendaplus.security;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

// Módulos do painel administrativo e quais rotas da API pertencem a cada um.
// O nível de acesso de cada funcionário diz quais módulos ele pode usar.
public final class Modulos {

    public static final String ALUNOS = "alunos";
    public static final String PROFESSORES = "professores";
    public static final String CURSOS = "cursos";
    public static final String DISCIPLINAS = "disciplinas";
    public static final String PERIODOS = "periodos";
    public static final String TURMAS = "turmas";
    public static final String INSCRICOES = "inscricoes";
    public static final String MATRICULAS = "matriculas";
    public static final String FINANCEIRO = "financeiro";
    public static final String FUNCIONARIOS = "funcionarios";
    // Configuração dos níveis de acesso: exclusivo do Master
    public static final String SISTEMA = "sistema";

    // Módulos que o Master pode liberar para os outros níveis (o "sistema" não entra)
    public static final List<String> LIBERAVEIS = List.of(
            ALUNOS, PROFESSORES, CURSOS, DISCIPLINAS, PERIODOS, TURMAS, INSCRICOES, MATRICULAS, FINANCEIRO, FUNCIONARIOS);

    // Todos os módulos (o que o Master tem)
    public static final List<String> TODOS;

    static {
        java.util.ArrayList<String> todos = new java.util.ArrayList<>(LIBERAVEIS);
        todos.add(SISTEMA);
        TODOS = List.copyOf(todos);
    }

    // Começo do caminho da API -> módulo dono da rota
    private static final Map<String, String> ROTAS = Map.ofEntries(
            Map.entry("/alunos", ALUNOS),
            Map.entry("/carrinhos", ALUNOS),
            Map.entry("/itens-carrinho", ALUNOS),
            Map.entry("/professores", PROFESSORES),
            Map.entry("/curso-professor", PROFESSORES),
            Map.entry("/disciplina-professor", PROFESSORES),
            Map.entry("/turma-professor", PROFESSORES),
            Map.entry("/cursos", CURSOS),
            Map.entry("/disciplinas", DISCIPLINAS),
            Map.entry("/periodos-letivos", PERIODOS),
            Map.entry("/periodo-letivo-curso", PERIODOS),
            Map.entry("/turmas", TURMAS),
            Map.entry("/aulas", TURMAS),
            Map.entry("/planos-de-aula", TURMAS),
            Map.entry("/inscricoes", INSCRICOES),
            Map.entry("/matriculas", MATRICULAS),
            Map.entry("/pagamentos", FINANCEIRO),
            Map.entry("/financeiro", FINANCEIRO),
            Map.entry("/funcionarios", FUNCIONARIOS),
            Map.entry("/niveis-acesso", SISTEMA));

    private Modulos() {
    }

    // Descobre o módulo de uma rota. Rotas desconhecidas devolvem null (só o Master acessa).
    public static String doCaminho(String caminho) {
        if (caminho == null) {
            return null;
        }
        for (Map.Entry<String, String> rota : ROTAS.entrySet()) {
            String inicio = rota.getKey();
            if (caminho.equals(inicio) || caminho.startsWith(inicio + "/")) {
                return rota.getValue();
            }
        }
        return null;
    }

    // Lê "alunos,cursos" (como fica no banco) e devolve só os módulos válidos e liberáveis
    public static Set<String> ler(String texto) {
        Set<String> modulos = new LinkedHashSet<>();
        if (texto == null) {
            return modulos;
        }
        for (String parte : texto.split(",")) {
            String modulo = parte.trim().toLowerCase();
            if (LIBERAVEIS.contains(modulo)) {
                modulos.add(modulo);
            }
        }
        return modulos;
    }

    // Monta o texto salvo no banco, na ordem do menu e sem repetidos
    public static String escrever(java.util.Collection<String> modulos) {
        if (modulos == null) {
            return "";
        }
        Set<String> validos = ler(String.join(",", modulos));
        return String.join(",", LIBERAVEIS.stream().filter(validos::contains).toList());
    }
}

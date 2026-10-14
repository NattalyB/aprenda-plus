package com.aprendaplus.security;

import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class ModulosTest {

    @Test
    void descobreOModuloDeCadaRota() {
        assertEquals("alunos", Modulos.doCaminho("/alunos"));
        assertEquals("alunos", Modulos.doCaminho("/alunos/3"));
        assertEquals("professores", Modulos.doCaminho("/curso-professor/1/2"));
        assertEquals("periodos", Modulos.doCaminho("/periodo-letivo-curso"));
        assertEquals("financeiro", Modulos.doCaminho("/pagamentos/9"));
        assertEquals("financeiro", Modulos.doCaminho("/financeiro/resumo"));
        assertEquals("sistema", Modulos.doCaminho("/niveis-acesso/4"));
        assertEquals("alunos", Modulos.doCaminho("/documentos/4/revisao"));
        assertEquals("aulas", Modulos.doCaminho("/planos-de-aula/turma/5/aulas"));
        assertEquals("aulas", Modulos.doCaminho("/aulas/3"));
    }

    @Test
    void rotaDesconhecidaOuParecidaNaoTemModulo() {
        assertNull(Modulos.doCaminho("/alunosx"));
        assertNull(Modulos.doCaminho("/qualquer"));
        assertNull(Modulos.doCaminho(null));
    }

    @Test
    void leSoModulosValidosENuncaOSistema() {
        Set<String> lidos = Modulos.ler(" Alunos ,cursos,,sistema,xpto");
        assertEquals(Set.of("alunos", "cursos"), lidos);
        assertTrue(Modulos.ler(null).isEmpty());
    }

    @Test
    void escreveNaOrdemDoMenuSemRepetir() {
        assertEquals("alunos,turmas,matriculas",
                Modulos.escrever(Arrays.asList("matriculas", "turmas", "alunos", "alunos", "sistema")));
        assertEquals("", Modulos.escrever(null));
    }

    @Test
    void masterTemTodosOsModulosInclusiveSistema() {
        assertEquals(Modulos.LIBERAVEIS.size() + 1, Modulos.TODOS.size());
        assertTrue(Modulos.TODOS.contains(Modulos.SISTEMA));
        assertFalse(Modulos.LIBERAVEIS.contains(Modulos.SISTEMA));
        assertEquals(List.of("alunos", "professores", "cursos", "disciplinas", "periodos", "turmas", "aulas",
                "inscricoes", "matriculas", "financeiro", "funcionarios"), Modulos.LIBERAVEIS);
    }
}

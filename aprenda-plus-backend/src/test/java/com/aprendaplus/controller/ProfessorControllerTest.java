package com.aprendaplus.controller;

import com.aprendaplus.dto.VinculosProfessor;
import com.aprendaplus.entity.Professor;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.service.ProfessorService;
import com.aprendaplus.service.RecuperacaoSenhaService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ProfessorController.class)
class ProfessorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProfessorService professorService;

    @MockitoBean
    private RecuperacaoSenhaService recuperacaoSenhaService;

    @Test
    void enviaOAcessoAoPortal() throws Exception {
        when(recuperacaoSenhaService.enviarAcessoProfessor(3)).thenReturn(
                new RecuperacaoSenhaService.AcessoProfessor("https://site/#/redefinir-senha?token=abc", false, "r@x.com"));

        mockMvc.perform(post("/professores/3/acesso"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.link").value("https://site/#/redefinir-senha?token=abc"))
                .andExpect(jsonPath("$.emailEnviado").value(false));
    }

    @Test
    void naoMandaASenhaNasRespostas() throws Exception {
        Professor p = new Professor();
        p.setIdProfessor(3);
        p.setSenhaHash("hash-secreto");
        when(professorService.buscarPorId(3)).thenReturn(p);

        mockMvc.perform(get("/professores/3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.senhaHash").doesNotExist())
                .andExpect(jsonPath("$.acessoCriado").value(true));
    }

    // Cadastro completo e válido (passa em todas as validações da entidade Professor)
    private static final String PROFESSOR_VALIDO = """
            {
              "nomeCompleto": "Novo Professor",
              "telefone": "(51) 98888-8888",
              "email": "prof@teste.com",
              "dataNascimento": "1985-03-20",
              "cpf": "98765432100",
              "rua": "Rua das Flores",
              "numero": "50",
              "cep": "92000-000",
              "bairro": "Centro",
              "cidade": "Canoas",
              "estado": "RS"
            }
            """;

    private Professor professorSalvo() {
        Professor professor = new Professor();
        professor.setIdProfessor(1);
        professor.setNomeCompleto("Novo Professor");
        professor.setEmail("prof@teste.com");
        professor.setCpf("98765432100");
        return professor;
    }

    @Test
    void deveRetornarListaDeProfessores() throws Exception {
        Professor professor = new Professor();
        professor.setIdProfessor(1);
        professor.setNomeCompleto("Professor Teste");

        when(professorService.listarTodos()).thenReturn(Arrays.asList(professor));

        mockMvc.perform(get("/professores"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nomeCompleto").value("Professor Teste"));
    }

    @Test
    void deveBuscarProfessorPorId() throws Exception {
        when(professorService.buscarPorId(1)).thenReturn(professorSalvo());

        mockMvc.perform(get("/professores/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("prof@teste.com"));
    }

    @Test
    void deveCriarProfessorComSucesso() throws Exception {
        when(professorService.salvar(any(Professor.class))).thenReturn(professorSalvo());

        mockMvc.perform(post("/professores")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(PROFESSOR_VALIDO))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nomeCompleto").value("Novo Professor"));
    }

    @Test
    void deveRecusarProfessorComUfInvalida() throws Exception {
        String professorUfInvalida = PROFESSOR_VALIDO.replace("\"RS\"", "\"RS1\"");

        mockMvc.perform(post("/professores")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(professorUfInvalida))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros.estado").exists());

        verify(professorService, never()).salvar(any(Professor.class));
    }

    @Test
    void deveAtualizarProfessor() throws Exception {
        when(professorService.salvar(any(Professor.class))).thenReturn(professorSalvo());

        mockMvc.perform(put("/professores/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(PROFESSOR_VALIDO))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idProfessor").value(1));
    }

    @Test
    void deveExcluirProfessor() throws Exception {
        mockMvc.perform(delete("/professores/1"))
                .andExpect(status().isNoContent());

        verify(professorService).deletar(1);
    }

    // ===== Cursos e disciplinas do professor =====

    @Test
    void deveBuscarCursosEDisciplinasDoProfessor() throws Exception {
        when(professorService.buscarVinculos(1)).thenReturn(new VinculosProfessor(List.of(1, 3), List.of(10, 25)));

        mockMvc.perform(get("/professores/1/vinculos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cursos[1]").value(3))
                .andExpect(jsonPath("$.disciplinas[0]").value(10));
    }

    @Test
    void deveSalvarCursosEDisciplinasDoProfessor() throws Exception {
        VinculosProfessor esperado = new VinculosProfessor(List.of(1), List.of(10, 11));
        when(professorService.salvarVinculos(eq(1), eq(esperado))).thenReturn(esperado);

        mockMvc.perform(put("/professores/1/vinculos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"cursos\": [1], \"disciplinas\": [10, 11] }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.disciplinas.length()").value(2));

        verify(professorService).salvarVinculos(eq(1), eq(esperado));
    }

    @Test
    void vinculoInvalidoDevolveMensagemClara() throws Exception {
        when(professorService.salvarVinculos(eq(1), any(VinculosProfessor.class)))
                .thenThrow(new RegraDeNegocioException("A disciplina \"Redes\" não pertence a nenhum dos cursos selecionados."));

        mockMvc.perform(put("/professores/1/vinculos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"cursos\": [1], \"disciplinas\": [20] }"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("A disciplina \"Redes\" não pertence a nenhum dos cursos selecionados."));
    }
}

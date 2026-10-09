package com.aprendaplus.controller;

import com.aprendaplus.entity.Aluno;
import com.aprendaplus.service.AlunoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AlunoController.class)
class AlunoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AlunoService alunoService;

    // Cadastro completo e válido (passa em todas as validações da entidade Aluno)
    private static final String ALUNO_VALIDO = """
            {
              "nomeCompleto": "Novo Aluno",
              "telefone": "(51) 99999-9999",
              "email": "aluno@teste.com",
              "dataNascimento": "2000-05-10",
              "cpf": "12345678900",
              "senhaHash": "senha123",
              "rua": "Av. Brasil",
              "numero": "100",
              "cep": "92000-000",
              "bairro": "Centro",
              "cidade": "Canoas",
              "estado": "RS"
            }
            """;

    private Aluno alunoSalvo() {
        Aluno aluno = new Aluno();
        aluno.setIdAluno(1);
        aluno.setNomeCompleto("Novo Aluno");
        aluno.setEmail("aluno@teste.com");
        aluno.setCpf("12345678900");
        aluno.setSenhaHash("$2a$10$hashDeExemplo");
        return aluno;
    }

    @Test
    void deveRetornarListaDeAlunos() throws Exception {
        Aluno aluno = new Aluno();
        aluno.setIdAluno(1);
        aluno.setNomeCompleto("Aluno Teste");

        when(alunoService.listarTodos()).thenReturn(Arrays.asList(aluno));

        mockMvc.perform(get("/alunos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nomeCompleto").value("Aluno Teste"));
    }

    @Test
    void deveBuscarAlunoPorId() throws Exception {
        when(alunoService.buscarPorId(1)).thenReturn(alunoSalvo());

        mockMvc.perform(get("/alunos/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("aluno@teste.com"));
    }

    @Test
    void deveCriarAlunoComSucesso() throws Exception {
        when(alunoService.salvar(any(Aluno.class))).thenReturn(alunoSalvo());

        mockMvc.perform(post("/alunos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ALUNO_VALIDO))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nomeCompleto").value("Novo Aluno"));
    }

    @Test
    void naoDeveDevolverOHashDaSenha() throws Exception {
        when(alunoService.salvar(any(Aluno.class))).thenReturn(alunoSalvo());

        mockMvc.perform(post("/alunos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ALUNO_VALIDO))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.senhaHash").doesNotExist());
    }

    @Test
    void deveRecusarAlunoComCpfInvalido() throws Exception {
        String alunoCpfInvalido = ALUNO_VALIDO.replace("12345678900", "123abc");

        mockMvc.perform(post("/alunos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(alunoCpfInvalido))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros.cpf").exists());

        verify(alunoService, never()).salvar(any(Aluno.class));
    }

    @Test
    void deveRecusarAlunoSemCamposObrigatorios() throws Exception {
        mockMvc.perform(post("/alunos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nomeCompleto\": \"Sem Dados\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("Verifique os dados preenchidos."))
                .andExpect(jsonPath("$.erros.email").exists())
                .andExpect(jsonPath("$.erros.cpf").exists());
    }

    @Test
    void deveRecusarCadastroSemSenha() throws Exception {
        String alunoSemSenha = ALUNO_VALIDO.replace("\"senhaHash\": \"senha123\",", "");

        mockMvc.perform(post("/alunos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(alunoSemSenha))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros.senhaHash").value("A senha é obrigatória."));
    }

    @Test
    void deveAtualizarAlunoSemInformarNovaSenha() throws Exception {
        String alunoSemSenha = ALUNO_VALIDO.replace("\"senhaHash\": \"senha123\",", "");
        when(alunoService.salvar(any(Aluno.class))).thenReturn(alunoSalvo());

        mockMvc.perform(put("/alunos/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(alunoSemSenha))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idAluno").value(1));
    }

    @Test
    void deveExcluirAluno() throws Exception {
        mockMvc.perform(delete("/alunos/1"))
                .andExpect(status().isNoContent());

        verify(alunoService).deletar(1);
    }
}

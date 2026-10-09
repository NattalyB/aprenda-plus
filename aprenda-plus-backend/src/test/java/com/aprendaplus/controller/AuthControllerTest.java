package com.aprendaplus.controller;

import com.aprendaplus.entity.Aluno;
import com.aprendaplus.entity.Funcionario;
import com.aprendaplus.repository.AlunoRepository;
import com.aprendaplus.repository.FuncionarioRepository;
import com.aprendaplus.security.JwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
class AuthControllerTest {

    private static final BCryptPasswordEncoder ENCODER = new BCryptPasswordEncoder();

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AlunoRepository alunoRepository;

    @MockitoBean
    private FuncionarioRepository funcionarioRepository;

    @MockitoBean
    private JwtUtil jwtUtil;

    private String login(String email, String senha) {
        return "{ \"email\": \"" + email + "\", \"senha\": \"" + senha + "\" }";
    }

    private Aluno alunoCadastrado() {
        Aluno aluno = new Aluno();
        aluno.setIdAluno(7);
        aluno.setNomeCompleto("Maria Aluna");
        aluno.setEmail("maria@teste.com");
        aluno.setSenhaHash(ENCODER.encode("senha123"));
        return aluno;
    }

    private Funcionario funcionarioCadastrado() {
        Funcionario funcionario = new Funcionario();
        funcionario.setIdFuncionario(1);
        funcionario.setNomeCompleto("Admin Teste");
        funcionario.setEmail("admin@teste.com");
        funcionario.setCargo("administrativo");
        funcionario.setSenhaHash(ENCODER.encode("admin123"));
        return funcionario;
    }

    // ===== Login de aluno =====

    @Test
    void deveFazerLoginDeAlunoComSenhaCorreta() throws Exception {
        when(alunoRepository.findByEmail("maria@teste.com")).thenReturn(alunoCadastrado());
        // O token do aluno precisa ser gerado com o papel ALUNO
        when(jwtUtil.gerarToken(eq("maria@teste.com"), eq(7), eq("ALUNO"))).thenReturn("token-aluno");

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(login("maria@teste.com", "senha123")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("token-aluno"))
                .andExpect(jsonPath("$.idAluno").value(7))
                .andExpect(jsonPath("$.nome").value("Maria Aluna"));
    }

    @Test
    void deveRecusarLoginDeAlunoComSenhaErrada() throws Exception {
        when(alunoRepository.findByEmail("maria@teste.com")).thenReturn(alunoCadastrado());

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(login("maria@teste.com", "senhaErrada")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erro").value("E-mail ou senha inválidos"));
    }

    @Test
    void deveRecusarLoginDeEmailNaoCadastrado() throws Exception {
        when(alunoRepository.findByEmail(anyString())).thenReturn(null);

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(login("ninguem@teste.com", "qualquer")))
                .andExpect(status().isUnauthorized());
    }

    // ===== Login de funcionário (admin) =====

    @Test
    void deveFazerLoginDeFuncionarioComSenhaCorreta() throws Exception {
        when(funcionarioRepository.findByEmail("admin@teste.com")).thenReturn(funcionarioCadastrado());
        // O token do funcionário precisa ser gerado com o papel ADMIN
        when(jwtUtil.gerarToken(eq("admin@teste.com"), eq(1), eq("ADMIN"))).thenReturn("token-admin");

        mockMvc.perform(post("/auth/login-funcionario")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(login("admin@teste.com", "admin123")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("token-admin"))
                .andExpect(jsonPath("$.idFuncionario").value(1))
                .andExpect(jsonPath("$.cargo").value("administrativo"));
    }

    @Test
    void deveRecusarLoginDeFuncionarioComSenhaErrada() throws Exception {
        when(funcionarioRepository.findByEmail("admin@teste.com")).thenReturn(funcionarioCadastrado());

        mockMvc.perform(post("/auth/login-funcionario")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(login("admin@teste.com", "errada")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void alunoNaoConsegueEntrarPeloLoginDeFuncionario() throws Exception {
        // E-mail de aluno não existe na tabela de funcionários
        when(funcionarioRepository.findByEmail("maria@teste.com")).thenReturn(null);

        mockMvc.perform(post("/auth/login-funcionario")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(login("maria@teste.com", "senha123")))
                .andExpect(status().isUnauthorized());
    }
}

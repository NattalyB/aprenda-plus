package com.aprendaplus.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.aprendaplus.entity.Aluno;
import com.aprendaplus.entity.Professor;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.AlunoRepository;
import com.aprendaplus.repository.ProfessorRepository;
import com.aprendaplus.security.JwtUtil;
import com.aprendaplus.service.AlunoService;
import com.aprendaplus.service.GoogleAuthService;
import com.aprendaplus.service.GoogleAuthService.UsuarioGoogle;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

@WebMvcTest(GoogleLoginController.class)
class GoogleLoginControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private GoogleAuthService google;

    @MockitoBean
    private AlunoRepository alunoRepository;

    @MockitoBean
    private ProfessorRepository professorRepository;

    @MockitoBean
    private AlunoService alunoService;

    @MockitoBean
    private JwtUtil jwtUtil;

    private static final String CREDENCIAL = "{\"credencial\": \"cred-google\"}";
    private static final String DADOS_DO_ALUNO = """
            {
              "nomeCompleto": "Maria Silva",
              "telefone": "(51) 99999-9999",
              "email": "maria@gmail.com",
              "dataNascimento": "2000-05-10",
              "cpf": "12345678900",
              "rua": "Av. Brasil",
              "numero": "100",
              "cep": "92000-000",
              "bairro": "Centro",
              "cidade": "Canoas",
              "estado": "RS"
            }
            """;

    private Aluno aluno(String status) {
        Aluno a = new Aluno();
        a.setIdAluno(7);
        a.setNomeCompleto("Maria Silva");
        a.setEmail("maria@gmail.com");
        a.setStatus(status);
        return a;
    }

    private Claims passe(String papel, String email) {
        Claims claims = mock(Claims.class);
        when(claims.get("papel", String.class)).thenReturn(papel);
        when(claims.getSubject()).thenReturn(email);
        return claims;
    }

    private MockMultipartFile parteAluno() {
        return new MockMultipartFile("aluno", "", MediaType.APPLICATION_JSON_VALUE, DADOS_DO_ALUNO.getBytes());
    }

    @Test
    void contaAoFrontSeOBotaoDoGoogleDeveAparecer() throws Exception {
        when(google.configurado()).thenReturn(true);
        when(google.idCliente()).thenReturn("123.apps.googleusercontent.com");

        mockMvc.perform(get("/auth/google/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ativo").value(true))
                .andExpect(jsonPath("$.idCliente").value("123.apps.googleusercontent.com"));
    }

    @Test
    void alunoComContaEntraDireto() throws Exception {
        when(google.verificar("cred-google")).thenReturn(new UsuarioGoogle("maria@gmail.com", "Maria"));
        when(alunoRepository.findFirstByEmailIgnoreCase("maria@gmail.com")).thenReturn(aluno("ativo"));
        when(jwtUtil.gerarToken("maria@gmail.com", 7, "ALUNO")).thenReturn("token-aluno");

        mockMvc.perform(post("/auth/google/aluno").contentType(MediaType.APPLICATION_JSON).content(CREDENCIAL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("token-aluno"))
                .andExpect(jsonPath("$.idAluno").value(7))
                .andExpect(jsonPath("$.nome").value("Maria Silva"))
                .andExpect(jsonPath("$.cadastroPendente").doesNotExist());
    }

    @Test
    void alunoNovoRecebeOPasseParaCompletarOCadastro() throws Exception {
        when(google.verificar("cred-google")).thenReturn(new UsuarioGoogle("nova@gmail.com", "Nova Aluna"));
        when(jwtUtil.gerarTokenCadastroGoogle("nova@gmail.com", "Nova Aluna")).thenReturn("passe-30-min");

        mockMvc.perform(post("/auth/google/aluno").contentType(MediaType.APPLICATION_JSON).content(CREDENCIAL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cadastroPendente").value(true))
                .andExpect(jsonPath("$.tokenCadastro").value("passe-30-min"))
                .andExpect(jsonPath("$.email").value("nova@gmail.com"))
                .andExpect(jsonPath("$.nome").value("Nova Aluna"))
                .andExpect(jsonPath("$.token").doesNotExist());
    }

    @Test
    void alunoBloqueadoNaoEntraPeloGoogle() throws Exception {
        when(google.verificar("cred-google")).thenReturn(new UsuarioGoogle("maria@gmail.com", "Maria"));
        when(alunoRepository.findFirstByEmailIgnoreCase("maria@gmail.com")).thenReturn(aluno("bloqueado"));

        mockMvc.perform(post("/auth/google/aluno").contentType(MediaType.APPLICATION_JSON).content(CREDENCIAL))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.erro").exists());
        verify(jwtUtil, never()).gerarToken(anyString(), any(), anyString());
    }

    @Test
    void credencialRecusadaPeloGoogleNaoEntra() throws Exception {
        when(google.verificar(any())).thenThrow(new RegraDeNegocioException("Não foi possível confirmar o login com o Google. Tente de novo."));

        mockMvc.perform(post("/auth/google/aluno").contentType(MediaType.APPLICATION_JSON).content(CREDENCIAL))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erro").value("Não foi possível confirmar o login com o Google. Tente de novo."));
        mockMvc.perform(post("/auth/google/professor").contentType(MediaType.APPLICATION_JSON).content(CREDENCIAL))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void completaOCadastroComOEmailDoPasseESemSenhaConhecida() throws Exception {
        // O passe é montado antes do when(): criar um mock dentro de outro when() confunde o Mockito
        Claims passeValido = passe(JwtUtil.PAPEL_CADASTRO_GOOGLE, "nova@gmail.com");
        when(jwtUtil.validarToken("passe-30-min")).thenReturn(passeValido);
        Aluno salvo = aluno("ativo");
        salvo.setEmail("nova@gmail.com");
        when(alunoService.cadastrarComDocumento(any(Aluno.class), eq("certificado.pdf"), any())).thenReturn(salvo);
        when(jwtUtil.gerarToken("nova@gmail.com", 7, "ALUNO")).thenReturn("token-novo");

        MockMultipartFile documento = new MockMultipartFile("documento", "certificado.pdf", "application/pdf", "%PDF-1.4".getBytes());
        mockMvc.perform(multipart("/auth/google/cadastro").file(parteAluno()).file(documento).param("tokenCadastro", "passe-30-min"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("token-novo"))
                .andExpect(jsonPath("$.idAluno").value(7));

        ArgumentCaptor<Aluno> enviado = ArgumentCaptor.forClass(Aluno.class);
        verify(alunoService).cadastrarComDocumento(enviado.capture(), eq("certificado.pdf"), any());
        // O e-mail vem do passe do Google, nunca do formulário
        assertThat(enviado.getValue().getEmail()).isEqualTo("nova@gmail.com");
        assertThat(enviado.getValue().getIdAluno()).isNull();
        assertThat(enviado.getValue().getSenhaHash()).hasSize(72);
    }

    @Test
    void passeVencidoOuDeOutroTipoNaoCadastra() throws Exception {
        when(jwtUtil.validarToken("vencido")).thenThrow(new JwtException("expirado"));
        Claims deAluno = passe("ALUNO", "maria@gmail.com");
        Claims semEmail = passe(JwtUtil.PAPEL_CADASTRO_GOOGLE, null);
        when(jwtUtil.validarToken("token-de-aluno")).thenReturn(deAluno);
        when(jwtUtil.validarToken("sem-email")).thenReturn(semEmail);

        for (String passe : new String[] {"vencido", "token-de-aluno", "sem-email"}) {
            mockMvc.perform(multipart("/auth/google/cadastro").file(parteAluno()).param("tokenCadastro", passe))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.mensagem").value(GoogleLoginController.PASSE_INVALIDO));
        }
        verify(alunoService, never()).cadastrarComDocumento(any(), any(), any());
    }

    @Test
    void emailQueJaTemCadastroNaoCriaOutraConta() throws Exception {
        Claims passeDeQuemJaTemConta = passe(JwtUtil.PAPEL_CADASTRO_GOOGLE, "maria@gmail.com");
        when(jwtUtil.validarToken("passe")).thenReturn(passeDeQuemJaTemConta);
        when(alunoRepository.existsByEmailIgnoreCase("maria@gmail.com")).thenReturn(true);

        mockMvc.perform(multipart("/auth/google/cadastro").file(parteAluno()).param("tokenCadastro", "passe"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value(GoogleLoginController.JA_CADASTRADO));
        verify(alunoService, never()).cadastrarComDocumento(any(), any(), any());
    }

    @Test
    void cadastroPeloGoogleTambemValidaOsDados() throws Exception {
        MockMultipartFile incompleto = new MockMultipartFile("aluno", "", MediaType.APPLICATION_JSON_VALUE,
                "{\"nomeCompleto\": \"Maria\", \"email\": \"maria@gmail.com\"}".getBytes());
        mockMvc.perform(multipart("/auth/google/cadastro").file(incompleto).param("tokenCadastro", "passe"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros.cpf").exists());
    }

    @Test
    void professorEntraComOMesmoEmailDoCadastro() throws Exception {
        Professor professor = new Professor();
        professor.setIdProfessor(3);
        professor.setNomeCompleto("Roberto Fagundes");
        professor.setEmail("roberto@aprendaplus.com");
        professor.setStatus("ativo");
        when(google.verificar("cred-google")).thenReturn(new UsuarioGoogle("roberto@aprendaplus.com", "Roberto"));
        when(professorRepository.findFirstByEmailIgnoreCase("roberto@aprendaplus.com")).thenReturn(professor);
        when(jwtUtil.gerarToken("roberto@aprendaplus.com", 3, "PROFESSOR")).thenReturn("token-professor");

        mockMvc.perform(post("/auth/google/professor").contentType(MediaType.APPLICATION_JSON).content(CREDENCIAL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("token-professor"))
                .andExpect(jsonPath("$.idProfessor").value(3))
                .andExpect(jsonPath("$.nome").value("Roberto Fagundes"));
    }

    @Test
    void professorSemCadastroOuBloqueadoNaoEntra() throws Exception {
        when(google.verificar("cred-google")).thenReturn(new UsuarioGoogle("x@gmail.com", "X"));
        mockMvc.perform(post("/auth/google/professor").contentType(MediaType.APPLICATION_JSON).content(CREDENCIAL))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erro").value(GoogleLoginController.PROFESSOR_NAO_ENCONTRADO));

        Professor inativo = new Professor();
        inativo.setIdProfessor(4);
        inativo.setEmail("x@gmail.com");
        inativo.setStatus("inativo");
        when(professorRepository.findFirstByEmailIgnoreCase("x@gmail.com")).thenReturn(inativo);
        mockMvc.perform(post("/auth/google/professor").contentType(MediaType.APPLICATION_JSON).content(CREDENCIAL))
                .andExpect(status().isForbidden());
    }

    @Test
    void pedidoSemCorpoNaoQuebra() throws Exception {
        when(google.verificar(null)).thenThrow(new RegraDeNegocioException("Não foi possível confirmar o login com o Google. Tente de novo."));
        mockMvc.perform(post("/auth/google/aluno").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }
}

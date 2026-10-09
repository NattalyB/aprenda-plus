package com.aprendaplus.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.*;

// Testa as regras de acesso da API: o que é público, o que o aluno pode
// e o que só o admin pode. Usa um JwtUtil de verdade, com chave de teste.
class AuthInterceptorTest {

    private final JwtUtil jwtUtil = new JwtUtil("chave-usada-somente-nos-testes-com-mais-de-32-caracteres");
    private final AuthInterceptor interceptor = new AuthInterceptor(jwtUtil);

    private final String tokenAluno = jwtUtil.gerarToken("aluno@teste.com", 7, "ALUNO");
    private final String tokenAdmin = jwtUtil.gerarToken("admin@teste.com", 1, "ADMIN");

    private MockHttpServletResponse response;

    // Simula uma requisição passando pelo interceptor.
    // Devolve true se ela foi liberada e false se foi bloqueada.
    private boolean requisicao(String metodo, String caminho, String token, MockHttpServletRequest[] guardar)
            throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(metodo, caminho);
        if (token != null) {
            request.addHeader("Authorization", "Bearer " + token);
        }
        if (guardar != null) {
            guardar[0] = request;
        }
        response = new MockHttpServletResponse();
        return interceptor.preHandle(request, response, new Object());
    }

    private boolean requisicao(String metodo, String caminho, String token) throws Exception {
        return requisicao(metodo, caminho, token, null);
    }

    // ===== Rotas públicas (sem login) =====

    @Test
    void visitantePodeVerCursosETurmas() throws Exception {
        assertTrue(requisicao("GET", "/cursos", null));
        assertTrue(requisicao("GET", "/cursos/3", null));
        assertTrue(requisicao("GET", "/turmas", null));
    }

    @Test
    void visitantePodeSeCadastrarEFazerLogin() throws Exception {
        assertTrue(requisicao("POST", "/alunos", null));
        assertTrue(requisicao("POST", "/auth/login", null));
        assertTrue(requisicao("POST", "/auth/login-funcionario", null));
    }

    @Test
    void preVerificacaoDoNavegadorSempreLiberada() throws Exception {
        assertTrue(requisicao("OPTIONS", "/alunos", null));
    }

    @Test
    void verificacaoDeSaudeDoServidorLiberada() throws Exception {
        assertTrue(requisicao("GET", "/actuator/health", null));
    }

    // ===== Sem login ou com token inválido =====

    @Test
    void visitanteNaoPodeListarAlunos() throws Exception {
        assertFalse(requisicao("GET", "/alunos", null));
        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("Faça login para continuar."));
    }

    @Test
    void visitanteNaoPodeAlterarCursos() throws Exception {
        assertFalse(requisicao("POST", "/cursos", null));
        assertFalse(requisicao("DELETE", "/cursos/1", null));
        assertEquals(401, response.getStatus());
    }

    @Test
    void tokenInvalidoEhRecusado() throws Exception {
        assertFalse(requisicao("GET", "/alunos", "token-inventado"));
        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("Sua sessão expirou"));
    }

    @Test
    void cabecalhoSemBearerEhRecusado() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/alunos");
        request.addHeader("Authorization", tokenAdmin); // faltou o "Bearer "
        response = new MockHttpServletResponse();

        assertFalse(interceptor.preHandle(request, response, new Object()));
        assertEquals(401, response.getStatus());
    }

    // ===== Aluno logado =====

    @Test
    void alunoPodeUsarOProprioCarrinho() throws Exception {
        assertTrue(requisicao("GET", "/carrinhos/meu", tokenAluno));
        assertTrue(requisicao("GET", "/itens-carrinho/meus", tokenAluno));
        assertTrue(requisicao("POST", "/itens-carrinho", tokenAluno));
        assertTrue(requisicao("DELETE", "/itens-carrinho/5", tokenAluno));
    }

    @Test
    void alunoPodeCriarInscricao() throws Exception {
        assertTrue(requisicao("POST", "/inscricoes", tokenAluno));
    }

    @Test
    void idEPapelDoAlunoFicamDisponiveisParaOsControllers() throws Exception {
        MockHttpServletRequest[] guardada = new MockHttpServletRequest[1];

        requisicao("GET", "/carrinhos/meu", tokenAluno, guardada);

        assertEquals(7, guardada[0].getAttribute("usuarioId"));
        assertEquals("ALUNO", guardada[0].getAttribute("usuarioPapel"));
    }

    @Test
    void alunoNaoPodeAcessarAreaAdministrativa() throws Exception {
        assertFalse(requisicao("GET", "/alunos", tokenAluno));
        assertEquals(403, response.getStatus());

        assertFalse(requisicao("GET", "/carrinhos", tokenAluno));      // todos os carrinhos
        assertFalse(requisicao("GET", "/itens-carrinho", tokenAluno)); // todos os itens
        assertFalse(requisicao("GET", "/inscricoes", tokenAluno));     // todas as inscrições
        assertFalse(requisicao("DELETE", "/cursos/1", tokenAluno));
        assertEquals(403, response.getStatus());
    }

    // ===== Admin logado =====

    @Test
    void adminPodeAcessarTudo() throws Exception {
        assertTrue(requisicao("GET", "/alunos", tokenAdmin));
        assertTrue(requisicao("PUT", "/alunos/1", tokenAdmin));
        assertTrue(requisicao("DELETE", "/cursos/1", tokenAdmin));
        assertTrue(requisicao("GET", "/inscricoes", tokenAdmin));
        assertTrue(requisicao("GET", "/matriculas", tokenAdmin));
    }
}

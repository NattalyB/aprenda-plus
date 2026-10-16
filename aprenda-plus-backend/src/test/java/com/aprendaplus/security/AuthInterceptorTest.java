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
        assertTrue(requisicao("POST", "/auth/esqueci-senha", null));
        assertTrue(requisicao("POST", "/auth/redefinir-senha", null));
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

    // ===== Área do aluno =====

    @Test
    void alunoVeAsPropriasInscricoesETrocaDeTurma() throws Exception {
        assertTrue(requisicao("GET", "/inscricoes/minhas", tokenAluno));
        assertTrue(requisicao("PUT", "/inscricoes/15/turma", tokenAluno));
    }

    @Test
    void alunoNaoEditaInscricaoPorOutraRota() throws Exception {
        assertFalse(requisicao("PUT", "/inscricoes/15", tokenAluno));
        assertFalse(requisicao("PUT", "/inscricoes/abc/turma", tokenAluno));
        assertFalse(requisicao("DELETE", "/inscricoes/15", tokenAluno));
        assertEquals(403, response.getStatus());
    }

    @Test
    void visitanteVeTurmasDisponiveisMasNaoAsInscricoes() throws Exception {
        assertTrue(requisicao("GET", "/turmas/curso/2/disponiveis", null));
        assertFalse(requisicao("GET", "/inscricoes/minhas", null));
        assertEquals(401, response.getStatus());
    }

    @Test
    void alunoNaoMexeEmFuncionarios() throws Exception {
        assertFalse(requisicao("GET", "/funcionarios", tokenAluno));
        assertFalse(requisicao("POST", "/funcionarios", tokenAluno));
        assertEquals(403, response.getStatus());
    }

    // ===== Níveis de acesso dos funcionários =====

    // Funcionário 2 = Administrativo (alunos, cursos e funcionários);
    // 3 = Financeiro (inscrições e matrículas); 1 = Master; 4 = conta bloqueada.
    private final PermissoesDoFuncionario permissoes = id -> switch (id) {
        case 1 -> java.util.Set.copyOf(Modulos.TODOS);
        case 2 -> java.util.Set.of("alunos", "cursos", "funcionarios");
        case 3 -> java.util.Set.of("inscricoes", "matriculas");
        case 5 -> java.util.Set.of("aulas");
        default -> null;
    };

    private final AuthInterceptor comNiveis = new AuthInterceptor(jwtUtil, permissoes);

    private boolean doFuncionario(int id, String metodo, String caminho) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(metodo, caminho);
        request.addHeader("Authorization", "Bearer " + jwtUtil.gerarToken("f@teste.com", id, "ADMIN"));
        response = new MockHttpServletResponse();
        return comNiveis.preHandle(request, response, new Object());
    }

    @Test
    void funcionarioAlteraSoOsModulosDoNivelDele() throws Exception {
        assertTrue(doFuncionario(3, "PUT", "/inscricoes/5"));
        assertTrue(doFuncionario(3, "POST", "/matriculas"));
        assertTrue(doFuncionario(2, "DELETE", "/alunos/4"));

        assertFalse(doFuncionario(3, "DELETE", "/turmas/1"));
        assertEquals(403, response.getStatus());
        assertTrue(response.getContentAsString().contains("Seu nível de acesso não permite usar este módulo."));
        assertFalse(doFuncionario(2, "POST", "/turmas"));
    }

    @Test
    void consultaEhLivreParaAEquipeMenosFuncionariosESistema() throws Exception {
        assertTrue(doFuncionario(3, "GET", "/alunos"));
        assertTrue(doFuncionario(3, "GET", "/professores/2"));

        assertFalse(doFuncionario(3, "GET", "/funcionarios"));
        assertFalse(doFuncionario(3, "GET", "/niveis-acesso"));
        assertTrue(doFuncionario(2, "GET", "/funcionarios"));
    }

    @Test
    void listaDeNiveisLiberadaParaQuemCadastraFuncionarios() throws Exception {
        assertTrue(doFuncionario(2, "GET", "/niveis-acesso"));
        assertFalse(doFuncionario(2, "POST", "/niveis-acesso"));
        assertFalse(doFuncionario(2, "GET", "/niveis-acesso/3"));
    }

    @Test
    void todoFuncionarioVeOProprioNivel() throws Exception {
        assertTrue(doFuncionario(3, "GET", "/niveis-acesso/meu"));
    }

    @Test
    void masterPodeTudoInclusiveRotasSemModulo() throws Exception {
        assertTrue(doFuncionario(1, "POST", "/niveis-acesso"));
        assertTrue(doFuncionario(1, "DELETE", "/funcionarios/3"));
        assertTrue(doFuncionario(1, "GET", "/rota-sem-modulo"));
        assertFalse(doFuncionario(3, "GET", "/rota-sem-modulo"));
    }

    @Test
    void contaBloqueadaOuExcluidaPerdeOAcessoNaHora() throws Exception {
        assertFalse(doFuncionario(4, "GET", "/alunos"));
        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("não está mais ativa"));
    }

    @Test
    void alunoVeAsPropriasParcelasMasNaoOFinanceiroDoPainel() throws Exception {
        assertTrue(requisicao("GET", "/financeiro/meus", tokenAluno));
        assertFalse(requisicao("GET", "/financeiro/parcelas", tokenAluno));
        assertFalse(requisicao("PUT", "/financeiro/parcelas/3/pagamento", tokenAluno));
        assertEquals(403, response.getStatus());
    }

    @Test
    void baixaDeParcelaExigeOModuloFinanceiro() throws Exception {
        assertFalse(doFuncionario(2, "PUT", "/financeiro/parcelas/3/pagamento"));
        assertTrue(doFuncionario(1, "PUT", "/financeiro/parcelas/3/pagamento"));
        assertTrue(doFuncionario(3, "GET", "/financeiro/resumo"));
    }

    // ===== Documento de escolaridade =====

    @Test
    void visitantePodeSeCadastrarComODocumento() throws Exception {
        assertTrue(requisicao("POST", "/alunos/com-documento", null));
        assertFalse(requisicao("GET", "/documentos/situacao", null));
        assertEquals(401, response.getStatus());
    }

    @Test
    void alunoEnviaEVeOsPropriosDocumentosMasNaoRevisa() throws Exception {
        assertTrue(requisicao("GET", "/documentos/meus", tokenAluno));
        assertTrue(requisicao("POST", "/documentos/meus", tokenAluno));
        assertTrue(requisicao("GET", "/documentos/4/arquivo", tokenAluno));

        assertFalse(requisicao("GET", "/documentos/aluno/7", tokenAluno));
        assertFalse(requisicao("PUT", "/documentos/4/revisao", tokenAluno));
        assertEquals(403, response.getStatus());
    }

    @Test
    void revisarDocumentoExigeOModuloAlunos() throws Exception {
        assertTrue(doFuncionario(2, "PUT", "/documentos/4/revisao"));
        assertFalse(doFuncionario(3, "PUT", "/documentos/4/revisao"));
        assertTrue(doFuncionario(3, "GET", "/documentos/situacao"));
    }

    // ===== Sala de aula EAD =====

    @Test
    void alunoUsaASalaDeAula() throws Exception {
        assertTrue(requisicao("GET", "/sala/minhas-turmas", tokenAluno));
        assertTrue(requisicao("GET", "/sala/turmas/5", tokenAluno));
        assertTrue(requisicao("PUT", "/sala/aulas/9/concluida", tokenAluno));
        assertTrue(requisicao("DELETE", "/sala/aulas/9/concluida", tokenAluno));
        assertTrue(requisicao("POST", "/sala/turmas/5/certificado", tokenAluno));

        assertFalse(requisicao("POST", "/sala/turmas/5", tokenAluno));
        assertFalse(requisicao("GET", "/sala/aulas/9/concluida", tokenAluno));
        assertFalse(requisicao("DELETE", "/sala/turmas/5/certificado", tokenAluno));
        assertFalse(requisicao("PATCH", "/sala/aulas/9/concluida", tokenAluno));
        assertFalse(requisicao("GET", "/planos-de-aula/turma/5", tokenAluno));
        assertEquals(403, response.getStatus());
    }

    @Test
    void visitanteNaoEntraNaSalaMasValidaCertificado() throws Exception {
        assertFalse(requisicao("GET", "/sala/minhas-turmas", null));
        assertEquals(401, response.getStatus());
        assertTrue(requisicao("GET", "/certificados/ABCD-EFGH-JKLM", null));
        assertFalse(requisicao("DELETE", "/certificados/ABCD-EFGH-JKLM", null));
    }

    @Test
    void montarAsAulasExigeOModuloSalaDeAula() throws Exception {
        assertFalse(doFuncionario(2, "POST", "/planos-de-aula/turma/5/aulas"));
        assertEquals(403, response.getStatus());
        assertTrue(doFuncionario(2, "GET", "/planos-de-aula/turma/5"));
        assertTrue(doFuncionario(1, "POST", "/planos-de-aula/turma/5/aulas"));
        assertTrue(doFuncionario(5, "PUT", "/planos-de-aula/aulas/3/mover"));
    }
}

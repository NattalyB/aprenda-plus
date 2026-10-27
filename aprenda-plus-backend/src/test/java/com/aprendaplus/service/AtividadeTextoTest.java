package com.aprendaplus.service;

import com.aprendaplus.service.AtividadeTexto.Descricao;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AtividadeTextoTest {

    private static Descricao d(String metodo, String caminho) {
        return AtividadeTexto.descrever(metodo, caminho, null, "funcionario");
    }

    @Test
    void ignoraConsultasLoginChatCarrinhoEAulaVista() {
        assertNull(d("GET", "/alunos"));
        assertNull(d("OPTIONS", "/alunos"));
        assertNull(d("POST", "/auth/login"));
        assertNull(d("POST", "/chat"));
        assertNull(d("POST", "/itens-carrinho"));
        assertNull(d("DELETE", "/carrinhos/3"));
        assertNull(d("PUT", "/sala/aulas/4/concluida"));
        assertNull(d("POST", "/error"));
        assertNull(d(null, "/alunos"));
        assertNull(d("POST", null));
    }

    @Test
    void regraGeralCadastrarAlterarExcluir() {
        Descricao novo = d("POST", "/alunos");
        assertEquals("Alunos", novo.modulo());
        assertEquals("cadastrou", novo.acao());
        assertEquals("Cadastrou aluno", novo.texto());
        assertEquals("alunos", novo.alvo());
        assertTrue(novo.idDaResposta());

        Descricao alterou = d("PUT", "/periodos-letivos/7");
        assertEquals("Períodos letivos", alterou.modulo());
        assertEquals("alterou", alterou.acao());
        assertEquals("Alterou período letivo #7", alterou.texto());
        assertEquals("periodos-letivos", alterou.alvo());
        assertEquals(7, alterou.registroId());
        assertFalse(alterou.idDaResposta());

        Descricao excluiu = d("DELETE", "/treinamentos/3");
        assertEquals("excluiu", excluiu.acao());
        assertEquals("Excluiu treinamento #3", excluiu.texto());

        Descricao vinculo = d("POST", "/curso-professor");
        assertEquals("Cadastrou vínculo de professor e curso", vinculo.texto());
        assertFalse(vinculo.idDaResposta());

        assertEquals("Alterou nível de acesso", d("PATCH", "/niveis-acesso/abc").texto());
        assertEquals("Outros", d("POST", "/qualquer/coisa").modulo());
        assertEquals("Excluiu /qualquer/1", d("DELETE", "/qualquer/1").texto());
    }

    @Test
    void importacaoSoQuandoConfirma() {
        assertNull(AtividadeTexto.descrever("POST", "/alunos/importacao", null, "funcionario"));
        assertNull(AtividadeTexto.descrever("POST", "/alunos/importacao", "confirmar=false", "funcionario"));
        Descricao alunos = AtividadeTexto.descrever("POST", "/alunos/importacao", "confirmar=true", "funcionario");
        assertEquals("importou", alunos.acao());
        assertEquals("Importou planilha de alunos", alunos.texto());
        Descricao aulas = AtividadeTexto.descrever("POST", "/planos-de-aula/turma/6/aulas/importacao", "x=1&confirmar=true", "funcionario");
        assertEquals("Importou planilha de aulas na turma #6", aulas.texto());
        assertEquals(6, aulas.registroId());
    }

    @Test
    void casosDoSiteEDosAlunos() {
        assertEquals("Novo cadastro de aluno pelo site", AtividadeTexto.descrever("POST", "/alunos", null, "visitante").texto());
        assertEquals("Novo cadastro de aluno pelo site",
                AtividadeTexto.descrever("POST", "/alunos/com-documento", null, "visitante").texto());
        assertEquals("Fez inscrição em curso pelo site", AtividadeTexto.descrever("POST", "/inscricoes", null, "aluno").texto());
        assertEquals("Cadastrou inscrição", d("POST", "/inscricoes").texto());
        assertEquals("Trocou a turma da inscrição #5", AtividadeTexto.descrever("PUT", "/inscricoes/5/turma", null, "aluno").texto());
        assertEquals("Enviou documento de escolaridade", AtividadeTexto.descrever("POST", "/documentos/meus", null, "aluno").texto());
        assertEquals("Revisou documento #8", d("PUT", "/documentos/8/revisao").texto());
        assertEquals("Emitiu certificado da turma #3", AtividadeTexto.descrever("POST", "/sala/turmas/3/certificado", null, "aluno").texto());
        assertEquals("Alterou certificado", AtividadeTexto.descrever("PUT", "/sala/outra", null, "aluno").texto());
    }

    @Test
    void financeiroEProfessores() {
        assertEquals("Gerou parcelas", d("POST", "/financeiro/gerar-parcelas").texto());
        assertEquals("Registrou pagamento da parcela #4", d("PUT", "/financeiro/parcelas/4/pagamento").texto());
        assertEquals("Estornou parcela #4", d("PUT", "/financeiro/parcelas/4/estorno").texto());
        assertEquals("Alterou parcela", d("PUT", "/financeiro/outra").texto());
        Descricao vinculos = d("PUT", "/professores/2/vinculos");
        assertEquals("Alterou cursos e disciplinas do professor #2", vinculos.texto());
        assertEquals("professores", vinculos.alvo());
        assertEquals("Alterou professor #2", d("PUT", "/professores/2").texto());
    }

    @Test
    void salaDeAulaEad() {
        assertEquals("Cadastrou aula EAD da turma #5", d("POST", "/planos-de-aula/turma/5/aulas").texto());
        assertEquals("Excluiu aulas EAD da turma #5", d("POST", "/planos-de-aula/turma/5/aulas/excluir").texto());
        assertEquals("Publicou aviso no mural da turma #5", d("POST", "/planos-de-aula/turma/5/avisos").texto());
        assertEquals("Copiou aulas de outra turma para a turma #5", d("POST", "/planos-de-aula/turma/5/copiar").texto());
        assertEquals("Definiu o professor da sala da turma #5", d("PUT", "/planos-de-aula/turma/5/professor").texto());
        assertEquals("Cadastrou sala de aula", d("POST", "/planos-de-aula/turma/5/outra").texto());
        Descricao aula = d("PUT", "/planos-de-aula/aulas/9");
        assertEquals("Alterou aula EAD #9", aula.texto());
        assertEquals("aulas-ead", aula.alvo());
        assertEquals("Mudou a ordem da aula EAD #9", d("PUT", "/planos-de-aula/aulas/9/mover").texto());
        assertEquals("Excluiu aviso do mural #2", d("DELETE", "/planos-de-aula/avisos/2").texto());
        assertEquals("Alterou sala de aula #4", d("PUT", "/planos-de-aula/4").texto());
    }

    @Test
    void portalDoProfessorEAcesso() {
        Descricao aula = AtividadeTexto.descrever("POST", "/docente/turmas/5/aulas", null, "professor");
        assertEquals("Sala de aula (EAD)", aula.modulo());
        assertEquals("Cadastrou aula EAD da turma #5", aula.texto());
        assertEquals("Alterou aula EAD #9", AtividadeTexto.descrever("PUT", "/docente/aulas/9", null, "professor").texto());
        assertEquals("Excluiu aviso do mural #2", AtividadeTexto.descrever("DELETE", "/docente/avisos/2", null, "professor").texto());
        assertEquals("Publicou aviso no mural da turma #5",
                AtividadeTexto.descrever("POST", "/docente/turmas/5/avisos", null, "professor").texto());
        assertNull(AtividadeTexto.descrever("POST", "/auth/login-professor", null, "visitante"));
        Descricao acesso = d("POST", "/professores/3/acesso");
        assertEquals("Enviou o acesso ao Portal do Professor para o professor #3", acesso.texto());
        assertEquals(3, acesso.registroId());
    }

    public static class ComGetter {
        public Integer getIdAluno() { return 12; }
        public String getNomeCompleto() { return "Ana"; }
    }

    public record ComRecord(Integer idCurso) {
    }

    public static class SemId {
        public Long getIdCurso() { throw new IllegalStateException("x"); }
    }

    @Test
    void leOIdDoQueFoiCadastrado() {
        assertEquals(12, AtividadeTexto.idDaResposta(new ComGetter(), "alunos"));
        assertEquals(3, AtividadeTexto.idDaResposta(new ComRecord(3), "cursos"));
        assertNull(AtividadeTexto.idDaResposta(new SemId(), "cursos"));
        assertNull(AtividadeTexto.idDaResposta(new ComGetter(), "cursos"));
        assertNull(AtividadeTexto.idDaResposta(new ComGetter(), "financeiro"));
        assertNull(AtividadeTexto.idDaResposta(new ComGetter(), "xpto"));
        assertNull(AtividadeTexto.idDaResposta(null, "alunos"));
        assertNull(AtividadeTexto.idDaResposta(new ComGetter(), null));
        assertNull(AtividadeTexto.numero("12345678901"));
    }
}

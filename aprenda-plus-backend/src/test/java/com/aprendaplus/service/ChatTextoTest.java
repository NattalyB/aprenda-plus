package com.aprendaplus.service;

import com.aprendaplus.service.ChatTexto.CursoResumo;
import com.aprendaplus.service.ChatTexto.Mensagem;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class ChatTextoTest {

    private static final CursoResumo ESI = new CursoResumo(1, "Engenharia de Software", "superior", "Presencial", 3200,
            new BigDecimal("48000.00"), 71, "Cartão; Boleto", "Desenvolvimento de sistemas e programação",
            List.of("Turma ESI-A - Manhã · 12 vagas"));
    private static final CursoResumo DADOS = new CursoResumo(2, "Ciência de Dados", "superior", "EAD", 2400,
            new BigDecimal("12000"), 28, null, "Dados, estatística e machine learning", List.of());
    private static final CursoResumo MKT = new CursoResumo(3, "Marketing Digital", "profissionalizante", "Híbrido", 400,
            new BigDecimal("1500"), 1, "Pix", null, null);
    private static final List<CursoResumo> CURSOS = List.of(ESI, DADOS, MKT);

    @Test
    void catalogoTrazPrecoTurmasECategoria() {
        String texto = ChatTexto.instrucoes(CURSOS);
        assertTrue(texto.contains("[[curso:ID]]"));
        assertTrue(texto.contains("- ID 1: Engenharia de Software | curso superior | modalidade: Presencial | 3200 horas"));
        assertTrue(texto.contains("R$ 48.000,00 no total ou 71x de R$ 676,06"));
        assertTrue(texto.contains("Turmas com inscrições abertas: Turma ESI-A - Manhã · 12 vagas"));
        assertTrue(texto.contains("ID 3: Marketing Digital | curso profissionalizante"));
        assertTrue(texto.contains("R$ 1.500,00 | pagamento: Pix"));
        assertEquals("(nenhum curso cadastrado no momento)\n", ChatTexto.catalogo(List.of()));
        assertEquals("preço sob consulta", ChatTexto.preco(new CursoResumo(9, "X", null, null, null, null, null, null, null, null)));
        assertEquals("livre", ChatTexto.categoria("livre"));
    }

    @Test
    void corpoDoGeminiLevaHistoricoEEscapaOTexto() {
        String corpo = ChatTexto.corpoGemini("regra \"um\"\n", List.of(new Mensagem("aluno", "oi"),
                new Mensagem("assistente", "Olá!"), new Mensagem("aluno", " ")), "tab\taqui\\");
        assertTrue(corpo.startsWith("{\"systemInstruction\":{\"parts\":[{\"text\":\"regra \\\"um\\\"\\n\"}]}"));
        assertTrue(corpo.contains("{\"role\":\"user\",\"parts\":[{\"text\":\"oi\"}]},{\"role\":\"model\",\"parts\":[{\"text\":\"Olá!\"}]}"));
        assertTrue(corpo.endsWith("{\"role\":\"user\",\"parts\":[{\"text\":\"tab\\taqui\\\\\"}]}],\"generationConfig\":{\"temperature\":0.4}}"));
        assertTrue(ChatTexto.corpoGemini("x", null, "y").contains("\"contents\":[{\"role\":\"user\""));
        assertEquals("\\u0001", ChatTexto.json("\u0001"));
        assertEquals("", ChatTexto.json(null));
    }

    @Test
    void leOTextoDaRespostaDoGemini() {
        String corpo = "{\"candidates\": [{\"content\": {\"parts\": [{\"text\": \"Olá \\u00e9 \\\"bom\\\"\\n\"},"
                + "{\"text\": \"- item\"}],\"role\":\"model\"}}],\"usageMetadata\":{}}";
        assertEquals("Olá é \"bom\"\n- item", ChatTexto.textoDaResposta(corpo));
        assertNull(ChatTexto.textoDaResposta("{\"error\":{\"message\":\"text\"}}"));
        assertNull(ChatTexto.textoDaResposta("{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"  \"}]}}]}"));
        assertNull(ChatTexto.textoDaResposta(null));
        assertNull(ChatTexto.textoDaResposta("{\"candidates\":[{\"text\":\"sem fim"));
    }

    @Test
    void marcacoesViramBotoesESaemDoTexto() {
        String resposta = "Veja **Engenharia de Software** [[curso:1]], [[ curso : 2 ]] e [[curso:99]]. [[curso:1]]";
        assertEquals(List.of(1, 2), ChatTexto.cursosCitados(resposta, Set.of(1, 2, 3)));
        assertEquals(List.of(1, 2, 99), ChatTexto.cursosCitados(resposta, null));
        assertEquals("Veja **Engenharia de Software**, e.", ChatTexto.semMarcacoes(resposta));
        assertEquals(List.of(), ChatTexto.cursosCitados(null, Set.of()));
        assertEquals("", ChatTexto.semMarcacoes(null));
        assertEquals(List.of(), ChatTexto.cursosCitados("[[curso:99999999999]]", null));
    }

    @Test
    void modoBasicoRespondePorAssunto() {
        assertTrue(ChatTexto.respostaOffline("quanto custa engenharia de software?", CURSOS)
                .contains("**Engenharia de Software** [[curso:1]]: R$ 48.000,00 no total ou 71x de R$ 676,06 (Cartão; Boleto)"));
        assertTrue(ChatTexto.respostaOffline("como funciona o pagamento?", CURSOS).contains("Minhas inscrições"));
        assertTrue(ChatTexto.respostaOffline("Tem certificado?", CURSOS).contains("certificado de conclusão"));
        assertTrue(ChatTexto.respostaOffline("como faço a inscrição", CURSOS).contains("Adicionar ao carrinho"));
        assertTrue(ChatTexto.respostaOffline("quais cursos são EAD?", CURSOS).contains("[[curso:2]]"));
        assertTrue(ChatTexto.respostaOffline("tem curso ead?", List.of(ESI)).contains("Me diga a área"));
        assertTrue(ChatTexto.respostaOffline("quero estudar programação", CURSOS).contains("[[curso:1]]"));
        assertTrue(ChatTexto.respostaOffline("gosto de dados e estatistica", CURSOS).contains("[[curso:2]]"));
        assertTrue(ChatTexto.respostaOffline("oi", CURSOS).startsWith("Olá!"));
        assertTrue(ChatTexto.respostaOffline("bla bla", null).startsWith("Posso te ajudar a escolher um curso!"));
    }
}

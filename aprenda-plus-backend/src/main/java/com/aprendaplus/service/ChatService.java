package com.aprendaplus.service;

import com.aprendaplus.dto.ChatPergunta;
import com.aprendaplus.dto.ChatResposta;
import com.aprendaplus.dto.TurmaDisponivel;
import com.aprendaplus.entity.Curso;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.service.ChatTexto.CursoResumo;
import com.aprendaplus.service.ChatTexto.Mensagem;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.LongSupplier;

// Assistente virtual do site de vendas, com IA (Google Gemini, plano gratuito).
// A chave fica só no servidor (GEMINI_API_KEY). Sem chave, ou se a IA falhar / passar do limite grátis,
// o assistente continua respondendo no modo básico (palavras-chave), para o site nunca ficar sem resposta.
@Service
public class ChatService {

    private static final Logger LOG = LoggerFactory.getLogger(ChatService.class);
    static final String URL_GEMINI = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent";
    static final int MAX_CARACTERES_PERGUNTA = 500;
    static final int MAX_MENSAGENS_HISTORICO = 10;
    static final long CATALOGO_VALIDO_POR_MS = 5 * 60 * 1000L;

    private final CursoService cursoService;
    private final TurmaService turmaService;
    private final String chave;
    private final String modelo;
    private final HttpClient cliente;
    private final LongSupplier relogio;

    private List<CursoResumo> catalogo;
    private long catalogoCarregadoEm;

    @Autowired
    public ChatService(CursoService cursoService, TurmaService turmaService,
                       @Value("${gemini.api-key:}") String chave,
                       @Value("${gemini.modelo:gemini-flash-latest}") String modelo) {
        this(cursoService, turmaService, chave, modelo,
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build(), System::currentTimeMillis);
    }

    ChatService(CursoService cursoService, TurmaService turmaService, String chave, String modelo,
                HttpClient cliente, LongSupplier relogio) {
        this.cursoService = cursoService;
        this.turmaService = turmaService;
        this.chave = chave == null ? "" : chave.trim();
        this.modelo = modelo == null || modelo.isBlank() ? "gemini-flash-latest" : modelo.trim();
        this.cliente = cliente;
        this.relogio = relogio;
    }

    public boolean iaConfigurada() {
        return !chave.isEmpty();
    }

    public ChatResposta responder(ChatPergunta pergunta) {
        String texto = pergunta == null || pergunta.mensagem() == null ? "" : pergunta.mensagem().trim();
        if (texto.isEmpty()) {
            throw new RegraDeNegocioException("Escreva a sua pergunta.");
        }
        if (texto.length() > MAX_CARACTERES_PERGUNTA) {
            throw new RegraDeNegocioException("A pergunta pode ter no máximo " + MAX_CARACTERES_PERGUNTA + " caracteres.");
        }

        if (ChatTexto.pedeAtendente(texto)) {
            return new ChatResposta(ChatTexto.RESPOSTA_ATENDENTE, List.of(), "basico", true);
        }

        List<CursoResumo> cursos = catalogo();
        Set<Integer> ids = new HashSet<>();
        cursos.forEach(c -> ids.add(c.id()));

        String daIa = iaConfigurada() ? perguntarAoGemini(cursos, historico(pergunta), texto) : null;
        String bruta = daIa != null ? daIa : ChatTexto.respostaOffline(texto, cursos);
        return new ChatResposta(ChatTexto.semMarcacoes(bruta), ChatTexto.cursosCitados(bruta, ids),
                daIa != null ? "ia" : "basico", ChatTexto.citaAtendente(bruta));
    }

    // Últimas mensagens da conversa, cada uma cortada no limite de tamanho
    static List<Mensagem> historico(ChatPergunta pergunta) {
        List<Mensagem> lista = new ArrayList<>();
        if (pergunta.historico() == null) return lista;
        for (ChatPergunta.Mensagem m : pergunta.historico()) {
            if (m == null || m.texto() == null || m.texto().isBlank()) continue;
            String texto = m.texto().trim();
            if (texto.length() > 1500) texto = texto.substring(0, 1500);
            lista.add(new Mensagem("assistente".equals(m.autor()) ? "assistente" : "aluno", texto));
        }
        int inicio = Math.max(0, lista.size() - MAX_MENSAGENS_HISTORICO);
        return new ArrayList<>(lista.subList(inicio, lista.size()));
    }

    // Devolve o texto da IA, ou null se não deu certo (aí entra o modo básico)
    String perguntarAoGemini(List<CursoResumo> cursos, List<Mensagem> historico, String texto) {
        try {
            String url = String.format(URL_GEMINI, URLEncoder.encode(modelo, StandardCharsets.UTF_8));
            HttpRequest requisicao = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(25))
                    .header("Content-Type", "application/json")
                    .header("x-goog-api-key", chave)
                    .POST(HttpRequest.BodyPublishers.ofString(
                            ChatTexto.corpoGemini(ChatTexto.instrucoes(cursos), historico, texto), StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> resposta = cliente.send(requisicao, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (resposta.statusCode() != 200) {
                // 429 = passou do limite do plano gratuito; 4xx/5xx = chave inválida, modelo fora do ar...
                LOG.warn("Gemini respondeu {}: {}", resposta.statusCode(), resumo(resposta.body()));
                return null;
            }
            String conteudo = ChatTexto.textoDaResposta(resposta.body());
            if (conteudo == null) {
                LOG.warn("Gemini não devolveu texto: {}", resumo(resposta.body()));
            }
            return conteudo;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return null;
        } catch (Exception e) {
            LOG.warn("Falha ao falar com o Gemini: {}", e.getMessage());
            return null;
        }
    }

    // Cursos e turmas abertas, guardados por alguns minutos para não consultar o banco a cada mensagem
    synchronized List<CursoResumo> catalogo() {
        long agora = relogio.getAsLong();
        if (catalogo != null && agora - catalogoCarregadoEm < CATALOGO_VALIDO_POR_MS) {
            return catalogo;
        }
        List<CursoResumo> lista = new ArrayList<>();
        for (Curso c : cursoService.listarTodos()) {
            List<String> turmas = new ArrayList<>();
            try {
                for (TurmaDisponivel t : turmaService.listarDisponiveisDoCurso(c.getIdCurso())) {
                    turmas.add(descreverTurma(t));
                }
            } catch (RuntimeException e) {
                LOG.warn("Não foi possível listar as turmas do curso {}: {}", c.getIdCurso(), e.getMessage());
            }
            lista.add(new CursoResumo(c.getIdCurso(), c.getNome(), c.getCategoria(), c.getModalidade(),
                    c.getCargaHoraria(), c.getValor(), c.getNumeroParcelas(), c.getFormasPagamento(),
                    c.getDescricao(), turmas));
        }
        catalogo = lista;
        catalogoCarregadoEm = agora;
        return catalogo;
    }

    // "Turma ESI-A - Manhã (Presencial, Seg a Sex 8h) · 12 vagas"
    static String descreverTurma(TurmaDisponivel t) {
        StringBuilder s = new StringBuilder(t.nome() == null ? "Turma" : t.nome());
        List<String> detalhes = new ArrayList<>();
        if (t.modalidade() != null && !t.modalidade().isBlank()) detalhes.add(t.modalidade());
        if (t.diasHorarios() != null && !t.diasHorarios().isBlank()) detalhes.add(t.diasHorarios());
        if (t.periodoLetivo() != null && !t.periodoLetivo().isBlank()) detalhes.add(t.periodoLetivo());
        if (!detalhes.isEmpty()) s.append(" (").append(String.join(", ", detalhes)).append(")");
        long vagas = t.vagasRestantes();
        s.append(" · ").append(vagas <= 0 ? "sem vagas (lista de espera)" : vagas == 1 ? "1 vaga" : vagas + " vagas");
        return s.toString();
    }

    private static String resumo(String corpo) {
        if (corpo == null) return "";
        String s = corpo.replaceAll("\\s+", " ");
        return s.length() > 300 ? s.substring(0, 300) + "..." : s;
    }
}

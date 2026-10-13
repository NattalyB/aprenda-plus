package com.aprendaplus.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

// Envio de e-mails pela API do Brevo (plano gratuito: 300 e-mails por dia).
// Sem a chave configurada (BREVO_API_KEY), o sistema funciona normalmente e só não envia.
// O e-mail sai depois que a operação é gravada no banco e nunca trava a resposta da API.
@Service
public class EmailService {

    private static final Logger LOG = LoggerFactory.getLogger(EmailService.class);
    static final String URL_BREVO = "https://api.brevo.com/v3/smtp/email";

    private final String chave;
    private final String remetente;
    private final String site;
    private final HttpClient cliente;

    // Com dois construtores, o Spring precisa saber qual usar: é este
    @Autowired
    public EmailService(@Value("${brevo.api-key:}") String chave,
                        @Value("${email.remetente:}") String remetente,
                        @Value("${email.site:https://nattalyb.github.io/aprenda-plus/}") String site) {
        this(chave, remetente, site, HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build());
    }

    EmailService(String chave, String remetente, String site, HttpClient cliente) {
        this.chave = chave == null ? "" : chave.trim();
        this.remetente = remetente == null ? "" : remetente.trim();
        this.site = site;
        this.cliente = cliente;
    }

    public boolean configurado() {
        return !chave.isEmpty() && !remetente.isEmpty();
    }

    // ===== Mensagens do sistema =====

    public void matriculaConfirmada(String email, String nome, String curso, String turma) {
        enviar(email, nome, "Sua matrícula no AprendaPlus foi confirmada! 🎉",
                "Matrícula confirmada",
                "<p>Olá, <strong>" + html(primeiroNome(nome)) + "</strong>!</p>"
                        + "<p>Seu pagamento foi aprovado e a sua matrícula no curso <strong>" + html(curso) + "</strong>"
                        + (turma == null ? "" : " (" + html(turma) + ")") + " está confirmada.</p>"
                        + "<p>Entre no site com o mesmo e-mail e senha do cadastro para acompanhar o seu curso.</p>",
                "Acessar minha área");
    }

    public void vagaLiberada(String email, String nome, String curso, String turma) {
        enviar(email, nome, "Abriu uma vaga para você no AprendaPlus",
                "Você saiu da lista de espera",
                "<p>Olá, <strong>" + html(primeiroNome(nome)) + "</strong>!</p>"
                        + "<p>Abriu uma vaga na turma <strong>" + html(turma) + "</strong> do curso <strong>"
                        + html(curso) + "</strong>. Sua inscrição agora está <strong>pendente de pagamento</strong>.</p>",
                "Ver minhas inscrições");
    }

    public void documentoRecusado(String email, String nome, String motivo) {
        enviar(email, nome, "Precisamos de um novo documento",
                "Documento não aprovado",
                "<p>Olá, <strong>" + html(primeiroNome(nome)) + "</strong>!</p>"
                        + "<p>O documento de escolaridade que você enviou não pôde ser aprovado.</p>"
                        + (motivo == null || motivo.isBlank() ? "" : "<p><strong>Motivo:</strong> " + html(motivo) + "</p>")
                        + "<p>Envie um novo arquivo em <strong>Minhas inscrições</strong> para continuarmos a sua matrícula.</p>",
                "Enviar novo documento");
    }

    // ===== Envio =====

    void enviar(String email, String nome, String assunto, String titulo, String corpo, String botao) {
        if (email == null || email.isBlank()) {
            return;
        }
        if (!configurado()) {
            LOG.info("E-mail não enviado (Brevo não configurado): \"{}\" para {}", assunto, email);
            return;
        }
        String json = "{\"sender\":{\"name\":\"AprendaPlus\",\"email\":\"" + json(remetente) + "\"},"
                + "\"to\":[{\"email\":\"" + json(email) + "\",\"name\":\"" + json(nome == null ? email : nome) + "\"}],"
                + "\"subject\":\"" + json(assunto) + "\","
                + "\"htmlContent\":\"" + json(modelo(titulo, corpo, botao)) + "\"}";
        HttpRequest requisicao = HttpRequest.newBuilder(URI.create(URL_BREVO))
                .timeout(Duration.ofSeconds(15))
                .header("api-key", chave)
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

        Runnable disparar = () -> cliente.sendAsync(requisicao, HttpResponse.BodyHandlers.ofString())
                .whenComplete((resposta, erro) -> {
                    if (erro != null) {
                        LOG.warn("Falha ao enviar e-mail para {}: {}", email, erro.getMessage());
                    } else if (resposta.statusCode() >= 300) {
                        LOG.warn("Brevo recusou o e-mail para {} (status {}): {}", email, resposta.statusCode(), resposta.body());
                    }
                });

        // Só envia se a operação for mesmo gravada (se der erro e voltar atrás, não manda nada)
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    disparar.run();
                }
            });
        } else {
            disparar.run();
        }
    }

    // Layout simples com a cor da marca
    String modelo(String titulo, String corpo, String botao) {
        return "<div style=\"font-family:Arial,sans-serif;background:#f3f4f6;padding:24px\">"
                + "<div style=\"max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden\">"
                + "<div style=\"background:#001e42;color:#ffffff;padding:18px 24px;font-size:20px;font-weight:bold\">"
                + "Aprenda<span style=\"color:#00b4d8\">Plus</span></div>"
                + "<div style=\"padding:24px;color:#1f2937;font-size:15px;line-height:1.6\">"
                + "<h1 style=\"font-size:20px;color:#0b2239;margin:0 0 12px\">" + html(titulo) + "</h1>"
                + corpo
                + "<p style=\"margin:24px 0 8px\"><a href=\"" + html(site) + "\" style=\"background:#00b4d8;color:#001e42;"
                + "padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold\">" + html(botao) + "</a></p>"
                + "</div><div style=\"padding:14px 24px;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb\">"
                + "E-mail automático do AprendaPlus. Projeto acadêmico +PraTi / Codifica.</div></div></div>";
    }

    static String primeiroNome(String nome) {
        return nome == null || nome.isBlank() ? "aluno(a)" : nome.trim().split("\\s+")[0];
    }

    static String html(String texto) {
        if (texto == null) {
            return "";
        }
        return texto.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    static String json(String texto) {
        StringBuilder sb = new StringBuilder();
        for (char c : texto.toCharArray()) {
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.toString();
    }
}

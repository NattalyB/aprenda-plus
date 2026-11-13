package com.aprendaplus.service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Locale;
import java.util.Set;
import java.util.function.Function;
import java.util.function.LongSupplier;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.aprendaplus.exception.RegraDeNegocioException;

// Login com o Google: confere com o próprio Google se a "credencial" que o navegador recebeu é verdadeira,
// foi feita para o AprendaPlus (nosso ID de cliente), não expirou e tem o e-mail confirmado.
// Só depois disso o sistema confia no e-mail. Sem o ID de cliente configurado, o login com Google fica desligado.
@Service
public class GoogleAuthService {

    private static final Logger LOG = LoggerFactory.getLogger(GoogleAuthService.class);
    private static final String ENDERECO = "https://oauth2.googleapis.com/tokeninfo?id_token=";
    private static final Set<String> EMISSORES = Set.of("accounts.google.com", "https://accounts.google.com");

    static final String NAO_CONFIGURADO = "O login com o Google não está disponível no momento.";
    static final String NAO_CONFIRMADO = "Não foi possível confirmar o login com o Google. Tente de novo.";
    static final String SEM_CONEXAO = "Não foi possível falar com o Google agora. Tente de novo em instantes.";
    static final String EMAIL_NAO_VERIFICADO = "O seu e-mail ainda não foi confirmado no Google. Confirme-o e tente de novo.";

    public record UsuarioGoogle(String email, String nome) { }

    record RespostaHttp(int status, String corpo) { }

    private final String idCliente;
    private final Function<String, RespostaHttp> consulta;
    private final LongSupplier relogio;

    @Autowired
    public GoogleAuthService(@Value("${google.client-id:}") String idCliente) {
        this(idCliente, consultaPadrao(), System::currentTimeMillis);
    }

    GoogleAuthService(String idCliente, Function<String, RespostaHttp> consulta, LongSupplier relogio) {
        this.idCliente = idCliente == null ? "" : idCliente.trim();
        this.consulta = consulta;
        this.relogio = relogio;
    }

    public boolean configurado() {
        return !idCliente.isEmpty();
    }

    // O ID de cliente é público (vai na própria página); o front usa para desenhar o botão do Google
    public String idCliente() {
        return idCliente;
    }

    public UsuarioGoogle verificar(String credencial) {
        if (!configurado()) {
            throw new RegraDeNegocioException(NAO_CONFIGURADO);
        }
        if (credencial == null || credencial.isBlank()) {
            throw new RegraDeNegocioException(NAO_CONFIRMADO);
        }
        RespostaHttp resposta;
        try {
            resposta = consulta.apply(credencial.trim());
        } catch (RuntimeException e) {
            LOG.warn("Falha ao consultar o Google: {}", e.getMessage());
            throw new RegraDeNegocioException(SEM_CONEXAO);
        }
        if (resposta == null || resposta.status() != 200 || resposta.corpo() == null) {
            throw new RegraDeNegocioException(NAO_CONFIRMADO);
        }
        String corpo = resposta.corpo();
        String email = valor(corpo, "email");
        long expiraEm;
        try {
            expiraEm = Long.parseLong(valor(corpo, "exp")) * 1000L;
        } catch (NumberFormatException | NullPointerException e) {
            throw new RegraDeNegocioException(NAO_CONFIRMADO);
        }
        if (!idCliente.equals(valor(corpo, "aud"))
                || !EMISSORES.contains(String.valueOf(valor(corpo, "iss")))
                || expiraEm <= relogio.getAsLong()
                || email == null || email.isBlank()) {
            throw new RegraDeNegocioException(NAO_CONFIRMADO);
        }
        if (!"true".equals(valor(corpo, "email_verified"))) {
            throw new RegraDeNegocioException(EMAIL_NAO_VERIFICADO);
        }
        String nome = valor(corpo, "name");
        return new UsuarioGoogle(email.trim().toLowerCase(Locale.ROOT), nome == null ? "" : nome.trim());
    }

    // A resposta do Google é um JSON simples, só com textos ("chave": "valor")
    static String valor(String json, String chave) {
        Matcher m = Pattern.compile("\"" + Pattern.quote(chave) + "\"\\s*:\\s*(\"((?:[^\"\\\\]|\\\\.)*)\"|true|false|-?\\d+)")
                .matcher(json);
        if (!m.find()) {
            return null;
        }
        return m.group(2) == null ? m.group(1) : desescapar(m.group(2));
    }

    private static String desescapar(String s) {
        StringBuilder r = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c != '\\' || i + 1 >= s.length()) {
                r.append(c);
                continue;
            }
            char n = s.charAt(++i);
            switch (n) {
                case 'n' -> r.append('\n');
                case 't' -> r.append('\t');
                case 'u' -> {
                    if (i + 4 < s.length()) {
                        r.append((char) Integer.parseInt(s.substring(i + 1, i + 5), 16));
                        i += 4;
                    }
                }
                default -> r.append(n);
            }
        }
        return r.toString();
    }

    private static Function<String, RespostaHttp> consultaPadrao() {
        HttpClient cliente = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
        return credencial -> {
            HttpRequest pedido = HttpRequest.newBuilder(URI.create(ENDERECO + URLEncoder.encode(credencial, StandardCharsets.UTF_8)))
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();
            try {
                HttpResponse<String> r = cliente.send(pedido, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
                return new RespostaHttp(r.statusCode(), r.body());
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("Consulta interrompida", e);
            }
        };
    }
}

package com.aprendaplus.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.service.GoogleAuthService.RespostaHttp;

class GoogleAuthServiceTest {

    private static final String CLIENTE = "123-abc.apps.googleusercontent.com";
    private static final long AGORA = 1_800_000_000_000L;
    private static final String RESPOSTA = """
            {
              "iss": "https://accounts.google.com",
              "aud": "123-abc.apps.googleusercontent.com",
              "sub": "1098",
              "email": "Maria.Silva@Gmail.com",
              "email_verified": "true",
              "name": "Maria S\\u00e1 \\"Mari\\"",
              "exp": "1800000600"
            }
            """;

    private GoogleAuthService servico(String cliente, int status, String corpo) {
        return new GoogleAuthService(cliente, credencial -> new RespostaHttp(status, corpo), () -> AGORA);
    }

    private void recusa(GoogleAuthService servico, String credencial, String mensagem) {
        assertThatThrownBy(() -> servico.verificar(credencial))
                .isInstanceOf(RegraDeNegocioException.class)
                .hasMessage(mensagem);
    }

    @Test
    void confiaNoEmailQuandoOGoogleConfirma() {
        GoogleAuthService servico = servico(CLIENTE, 200, RESPOSTA);

        GoogleAuthService.UsuarioGoogle usuario = servico.verificar(" credencial ");

        assertThat(usuario.email()).isEqualTo("maria.silva@gmail.com");
        assertThat(usuario.nome()).isEqualTo("Maria Sá \"Mari\"");
        assertThat(servico.configurado()).isTrue();
        assertThat(servico.idCliente()).isEqualTo(CLIENTE);
    }

    @Test
    void semIdDeClienteOLoginComGoogleFicaDesligado() {
        GoogleAuthService servico = new GoogleAuthService(null);
        assertThat(servico.configurado()).isFalse();
        recusa(servico, "credencial", GoogleAuthService.NAO_CONFIGURADO);
    }

    @Test
    void recusaCredencialVaziaOuQueOGoogleNaoReconhece() {
        recusa(servico(CLIENTE, 200, RESPOSTA), "  ", GoogleAuthService.NAO_CONFIRMADO);
        recusa(servico(CLIENTE, 200, RESPOSTA), null, GoogleAuthService.NAO_CONFIRMADO);
        recusa(servico(CLIENTE, 400, "{\"error\": \"invalid_token\"}"), "x", GoogleAuthService.NAO_CONFIRMADO);
        recusa(new GoogleAuthService(CLIENTE, c -> null, () -> AGORA), "x", GoogleAuthService.NAO_CONFIRMADO);
    }

    @Test
    void recusaCredencialFeitaParaOutroSiteOuDeOutroEmissor() {
        recusa(servico("outro-site.apps.googleusercontent.com", 200, RESPOSTA), "x", GoogleAuthService.NAO_CONFIRMADO);
        recusa(servico(CLIENTE, 200, RESPOSTA.replace("https://accounts.google.com", "https://falso.com")), "x",
                GoogleAuthService.NAO_CONFIRMADO);
    }

    @Test
    void aceitaOEmissorSemHttps() {
        GoogleAuthService servico = servico(CLIENTE, 200, RESPOSTA.replace("https://accounts.google.com", "accounts.google.com"));
        assertThat(servico.verificar("x").email()).isEqualTo("maria.silva@gmail.com");
    }

    @Test
    void recusaCredencialVencidaOuSemValidade() {
        GoogleAuthService vencida = new GoogleAuthService(CLIENTE, c -> new RespostaHttp(200, RESPOSTA), () -> AGORA + 600_000);
        recusa(vencida, "x", GoogleAuthService.NAO_CONFIRMADO);
        recusa(servico(CLIENTE, 200, RESPOSTA.replace("\"1800000600\"", "\"amanha\"")), "x", GoogleAuthService.NAO_CONFIRMADO);
        recusa(servico(CLIENTE, 200, "{\"aud\": \"" + CLIENTE + "\"}"), "x", GoogleAuthService.NAO_CONFIRMADO);
    }

    @Test
    void exigeEmailConfirmadoNoGoogle() {
        recusa(servico(CLIENTE, 200, RESPOSTA.replace("\"email_verified\": \"true\"", "\"email_verified\": \"false\"")), "x",
                GoogleAuthService.EMAIL_NAO_VERIFICADO);
        recusa(servico(CLIENTE, 200, RESPOSTA.replace("\"email\": \"Maria.Silva@Gmail.com\",", "")), "x",
                GoogleAuthService.NAO_CONFIRMADO);
    }

    @Test
    void semNomeNoGoogleDevolveNomeVazio() {
        GoogleAuthService servico = servico(CLIENTE, 200, RESPOSTA.replace("\"name\": \"Maria S\\u00e1 \\\"Mari\\\"\",", ""));
        assertThat(servico.verificar("x").nome()).isEmpty();
    }

    @Test
    void semConexaoComOGoogleAvisaParaTentarDeNovo() {
        GoogleAuthService servico = new GoogleAuthService(CLIENTE, c -> {
            throw new IllegalStateException("timeout");
        }, () -> AGORA);
        recusa(servico, "x", GoogleAuthService.SEM_CONEXAO);
    }

    @Test
    void leValoresDoJsonDoGoogle() {
        assertThat(GoogleAuthService.valor("{\"a\": true, \"b\": 12}", "a")).isEqualTo("true");
        assertThat(GoogleAuthService.valor("{\"a\": true, \"b\": 12}", "b")).isEqualTo("12");
        assertThat(GoogleAuthService.valor("{\"a\": \"linha\\nnova\\tcom\\/barra\"}", "a")).isEqualTo("linha\nnova\tcom/barra");
        assertThat(GoogleAuthService.valor("{}", "a")).isNull();
    }
}

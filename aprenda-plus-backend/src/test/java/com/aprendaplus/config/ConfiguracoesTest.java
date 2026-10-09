package com.aprendaplus.config;

import com.aprendaplus.security.AuthInterceptor;
import com.aprendaplus.security.JwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

// Testa as duas configurações web do sistema:
// a proteção da API (WebConfig) e a liberação de CORS para o front (CorsConfig).
class ConfiguracoesTest {

    // CorsRegistry guarda as regras num método "protected";
    // esta subclasse só serve para conseguirmos ler essas regras no teste
    static class RegistroDeCorsParaTeste extends CorsRegistry {
        Map<String, CorsConfiguration> regras() {
            return getCorsConfigurations();
        }
    }

    @Test
    void webConfigDeveRegistrarAProtecaoEmTodasAsRotas() {
        JwtUtil jwtUtil = new JwtUtil("chave-usada-somente-nos-testes-com-mais-de-32-caracteres");
        WebConfig webConfig = new WebConfig(jwtUtil);

        InterceptorRegistry registry = mock(InterceptorRegistry.class);
        InterceptorRegistration registro = mock(InterceptorRegistration.class);
        when(registry.addInterceptor(any())).thenReturn(registro);

        webConfig.addInterceptors(registry);

        verify(registry).addInterceptor(any(AuthInterceptor.class));
        verify(registro).addPathPatterns("/**");
    }

    @Test
    void corsDeveLiberarOSitePublicadoEODesenvolvimentoLocal() {
        RegistroDeCorsParaTeste registry = new RegistroDeCorsParaTeste();

        new CorsConfig().corsConfigurer().addCorsMappings(registry);

        CorsConfiguration regra = registry.regras().get("/**");
        assertNotNull(regra);
        assertTrue(regra.getAllowedOrigins().contains("https://nattalyb.github.io"));
        assertTrue(regra.getAllowedOrigins().contains("http://localhost:5173"));
        assertTrue(regra.getAllowedMethods().containsAll(
                java.util.List.of("GET", "POST", "PUT", "DELETE", "OPTIONS")));
    }

    @Test
    void corsNaoDeveLiberarSitesDesconhecidos() {
        RegistroDeCorsParaTeste registry = new RegistroDeCorsParaTeste();

        new CorsConfig().corsConfigurer().addCorsMappings(registry);

        CorsConfiguration regra = registry.regras().get("/**");
        assertFalse(regra.getAllowedOrigins().contains("https://site-desconhecido.com"));
        assertNull(regra.checkOrigin("https://site-desconhecido.com"));
    }
}

package com.aprendaplus.config;

import com.aprendaplus.security.AuthInterceptor;
import com.aprendaplus.security.JwtUtil;
import com.aprendaplus.security.PermissoesDoFuncionario;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

// Liga a proteção da API em todas as rotas.
// Fica ativa por padrão; só é desligada nos testes de controller
// (propriedade seguranca.api.ativa=false, definida no pom.xml).
@Configuration
@ConditionalOnProperty(name = "seguranca.api.ativa", havingValue = "true", matchIfMissing = true)
public class WebConfig implements WebMvcConfigurer {

    private final JwtUtil jwtUtil;
    private final PermissoesDoFuncionario permissoes;

    public WebConfig(JwtUtil jwtUtil) {
        this(jwtUtil, null);
    }

    // Recebe quem confere o nível de acesso dos funcionários (NivelAcessoService)
    @Autowired
    public WebConfig(JwtUtil jwtUtil, PermissoesDoFuncionario permissoes) {
        this.jwtUtil = jwtUtil;
        this.permissoes = permissoes;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new AuthInterceptor(jwtUtil, permissoes)).addPathPatterns("/**");
    }
}
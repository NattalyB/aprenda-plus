package com.aprendaplus.config;

import com.aprendaplus.security.AtividadeInterceptor;
import com.aprendaplus.security.AuthInterceptor;
import com.aprendaplus.security.JwtUtil;
import com.aprendaplus.security.PermissoesDoFuncionario;
import com.aprendaplus.service.AtividadeService;
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
    private final AtividadeService atividadeService;

    public WebConfig(JwtUtil jwtUtil) {
        this(jwtUtil, null, null);
    }

    public WebConfig(JwtUtil jwtUtil, PermissoesDoFuncionario permissoes) {
        this(jwtUtil, permissoes, null);
    }

    // Recebe quem confere o nível de acesso dos funcionários (NivelAcessoService)
    // e quem grava o histórico de alterações (AtividadeService)
    @Autowired
    public WebConfig(JwtUtil jwtUtil, PermissoesDoFuncionario permissoes, AtividadeService atividadeService) {
        this.jwtUtil = jwtUtil;
        this.permissoes = permissoes;
        this.atividadeService = atividadeService;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new AuthInterceptor(jwtUtil, permissoes)).addPathPatterns("/**");
        if (atividadeService != null) {
            // Depois da segurança: grava no histórico o que foi cadastrado, alterado ou excluído
            registry.addInterceptor(new AtividadeInterceptor(atividadeService)).addPathPatterns("/**");
        }
    }
}
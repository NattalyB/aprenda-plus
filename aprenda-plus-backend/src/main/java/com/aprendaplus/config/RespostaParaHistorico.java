package com.aprendaplus.config;

import com.aprendaplus.security.AtividadeInterceptor;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

// Guarda o corpo da resposta dos POST para o histórico saber o id do registro recém-cadastrado
// (ex.: "Cadastrou aluno #12"). Não altera a resposta.
@ControllerAdvice
public class RespostaParaHistorico implements ResponseBodyAdvice<Object> {

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        return true;
    }

    @Override
    public Object beforeBodyWrite(Object body, MethodParameter returnType, MediaType selectedContentType,
                                  Class<? extends HttpMessageConverter<?>> selectedConverterType,
                                  ServerHttpRequest request, ServerHttpResponse response) {
        if (body != null && request instanceof ServletServerHttpRequest servlet
                && "POST".equals(servlet.getServletRequest().getMethod())) {
            servlet.getServletRequest().setAttribute(AtividadeInterceptor.CORPO_DA_RESPOSTA, body);
        }
        return body;
    }
}

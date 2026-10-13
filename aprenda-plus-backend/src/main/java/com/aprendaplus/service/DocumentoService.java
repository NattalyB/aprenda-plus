package com.aprendaplus.service;

import com.aprendaplus.dto.DocumentoResumo;
import com.aprendaplus.entity.Aluno;
import com.aprendaplus.entity.DocumentoAluno;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.AlunoRepository;
import com.aprendaplus.repository.DocumentoAlunoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

// Documento de escolaridade do aluno: envio, consulta e revisão pela secretaria
@Service
public class DocumentoService {

    public static final String PENDENTE = "pendente";
    public static final String APROVADO = "aprovado";
    public static final String RECUSADO = "recusado";

    // 5 MB
    public static final int TAMANHO_MAXIMO = 5 * 1024 * 1024;
    private static final Set<String> TIPOS = Set.of("application/pdf", "image/jpeg", "image/png");

    @Autowired
    private DocumentoAlunoRepository documentoRepository;

    @Autowired
    private AlunoRepository alunoRepository;

    @Autowired
    private EmailService emailService;

    // Confere o arquivo pelo conteúdo (e não só pela extensão): PDF, JPG ou PNG de até 5 MB.
    // Devolve o tipo real do arquivo.
    public String validarArquivo(String nomeArquivo, byte[] conteudo) {
        if (conteudo == null || conteudo.length == 0) {
            throw new RegraDeNegocioException("Anexe o certificado de conclusão (PDF, JPG ou PNG).");
        }
        if (conteudo.length > TAMANHO_MAXIMO) {
            throw new RegraDeNegocioException("O arquivo pode ter no máximo 5 MB.");
        }
        String tipo = tipoPeloConteudo(conteudo);
        if (tipo == null || !TIPOS.contains(tipo)) {
            throw new RegraDeNegocioException("Envie o documento em PDF, JPG ou PNG.");
        }
        return tipo;
    }

    @Transactional
    public DocumentoResumo salvar(Integer idAluno, String nomeArquivo, byte[] conteudo) {
        String tipo = validarArquivo(nomeArquivo, conteudo);
        Aluno aluno = alunoRepository.findById(idAluno)
                .orElseThrow(() -> new RegraDeNegocioException("Aluno não encontrado."));

        DocumentoAluno documento = new DocumentoAluno();
        documento.setAluno(aluno);
        documento.setNomeArquivo(limparNome(nomeArquivo, tipo));
        documento.setContentType(tipo);
        documento.setTamanho(conteudo.length);
        documento.setConteudo(conteudo);
        documento.setStatus(PENDENTE);
        DocumentoAluno salvo = documentoRepository.save(documento);
        return resumo(salvo);
    }

    public List<DocumentoResumo> doAluno(Integer idAluno) {
        return documentoRepository.resumosDoAluno(idAluno);
    }

    // Situação mais recente de cada aluno: { idAluno: "aprovado" }
    public Map<Integer, String> situacaoPorAluno() {
        Map<Integer, String> situacao = new LinkedHashMap<>();
        for (DocumentoResumo d : documentoRepository.todosOsResumos()) {
            if (APROVADO.equals(d.status())) {
                situacao.put(d.idAluno(), APROVADO);
            } else {
                situacao.putIfAbsent(d.idAluno(), d.status());
            }
        }
        return situacao;
    }

    public boolean temDocumentoAprovado(Integer idAluno) {
        return idAluno != null && documentoRepository.existsByAluno_IdAlunoAndStatus(idAluno, APROVADO);
    }

    // Arquivo para baixar/visualizar. idAluno = null quando quem pede é o admin.
    @Transactional(readOnly = true)
    public DocumentoAluno arquivo(Integer idDocumento, Integer idAluno) {
        DocumentoAluno documento = documentoRepository.findById(idDocumento)
                .orElseThrow(() -> new RegraDeNegocioException("Documento não encontrado."));
        if (idAluno != null && (documento.getAluno() == null || !idAluno.equals(documento.getAluno().getIdAluno()))) {
            throw new RegraDeNegocioException("Documento não encontrado.");
        }
        return documento;
    }

    @Transactional
    public DocumentoResumo revisar(Integer idDocumento, String status, String observacao) {
        if (!APROVADO.equals(status) && !RECUSADO.equals(status)) {
            throw new RegraDeNegocioException("Escolha aprovar ou recusar o documento.");
        }
        String motivo = observacao == null ? null : observacao.trim();
        if (RECUSADO.equals(status) && (motivo == null || motivo.isEmpty())) {
            throw new RegraDeNegocioException("Informe o motivo da recusa para o aluno saber o que corrigir.");
        }
        if (motivo != null && motivo.length() > 500) {
            throw new RegraDeNegocioException("O motivo pode ter no máximo 500 caracteres.");
        }
        DocumentoAluno documento = documentoRepository.findById(idDocumento)
                .orElseThrow(() -> new RegraDeNegocioException("Documento não encontrado."));
        documento.setStatus(status);
        documento.setObservacao(motivo == null || motivo.isEmpty() ? null : motivo);
        documento.setRevisadoEm(LocalDateTime.now(ZoneId.of("America/Sao_Paulo")));
        DocumentoAluno salvo = documentoRepository.save(documento);

        Aluno aluno = salvo.getAluno();
        if (RECUSADO.equals(status) && aluno != null) {
            emailService.documentoRecusado(aluno.getEmail(), aluno.getNomeCompleto(), motivo);
        }
        return resumo(salvo);
    }

    // ===== Auxiliares =====

    static String tipoPeloConteudo(byte[] c) {
        if (c.length >= 4 && c[0] == '%' && c[1] == 'P' && c[2] == 'D' && c[3] == 'F') {
            return "application/pdf";
        }
        if (c.length >= 8 && (c[0] & 0xFF) == 0x89 && c[1] == 'P' && c[2] == 'N' && c[3] == 'G') {
            return "image/png";
        }
        if (c.length >= 3 && (c[0] & 0xFF) == 0xFF && (c[1] & 0xFF) == 0xD8 && (c[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        return null;
    }

    // Nome seguro para mostrar/baixar, com a extensão certa
    static String limparNome(String nome, String tipo) {
        String base = nome == null ? "" : nome.replaceAll("[\\\\/:*?\"<>|\\r\\n]", "").trim();
        if (base.isEmpty()) {
            base = "documento";
        }
        if (base.length() > 150) {
            base = base.substring(0, 150);
        }
        String extensao = switch (tipo) {
            case "application/pdf" -> ".pdf";
            case "image/png" -> ".png";
            default -> ".jpg";
        };
        String minusculo = base.toLowerCase();
        boolean temExtensao = minusculo.endsWith(extensao) || (".jpg".equals(extensao) && minusculo.endsWith(".jpeg"));
        return temExtensao ? base : base + extensao;
    }

    private static DocumentoResumo resumo(DocumentoAluno d) {
        return new DocumentoResumo(d.getIdDocumento(), d.getAluno() == null ? null : d.getAluno().getIdAluno(),
                d.getNomeArquivo(), d.getContentType(), d.getTamanho(), d.getStatus(), d.getObservacao(),
                d.getEnviadoEm(), d.getRevisadoEm());
    }
}

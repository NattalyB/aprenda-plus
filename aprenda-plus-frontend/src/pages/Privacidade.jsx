import { Link } from 'react-router-dom';

// Política de privacidade (LGPD): o que o AprendaPlus guarda, para quê e como a pessoa exerce os seus direitos.
// Também é a página que o Google pede para liberar o "Continuar com o Google".
const CONTATO = 'aprendaplus@gmail.com';

function Privacidade() {
  return (
    <main className="privacidade">
      <article className="privacidade-conteudo">
        <h1>Política de privacidade</h1>
        <p className="privacidade-atualizada">Atualizada em 13 de novembro de 2026</p>

        <p>
          O AprendaPlus é uma plataforma de venda de cursos e gestão escolar desenvolvida como projeto final do
          curso Full Stack +PraTi / Codifica. Esta página explica, em linguagem simples, quais dados pessoais
          tratamos, para quê, com quem compartilhamos e como você pode exercer os seus direitos, conforme a
          Lei Geral de Proteção de Dados (Lei 13.709/2018, LGPD).
        </p>

        <h2>1. Quais dados coletamos</h2>
        <ul>
          <li><strong>Cadastro do aluno:</strong> nome completo, e-mail, telefone, data de nascimento, CPF, endereço e o certificado de conclusão do ensino médio (documento de escolaridade).</li>
          <li><strong>Entrar com o Google:</strong> apenas o nome e o e-mail da sua conta Google. Não recebemos a sua senha do Google nem acesso aos seus outros dados.</li>
          <li><strong>Inscrições e pagamentos:</strong> cursos escolhidos, forma de pagamento, parcelas e situação de cada uma.</li>
          <li><strong>Sala de aula:</strong> aulas concluídas, atividades e o certificado de conclusão do curso.</li>
          <li><strong>Assistente virtual:</strong> as perguntas que você digita no chat do site.</li>
          <li><strong>Preferências da tela:</strong> tema e opções de acessibilidade ficam salvos <strong>só no seu navegador</strong>, não no nosso servidor.</li>
        </ul>

        <h2>2. Para que usamos</h2>
        <ul>
          <li>Criar e manter a sua conta e permitir o login.</li>
          <li>Fazer a sua inscrição, conferir o documento de escolaridade, gerar a matrícula e as parcelas.</li>
          <li>Liberar a sala de aula e emitir o certificado de conclusão.</li>
          <li>Enviar e-mails sobre a sua conta, inscrição, pagamentos e senha.</li>
          <li>Responder às suas dúvidas no assistente virtual e no suporte.</li>
          <li>Enviar novidades e ofertas <strong>somente se você marcar</strong> que aceita recebê-las. Você pode desmarcar quando quiser.</li>
        </ul>

        <h2>3. Base legal</h2>
        <p>
          Tratamos os dados para executar o contrato do curso que você contrata (art. 7º, V, da LGPD), para cumprir
          obrigações legais da escola (art. 7º, II) e, no caso das ofertas, com o seu consentimento (art. 7º, I).
        </p>

        <h2>4. Com quem compartilhamos</h2>
        <p>Não vendemos dados. Usamos apenas os serviços necessários para o sistema funcionar:</p>
        <ul>
          <li><strong>Render</strong> (servidor da aplicação) e <strong>Neon</strong> (banco de dados), onde os dados ficam guardados.</li>
          <li><strong>Brevo</strong>, para enviar os e-mails automáticos.</li>
          <li><strong>Google</strong>, para o login com a conta Google e para responder às perguntas do assistente virtual.</li>
        </ul>
        <p>Dentro da escola, cada funcionário só vê os dados do módulo que o seu nível de acesso permite, e toda alteração fica registrada.</p>

        <h2>5. Segurança</h2>
        <p>
          As senhas são guardadas criptografadas (BCrypt), o acesso é feito com login e permissões conferidas pelo
          servidor, a comunicação usa HTTPS e os documentos enviados são conferidos antes de serem aceitos.
        </p>

        <h2>6. Por quanto tempo guardamos</h2>
        <p>
          Enquanto a sua conta estiver ativa e, depois, pelo tempo necessário para cumprir obrigações legais e
          acadêmicas (por exemplo, comprovar uma matrícula ou validar um certificado emitido).
        </p>

        <h2>7. Seus direitos</h2>
        <p>Você pode, a qualquer momento:</p>
        <ul>
          <li>confirmar se tratamos os seus dados e ter acesso a eles;</li>
          <li>corrigir dados incompletos ou desatualizados;</li>
          <li>pedir a exclusão dos dados que não precisam mais ser guardados;</li>
          <li>retirar o consentimento para receber ofertas;</li>
          <li>pedir informações sobre com quem os seus dados são compartilhados.</li>
        </ul>
        <p>
          Para isso, escreva para <a href={`mailto:${CONTATO}`}>{CONTATO}</a>. Respondemos em até 15 dias.
        </p>

        <h2>8. Mudanças nesta política</h2>
        <p>Se esta política mudar, a data no topo da página será atualizada.</p>

        <p className="privacidade-voltar">
          <Link to="/">← Voltar ao início</Link>
        </p>
      </article>
    </main>
  );
}

export default Privacidade;

import { useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function Install() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const endpoint = params.get("endpoint") ?? window.location.origin;
  const accessToken = params.get("accessToken") ?? "";
  const slug = params.get("slug") ?? "projeto";
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, key: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const mcpCommand = `claude mcp add --transport http annotate-${slug} ${endpoint}/mcp -H "Authorization: Bearer ${accessToken}" -s user`;

  return (
    <div className="page install-page">
      <h1>Instalar a extensão Annotate</h1>
      <p className="hint">
        Isso ativa um lápis (✎) em qualquer site que você abrir no navegador, pra reportar
        problemas visuais direto na página — sem mexer em nenhum código.
      </p>

      <a className="download-btn" href={`${endpoint}/extension.zip`}>
        ⬇ Baixar extensão (.zip)
      </a>

      <h2>Passo a passo</h2>
      <ol className="install-steps">
        <li>
          Baixe o arquivo acima. No Windows, ele vai pra pasta <strong>Downloads</strong>.
        </li>
        <li>
          Clique com o botão direito no arquivo baixado → <strong>Extrair Tudo</strong> (ou
          "Extrair aqui"). Deve aparecer uma pasta chamada <strong>annotate-extension</strong>{" "}
          — é ela que você vai usar no passo 5, nunca os arquivos soltos.
        </li>
        <li>
          Abra o Chrome (ou Edge) e digite na barra de endereço:{" "}
          <code>chrome://extensions</code> (ou <code>edge://extensions</code>) e aperte Enter.
        </li>
        <li>
          Ative o botão <strong>"Modo do desenvolvedor"</strong> (canto superior direito da
          página).
        </li>
        <li>
          Clique em <strong>"Carregar sem compactação"</strong> e selecione a pasta{" "}
          <strong>annotate-extension</strong> (a que tem o arquivo <code>manifest.json</code>{" "}
          dentro — se aparecer uma pasta dentro da outra com o mesmo nome, entre nela e use a
          de dentro).
        </li>
        <li>
          Clique no ícone da extensão (canto superior direito do navegador, perto da barra de
          endereço — pode estar dentro do ícone de quebra-cabeça 🧩).
        </li>
        <li>
          Cole os dois campos abaixo e clique em <strong>Salvar</strong>:
        </li>
      </ol>

      <div className="install-fields">
        <div>
          <label>Endpoint do servidor</label>
          <pre>{endpoint}</pre>
        </div>
        <div>
          <label>Token do projeto (widget)</label>
          <pre>{token || "(peça esse token a quem criou o projeto em /admin)"}</pre>
          {token && (
            <button onClick={() => copy(token, "token")}>
              {copied === "token" ? "Copiado ✓" : "Copiar token"}
            </button>
          )}
        </div>
      </div>

      <ol className="install-steps" start={8}>
        <li>Recarregue (F5) qualquer página aberta.</li>
        <li>
          O lápis (✎) aparece no canto inferior direito. Clique nele, clique no elemento com
          problema, escreva o que está errado, clique em Enviar.
        </li>
        <li>
          Depois de cada atualização da ferramenta, volte em <code>chrome://extensions</code> e
          clique no botão de recarregar (↻) no card da extensão.
        </li>
      </ol>

      <h2>Conectar a IA (Claude Code / Cursor)</h2>
      <p className="hint">
        Isso deixa a IA ler o que foi reportado e resolver sozinha. Rode o comando abaixo num
        terminal (Prompt de Comando, PowerShell, ou o terminal do próprio Claude Code/Cursor):
      </p>
      {accessToken ? (
        <>
          <pre>{mcpCommand}</pre>
          <button onClick={() => copy(mcpCommand, "mcp")}>
            {copied === "mcp" ? "Copiado ✓" : "Copiar comando"}
          </button>
        </>
      ) : (
        <p className="hint">
          (Esse link não veio com o token de acesso — pegue o comando completo na tela de
          criação do projeto em <code>/admin</code>.)
        </p>
      )}
      <p className="hint">
        Depois de rodar, <strong>abra uma conversa NOVA</strong> no Claude Code ou Cursor (uma já
        aberta não enxerga a conexão nova) e pergunte algo como "liste as anotações pendentes do
        projeto {slug}". Se ela responder com a lista (ou "nenhuma pendente"), a conexão
        funcionou.
      </p>
    </div>
  );
}

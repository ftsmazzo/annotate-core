import { useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function Install() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const endpoint = params.get("endpoint") ?? window.location.origin;
  const [copied, setCopied] = useState(false);

  function copyToken() {
    navigator.clipboard?.writeText(token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

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
          "Extrair aqui"). Isso cria uma pasta com os arquivos da extensão.
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
          Clique em <strong>"Carregar sem compactação"</strong> e selecione a pasta que você
          extraiu no passo 2.
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
            <button onClick={copyToken}>{copied ? "Copiado ✓" : "Copiar token"}</button>
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
    </div>
  );
}

# Distribuicao e Auto-Update

Este projeto esta preparado para gerar uma versao instalavel limpa do Planilha Trader.

## O que nao vai junto

Os dados importados por CSV ficam no computador do usuario, em armazenamento do Electron (`AppData`). Eles nao ficam dentro do codigo do projeto.

O instalador gerado por `electron-builder` empacota somente os arquivos listados em `package.json > build.files`. Pastas como `dist/`, `release/`, `backup/`, `.agents/`, `.vscode/` e arquivos de build nao entram.

## Fluxo recomendado

1. Desenvolva e teste localmente usando o atalho da sua area de trabalho.
2. Quando estiver funcionando, crie um commit:

```powershell
git status
git add .
git commit -m "Descreva a melhoria"
```

3. Gere um instalador local para testar, sem publicar para ninguem:

```powershell
.\tools\build-installer.ps1
```

4. Instale esse arquivo em uma maquina de teste ou em outro usuario do Windows e confira se abre limpo.
5. Se estiver tudo certo, aumente a versao no `package.json`, por exemplo `1.0.0` para `1.0.1`.
6. Publique a release:

```powershell
.\tools\publish-release.ps1
```

Somente depois da release publicada os usuarios recebem a atualizacao ao abrir o programa.

## GitHub necessario

O auto-update usa GitHub Releases. Antes de publicar de verdade, ajuste no `package.json`:

```json
"publish": [
  {
    "provider": "github",
    "owner": "Michaeltf7",
    "repo": "planilha-trader"
  }
]
```

Confirme que o repositorio existe em `https://github.com/Michaeltf7/planilha-trader`.

Para publicar pelo terminal, voce tambem precisa configurar um token:

```powershell
$env:GH_TOKEN = "SEU_TOKEN_DO_GITHUB"
.\tools\publish-release.ps1
```

## Observacoes

- Em modo desenvolvimento (`pnpm run start` ou atalho local), o auto-update fica desligado.
- O usuario so recebe atualizacao publicada em release, nao em todo commit.
- Para testar uma melhoria antes de liberar, use `pnpm run build:installer`, instale e teste. Depois publique.

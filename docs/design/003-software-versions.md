# 003. 採用ソフトウェア バージョン一覧

- 作成日: 2026-09-21
- 更新日: 2026-09-22
- 作成者: A Citizen for the Association
- ステータス: Approved(フロントエンド実装時に確定した内容を反映済み)
- 関連: [コントラクト基本設計書](./001-contract-design.md) / [フロントエンド基本設計書](./002-frontend-design.md) / [ADR-0003](../adr/0003-use-foundry-with-revm-backend-for-polkadot-hub.md) / [ADR-0004](../adr/0004-ownable-governance-model.md)

`software-policy`(安定版を優先し、最新リリースから順に採用可否を判断する)に従い、2026-09-21時点で公式リリースページ・npmを調査した結果。**実装着手時に再度バージョンを確認し、`package.json` / `foundry.toml` にロックすること**(日数が経つと新しいリリースが出ている可能性があるため)。

## 1. コントラクト側

| ソフトウェア | 採用予定バージョン | 状態 | 備考 |
|---|---|---|---|
| Solidity コンパイラ | **0.8.37** | Stable(2026-09-10リリース) | 重要なセキュリティ修正を含むリリース。OpenZeppelin 5.xの要求(`^0.8.20`)を満たす |
| Foundry(forge/cast/anvil) | **v1.8.3** | Stable | v1.8.2は依存ライブラリ`rustls`の脆弱性(RUSTSEC-2026-0285)により欠番。**v1.8.2は使用しないこと** |
| OpenZeppelin Contracts | **5.7.0** | Stable(2026-07-29リリース) | `Ownable`等。監査済みライブラリをそのまま利用し自前実装しない([コントラクト設計書 6章](./001-contract-design.md#6-セキュリティ方針)) |

Foundry自体はPolkadot Hub(EVM/REVM)向けのチェーン設定(`--chain polkadot` 等)を組み込みでサポートしている([ADR-0003](../adr/0003-use-foundry-with-revm-backend-for-polkadot-hub.md))。

### 1.1 コントラクトのLint/フォーマット

| 用途 | 採用 | 備考 |
|---|---|---|
| フォーマッター | **`forge fmt`**(Foundry組み込み) | 追加の依存を増やさない。`foundry.toml`の`[fmt]`で設定 |
| リンター | **`forge lint`**(Foundry v1.7.0以降に組み込み) | `forge build`実行時にデフォルトで動く。CIでは`--deny warnings`を付けて警告もエラー扱いにする |

外部ツール(`solhint`等)は導入しない。Foundry組み込み機能で要件を満たせるため、依存を増やさない方針とする。

## 2. フロントエンド側

| ソフトウェア | 採用予定バージョン | 状態 | 備考 |
|---|---|---|---|
| Node.js | **24.x** | LTS | [変更](#3-導入時に確認した事項結果)2026-09-22時点、Vercelが対応するNode.jsは24.x/22.x/20.xまでで26.xは未対応と判明したため、当初採用していた26.x(Current)から変更した |
| パッケージマネージャ | **pnpm 12.5.1** | Stable | 2026-08にTypeScript実装からRust実装への全面書き換え(v12)を実施したばかりのため、導入時にプロジェクトの主要コマンド(install/build)が問題なく動くことを確認すること(3章参照) |
| Next.js | **16.3.x** | Stable | App Router。Pages Routerは使用しない |
| React / React DOM | **19.2.x**(Next.js 16.3の要求に合わせる) | Stable | Next.js側のpeer dependencyに従う |
| TypeScript | **5.9.3**(5.x系最新) | Stable | [解決済み]`create-next-app 16.3.5`自体が5.9.3をデフォルトで採用しており、エコシステム(特にESLint関連プラグイン)がまだ5.x系を前提にしていると判断し、7.0系は見送った |
| wagmi | **3.7.7** | Stable | React用Web3フック |
| viem | **2.56.8** | Stable | wagmiの下層ライブラリ(RPC/ABIエンコード) |
| TanStack Query | **5.103.1** | Stable | wagmiに内蔵、個別インストール不要 |
| ESLint | **9.39.5**(EOL版、意図的に採用) | Deprecated | [解決済み] 10.5.xを試したところ`eslint-config-next`が依存する`eslint-plugin-react`がESLint 10の内部API変更(`getFilename`)に対応しておらず、`pnpm lint`が例外で落ちた。実際に壊れたため、`create-next-app`が選定した9.39.5(動作確認済み)に戻した。`eslint-config-next`側がESLint 10対応した時点で再度アップグレードを検討する |
| Prettier | **3.9.8** | Stable | フォーマッター |

フロントエンドのLint/フォーマットは、Solidity側(Foundry組み込み)とは異なり、実績があり広く使われているESLint + Prettierの組み合わせを採用する。新しい統合ツール(Biome等)は本プロジェクトでは採用しない(`software-policy`の「実績のある広く使われているものを優先する」方針)。

## 3. 導入時に確認した事項(結果)

- [x] **Node.js 26(Current)→24(LTS)に変更**: 当初`nvm install 26`で導入し問題なく動作していたが、2026-09-22にVercelへのデプロイを準備した際、Vercelのサポート対象Node.jsが24.x/22.x/20.xまで(26.x非対応)と判明した。ローカル開発・CI・Vercel本番ビルドの環境を揃えるため、`engines.node`・`.nvmrc`ともに24.xへ変更した。
- [x] **Node.js 24.x**: `nvm install 24`で導入し、`pnpm install`/`pnpm build`/`pnpm typecheck`/`pnpm test:coverage`/`pnpm e2e`とも問題なく動作した。
- [x] **TypeScript 7.0系の採用可否**: 上表の通り5.9.3を採用(7.0系は見送り)。
- [x] **pnpm 12.5.1(Rust書き換え版)**: `pnpm install`/`pnpm build`/`pnpm dev`とも問題なく動作した。
- [x] **ESLint 10.5.xの採用可否**: 上表の通り非採用(9.39.5に決定)。
- [x] Polkadot Hub Testnet/MainnetのRPC・Chain ID・ネイティブ通貨: docs.polkadot.com(smart-contracts/connect)で確認済み。Testnet: Chain ID `420420417`, 通貨`PAS`, RPC `https://eth-rpc-testnet.polkadot.io/`。Mainnet: Chain ID `420420419`, 通貨`DOT`, RPC `https://eth-rpc.polkadot.io/`。`frontend/lib/wagmi.ts`に反映済み。

## 4. 次のステップ

上記バージョンで問題なければ、このリストの通りに `package.json`(`"engines"`含む)・`foundry.toml`・`.tool-versions`(または`.nvmrc`)へ反映し、実装に着手する。

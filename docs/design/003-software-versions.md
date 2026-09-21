# 003. 採用ソフトウェア バージョン一覧

- 作成日: 2026-09-21
- 更新日: 2026-09-21
- 作成者: A Citizen for the Association
- ステータス: Draft(確認待ち)
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
| Node.js | **26.x** | Current(LTS昇格は2026-10予定) | 指定によりNode.js 26を採用。2026-09時点ではLTSではなくCurrentであることに留意(3章参照) |
| パッケージマネージャ | **pnpm 12.5.1** | Stable | 2026-08にTypeScript実装からRust実装への全面書き換え(v12)を実施したばかりのため、導入時にプロジェクトの主要コマンド(install/build)が問題なく動くことを確認すること(3章参照) |
| Next.js | **16.3.x** | Stable | App Router。Pages Routerは使用しない |
| React / React DOM | **19.2.x**(Next.js 16.3の要求に合わせる) | Stable | Next.js側のpeer dependencyに従う |
| TypeScript | **7.0.x**(要検証) または **5.x最新** | Stable(7.0はリリース直後) | 9章参照。Go製ネイティブコンパイラへの全面書き換えで、リリース直後のためエコシステム互換性を要確認 |
| wagmi | **3.7.x** | Stable | React用Web3フック。v2からv3への移行ガイドが公式に存在 |
| viem | **2.56.x** | Stable | wagmiの下層ライブラリ(RPC/ABIエンコード) |
| TanStack Query | wagmiの要求バージョンに追従(v5系) | Stable | wagmiに内蔵、個別インストール不要 |
| ESLint | **10.5.x** | Stable | v9系は2026-08にEOL。`eslint-config-next`(16.3.x、採用中のNext.jsと同一バージョン)を利用 |
| Prettier | **3.9.x** | Stable | フォーマッター。ecc web/hooks.mdのPostToolUseフック(`prettier --write`)にそのまま利用する |

フロントエンドのLint/フォーマットは、Solidity側(Foundry組み込み)とは異なり、実績があり広く使われているESLint + Prettierの組み合わせを採用する。新しい統合ツール(Biome等)は本プロジェクトでは採用しない(`software-policy`の「実績のある広く使われているものを優先する」方針)。

## 3. 導入前に確認すべき事項

- [ ] **Node.js 26(Current)の採用**: 指定により採用するが、2026-09時点ではLTSではなくCurrent(LTS昇格は2026-10予定)である。Vercelのビルド環境・wagmi/viem等の依存パッケージがNode.js 26で問題なく動くことを確認する。
- [ ] **TypeScript 7.0系の採用可否**: 2026-07リリースの新しいネイティブコンパイラ版であり、リリースから日が浅い。wagmi/viem/Next.jsの型定義や周辺ツール(ESLint等)が7.0系で問題なく動くかを`pnpm create next-app`実行時に確認し、問題があれば直近の5.x系安定版に切り替える(2章の表を参照)。
- [ ] **pnpm 12.5.1(Rust書き換え版)の動作確認**: リリースから日が浅い大規模書き換えのため、`pnpm install`/`pnpm build`が問題なく動くかを確認する。
- [ ] Polkadot Hub Testnet/MainnetのRPCエンドポイント・Chain IDの確定(バージョンではなくネットワーク設定。[要件定義8章](../requirements/001-mvp-requirements.md)で継続管理)

## 4. 次のステップ

上記バージョンで問題なければ、このリストの通りに `package.json`(`"engines"`含む)・`foundry.toml`・`.tool-versions`(または`.nvmrc`)へ反映し、実装に着手する。

# 0003. Polkadot HubへのデプロイはFoundry + REVM実行バックエンドを使用する

- 日付: 2026-09-21
- ステータス: Accepted

## コンテキスト

コントラクトの開発・テスト・デプロイツールとしてFoundryを採用したいが、Polkadot HubでのFoundry対応の成熟度が未確認だった。ユーザーのソフトウェア選定方針([software-policy](~/.claude/rules/own/software-policy.md))は、安定版のみを採用し実験的/beta版を避けることを求めている。

公式ドキュメント([Polkadot Hub Smart Contracts](https://docs.polkadot.com/reference/polkadot-hub/smart-contracts/), [Use Foundry with Polkadot Hub](https://docs.polkadot.com/smart-contracts/dev-environments/foundry/))を調査した結果、Polkadot HubにはSolidityコントラクトを実行するバックエンドが2種類存在することを確認した。

| バックエンド | 実行方式 | Foundry対応 | 成熟度 |
|---|---|---|---|
| REVM | 標準EVMバイトコードをRust実装(REVM)でそのまま実行 | 素のFoundry/Hardhatが無改造で利用可能。`--chain polkadot` / `--chain polkadot-testnet`が組み込み対応 | 不安定性に関する注記なし。既存Ethereum向けSolidity資産をそのまま移行できる想定で設計されている |
| PolkaVM(PVM) | RISC-V独自VMでネイティブ実行、専用コンパイラ`resolc`が必要 | 専用フォーク(foundry-polkadot)や`--resolc`フラグなど専用対応が必要 | 公式ドキュメントに **"early-stage development and may be unstable or incomplete"** と明記 |

なお、`forge test`は標準のAnvil(Ethereumノード)上で実行され、Polkadotノードとは異なる挙動になり得るため、本番デプロイ前にはローカルのdevノードまたはTestnet相手のテストが推奨されている。

## 決定

Polkadot Hubへのデプロイには **REVM実行バックエンド + 素のFoundry** を採用する。PolkaVM(PVM)実行バックエンドおよび専用コンパイラ`resolc`は、現時点で公式に不安定と明記されているため採用しない。

Hardhatへの切り替えは行わない(REVMバックエンドであればFoundryで要件を満たせるため)。

## 代替案

- **PolkaVM(PVM) + resolc**: PolkaVM独自の高性能実行やPolkadotネイティブ機能(ガバナンス・XCM等のプリコンパイル)を利用できるが、現時点で不安定と明記されており、本プロジェクトの安定性重視の方針に反するため不採用。将来的にPVMが安定版になった時点で再検討する。
- **Hardhat + hardhat-polkadot プラグイン**: REVMバックエンドであればFoundryで同等のことができるため、ツールチェーンを分割するメリットがなく不採用。

## 影響

- コントラクトは標準的なSolidity/EVMバイトコードとして実装・テストでき、Ethereum向けとPolkadot Hub向けで実装を分ける必要がない。
- Polkadot Hub固有機能(XCM等のプリコンパイル経由でのPolkadotネイティブ機能利用)は本プロジェクトでは使用しない前提となる。将来的に必要になった場合はPVMバックエンドへの切り替えを別途ADR化して検討する。
- 本番デプロイ前に、Anvilだけでなく実際のPolkadot Hub Testnet(REVM)に対するテストを実施する運用とする。

# Architecture Decision Records (ADR)

アーキテクチャや技術選定に関する重要な意思決定を記録します。

## 目的

- なぜその選択をしたのかを後から追跡できるようにする
- 同じ議論を繰り返さないようにする
- 決定を覆す際に、過去の前提や制約を正しく理解できるようにする

## 命名規則

`NNNN-短いタイトル.md`（例: `0002-use-nextjs-app-router.md`）

番号は連番。欠番や再利用はしない。

## ステータス

- `Proposed` — 提案中
- `Accepted` — 採択済み
- `Superseded by ADR-XXXX` — 別のADRに置き換えられた
- `Deprecated` — 撤回された

## 新しいADRの作り方

[TEMPLATE.md](./TEMPLATE.md) をコピーし、連番のファイル名で保存してください。

最初のADRとして [0001-record-architecture-decisions.md](./0001-record-architecture-decisions.md) を参照してください（ADRを書くこと自体の決定）。

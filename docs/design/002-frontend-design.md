# 002. フロントエンド基本設計書

- 作成日: 2026-09-21
- 更新日: 2026-09-21
- 作成者: A Citizen for the Association
- ステータス: Draft
- 関連: [要件定義 001](../requirements/001-mvp-requirements.md) / [コントラクト基本設計書 001](./001-contract-design.md) / [SaveEarth Home Screen(デザイン案)](https://claude.ai/code/artifact/6a37909a-6a4d-406e-a9d7-85808cf5b47e)

## 1. 概要

Next.js(App Router)でウォレット接続とコントラクト読み書きを行う単一ページのアプリケーションを実装する。採用ビジュアルは「8-Bit Assembly」案(Game Boy風4階調グリーンパレット、装飾を排した直角UI)。Vercelにデプロイする。

## 2. 技術スタック

| 領域 | 採用technology | 備考 |
|---|---|---|
| フレームワーク | Next.js(App Router) | Pages Routerは使用しない。Server Componentsをデフォルトとする |
| Web3接続 | wagmi + viem | Reactフック(wagmi)でウォレット状態・コントラクト呼び出しを扱い、viemが下層のRPC/ABIエンコードを担う。2026年時点でのReact向けWeb3標準スタック |
| ウォレットUI | wagmiの`injected`/`walletConnect`コネクタ + 自前の簡易接続ボタン | RainbowKit等のUIキットは本アプリのシンプルな要件・独自ピクセルUIとの相性・バンドルサイズを考慮し採用しない(要確認、8章参照) |
| サーバー状態 | TanStack Query(wagmi内蔵) | コントラクト読み取り結果のキャッシュ・再取得 |
| スタイリング | CSS Modules(素のCSS) | Tailwindは使用しない。ピクセル単位で作り込むレトロUIとユーティリティクラスの相性が悪いため |
| フォント | `next/font/google`(Press Start 2P, VT323) | セルフホスティングにより外部リクエストとCSP設定をシンプルに保つ |
| コントラクトアクセス制御 | OpenZeppelin `Ownable`のオンチェーン状態を`isOwner`判定に利用 | フロントエンドは`owner()`を読み取ってUIの出し分けを行う |

実装時にはバージョンを確定し`package.json`にロックする(`software-policy`の方針に従い、実装着手時点での最新安定版を採用する)。

## 3. 画面構成

初期バージョンは単一ページ(`/`)とする。ルーティングの追加は行わない(YAGNI)。

```
app/
├── layout.tsx          # フォント・グローバルCSS読み込み、Web3Provider
├── page.tsx             # ホーム画面(Server Component、初期データはクライアント側で取得)
└── providers.tsx        # "use client"; wagmi Provider + QueryClientProvider
```

画面上のセクション構成(デザイン案参照):

1. ヘッダー: ロゴ、ネットワークバッジ、ウォレット接続ボタン/接続済みアドレス表示、Owner時は "★ HOST ★" バッジ
2. MISSION LOG: 理念・目標メッセージの一覧(複数)。Owner時のみ追加・削除フォームを表示
3. COMMS CHANNELS: チャットルームURLの一覧(複数)。Owner時のみ追加・削除フォームを表示
4. PARTY ROSTER: メンバー一覧(アドレス・追加者・件数)。メンバー時のみ「新規メンバー追加」フォーム、本人の行にのみ「脱退」ボタンを表示

## 4. コンポーネント構成

```
components/
├── layout/
│   ├── Header.tsx
│   ├── WalletConnectButton.tsx
│   └── NetworkBadge.tsx
├── mission/
│   ├── MissionLog.tsx
│   └── MissionForm.tsx        # Owner専用
├── comms/
│   ├── CommsChannelList.tsx
│   └── CommsChannelForm.tsx   # Owner専用
└── membership/
    ├── PartyRoster.tsx
    ├── AddMemberForm.tsx      # メンバー専用
    └── LeaveButton.tsx        # 本人のみ
```

`Owner専用`/`メンバー専用`のコンポーネントは、対応する権限を持たないアカウントの場合はそもそもレンダリングしない(操作できないボタンをグレー表示するのではなく、非表示にする)。

## 5. 状態管理

- ウォレット/アカウント状態: `wagmi`の`useAccount`
- コントラクト読み取り: セクションごとに`useReadContract`(メンバー一覧、チャットルーム一覧、メッセージ一覧、`owner()`)
- 書き込み後の反映: `useWriteContract`のトランザクション確定後、対象クエリを`invalidate`して再取得する(ページ全体のリロードは行わない)
- フォーム状態: `useState`によるローカル状態のみ。グローバル状態管理ライブラリ(Zustand等)は本アプリの状態量では不要と判断し導入しない(YAGNI)
- URL状態: 初期バージョンでは不要(フィルタ・ページネーションなし)

## 6. コントラクト連携層

```
lib/
├── contracts/
│   ├── membership.ts       # ABI + チェーンごとのアドレス + 型付きフック
│   └── communityBoard.ts
└── wagmi.ts                 # wagmi config(4チェーン定義、コネクタ設定)
```

- チェーンごとのコントラクトアドレスは環境変数(`NEXT_PUBLIC_MEMBERSHIP_ADDRESS_*`等)で注入し、起動時に存在検証する(未設定チェーンでは機能を無効化し、エラーメッセージを表示する)。
- Polkadot Hub(mainnet/testnet)はwagmiの`defineChain`でカスタムチェーン定義を追加する(RPCエンドポイント・チェーンIDは実装時に確定。[要件定義 8章](../requirements/001-mvp-requirements.md)参照)。

## 7. デプロイ

- Vercelにデプロイする。
- Preview環境はTestnet(Sepolia / Polkadot Hub Testnet)向けコントラクトアドレスを既定値とする。
- Production環境の環境変数は、[ADR-0002](../adr/0002-single-chain-mainnet-strategy.md)で選定するMainnet(Ethereum または Polkadot Hub のいずれか)のコントラクトアドレスのみを設定する。

## 8. 非機能要件・オープン事項

- **パフォーマンス**: JSバンドルはアプリページ想定の目安(300kb gzip以下)を上回らないよう、wagmi/viem以外の重量ライブラリ(チャート、UIキット等)を追加しない。
- **アクセシビリティ**: Game Boy配色(前景 `#0f380f` / 背景 `#9bbc0f` 等)はコントラスト比を実装時にWCAG AA(通常テキスト4.5:1)で再検証する。フォーカス可視化は既にデザイン案で対応済み。
- [ ] ウォレット接続UIを自前実装するか、軽量なウォレット接続ライブラリを追加するかの最終判断
- [ ] コントラクトイベント(`MemberAdded`等)をリアルタイム購読(`watchContractEvent`)するか、書き込み成功時の手動再取得のみとするか
- [ ] Polkadot Hub側のウォレット(MetaMask以外の対応状況)の動作確認

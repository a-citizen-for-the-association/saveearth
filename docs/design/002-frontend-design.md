# 002. フロントエンド基本設計書

- 作成日: 2026-09-21
- 更新日: 2026-09-21
- 作成者: A Citizen for the Association
- ステータス: Approved(ガバナンストークン表示[ADR-0006]の画面サンプルも承認済み。残るオープン事項は8章参照)
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
| コントラクトアクセス制御 | OpenZeppelin `Ownable`のオンチェーン状態を`isOwner`判定に利用 | フロントエンドは`owner()`を読み取ってUIの出し分けを行う。CommunityBoardの管理系操作は`isOwner && isMember`(ADR-0005)で判定する |

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
2. MISSION LOG: 理念・目標メッセージの一覧(複数)。Ownerかつメンバーである間のみ追加・削除フォームを表示(ADR-0005)。Ownerだがメンバーでない場合はその旨を表示する
3. COMMS CHANNELS: チャットルームURLの一覧(複数)。Ownerかつメンバーである間のみ追加・削除フォームを表示(ADR-0005)。Ownerだがメンバーでない場合はその旨を表示する
4. PARTY ROSTER: メンバー一覧(アドレス・追加者・件数)。メンバー時のみ「新規メンバー追加」フォーム、本人の行にのみ「脱退」ボタンを表示。各行にアドレスのコピーボタンと、外部チャットルーム(hackchat.js.org)用にアドレスから導出したニックネーム(`SE_`+アドレス末尾21文字、24文字以内・英数字とアンダースコアのみという制約に対応、`lib/hackchatNickname.ts`)+コピーボタンを表示
5. **GOVERNANCE TOKEN**([ADR-0006](../adr/0006-governance-token.md)、要件4.6): `CommunityBoard.governanceToken()`から取得した公式ガバナンストークンのコントラクトアドレスを表示する。読み取り専用(誰でも閲覧可能)、編集フォームはない。画面サンプルは本設計書に別途添付のモックアップを参照

## 4. コンポーネント構成

```
components/
├── layout/
│   ├── Header.tsx
│   ├── WalletConnectButton.tsx
│   └── NetworkBadge.tsx
├── mission/
│   ├── MissionLog.tsx
│   └── MissionForm.tsx        # Owner かつ メンバー専用(ADR-0005)
├── comms/
│   ├── CommsChannelList.tsx
│   └── CommsChannelForm.tsx   # Owner かつ メンバー専用(ADR-0005)
├── membership/
│   ├── PartyRoster.tsx
│   ├── AddMemberForm.tsx      # メンバー専用
│   └── LeaveButton.tsx        # 本人のみ
└── token/
    └── GovernanceTokenPanel.tsx   # 読み取り専用、誰でも閲覧可(ADR-0006)
```

`Owner専用`/`メンバー専用`のコンポーネントは、対応する権限を持たないアカウントの場合はそもそもレンダリングしない(操作できないボタンをグレー表示するのではなく、非表示にする)。ただし「Ownerではあるがメンバーでない」場合に限っては、単に非表示にするのではなく理由を短く表示する(`hooks/useMembershipStatus.ts`の`canManageCommunityBoard`)。

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
│   ├── communityBoard.ts   # governanceToken()ゲッター含む(ADR-0006)
│   └── governanceToken.ts  # 最小限のERC20 ABI(name/symbol/decimals/totalSupplyのみ、読み取り専用)
└── wagmi.ts                 # wagmi config(4チェーン定義、コネクタ設定、blockExplorerUrl()ヘルパー)
```

- チェーンごとのコントラクトアドレスは環境変数(`NEXT_PUBLIC_MEMBERSHIP_ADDRESS_<chainId>`等)で注入する。Next.jsは`process.env.NEXT_PUBLIC_*`をビルド時に静的置換するため、動的なキー組み立て(`process.env[computed]`)ではなく、チェーンごとに固定のプロパティアクセスを列挙する必要がある(`lib/contracts/membership.ts`参照)。未設定チェーンでは機能を無効化し、「未デプロイ」の表示にする。
- **ガバナンストークンのアドレスは環境変数を別途持たない**。`CommunityBoard.governanceToken()`をオンチェーンから直接読み取って表示する(`lib/contracts/communityBoard.ts`のABIに`governanceToken`ゲッターを追加)。CommunityBoardのアドレスさえ分かればガバナンストークンのアドレスも導出できるため、フロントエンド側で二重に設定を持たない([ADR-0006](../adr/0006-governance-token.md))。
- Polkadot Hub(mainnet/testnet)はwagmiの`defineChain`でカスタムチェーン定義を追加する。RPC/Chain ID/ネイティブ通貨はdocs.polkadot.comで確認済み(Testnet: `420420417`/`PAS`、Mainnet: `420420419`/`DOT`。[003-software-versions.md](./003-software-versions.md)参照)。
- `getActiveChatRooms`/`getActiveMessages`はコントラクト側でid情報を含めずactive要素だけを返すため、削除ボタンに必要な本当のオンチェーンidをそこから復元できない。フロントエンドでは代わりに`chatRoomCount`/`messageCount`から`0..count-1`の範囲で`getChatRoom(i)`/`getMessage(i)`を`useReadContracts`によるマルチコールでまとめて取得し、idを保持したまま`active`でフィルタする(`hooks/useActiveEntries.ts`)。

## 7. デプロイ

- Vercelにデプロイする。
- Preview環境はTestnet(Sepolia / Polkadot Hub Testnet)向けコントラクトアドレスを既定値とする。
- Production環境の環境変数は、[ADR-0002](../adr/0002-single-chain-mainnet-strategy.md)で選定するMainnet(Ethereum または Polkadot Hub のいずれか)のコントラクトアドレスのみを設定する。

## 8. 非機能要件・オープン事項

- **パフォーマンス**: JSバンドルはアプリページ想定の目安(300kb gzip以下)を上回らないよう、wagmi/viem以外の重量ライブラリ(チャート、UIキット等)を追加しない。
- [x] **アクセシビリティ**: Game Boy配色(前景 `#0f380f` / 背景 `#9bbc0f`)のコントラスト比を計算したところ約6.0:1で、WCAG AA(通常テキスト4.5:1)を満たす。フォーカス可視化も実装済み(`globals.css`)。
- [x] **ウォレット接続UI**: 自前実装(`WalletConnectButton.tsx`)を採用。wagmiの`injected()`コネクタのみを使い、RainbowKit等のUIキットは追加しなかった。
- [ ] コントラクトイベント(`MemberAdded`等)をリアルタイム購読(`watchContractEvent`)するか、書き込み成功時の手動再取得のみとするか。現状は後者(`useWriteContract`の`onSuccess`で`refetch`)のみを実装済み。
- [ ] Polkadot Hub側のウォレット(MetaMask以外の対応状況)の動作確認(未実施。実際のTestnetデプロイ後に確認する)

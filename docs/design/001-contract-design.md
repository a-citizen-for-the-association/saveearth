# 001. コントラクト基本設計書

- 作成日: 2026-09-21
- 更新日: 2026-09-21
- 作成者: A Citizen for the Association
- ステータス: Approved
- 関連: [要件定義 001](../requirements/001-mvp-requirements.md) / [ADR-0002](../adr/0002-single-chain-mainnet-strategy.md) [ADR-0003](../adr/0003-use-foundry-with-revm-backend-for-polkadot-hub.md) [ADR-0004](../adr/0004-ownable-governance-model.md)

## 1. 概要

初期バージョンで実装するコントラクトは以下の2本とする。機能単位で分離し、互いに依存させない(片方の不具合がもう片方に波及しないようにする)。

| コントラクト | 責務 |
|---|---|
| `Membership.sol` | メンバーの追加・削除・追加者の記録 |
| `CommunityBoard.sol` | チャットルームURLの登録、理念・目標メッセージの登録 |

両方とも OpenZeppelin `Ownable`(5.x系、要実装時に最新安定版を確認)を継承し、非アップグレード(プロキシなし)とする([ADR-0004](../adr/0004-ownable-governance-model.md))。デプロイ時に同一のOwnerアドレス(EOA、将来はマルチシグ)を両コントラクトに設定する。

## 2. Membership.sol

### 2.1 データモデル

```solidity
struct Member {
    bool isMember;
    address addedBy;   // Ownerが最初のメンバーとして自己登録する場合は address(0)
    uint40 addedAt;    // block.timestamp
}

mapping(address => Member) private members;
address[] private memberList;   // 列挙用。追加時にpush、削除時はswap-and-pop
uint256 public memberCount;
```

- 個人情報は一切保持しない。キーはアドレスのみ(要件4.2)。

### 2.2 関数

| 関数 | 呼び出し可能者 | 概要 |
|---|---|---|
| `constructor(address initialOwner)` | デプロイ者 | `Ownable`初期化 + `initialOwner`を最初のメンバーとして自動登録(要件7.1) |
| `addMember(address newMember)` | 既存メンバー | 他メンバーの承認・合議は不要。単独で追加できる(要件4.1)。ゼロアドレス・重複登録は revert |
| `removeMember(address member)` | 本人 または Owner | 自己脱退、またはOwnerによる削除(要件4.1・7.6)。メンバー同士の相互削除は不可 |
| `isMember(address account) view` | 誰でも | メンバーか否かを返す |
| `getMember(address account) view` | 誰でも | `Member`構造体を返す(`addedBy`含む) |
| `memberAt(uint256 index) view` | 誰でも | 列挙用 |

### 2.3 イベント

```solidity
event MemberAdded(address indexed member, address indexed addedBy, uint256 timestamp);
event MemberRemoved(address indexed member, address indexed removedBy);
```

「誰の追加によってメンバーになったか」はイベントログとオンチェーンの`Member.addedBy`の両方から検証可能にする(要件4.1)。

### 2.4 [決定済み] 全メンバー脱退時の扱い

`addMember`は「既存メンバー」のみが呼べる設計のため、Ownerを含む全メンバーが脱退した場合、以後誰も新規メンバーを追加できなくなり、コントラクトの機能は実質停止する。

**決定**: これは許容する。全メンバーの脱退は「この会の終了」を意味するものであり、Ownerに例外的な追加権限(セーフティネット)を持たせる必要はない。`addMember`は要件通り「既存メンバーのみ」とし、Ownerもメンバーである間だけ追加できる(追加の特別扱いはしない)。

## 3. CommunityBoard.sol

### 3.1 データモデル

チャットルームとメッセージは同型の「登録・論理削除できるリスト」なので、同じ構造で2種類管理する。配列の物理削除(swap-and-pop)はID/インデックスがずれてフロントエンドの参照を壊すため、**論理削除(activeフラグ)** を採用する。

```solidity
struct ChatRoom {
    string label;
    string url;
    bool active;
}

struct Message {
    string content;
    bool active;
}

mapping(uint256 => ChatRoom) private chatRooms;
uint256 public chatRoomCount;

mapping(uint256 => Message) private messages;
uint256 public messageCount;
```

### 3.2 関数

| 関数 | 呼び出し可能者 | 概要 |
|---|---|---|
| `addChatRoom(string label, string url) returns (uint256 id)` | Owner | 複数登録可能(要件4.4) |
| `removeChatRoom(uint256 id)` | Owner | `active = false` にする論理削除 |
| `addMessage(string content) returns (uint256 id)` | Owner | 複数登録可能(要件4.5) |
| `removeMessage(uint256 id)` | Owner | 論理削除 |
| `getActiveChatRooms() view returns (ChatRoom[] memory)` | 誰でも | フロントエンド表示用のヘルパー(3.4参照) |
| `getActiveMessages() view returns (Message[] memory)` | 誰でも | 同上 |

### 3.3 イベント

```solidity
event ChatRoomAdded(uint256 indexed id, string label, string url);
event ChatRoomRemoved(uint256 indexed id);
event MessageAdded(uint256 indexed id, string content);
event MessageRemoved(uint256 indexed id);
```

### 3.4 [設計メモ] 一覧取得のガスコスト

`getActiveChatRooms` / `getActiveMessages` はオンチェーンで配列を走査してactiveな要素だけを返す実装になるため、件数が増えるとgas(view呼び出し自体はgasless読み取りだが、走査コストがブロックガスリミットに近づくと呼び出し不能になる)が増加する。Owner管理下の少数登録(数件〜数十件程度)を前提とするため許容するが、将来的に件数が増える場合はフロントエンド側でイベントログ(`ChatRoomAdded`等)をインデックスして表示する方式への切り替えを検討する(8章参照)。

## 4. アクセス制御まとめ

| ロール | Membership | CommunityBoard |
|---|---|---|
| Owner | メンバーである間は追加可(2.4)、任意メンバーの削除可 | チャットルーム/メッセージの追加・削除 |
| メンバー | 新規メンバーの追加(単独)、自己脱退 | 閲覧のみ |
| 誰でも | 閲覧のみ | 閲覧のみ |

## 5. マルチチェーン対応

- 両コントラクトはチェーン固有の機能(プリコンパイル等)を使わない、標準的なSolidity/EVMバイトコードとして実装する([ADR-0003](../adr/0003-use-foundry-with-revm-backend-for-polkadot-hub.md))。
- デプロイはFoundry Script(`script/Deploy.s.sol`)で行い、ネットワークごとに実行する。
  - 開発・検証: Ethereum Sepolia、Polkadot Hub Testnet(REVMバックエンド)
  - 本番: Ethereum MainnetまたはPolkadot Hub Mainnetのいずれか一方([ADR-0002](../adr/0002-single-chain-mainnet-strategy.md))
- チェーンごとにコントラクトアドレスは異なる。フロントエンド側で `chainId → コントラクトアドレス` のマッピングを保持する(フロントエンド基本設計書 参照)。

## 6. セキュリティ方針

- アクセス制御は自前実装せず、OpenZeppelンの監査済み `Ownable` を利用する。
- ETHやトークンの送受金ロジックを持たないため、reentrancy(再入)のリスクは低い。
- 入力値検証: `addMember`はゼロアドレス・重複登録をrevert、`addChatRoom`/`addMessage`は空文字列の扱いを実装時に決定する(空文字列を許可するか、`require(bytes(x).length > 0)`で弾くか)。
- Owner権限の乗っ取り対策として、将来のCouncil移行時は `transferOwnership` の宛先をマルチシグ(例: Safe)にすることを強く推奨する([ADR-0004](../adr/0004-ownable-governance-model.md))。

## 7. テスト方針

- Foundry(`forge test`)でユニットテストを作成する。最低限カバーすべきケース:
  - `addMember`: 非メンバーからの呼び出しがrevertすること、ゼロアドレス・重複登録がrevertすること、正常系でイベントと状態が更新されること
  - `removeMember`: 本人・Owner以外からの呼び出しがrevertすること
  - `addChatRoom`/`addMessage`/削除系: Owner以外からの呼び出しがrevertすること、論理削除後に一覧から除外されること
  - デプロイ直後にOwnerがメンバー#1として登録されていること(要件7.1)
- 本番デプロイ前に、Anvilだけでなく実際のTestnet(Sepolia / Polkadot Hub Testnet)に対しても動作確認を行う([ADR-0003](../adr/0003-use-foundry-with-revm-backend-for-polkadot-hub.md)の注記事項)。

## 8. オープン事項

- [ ] チャットルーム/メッセージの登録数に上限を設けるか(3.4のガスコスト対策)
- [ ] `label`/`content`/`url`の文字数上限(ストレージコスト・UI表示崩れ防止のため設定を推奨)

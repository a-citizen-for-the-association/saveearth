# 001. コントラクト基本設計書

- 作成日: 2026-09-21
- 更新日: 2026-09-21
- 作成者: A Citizen for the Association
- ステータス: Approved
- 関連: [要件定義 001](../requirements/001-mvp-requirements.md) / [ADR-0002](../adr/0002-single-chain-mainnet-strategy.md) [ADR-0003](../adr/0003-use-foundry-with-revm-backend-for-polkadot-hub.md) [ADR-0004](../adr/0004-ownable-governance-model.md) [ADR-0005](../adr/0005-communityboard-references-membership.md) [ADR-0006](../adr/0006-governance-token.md)

## 1. 概要

初期バージョンで実装するコントラクトは以下の3本とする。機能単位で分離し、互いに依存させない(片方の不具合がもう片方に波及しないようにする)。

| コントラクト | 責務 |
|---|---|
| `Membership.sol` | メンバーの追加・削除・追加者の記録 |
| `GovernanceToken.sol` | 固定供給のERC20ガバナンストークン(将来のDAO化に備えた準備。[ADR-0006](../adr/0006-governance-token.md)) |
| `CommunityBoard.sol` | チャットルームURLの登録、理念・目標メッセージの登録。`Membership`と`GovernanceToken`を不変参照する([ADR-0005](../adr/0005-communityboard-references-membership.md) [ADR-0006](../adr/0006-governance-token.md)) |

`Membership`と`CommunityBoard`は OpenZeppelin `Ownable`(5.7.0)を継承し、非アップグレード(プロキシなし)とする([ADR-0004](../adr/0004-ownable-governance-model.md))。`GovernanceToken`は`Ownable`を継承せず、デプロイ後は誰も特権的な操作を行えない([ADR-0006](../adr/0006-governance-token.md))。デプロイ時に同一のOwnerアドレス(EOA、将来はマルチシグ)を`Membership`・`CommunityBoard`に設定する。

`CommunityBoard`は`Membership`・`GovernanceToken`のコントラクトアドレスをコンストラクタで受け取り、それぞれ`immutable`で保持する(依存の方向は一方向。`Membership`・`GovernanceToken`は`CommunityBoard`の存在を一切知らない)。デプロイ順序は以下に固定される。

1. `Membership`
2. `GovernanceToken`(①とは互いに依存しない)
3. `CommunityBoard`(①②のアドレスを渡す)

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

## 3. GovernanceToken.sol [ADR-0006、要件4.6]

将来のDAO化を検討する準備として、固定供給のERC20トークンを発行する。**DAOとしての機能(投票・提案等)は実装しない**。

### 3.1 データモデル

OpenZeppelin `ERC20`をそのまま継承し、独自のstateは持たない。

```solidity
contract GovernanceToken is ERC20 {
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000_000 * 10 ** 18;

    constructor(address initialHolder) ERC20("SaveEarth Governance Token", "SEG") {
        _mint(initialHolder, INITIAL_SUPPLY);
    }
}
```

- 名称: `SaveEarth Governance Token`、シンボル: `SEG`。
- 供給量: 1兆(1,000,000,000,000)トークン(人間可読の枚数)。`decimals`はOpenZeppelin `ERC20`のデフォルト実装(18)をオーバーライドせず使用するため、生の値は`INITIAL_SUPPLY = 1_000_000_000_000 * 10**18`を定数として持つ。

### 3.2 関数

`ERC20`標準関数(`transfer`/`approve`/`transferFrom`/`balanceOf`等)以外に独自関数は持たない。`Ownable`を継承しないため、`owner()`は存在しない。

| 関数 | 呼び出し可能者 | 概要 |
|---|---|---|
| `constructor(address initialHolder)` | デプロイ者 | `initialHolder`(Owner)へ`INITIAL_SUPPLY`(1兆トークン)を一度だけミント |

デプロイ後に供給量を変更する手段(追加ミント・バーン権限)は一切実装しない(固定供給、[ADR-0006](../adr/0006-governance-token.md))。

### 3.3 イベント

`ERC20`標準の`Transfer`/`Approval`イベントのみ(独自イベントなし)。

## 4. CommunityBoard.sol

### 4.1 データモデル

チャットルームとメッセージは同型の「登録・論理削除できるリスト」なので、同じ構造で2種類管理する。配列の物理削除(swap-and-pop)はID/インデックスがずれてフロントエンドの参照を壊すため、**論理削除(activeフラグ)** を採用する。

```solidity
interface IMembership {
    function isMember(address account) external view returns (bool);
}

IMembership public immutable membership;        // コンストラクタで設定、変更不可(ADR-0005)
address public immutable governanceToken;       // コンストラクタで設定、変更不可(ADR-0006)。関数呼び出しは行わず、公式トークンを示すためだけの参照

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

`Membership`の実装全体をimportせず、`isMember`のみを持つ最小限のインターフェース(`IMembership`)経由で参照する(コントラクトサイズを抑え、依存を最小化するため)。`GovernanceToken`は関数を一切呼び出さないため、インターフェースも介さずただの`address`として保持する。

### 4.2 関数

| 関数 | 呼び出し可能者 | 概要 |
|---|---|---|
| `constructor(address initialOwner, address membershipAddress, address governanceTokenAddress)` | デプロイ者 | `membership`・`governanceToken`を設定(ADR-0005・ADR-0006)。両アドレスともコードを持たないアドレス(EOA・`address(0)`等)を渡すとそれぞれ`InvalidMembership`・`InvalidGovernanceToken`でrevertする(誤ったアドレスでのデプロイをその場で検知するため。正しい実装であることまでは保証しない) |
| `addChatRoom(string label, string url) returns (uint256 id)` | Owner **かつ** `membership`上で現在もメンバーであること | 複数登録可能(要件4.4)。Ownerがメンバーでなくなっている場合は`OwnerNotAMember`でrevert |
| `removeChatRoom(uint256 id)` | 同上 | `active = false` にする論理削除 |
| `addMessage(string content) returns (uint256 id)` | 同上 | 複数登録可能(要件4.5) |
| `removeMessage(uint256 id)` | 同上 | 論理削除 |
| `getActiveChatRooms() view returns (ChatRoom[] memory)` | 誰でも | フロントエンド表示用のヘルパー(4.4参照) |
| `getActiveMessages() view returns (Message[] memory)` | 誰でも | 同上 |

「Ownerかつメンバー」の判定は、OpenZeppelin `Ownable`の`_checkOwner()`(Owner以外は`OwnableUnauthorizedAccount`でrevert)を先に呼び、続けて`membership.isMember(msg.sender)`を確認する専用モディファイア`onlyOwnerWhoIsMember`として実装する。

### 4.3 イベント

```solidity
event ChatRoomAdded(uint256 indexed id, string label, string url);
event ChatRoomRemoved(uint256 indexed id);
event MessageAdded(uint256 indexed id, string content);
event MessageRemoved(uint256 indexed id);

error OwnerNotAMember(address owner);
error InvalidMembership(address membershipAddress);
error InvalidGovernanceToken(address governanceTokenAddress);
```

### 4.4 [設計メモ] 一覧取得のガスコスト

`getActiveChatRooms` / `getActiveMessages` はオンチェーンで配列を走査してactiveな要素だけを返す実装になるため、件数が増えるとgas(view呼び出し自体はgasless読み取りだが、走査コストがブロックガスリミットに近づくと呼び出し不能になる)が増加する。Owner管理下の少数登録(数件〜数十件程度)を前提とするため許容するが、将来的に件数が増える場合はフロントエンド側でイベントログ(`ChatRoomAdded`等)をインデックスして表示する方式への切り替えを検討する(9章参照)。

## 5. アクセス制御まとめ

| ロール | Membership | GovernanceToken | CommunityBoard |
|---|---|---|---|
| Owner | メンバーである間は追加可(2.4)、任意メンバーの削除可 | 発行時の全量ミント先(以降は保有者の1人として扱われる) | メンバーである間のみ、チャットルーム/メッセージの追加・削除(ADR-0005) |
| メンバー | 新規メンバーの追加(単独)、自己脱退 | (メンバーであることによる特別な権限はない) | 閲覧のみ(Ownerを兼ねる場合を除く) |
| 誰でも | 閲覧のみ | 標準ERC20の保有・譲渡(`transfer`/`approve`等) | 閲覧のみ |

## 6. マルチチェーン対応

- 全コントラクトはチェーン固有の機能(プリコンパイル等)を使わない、標準的なSolidity/EVMバイトコードとして実装する([ADR-0003](../adr/0003-use-foundry-with-revm-backend-for-polkadot-hub.md))。
- デプロイはFoundry Script(`script/Deploy.s.sol`)で行い、ネットワークごとに実行する。
  - 開発・検証: Ethereum Sepolia、Polkadot Hub Testnet(REVMバックエンド)
  - 本番: Ethereum MainnetまたはPolkadot Hub Mainnetのいずれか一方([ADR-0002](../adr/0002-single-chain-mainnet-strategy.md))
- チェーンごとにコントラクトアドレスは異なる。フロントエンド側で `chainId → コントラクトアドレス` のマッピングを保持する(フロントエンド基本設計書 参照)。

## 7. セキュリティ方針

- アクセス制御は自前実装せず、OpenZeppelンの監査済み `Ownable` を利用する。
- ETHやトークンの送受金ロジックを持たないため、reentrancy(再入)のリスクは低い。`GovernanceToken`はOpenZeppelンの監査済み`ERC20`実装をそのまま使う。
- 入力値検証: `addMember`はゼロアドレス・重複登録をrevert、`addChatRoom`/`addMessage`は空文字列の扱いを実装時に決定する(空文字列を許可するか、`require(bytes(x).length > 0)`で弾くか)。
- Owner権限の乗っ取り対策として、将来のCouncil移行時は `transferOwnership` の宛先をマルチシグ(例: Safe)にすることを強く推奨する([ADR-0004](../adr/0004-ownable-governance-model.md))。
- **`renounceOwnership()`は`Membership`・`CommunityBoard`ともオーバーライドしてrevertさせ、無効化する**(セキュリティレビューで指摘)。非アップグレード契約でOwnerが`address(0)`になると、`CommunityBoard`の全操作が永久に不能になり、`Membership`のOwner経由削除・将来の`transferOwnership`によるCouncil移行経路も塞がれてしまうため。`GovernanceToken`は`Ownable`を継承しないためこの問題自体が存在しない。
- `CommunityBoard`は`Membership`の実装全体をimportせず、最小限のインターフェース(`IMembership`)のみに依存する。`GovernanceToken`に対しては関数呼び出し自体を行わない(単なるアドレス参照)。依存の方向は一方向(`CommunityBoard → Membership` / `CommunityBoard → GovernanceToken`)で、`Membership`・`GovernanceToken`側の変更・不具合が`CommunityBoard`に波及することはあっても逆はない([ADR-0005](../adr/0005-communityboard-references-membership.md) [ADR-0006](../adr/0006-governance-token.md))。
- `GovernanceToken`はミント関数を持たないため、供給量はデプロイ時点で恒久的に固定される。

## 8. テスト方針

- Foundry(`forge test`)でユニットテストを作成する。最低限カバーすべきケース:
  - `addMember`: 非メンバーからの呼び出しがrevertすること、ゼロアドレス・重複登録がrevertすること、正常系でイベントと状態が更新されること
  - `removeMember`: 本人・Owner以外からの呼び出しがrevertすること
  - `addChatRoom`/`addMessage`/削除系: Owner以外からの呼び出しがrevertすること、論理削除後に一覧から除外されること
  - **Ownerであっても`membership`上でメンバーでなくなっている場合は`OwnerNotAMember`でrevertすること**、メンバーに復帰(他メンバーによる再追加)すれば再び操作できること(ADR-0005)
  - `membershipAddress`/`governanceTokenAddress`にコードを持たないアドレス(EOA・`address(0)`)を渡すとデプロイ時にそれぞれ`InvalidMembership`・`InvalidGovernanceToken`でrevertすること
  - `transferOwnership`後、新Ownerがメンバーでなければ`OwnerNotAMember`でrevertし、メンバーであれば操作できること(セキュリティレビューで指摘)
  - デプロイ直後にOwnerがメンバー#1として登録されていること(要件7.1)
  - `GovernanceToken`: デプロイ直後に`initialHolder`の残高が`INITIAL_SUPPLY`(1兆トークン)と一致すること、`totalSupply()`が`INITIAL_SUPPLY`と一致すること、名称・シンボルが`SaveEarth Governance Token`/`SEG`であること
- 本番デプロイ前に、Anvilだけでなく実際のTestnet(Sepolia / Polkadot Hub Testnet)に対しても動作確認を行う([ADR-0003](../adr/0003-use-foundry-with-revm-backend-for-polkadot-hub.md)の注記事項)。
- `forge coverage`の100%要件は`src/`配下のコントラクトを対象とする。`script/Deploy.s.sol`はデプロイスクリプトであり、実際のデプロイ(dry-run含む)で動作確認するものであってユニットテスト対象ではないため、`--no-match-coverage "script/"`で除外して集計する。

## 9. オープン事項

- [ ] チャットルーム/メッセージの登録数に上限を設けるか(4.4のガスコスト対策)
- [ ] `label`/`content`/`url`の文字数上限(ストレージコスト・UI表示崩れ防止のため設定を推奨)

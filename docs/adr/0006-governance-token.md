# 0006. ガバナンストークン(ERC20)の導入とCommunityBoardへの不変参照

- 日付: 2026-09-21
- ステータス: Accepted

## コンテキスト

本プロジェクトの価値が上がった場合に、将来DAO化を検討している。DAOとしての機能(トークンによる投票・提案・Treasury管理等)は今回実装しないが、その準備として、ガバナンストークン(ERC20)を発行しておきたいという要望があった。これは当初の要件定義に含まれていなかった**要件漏れ**であり、要件定義001に4.6として追記した。

あわせて、このトークンが「本プロジェクト公式のものである」ことを示すため、`CommunityBoard`に当該ERC20のコントラクトアドレスを`public`変数として保持し、デプロイ後は変更できないようにしたいという要望があった。これは[ADR-0005](./0005-communityboard-references-membership.md)で`CommunityBoard`が`Membership`を不変参照した構造と同種のパターンである。

## 決定

### 1. 新規コントラクト `GovernanceToken.sol`

- OpenZeppelin `ERC20`(5.7.0)を継承する標準的なERC20トークンとする。
- 名称: `SaveEarth Governance Token`、シンボル: `SEG`、`decimals`はOpenZeppelンのデフォルト(18)をそのまま使う。
- 供給量は **1兆(1,000,000,000,000)トークン**(人間可読の枚数。`decimals=18`を考慮すると生の値は`1_000_000_000_000 * 10**18`)を、コンストラクタで指定アドレス(Owner)に一度だけミントする。
- **それ以外にミント関数を一切持たない(固定供給)**。`Ownable`も継承しない — デプロイ後、誰も追加ミント・供給量変更を行えないようにする。

```solidity
contract GovernanceToken is ERC20 {
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000_000 * 10 ** 18;

    constructor(address initialHolder) ERC20("SaveEarth Governance Token", "SEG") {
        _mint(initialHolder, INITIAL_SUPPLY);
    }
}
```

### 2. `CommunityBoard`に不変参照を追加

`CommunityBoard`のコンストラクタに`governanceToken`アドレスを追加し、`immutable`の`public`変数として保持する。[ADR-0005](./0005-communityboard-references-membership.md)の`membership`と異なり、`CommunityBoard`はこのトークンに対して**何の関数呼び出しも行わない**(純粋に「公式トークンはこれである」ことを示すためだけの参照)。

```solidity
address public immutable governanceToken;   // コンストラクタで設定、変更不可

constructor(address initialOwner, address membershipAddress, address governanceTokenAddress)
    Ownable(initialOwner)
{
    if (membershipAddress.code.length == 0) revert InvalidMembership(membershipAddress);
    if (governanceTokenAddress.code.length == 0) revert InvalidGovernanceToken(governanceTokenAddress);
    membership = IMembership(membershipAddress);
    governanceToken = governanceTokenAddress;
}
```

`Membership`への参照(ADR-0005)と同様、コンストラクタでコードを持たないアドレス(EOA・`address(0)`)が渡された場合は即座にrevertし、誤ったアドレスでのデプロイをその場で検知する。

### 3. デプロイ順序

3コントラクトの依存関係により、デプロイ順序は以下に固定される。

1. `Membership`
2. `GovernanceToken`(①②は互いに依存しないため順不同で良いが、スクリプト上は`Membership`の後に統一する)
3. `CommunityBoard`(①②のアドレスを渡してデプロイ)

## 代替案

### ミント権限を残す(Ownerが将来追加ミットできるようにする)か、固定供給にするか

**固定供給(追加ミント不可)を採用**。理由:

- 「DAOとしての機能は今回実装しない」という要望に対し、追加ミント権限は将来の中央集権的なインフレ・希薄化リスクを生むだけで、今回のスコープでは便益がない。
- ガバナンストークンは「保有量に応じた発言権」を将来担保するものであるべきで、供給量が固定されている方が将来のDAO設計(スナップショット・投票権計算等)にとってもシンプルで扱いやすい。
- 将来本当にDAO化する際、投票権追跡(`ERC20Votes`等)が必要になった場合は、その時点で新しいガバナンストークンとして再発行し、既存保有者にスナップショット配布する方が、今回のトークンに後から機能を継ぎ足すより安全(非アップグレード方針、[ADR-0004](./0004-ownable-governance-model.md)と一貫)。

### `ERC20Votes`(投票権追跡付き拡張)を今のうちに採用するか

**採用しない(素の`ERC20`のみ)**。`ERC20Votes`はDAOのガバナンス(OpenZeppelin Governor等)と組み合わせて初めて意味を持つ機能であり、「DAOとしての機能は今回実装しない」という要望に反する。今回は「保有証明としてのトークン」を発行するに留め、実際にDAO化する段階で必要な拡張を持つトークンへ移行することを推奨する(このため、現時点で発行するトークンが将来にわたって「唯一のガバナンストークン」であり続けることを保証するものではない点は留意事項として残す)。

### `CommunityBoard`が`GovernanceToken`に対して何らかのアクセス制御を行うか(例: 一定量保有者のみ投稿可能等)

**行わない**。要望は「公式トークンのアドレスを示す」ことのみであり、アクセス制御への利用は明示的にスコープ外(DAO機能そのものは今回実装しない)。

## 影響

- `CommunityBoard`のコンストラクタ引数が`(address initialOwner, address membershipAddress, address governanceTokenAddress)`に変わる(2回目のコンストラクタ変更)。
- デプロイスクリプト(`script/Deploy.s.sol`)に`GovernanceToken`のデプロイ手順を追加する。
- フロントエンドは`CommunityBoard.governanceToken()`を読み取り、ガバナンストークンのコントラクトアドレスを表示する(画面サンプルは別途提示)。
- 供給量の全量が単一のアドレス(Owner)に集中する。将来のDAO化時にどう分配するかは別途検討が必要(今回のスコープ外)。
- セキュリティレビューの指摘を受け、`membershipAddress`と`governanceTokenAddress`に同一アドレスが渡された場合は`MembershipAndGovernanceTokenMustDiffer`でrevertするようにした。両者とも「コードを持つか」だけを検証しているため、2つの引数を取り違えても検知できないという限界があり、せめて同一アドレス指定という退化ケースだけは弾く対応。異なる2つの正当なコントラクト同士が入れ替わるケースまでは検知できない(デプロイスクリプトが正しい順序で渡す前提の、既知の残存リスクとして記録)。

## 決定事項(2026-09-21確認済み)

- 名称・シンボル: `SaveEarth Governance Token` / `SEG`
- 供給量: 1兆(1,000,000,000,000)トークン(人間可読の枚数として)
- 固定供給・`Ownable`なし(追加ミント不可)で確定

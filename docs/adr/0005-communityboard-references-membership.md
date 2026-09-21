# 0005. CommunityBoardはMembershipを不変参照し、Owner操作にはメンバーであることも要求する

- 日付: 2026-09-21
- ステータス: Accepted

## コンテキスト

初期実装では`Membership.sol`と`CommunityBoard.sol`が完全に独立しており、両コントラクト間に何の関連もなかった。両者は同じOwnerアドレスをデプロイ時に受け取るだけで、それ以外の結びつきがない状態だった。

これには以下の問題がある。

- フロントエンドや外部の第三者が「このCommunityBoardは本当にこのMembershipと対になっているか」をオンチェーンで検証する手段がない。
- CommunityBoardの管理権限(チャットルーム・理念メッセージの追加/削除)は「Ownerの秘密鍵を持っていること」だけに紐づいており、「実際にこの会のメンバーであること」とは無関係になっている。Ownerが将来Membership上で自身のメンバーシップを外れた場合でも、CommunityBoardの管理権限は影響を受けず持ち続けてしまう。

## 決定

`CommunityBoard`のコンストラクタに`Membership`のコントラクトアドレスを追加し、`immutable`(デプロイ後変更不可)で保持する。CommunityBoardは`Membership`の実装全体をimportせず、`isMember(address) view returns (bool)`のみを持つ最小限のインターフェース(`IMembership`)を介して参照する。

さらに、`addChatRoom` / `removeChatRoom` / `addMessage` / `removeMessage`の呼び出し条件を「Ownerであること」から「**Ownerであり、かつ参照先Membershipにおいて現在もメンバーであること**」に変更する。

依存の方向は **CommunityBoard → Membership の一方向** に限定する。Membership側はCommunityBoardの存在を一切知らない。

## 代替案

- **案1のみ(アドレスを不変保持するだけで、権限ロジックは変えない)**: 実装コストは最小だが、「このCommunityBoardは本当にこのMembershipと対になっているか」を検証できるようになるだけで、Owner権限とメンバーシップの実質的な結びつきは生まれない。今回の課題(関連が何もない)を形式的にしか解決しないため不採用。
- **案2(MembershipとCommunityBoardを1つのコントラクトに統合する)**: 実装時点のコントラクトサイズ(CommunityBoard 4,551 bytes、Membership 1,943 bytes、EVM上限24,576 bytes)を確認した結果、統合してもサイズ上の問題はないことを確認した。しかし、[コントラクト基本設計書 1章](../design/001-contract-design.md)で決定した「機能単位で分離し、互いに依存させない」という方針に反すること、また将来Treasury(ステーブルコイン対応)やCouncil投票など他モジュールがMembershipを共通の身分証として再利用する可能性(要件定義の将来スコープ)を狭めることから不採用とした。
- **専用のRegistryコントラクトを別途デプロイし、そこで2つのコントラクトの対応関係を記録する案**: 案の決定で得られる検証可能性を、コントラクトをもう1本増やすコストをかけてまで得る理由がなく、MVPには過剰と判断し不採用とした。

## 影響

- `CommunityBoard`のコンストラクタ引数が`(address initialOwner, address membershipAddress)`に変わる。
- デプロイ順序が固定される: **① Membershipをデプロイ → ② そのアドレスを渡してCommunityBoardをデプロイ**。`script/Deploy.s.sol`を修正する。
- Ownerが自身のMembership上のメンバーシップを外れた場合、再びメンバーになる(または他のメンバーである別アドレスにOwnershipを移す)までCommunityBoardの管理操作ができなくなる。これは意図した挙動である。
- 将来Owner権限をCouncilのマルチシグに移譲する場合([ADR-0004](./0004-ownable-governance-model.md))、そのマルチシグのアドレス自身をMembershipのメンバーとして登録しておく必要がある(運用上の留意点として記録)。
- コントラクトサイズへの影響は軽微(インターフェース経由の外部呼び出し1回分のみ)で、上限に対する余裕は引き続き十分にある。
- セキュリティレビューの指摘を受け、`membershipAddress`にコードを持たないアドレス(EOA・`address(0)`等)が渡された場合はコンストラクタで即座に`InvalidMembership`でrevertするようにした。`membership`は`immutable`のため、誤ったアドレスでのデプロイを後から検知するとCommunityBoardの再デプロイが必要になる(状態の引き継ぎができない)。デプロイ時点で誤りに気づけるようにする方が損害が小さいための対応であり、渡されたアドレスが正しいMembership実装であることまでは保証しない(その検証はできないため、引き続きデプロイ時の信頼境界として受け入れる)。

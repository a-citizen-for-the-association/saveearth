# 2026-09-21 テスト結果レポート(2回目)

- 対象コミット: `317575b`(`test: add Playwright E2E suite for all Definition of Done golden paths`)+ 本レポートと同時にコミットする`e2e/golden-paths.spec.ts`の追加修正(後述)
- 実行環境: ローカル(CI未構築。[Definition of Done](../requirements/002-definition-of-done.md)参照)
- 実行者: A Citizen for the Association
- 目的: [同日1回目のレポート](./2026-09-21-test-results.md)時点で未達だったフロントエンドの自動テスト(2.3)が完了したため、[Definition of Done](../requirements/002-definition-of-done.md)に対する達成状況を、公開可能な形で記録する。

## サマリー

| 項目 | 状態 |
|---|---|
| コントラクトのテスト(`forge test`) | ✅ 62件全成功(変更なし) |
| コントラクトのカバレッジ(`src/`) | ✅ line/statement/branch/function すべて100%(変更なし) |
| コントラクトのフォーマット・Lint | ✅ `forge fmt --check` / `forge lint` ともにクリーン |
| フロントエンドの型チェック(`tsc --noEmit`) | ✅ エラーなし |
| フロントエンドのLint(ESLint) | ✅ エラーなし |
| フロントエンドのフォーマット(Prettier) | ✅ エラーなし |
| フロントエンドのビルド(`next build`) | ✅ 成功 |
| **フロントエンドのユニットテスト(Vitest)** | ✅ **45件全成功。`lib/`+`hooks/`のline/statement/functionカバレッジ100%、branchカバレッジ91.07%** |
| **フロントエンドのE2Eテスト(Playwright)** | ✅ **ゴールデンパス1〜7、7件全成功(連続2回実行して再現性を確認)。ゴールデンパス8はコンポーネントテストで代替** |
| **CI(継続的インテグレーション)** | ❌ **未構築**(`.github/workflows`等なし。上記はすべてローカル実行結果) |

**結論: [Definition of Done](../requirements/002-definition-of-done.md)のうち、フロントエンドの自動テスト(2.3)は達成した。残る未達項目はCI構築(2.5の一部)のみ。** 詳細は下記、および[Definition of Done](../requirements/002-definition-of-done.md)の該当チェックボックスを参照。

## 1. コントラクト(変更なし、再確認のみ)

[同日1回目のレポート](./2026-09-21-test-results.md)からコントラクトへの変更はない。今回のセッションでも念のため再実行し、同じ結果であることを確認した。

### 1.1 `forge test`

```
Ran 3 test suites in 2.96ms (2.87ms CPU time): 62 tests passed, 0 failed, 0 skipped (62 total tests)
```

| テストファイル | テスト数 | 結果 |
|---|---|---|
| `test/Membership.t.sol` | 19 | 全成功 |
| `test/CommunityBoard.t.sol` | 37 | 全成功 |
| `test/GovernanceToken.t.sol` | 6 | 全成功 |

### 1.2 カバレッジ(`forge coverage --no-match-coverage "script/"`)

```
| File                    | % Lines           | % Statements      | % Branches      | % Funcs         |
+=======================================================================================================+
| src/CommunityBoard.sol  | 100.00% (61/61)   | 100.00% (66/66)   | 100.00% (14/14) | 100.00% (13/13) |
| src/GovernanceToken.sol | 100.00% (2/2)     | 100.00% (1/1)     | N/A (0/0)       | 100.00% (1/1)   |
| src/Membership.sol      | 100.00% (36/36)   | 100.00% (32/32)   | 100.00% (6/6)   | 100.00% (10/10) |
| Total                   | 100.00% (101/101) | 100.00% (100/100) | 100.00% (20/20) | 100.00% (25/25) |
```

### 1.3 フォーマット・Lint

- `forge fmt --check` → 差分なし(exit 0)
- `forge lint` → 警告・エラーなし(exit 0)

## 2. フロントエンド

### 2.1 型チェック・Lint・フォーマット・ビルド

いずれもエラーなし(前回と同様)。`next build`は成功し、`/`ルートは動的レンダリング。

### 2.2 ユニット/コンポーネントテスト(Vitest + Testing Library)

```
Test Files  11 passed (11)
     Tests  45 passed (45)
```

```
File               | % Stmts | % Branch | % Funcs | % Lines
-------------------|---------|----------|---------|--------
All files          |     100 |    91.07 |     100 |     100
 hooks             |     100 |    94.23 |     100 |     100
 lib               |     100 |       50 |     100 |     100
```

[Definition of Done 2.3](../requirements/002-definition-of-done.md#23-フロントエンドのテスト)の基準(line/branchカバレッジ80%以上)を達成。`lib/wagmi.ts`のbranchカバレッジが50%と低いのは、実際のブラウザ環境が必要な`localStorage`アクセス部分など、Vitest(jsdom)環境で意味のある形でテストしづらい分岐のため。

### 2.3 E2Eテスト(Playwright)

`e2e/golden-paths.spec.ts`に[Definition of Done 4章](../requirements/002-definition-of-done.md#4-ゴールデンパス一覧e2eテスト対象)のゴールデンパス1〜7を実装。ローカルのAnvilチェーン + 実際の`Deploy.s.sol`によるデプロイ + wagmiの`mock`コネクタ(Owner/メンバー/非メンバーの3アカウント、`?e2eConnector`クエリパラメータで選択)という構成で、本番ビルド(`next build && next start`)に対して実行する。

```
✓ golden path 1: an unconnected visitor can browse the home screen read-only
✓ golden path 2: connecting shows the account address and the network
✓ golden path 3: an existing member adds a new member unilaterally
✓ golden path 4: a member can remove themself (self-removal)
✓ golden path 5: a non-member/non-owner sees no add/edit/delete controls
✓ golden path 6: the Owner can add and then remove a chat room
✓ golden path 7: the Owner can add and then remove a mission message

7 passed
```

連続2回実行し、いずれも7件全成功することを確認済み(再現性の確認)。

ゴールデンパス8(未対応ネットワーク接続時の警告表示)のみ、E2Eではなく`components/layout/NetworkBadge.test.tsx`のコンポーネントテストとして実装している。理由: wagmiの`mock`コネクタは常に`wagmiConfig`の`chains`に含まれるチェーンとして接続する仕様のため、「`supportedChains`に含まれないネットワークに接続している」という状態をE2Eで再現できない。コード内コメントに理由を明記済み。

#### 実装時に判明し、修正した問題

このE2Eスイートの構築過程で、以下の問題が見つかり修正した(詳細はコミット履歴参照)。

1. **開発サーバー(`next dev`)がハイドレーションしない**: このローカル環境ではTurbopackのHMR用WebSocketハンドシェイクが失敗し(`ERR_INVALID_HTTP_RESPONSE`)、Reactが`hydrateRoot`を呼び出さないままになっていた。画面のSSR初期表示は出るが、ボタンクリック等が一切反応しない状態。本番ビルド(`next build && next start`)に切り替えることで解決。副次効果として、Vercel本番相当の挙動をより正確に検証できるようになった。
2. **wagmiの`mock`コネクタが未指定時にmainnet扱いになる**: `connect()`にチェーンIDを渡さない場合、コネクタは`wagmiConfig`の`chains`配列の先頭要素に接続する仕様であり、既存の並び(`mainnet`が先頭)だとE2Eでもmainnetに接続されてしまっていた。E2Eテストモード時のみ`foundry`(ローカルAnvil)を先頭にするよう`lib/wagmi.ts`を修正。
3. **テストコード自身の不具合3件**: 誤ったアドレス文字列のハードコード、`.first()`が意図しないボタンを取得してしまう問題、`getByText`の大文字小文字を無視した部分一致により複数要素にマッチしてしまう問題(`"SAVEEARTH"`が`"SaveEarth Governance Token"`等にも一致していた)。いずれも修正済み。

### 2.4 権限状態カバレッジ

「訪問者」「メンバー」「Owner」の3ロールについて、E2Eのゴールデンパス1・5(訪問者)、3・4(メンバー)、2・6・7(Owner)がそれぞれ役割バッジの表示および操作ボタンの有無を検証している。[Definition of Done 2.3](../requirements/002-definition-of-done.md#23-フロントエンドのテスト)の3つ目の基準を満たす。

## 3. CI — 未構築(前回から変更なし)

`.github/workflows`等のCI設定ファイルは存在しない。上記の結果はすべて開発者のローカル環境での実行結果であり、プルリクエストや`main`ブランチへのプッシュ時に自動検証される仕組みはまだない。[Definition of Done](../requirements/002-definition-of-done.md)の唯一の残存未達項目。

## 4. 今後の対応

[Definition of Done](../requirements/002-definition-of-done.md)を完全に満たすには、以下が必要:

1. GitHub Actions等でCIを構築し、コントラクト(`forge test` / `forge coverage` / `forge fmt --check` / `forge lint`)とフロントエンド(`tsc` / `eslint` / `prettier --check` / `next build` / Vitest / Playwright)をPR時に自動実行する
2. Vercelへの実際のデプロイ(現状はローカルビルド成功のみで確認)

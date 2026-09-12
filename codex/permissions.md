# コマンドの承認設定

`rules/claude.rules` は `claude/settings.json` の Bash 許可設定をもとにしたグローバルルールです。
`~/.codex/rules` からリンクし、Codex の再起動後に読み込ませます。
モードの選択は変更しません。Ask for approval でも利用できます。

- `allow`：Git、uv、npm、npx、jq、GitHub の閲覧コマンドなど、列挙した接頭辞を常時許可します。
- `prompt`：push、PR の作成や変更、Issue の作成や変更、API の更新、npm のインストールや公開を確認対象にします。
- `forbidden`：列挙した引数順の main/master への force push、ルートやホーム全体の削除、`sed -i` を禁止します。

Codex はコマンドの引数を前方一致で判定します。
複数ルールが一致した場合は `forbidden`、`prompt`、`allow` の順に優先します。
Auto-review が有効な場合、対象となる確認要求は自動レビューに回ります。

## Claude と異なる点

- `gh api repos/*` と `gh api orgs/*` は、引数内のワイルドカードを表現できないため許可しません。`gh api -X GET ...` は許可対象です。
- `uv sync*` など末尾のワイルドカードは、`uv sync` という完全な引数に限定します。`uv sync-other` のような別名まで許可しません。
- `find * -delete*`、`find * -exec *`、`find * -execdir *`、`sed -i.bak`、ホーム配下の削除パターンなどは完全には移植できません。これらのコマンドを包括的に許可するルールは追加していません。
- 禁止ルールはあらゆる等価表記を検出するものではありません。オプションの順序変更や別形式のコマンドまで完全に一致するとは限りません。
- Claude の Read/Edit/Write、WebSearch/WebFetch、MCP の許可、additionalDirectories はこのコマンドルールの対象外で、既存の Codex 設定を維持します。

承認画面から追加される `default.rules` と、ここで管理する `claude.rules` は両方読み込まれます。
このファイルは自動同期ではないため、Claude 側の設定を変えた場合は必要な差分を反映します。

仕様：[Codex Rules](https://learn.chatgpt.com/docs/agent-configuration/rules)

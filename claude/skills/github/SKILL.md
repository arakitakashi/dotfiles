---
name: github
description: "`gh` CLIを使用してGitHub手続きをします。`gh issue`、`gh pr`、`gh run`、`gh api`を使用して、Issue、PR、CI実行、高度なクエリを実行できます。"
---

# GitHub スキル

`gh` CLIを使用してGitHubと対話します。gitディレクトリ外で実行する場合は、必ず`--repo owner/repo`を指定するか、URLを直接使用してください。

## プルリクエスト

PRのCIステータスを確認：

```bash
gh pr checks 55 --repo owner/repo
```

最近のワークフロー実行をリスト表示：

```bash
gh run list --repo owner/repo --limit 10
```

実行の詳細を表示し、どのステップが失敗したかを確認：

```bash
gh run view <run-id> --repo owner/repo
```

失敗したステップのログのみを表示：

```bash
gh run view <run-id> --repo owner/repo --log-failed
```

## 高度なクエリ用API

`gh api`コマンドは、他のサブコマンドでは利用できないデータにアクセスする際に便利です。

特定のフィールドを指定してPRを取得：

```bash
gh api repos/owner/repo/pulls/55 --jq '.title, .state, .user.login'
```

## JSON出力

ほとんどのコマンドは構造化された出力のために`--json`をサポートしています。`--jq`を使用してフィルタリングできます：

```bash
gh issue list --repo owner/repo --json number,title --jq '.[] | "\(.number): \(.title)"'
```

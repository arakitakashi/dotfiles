---
name: agent-engine-deploy
description: Vertex AI Agent Engine (Reasoning Engine) を Terraform でデプロイするためのガイド。ADK Agent の source_code_spec デプロイ、AdkApp ラッパー、null_resource によるビルドパイプラインの知見を提供する。Agent Engine、Reasoning Engine、ADK Agent のデプロイ、Terraform での AI エージェント管理に関するタスクで使用する。
---

# Agent Engine Deploy

Vertex AI Agent Engine (google_vertex_ai_reasoning_engine) を Terraform の `source_code_spec` でデプロイするためのガイド。

## 前提条件

- Google Provider **`~> 7.0`** (v7.13.0+ で `google_vertex_ai_reasoning_engine` が利用可能)
- ADK Agent（`google.adk.agents.Agent`）が定義済み

## 重要な制約

### AdkApp ラッパーが必須

Agent Engine は entrypoint_object に `query` / `async_query` メソッドを要求する。ADK の `Agent`（`LlmAgent`）はこれらを持たないため、**`AdkApp` でラップする必要がある**。

```python
# src/chat/agent/app.py - Agent Engine 用エントリーポイント
from vertexai.preview import reasoning_engines
from chat.agent.agent import root_agent

app = reasoning_engines.AdkApp(
    agent=root_agent,
    enable_tracing=True,
)
```

直接 `Agent` を entrypoint にすると以下のエラーで起動失敗する:
```
Class LlmAgent is missing all methods `query`, `async_query`, `stream_query`...
```

### archive_file は zip のみ対応

Terraform の `data "archive_file"` は `zip` のみ。`source_code_spec` の `inline_source` は **tar.gz** を要求するため、`null_resource` + `tar czf` でビルドする。

### テレメトリ環境変数が必須（API デプロイ時）

Python SDK は内部でテレメトリ変数を設定するが、Terraform（API 経由）では **`deployment_spec.env` で明示的に設定しないとダッシュボード・トレースが使えない**。

```hcl
deployment_spec {
  env {
    name  = "GOOGLE_CLOUD_AGENT_ENGINE_ENABLE_TELEMETRY"
    value = "true"
  }
  env {
    name  = "OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT"
    value = "true"
  }
}
```

### data "local_file" の depends_on パターン

`filebase64()` は plan 時に評価されるため、ビルド後のファイルを読めない。`data "local_file"` + `depends_on` を使えば **apply 時に遅延評価** される。

## デプロイフロー

```
null_resource (tar.gz ビルド)
  ↓ depends_on
data "local_file" (apply 時に base64 読み取り)
  ↓
google_vertex_ai_reasoning_engine (Agent Engine デプロイ)
  ↓
Cloud Run 等の環境変数に ID 注入
```

## Terraform 実装パターン

完全な Terraform 設定例は [references/terraform-pattern.md](references/terraform-pattern.md) を参照。

主要ポイント:
- `source_code_spec.inline_source.source_archive`: `data.local_file.*.content_base64`
- `python_spec.entrypoint_module`: AdkApp を定義したモジュール（例: `chat.agent.app`）
- `python_spec.entrypoint_object`: AdkApp インスタンス名（例: `app`）
- `python_spec.requirements_file`: アーカイブ内の requirements.txt パス

## tar.gz アーカイブ構成

```
./
├── requirements.txt          # Agent Engine ランタイム用依存関係
└── chat/
    ├── __init__.py
    └── agent/
        ├── __init__.py
        ├── agent.py          # ADK Agent 定義 (root_agent)
        ├── app.py            # AdkApp ラッパー (entrypoint)
        └── tools.py          # ツール関数
```

requirements.txt の内容（バージョン下限はダッシュボード・トレース機能に必須）:
```
google-cloud-aiplatform[adk,agent_engines]>=1.126.1
google-cloud-bigquery
google-adk>=1.18.0
```

## トラブルシューティング

よくあるエラーと解決策は [references/troubleshooting.md](references/troubleshooting.md) を参照。

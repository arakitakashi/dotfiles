# トラブルシューティング

## エラー一覧

### 1. LlmAgent is missing all methods `query`, `async_query`...

```
UserCodeControlPlaneError: Class LlmAgent is missing all methods
`query`, `async_query`, `stream_query`, `bidi_stream_query` and
`async_stream_query`.
```

**原因**: ADK の `Agent` を直接 entrypoint_object に指定している。

**解決**: `AdkApp` でラップしたモジュールを entrypoint にする。

```python
# app.py
from vertexai.preview import reasoning_engines
from chat.agent.agent import root_agent

app = reasoning_engines.AdkApp(agent=root_agent, enable_tracing=True)
```

```hcl
python_spec {
  entrypoint_module = "chat.agent.app"  # app.py のモジュールパス
  entrypoint_object = "app"             # AdkApp インスタンス名
}
```

### 2. Reasoning Engine failed to start and cannot serve traffic

**原因**: 複数の可能性がある。

**調査方法**:
```bash
gcloud logging read \
  'resource.type="aiplatform.googleapis.com/ReasoningEngine" resource.labels.reasoning_engine_id="<ID>"' \
  --project=<PROJECT_ID> \
  --limit=30 \
  --format='json(textPayload,jsonPayload,severity,timestamp)'
```

**よくある原因**:
- entrypoint_object が正しくない
- requirements.txt に不足がある
- ソースアーカイブにモジュールが含まれていない

### 3. filebase64() でファイルが見つからない

**原因**: `filebase64()` は plan 時に評価されるため、ビルド前のファイルを読めない。

**解決**: `data "local_file"` + `depends_on` パターンを使う。

```hcl
data "local_file" "agent_source_archive" {
  filename   = "${path.module}/.build/agent-source.tar.gz"
  depends_on = [null_resource.agent_source_build]
}
```

`depends_on` により apply フェーズまで評価が遅延される。plan 時は `(known after apply)` と表示される。

### 4. Provider v6.x で google_vertex_ai_reasoning_engine が使えない

**原因**: `google_vertex_ai_reasoning_engine` は v7.13.0 で追加された。

**解決**:
```hcl
required_providers {
  google = {
    source  = "hashicorp/google"
    version = "~> 7.0"
  }
}
```

アップグレード後に `terraform init -upgrade` を実行。

### 5. tar.gz 内のモジュールが見つからない

**原因**: アーカイブ内のディレクトリ構造が正しくない。

**確認方法**:
```bash
tar tzf infra/.build/agent-source.tar.gz
```

**正しい構造** (`tar czf ... -C "$BUILD_DIR" .` で作成):
```
./requirements.txt
./chat/__init__.py
./chat/agent/__init__.py
./chat/agent/agent.py
./chat/agent/app.py
./chat/agent/tools.py
```

`-C` オプションで BUILD_DIR をルートにすることが重要。

### 6. ダッシュボードとトレースが「使用不能」と表示される

**原因**: API 経由（Terraform 含む）のデプロイではテレメトリ環境変数が自動設定されない。Python SDK の `agent_engines.create()` は内部で設定するが、Terraform では明示的に指定が必要。

**解決**: `deployment_spec.env` でテレメトリ環境変数を設定する。

```hcl
spec {
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
}
```

また、依存パッケージのバージョン下限も必須:
- `google-cloud-aiplatform[adk,agent_engines]>=1.126.1`
- `google-adk>=1.18.0`

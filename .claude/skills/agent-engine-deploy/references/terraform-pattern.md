# Terraform 設定パターン

## 完全な agent_engine.tf の例

```hcl
# --------------------------------------------------
# Vertex AI Agent Engine (Reasoning Engine)
# --------------------------------------------------

# --- ソースハッシュ（変更検知用） ---
locals {
  agent_source_hash = sha1(join("", [
    for f in sort(fileset("${path.module}/../src/chat/agent", "**")) :
    filemd5("${path.module}/../src/chat/agent/${f}")
    if !can(regex("__pycache__", f))
  ]))
  chat_init_hash = filemd5("${path.module}/../src/chat/__init__.py")

  # name は "projects/.../reasoningEngines/ID" 形式 or ID のみ
  agent_engine_id = regex("[^/]+$", google_vertex_ai_reasoning_engine.agent.name)
}

# --- ソースアーカイブのビルド ---
resource "null_resource" "agent_source_build" {
  triggers = {
    agent_hash = local.agent_source_hash
    chat_init  = local.chat_init_hash
  }

  provisioner "local-exec" {
    command = <<-EOT
      set -e
      BUILD_DIR="${path.module}/.build/agent-source"
      rm -rf "$BUILD_DIR"
      mkdir -p "$BUILD_DIR/chat/agent"

      # ソースコピー
      cp "${path.module}/../src/chat/__init__.py" "$BUILD_DIR/chat/"
      cp "${path.module}/../src/chat/agent/__init__.py" "$BUILD_DIR/chat/agent/"
      cp "${path.module}/../src/chat/agent/agent.py" "$BUILD_DIR/chat/agent/"
      cp "${path.module}/../src/chat/agent/app.py" "$BUILD_DIR/chat/agent/"
      cp "${path.module}/../src/chat/agent/tools.py" "$BUILD_DIR/chat/agent/"

      # requirements.txt（バージョン下限はダッシュボード・トレースに必須）
      cat > "$BUILD_DIR/requirements.txt" <<'REQ'
google-cloud-aiplatform[adk,agent_engines]>=1.126.1
google-cloud-bigquery
google-adk>=1.18.0
REQ

      # __pycache__ 除去
      find "$BUILD_DIR" -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

      # tar.gz 作成
      tar czf "${path.module}/.build/agent-source.tar.gz" -C "$BUILD_DIR" .
    EOT
  }
}

# --- アーカイブ読み取り（apply 時に評価） ---
data "local_file" "agent_source_archive" {
  filename   = "${path.module}/.build/agent-source.tar.gz"
  depends_on = [null_resource.agent_source_build]
}

# --- Reasoning Engine リソース ---
resource "google_vertex_ai_reasoning_engine" "agent" {
  display_name = "product-concierge"
  description  = "商品コンシェルジュエージェント"
  region       = var.region

  spec {
    agent_framework = "google-adk"

    source_code_spec {
      inline_source {
        source_archive = data.local_file.agent_source_archive.content_base64
      }

      python_spec {
        entrypoint_module = "chat.agent.app"
        entrypoint_object = "app"
        requirements_file = "requirements.txt"
        version           = "3.11"
      }
    }

    # ダッシュボード・トレース機能の有効化（API デプロイ時は必須）
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

  depends_on = [google_project_service.apis]
}
```

## Cloud Run への ID 注入

```hcl
resource "google_cloud_run_v2_service" "chat_ui" {
  # ...
  depends_on = [
    null_resource.chat_ui_build,
    google_vertex_ai_reasoning_engine.agent,
  ]

  template {
    containers {
      # ...
      env {
        name  = "AGENT_ENGINE_ID"
        value = local.agent_engine_id
      }
    }
  }
}
```

## outputs.tf

```hcl
output "agent_engine_id" {
  description = "Agent Engine の ID"
  value       = local.agent_engine_id
}

output "agent_engine_name" {
  description = "Agent Engine のフルリソース名"
  value       = google_vertex_ai_reasoning_engine.agent.name
}
```

## provider 要件

```hcl
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }
}
```

`google_vertex_ai_reasoning_engine` は v7.13.0 で追加。v6.x からのアップグレード時は `terraform init -upgrade` が必要。

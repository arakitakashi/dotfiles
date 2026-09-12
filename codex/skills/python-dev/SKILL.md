---
name: python-dev
description: Pythonプロジェクトで作業するときの環境・ツール規約（mise/uv/ruff/pyright、型ヒント必須、pathlib、コンテキストマネージャ、禁止事項）。Pythonコードの作成・編集、依存関係の追加/削除、スクリプト実行、lint/format/型チェックを行う際に必ず参照する。Python・uv・ruff・mise・pyproject.toml が関わる作業でトリガーする。
---

# Python 開発ルール

このPCで Python を使用する際に常に従うルール。

## 環境管理

- **バージョン管理**: mise を使用（pyenv は使わない）
- **デフォルトバージョン**: Python 3.13（`~/.config/mise/config.toml` で設定済み）
- **パッケージマネージャ**: uv を使用（pip, pip install は使わない）
- **仮想環境**: uv が自動管理する `.venv` を使用（`python -m venv` は使わない）

## プロジェクト操作

- **プロジェクト初期化**: `uv init`
- **パッケージ追加**: `uv add <package>`
- **開発用パッケージ追加**: `uv add --dev <package>`
- **パッケージ削除**: `uv remove <package>`
- **スクリプト実行**: `uv run python script.py`
- **依存関係の同期**: `uv sync`
- **ロックファイル**: `uv.lock` はコミットに含める

## コード品質ツール

- **リンタ・フォーマッタ**: ruff を使用（flake8, black, isort は使わない）
  - フォーマット: `uv run ruff format`
  - リントチェック: `uv run ruff check`
  - リント自動修正: `uv run ruff check --fix`
- **型チェック**: pyright または mypy を使用（プロジェクトの設定に従う）

## コーディング規約

- 型ヒントを必ず使用する
- f-string を文字列フォーマットに使用する（`.format()` や `%` は避ける）
- `pathlib.Path` をファイルパス操作に使用する（`os.path` より優先）
- コンテキストマネージャ（`with` 文）をリソース管理に使用する

## 禁止事項

- `pip install` を直接実行しない（必ず `uv add` を使う）
- `python -m venv` で仮想環境を手動作成しない
- グローバル環境にパッケージをインストールしない
- `requirements.txt` を手動管理しない（`pyproject.toml` + `uv.lock` で管理）

> 補足: PostToolUse フック（`ruff_format.py`）が、pyproject.toml を持つプロジェクト内の .py 編集時に `uv run ruff format` と `ruff check --fix` を自動実行する。フォーマットは決定論的に保証されるので、手動整形は不要。

# 提示词优化 CLI 工具

一个基于测试用例驱动的方式，自动化迭代优化语言模型（LLM）提示词（Prompt）的命令行工具。

## 功能特点

- 通过测试用例驱动的方式评估提示词性能
- 自动优化提示词，提高测试用例通过率
- 支持自动和手动交互两种模式
- 保存优化过程的检查点，支持随时恢复
- 跟踪并显示token使用情况
- 支持token预算控制

## 安装

1. 克隆仓库：
   ```bash
   git clone [仓库地址]
   cd ok-prompt/backend
   ```

2. 安装依赖：
   ```bash
   pip install -r requirement.txt
   ```

3. 设置配置文件：
   ```bash
   python setup_config.py
   ```
   按照提示输入各LLM服务的API密钥。

## 配置文件

LLM的API密钥等敏感信息存储在 `core/llm/config.json` 文件中，该文件已被添加到 `.gitignore` 以避免提交到Git仓库。

如果您需要手动设置配置文件，请复制 `core/llm/config_template.json` 为 `core/llm/config.json`，然后在其中填入您的API密钥。

## 使用方法

基本用法：

```bash
python main.py --test-set <测试集文件路径> --initial-prompt "初始提示词"
```

完整参数：

```bash
python main.py --test-set <测试集文件路径> --initial-prompt "初始提示词" --iteration-mode auto --max-iterations 20 --checkpoint-dir "检查点目录" --token-budget 50000
```

从检查点恢复：

```bash
python main.py --test-set <测试集文件路径> --resume-from <检查点文件路径>
```

## 测试集格式

测试集文件是一个JSON文件，格式如下：

```json
{
  "mode": "strict | descriptive",
  "data": [
    {
      "input": "张三 17812341234",
      "output": "张三"
    },
    {
      "input": "李四 13987654321",
      "output": "李四"
    }
  ]
}
```

- `mode`: 测试模式
  - `strict`: 输出必须与期望完全匹配
  - `descriptive`: 输出必须符合描述性要求

## 参数说明

- `--test-set`: 测试集文件路径（必需）
- `--initial-prompt`: 初始提示词（从头开始优化时必需）
- `--iteration-mode`: 迭代模式，可选 `auto`（全自动）或 `manual_review`（每轮审查）
- `--max-iterations`: 最大迭代次数，默认20
- `--checkpoint-dir`: 检查点保存目录，默认"prompt_optimizer_checkpoints"
- `--resume-from`: 从指定检查点文件恢复
- `--token-budget`: token预算上限，达到此值时停止优化

## 注意事项

- 配置文件包含敏感信息，请不要将其提交到公共仓库
- 使用 `--token-budget` 参数可以控制API调用成本 
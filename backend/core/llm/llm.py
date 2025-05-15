import json
import os
import openai


def load_config():
    """加载LLM配置信息"""
    # 首先尝试加载实际配置文件
    config_path = os.path.join(os.path.dirname(__file__), "config.json")
    
    # 如果实际配置文件不存在，尝试使用模板文件
    if not os.path.exists(config_path):
        template_path = os.path.join(os.path.dirname(__file__), "config_template.json")
        
        if os.path.exists(template_path):
            print("警告: 正在使用配置模板文件。请创建实际的配置文件config.json")
            config_path = template_path
        else:
            raise FileNotFoundError("错误: 找不到LLM配置文件。请根据config_template.json创建config.json文件")
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config_data = json.load(f)
            return config_data.get("llm_config", [])
    except Exception as e:
        raise Exception(f"加载LLM配置文件失败: {str(e)}")


# 加载LLM配置
try:
    llm_config = load_config()
except Exception as e:
    print(f"错误: {str(e)}")
    # 使用环境变量作为备选方案
    # 这里使用占位符，实际项目中可能需要从环境变量中获取API密钥
    llm_config = [
        {
            "name": "qwen-plus-1127",
            "api_key": os.environ.get("QWEN_API_KEY", ""),
            "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        },
        {
            "name": "qwen/qwen3-32b:free",
            "api_key": os.environ.get("OPENROUTER_API_KEY", ""),
            "base_url": "https://openrouter.ai/api/v1",
        }
    ]

llm_clients = {}

for config in llm_config:
    if config.get("api_key"):  # 只在有API密钥的情况下初始化客户端
        llm_clients[config["name"]] = openai.OpenAI(
            api_key=config["api_key"],
            base_url=config["base_url"]
        )
    else:
        print(f"警告: 模型 {config['name']} 未设置API密钥，将无法使用")

def invoke_llm(model, **kwargs):
    if model not in llm_clients:
        raise ValueError(f"错误: 找不到模型 '{model}' 的客户端。请检查配置文件并确保设置了正确的API密钥")
    
    client = llm_clients[model]
    return client.chat.completions.create(model=model, **kwargs)
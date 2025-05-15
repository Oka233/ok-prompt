#!/usr/bin/env python
"""
配置文件设置脚本
帮助用户从模板创建并配置LLM配置文件
"""

import json
import os
import shutil
from pathlib import Path


def setup_config():
    """设置LLM配置文件"""
    script_dir = Path(__file__).parent
    template_path = script_dir / "core" / "llm" / "config_template.json"
    config_path = script_dir / "core" / "llm" / "config.json"
    
    # 检查模板是否存在
    if not template_path.exists():
        print(f"错误: 找不到模板文件 {template_path}")
        return False
    
    # 检查配置文件是否已存在
    if config_path.exists():
        overwrite = input(f"配置文件 {config_path} 已存在。是否覆盖? (y/n): ").lower()
        if overwrite != 'y':
            print("操作已取消。")
            return False
    
    # 复制模板文件
    try:
        with open(template_path, 'r', encoding='utf-8') as f:
            config_data = json.load(f)
        
        # 请求用户输入API密钥
        for model_config in config_data.get("llm_config", []):
            name = model_config.get("name", "未知模型")
            api_key = input(f"请输入模型 '{name}' 的API密钥: ").strip()
            if api_key:
                model_config["api_key"] = api_key
        
        # 保存配置文件
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config_data, f, ensure_ascii=False, indent=2)
        
        print(f"配置文件已成功创建: {config_path}")
        
        # 确保配置文件在.gitignore中
        gitignore_path = script_dir / ".gitignore"
        if gitignore_path.exists():
            with open(gitignore_path, 'r', encoding='utf-8') as f:
                gitignore_content = f.read()
            
            if "core/llm/config.json" not in gitignore_content:
                with open(gitignore_path, 'a', encoding='utf-8') as f:
                    f.write("\n# LLM配置文件（包含API密钥）\ncore/llm/config.json\n")
                print("已将配置文件添加到.gitignore")
        
        return True
    
    except Exception as e:
        print(f"设置配置文件时出错: {str(e)}")
        return False


if __name__ == "__main__":
    print("===== LLM配置文件设置 =====")
    print("此脚本将帮助您创建LLM配置文件，用于存储API密钥等敏感信息。")
    print("配置文件将存储在 core/llm/config.json，并已加入.gitignore以避免提交到Git仓库。")
    print("================================================")
    
    if setup_config():
        print("\n配置完成！请确保不要将包含API密钥的配置文件提交到公共仓库。")
    else:
        print("\n配置失败。请检查错误信息并重试。") 
import argparse
import json
import os
import pickle
import sys
from pathlib import Path

from core.optimizer import Optimizer


def validate_test_set(test_set_path):
    """检查测试集文件是否存在、格式是否正确"""
    if not os.path.exists(test_set_path):
        print(f"错误: 测试集文件不存在: {test_set_path}")
        return False
    
    try:
        with open(test_set_path, 'r', encoding='utf-8') as f:
            test_set = json.load(f)
            
        # 检查必需字段
        if "mode" not in test_set:
            print("错误: 测试集文件缺少 'mode' 字段")
            return False
        
        if test_set["mode"] not in ["strict", "descriptive"]:
            print(f"错误: 测试集模式无效，必须是 'strict' 或 'descriptive'，而不是 '{test_set['mode']}'")
            return False
        
        if "data" not in test_set or not isinstance(test_set["data"], list):
            print("错误: 测试集文件缺少 'data' 数组字段")
            return False
        
        # 检查每个测试用例是否有必需字段
        for i, case in enumerate(test_set["data"]):
            if "input" not in case:
                print(f"错误: 测试用例 #{i} 缺少 'input' 字段")
                return False
            if "output" not in case:
                print(f"错误: 测试用例 #{i} 缺少 'output' 字段")
                return False
        
        return True
    except json.JSONDecodeError:
        print(f"错误: 测试集文件不是有效的 JSON 格式: {test_set_path}")
        return False
    except Exception as e:
        print(f"错误: 验证测试集文件时出错: {str(e)}")
        return False


def load_checkpoint(checkpoint_path):
    """从检查点加载状态"""
    try:
        # 检查文件扩展名来确定格式
        if checkpoint_path.endswith('.json'):
            with open(checkpoint_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        else:
            # 兼容旧版pkl格式
            with open(checkpoint_path, 'rb') as f:
                return pickle.load(f)
    except Exception as e:
        print(f"错误: 无法加载检查点文件 {checkpoint_path}: {str(e)}")
        sys.exit(1)


def main():
    # 1. 解析命令行参数
    parser = argparse.ArgumentParser(description="提示词优化CLI工具")
    
    # 必需参数
    parser.add_argument("--test-set", required=True, help="测试集 JSON 文件路径")
    parser.add_argument("--initial-prompt", help="初始提示词文本")
    
    # 可选参数
    parser.add_argument("--iteration-mode", choices=["auto", "manual_review"], default="auto",
                        help="迭代模式: auto(全自动) 或 manual_review(每轮审查)")
    parser.add_argument("--max-iterations", type=int, default=20, help="最大迭代次数")
    parser.add_argument("--checkpoint-dir", default="prompt_optimizer_checkpoints",
                        help="存储检查点的目录路径")
    parser.add_argument("--resume-from", help="从指定的检查点文件恢复")
    parser.add_argument("--token-budget", type=int, help="token预算上限，达到此值时停止优化")
    
    args = parser.parse_args()
    
    # 2. 检查并创建检查点目录
    checkpoint_dir = Path(args.checkpoint_dir)
    checkpoint_dir.mkdir(exist_ok=True, parents=True)
    
    # 3. 验证测试集
    if not validate_test_set(args.test_set):
        sys.exit(1)
    
    # 4. 初始化或从检查点恢复
    if args.resume_from:
        print(f"正在从检查点恢复: {args.resume_from}")
        checkpoint_data = load_checkpoint(args.resume_from)
        
        # 从检查点数据中提取信息
        current_prompt = checkpoint_data.get("current_prompt")
        iteration_count = checkpoint_data.get("iteration_count", 1)
        test_set_path = checkpoint_data.get("test_set_path", args.test_set)
        max_iterations = checkpoint_data.get("max_iterations", args.max_iterations)
        iteration_mode = checkpoint_data.get("iteration_mode", args.iteration_mode)
        token_budget = checkpoint_data.get("token_budget", args.token_budget)
        total_tokens_used = checkpoint_data.get("total_tokens_used", 0)
        
        print(f"恢复成功: 当前迭代 #{iteration_count}, 当前提示词: '{current_prompt[:50]}...'")
        if token_budget:
            print(f"Token预算: {token_budget}, 已使用: {total_tokens_used}")
    else:
        # 检查初始提示词是否提供
        if not args.initial_prompt:
            print("错误: 当不从检查点恢复时，必须提供 --initial-prompt 参数")
            sys.exit(1)
            
        current_prompt = args.initial_prompt
        iteration_count = 1
        test_set_path = args.test_set
        max_iterations = args.max_iterations
        iteration_mode = args.iteration_mode
        token_budget = args.token_budget
        
        if token_budget:
            print(f"已设置token预算上限: {token_budget}")
    
    # 5. 初始化优化器
    optimizer = Optimizer(
        init_prompt=current_prompt,
        dataset=test_set_path,
        mode=iteration_mode,
        human_feedback=(iteration_mode == "manual_review"),
        token_budget=token_budget
    )
    
    # 如果从检查点恢复，传递更多状态信息
    if args.resume_from:
        optimizer.iteration_count = iteration_count
        optimizer.total_tokens_used = total_tokens_used
        # 根据实际Optimizer类实现，可能需要传递更多状态
    
    # 6. 设置最大迭代次数
    optimizer.max_iterations = max_iterations
    
    # 7. 设置检查点目录
    optimizer.checkpoint_dir = str(checkpoint_dir)
    
    # 8. 开始优化流程
    try:
        print(f"开始提示词优化流程 - 模式: {iteration_mode}, 最大迭代次数: {max_iterations}")
        print(f"初始提示词: '{current_prompt[:100]}...'")
        
        result = optimizer.optimize()
        
        print("\n" + "="*50)
        print("优化流程完成!")
        print(f"最终提示词: '{result[:100]}...'")
        print(f"总计使用token: {optimizer.total_tokens_used}")
        print("完整结果已保存到检查点目录")
    except KeyboardInterrupt:
        print("\n用户中断，优化流程已停止")
    except Exception as e:
        print(f"\n错误: 优化过程中发生异常: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
import json
import os
import pickle
import time
from pathlib import Path

from core.llm.llm import invoke_llm

class Optimizer:
    def __init__(self, init_prompt, dataset, mode, human_feedback=False, token_budget=None):
        """
        初始化优化器
        
        Args:
            init_prompt: 初始提示词
            dataset: 测试集文件路径
            mode: 迭代模式 ("auto" 或 "manual_review")
            human_feedback: 是否需要人工反馈
            token_budget: token预算，达到此值时停止优化
        """
        self.human_feedback = human_feedback
        self.init_prompt = init_prompt
        self.current_prompt = init_prompt
        self.dataset_path = dataset
        self.iteration_mode = mode
        self.iteration_count = 1
        self.max_iterations = 20
        self.checkpoint_dir = "prompt_optimizer_checkpoints"
        self.prompt_history = []
        self.test_results = []
        self.total_tokens_used = 0
        self.token_budget = token_budget
        self.load_test_set()
        
    def load_test_set(self):
        """加载测试集文件"""
        try:
            with open(self.dataset_path, 'r', encoding='utf-8') as f:
                self.test_set = json.load(f)
        except Exception as e:
            raise Exception(f"加载测试集文件时出错: {str(e)}")
        
    def save_checkpoint(self):
        """保存当前优化状态到检查点（使用JSON格式）"""
        # 创建可JSON序列化的检查点数据
        checkpoint_data = {
            "current_prompt": self.current_prompt,
            "iteration_count": self.iteration_count,
            "test_set_path": self.dataset_path,
            "max_iterations": self.max_iterations,
            "iteration_mode": self.iteration_mode,
            "total_tokens_used": self.total_tokens_used,
            "token_budget": self.token_budget,
            # 简化prompt_history以便于存储和查看
            "prompt_history": [
                {
                    "iteration": record["iteration"],
                    "prompt": record["prompt"],
                    "avg_score": record["avg_score"],
                    "perfect_score_count": record["perfect_score_count"],
                    "total_cases": record["total_cases"],
                    "summary_report": record["summary_report"],
                }
                for record in self.prompt_history
            ]
        }
        
        checkpoint_path = Path(self.checkpoint_dir) / f"checkpoint_iter_{self.iteration_count}_{int(time.time())}.json"
        
        try:
            with open(checkpoint_path, 'w', encoding='utf-8') as f:
                json.dump(checkpoint_data, f, ensure_ascii=False, indent=2)
            print(f"检查点已保存: {checkpoint_path}")
            return str(checkpoint_path)
        except Exception as e:
            print(f"保存检查点失败: {str(e)}")
            return None

    def load_checkpoint(self, checkpoint_path):
        """从检查点恢复状态"""
        try:
            # 检查文件扩展名来确定格式
            if checkpoint_path.endswith('.json'):
                with open(checkpoint_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            else:
                # 兼容旧版pkl格式
                with open(checkpoint_path, 'rb') as f:
                    data = pickle.load(f)
                
            self.current_prompt = data.get("current_prompt", self.current_prompt)
            self.iteration_count = data.get("iteration_count", self.iteration_count)
            self.dataset_path = data.get("test_set_path", self.dataset_path)
            self.max_iterations = data.get("max_iterations", self.max_iterations)
            self.iteration_mode = data.get("iteration_mode", self.iteration_mode)
            self.prompt_history = data.get("prompt_history", [])
            self.total_tokens_used = data.get("total_tokens_used", 0)
            self.token_budget = data.get("token_budget", self.token_budget)
            
            # 重新加载测试集
            self.load_test_set()
            
            print(f"从检查点恢复成功，当前已用token: {self.total_tokens_used}")
            return True
        except Exception as e:
            print(f"从检查点恢复失败: {str(e)}")
            return False
            
    def execute_tests(self):
        """执行测试集上的所有测试用例"""
        current_iteration_results = []
        
        print(f"\n执行测试 (迭代 #{self.iteration_count})...")
        
        for case_index, case in enumerate(self.test_set["data"]):
            # 构建输入
            full_input = f"{self.current_prompt}\n\n输入文本：\n{case['input']}\n\n提取结果："
            
            print(f"测试用例 #{case_index}: '{case['input'][:30]}...'")
            
            # 调用目标LLM
            try:
                response = invoke_llm(
                    model="qwen-plus-1127",  # 目标LLM
                    stream=False,
                    messages=[
                        {"role": "user", "content": full_input}
                    ],
                )
                
                # 记录token使用情况
                prompt_tokens = response.usage.prompt_tokens if hasattr(response, 'usage') and hasattr(response.usage, 'prompt_tokens') else 0
                completion_tokens = response.usage.completion_tokens if hasattr(response, 'usage') and hasattr(response.usage, 'completion_tokens') else 0
                total_tokens = response.usage.total_tokens if hasattr(response, 'usage') and hasattr(response.usage, 'total_tokens') else 0
                
                self.total_tokens_used += total_tokens
                
                print(f"  用例 #{case_index} Token使用: 输入={prompt_tokens}, 输出={completion_tokens}, 总计={total_tokens}")
                
                actual_output = response.choices[0].message.content.strip()
                
                # 初始化结果对象
                result = {
                    "case_index": case_index,
                    "input": case["input"],
                    "expected_guideline_or_output": case["output"],
                    "actual_output_by_target_llm": actual_output,
                    "needs_eval_llm_assessment": True,
                    "evaluation_score_by_eval_llm": None,
                    "evaluation_reasoning_by_eval_llm": None,
                    "token_usage": {
                        "prompt_tokens": prompt_tokens,
                        "completion_tokens": completion_tokens,
                        "total_tokens": total_tokens
                    }
                }
                
                # 处理strict模式下的精确匹配
                if self.test_set["mode"] == "strict":
                    if actual_output == case["output"]:
                        result["evaluation_score_by_eval_llm"] = 5
                        result["evaluation_reasoning_by_eval_llm"] = "系统判定：strict模式下，输出与期望完全匹配。"
                        result["needs_eval_llm_assessment"] = False
                
                current_iteration_results.append(result)
                
            except Exception as e:
                print(f"执行测试用例时出错: {str(e)}")
                # 添加失败的测试结果
                current_iteration_results.append({
                    "case_index": case_index,
                    "input": case["input"],
                    "expected_guideline_or_output": case["output"],
                    "actual_output_by_target_llm": f"错误: {str(e)}",
                    "needs_eval_llm_assessment": False,
                    "evaluation_score_by_eval_llm": 1,
                    "evaluation_reasoning_by_eval_llm": f"执行失败: {str(e)}",
                    "token_usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
                })
        
        print(f"本轮测试总计token使用: {self.total_tokens_used}")
        return current_iteration_results
    
    def evaluate_results(self, results):
        """由评估LLM对测试结果进行评估"""
        print(f"\n评估测试结果...")
        
        evaluation_tokens_used = 0
        
        for result in results:
            if result["needs_eval_llm_assessment"]:
                # 构建评估输入
                prompt_for_evaluation = f"""
                请评估以下任务的完成质量。
                原始任务描述（提示词）：
                '{self.current_prompt}'

                测试输入：
                '{result["input"]}'
                """

                if self.test_set["mode"] == "strict":
                    prompt_for_evaluation += f"""
                期望输出（严格匹配）：
                '{result["expected_guideline_or_output"]}'
                """
                elif self.test_set["mode"] == "descriptive":
                    prompt_for_evaluation += f"""
                输出要求与期望（描述性）：
                '{result["expected_guideline_or_output"]}'
                """

                prompt_for_evaluation += f"""
                实际输出：
                '{result["actual_output_by_target_llm"]}'

                请根据实际输出与期望的匹配程度/符合程度，以及是否准确完成了原始任务描述的目标，给出一个1到5的评分（1为最差，5为完美）。
                请同时提供简要的评估理由。

                评分（1-5）：
                评估理由：
                """
                
                # 调用评估LLM
                try:
                    response = invoke_llm(
                        model="qwen-plus-1127",  # 评估LLM
                        stream=False,
                        messages=[
                            {"role": "user", "content": prompt_for_evaluation}
                        ],
                    )
                    
                    # 记录token使用情况
                    prompt_tokens = response.usage.prompt_tokens if hasattr(response, 'usage') and hasattr(response.usage, 'prompt_tokens') else 0
                    completion_tokens = response.usage.completion_tokens if hasattr(response, 'usage') and hasattr(response.usage, 'completion_tokens') else 0
                    total_tokens = response.usage.total_tokens if hasattr(response, 'usage') and hasattr(response.usage, 'total_tokens') else 0
                    
                    self.total_tokens_used += total_tokens
                    evaluation_tokens_used += total_tokens
                    
                    result["token_usage"]["evaluation"] = {
                        "prompt_tokens": prompt_tokens,
                        "completion_tokens": completion_tokens,
                        "total_tokens": total_tokens
                    }
                    
                    eval_response = response.choices[0].message.content.strip()
                    
                    # 解析评分和评估理由
                    try:
                        eval_lines = eval_response.split('\n')
                        score_line = None
                        reason_line = None
                        
                        for line in eval_lines:
                            if "评分" in line and not score_line:
                                score_line = line
                            elif "评估理由" in line or "理由" in line:
                                reason_idx = eval_lines.index(line)
                                if reason_idx + 1 < len(eval_lines):
                                    reason_line = eval_lines[reason_idx + 1]
                                else:
                                    reason_line = "未提供评估理由"
                        
                        if not score_line:
                            for line in eval_lines:
                                if any(c.isdigit() for c in line):
                                    score_line = line
                                    break
                        
                        # 提取数字评分
                        score = None
                        if score_line:
                            for char in score_line:
                                if char.isdigit() and int(char) >= 1 and int(char) <= 5:
                                    score = int(char)
                                    break
                        
                        if score is None:
                            score = 3  # 默认分数
                            reason = f"无法解析评分，默认设为3分。原始响应: {eval_response[:100]}..."
                        else:
                            reason = reason_line if reason_line else f"评分: {score}，未提供明确理由"
                            
                        result["evaluation_score_by_eval_llm"] = score
                        result["evaluation_reasoning_by_eval_llm"] = reason
                        
                        # 打印评估结果
                        print(f"  用例 #{result['case_index']} 评估结果: 评分={score}, 理由='{reason[:80]}...'")
                        
                    except Exception as e:
                        print(f"解析评估响应时出错: {str(e)}")
                        result["evaluation_score_by_eval_llm"] = 2
                        result["evaluation_reasoning_by_eval_llm"] = f"解析评估失败: {str(e)}。原始响应: {eval_response[:50]}..."
                
                except Exception as e:
                    print(f"调用评估LLM时出错: {str(e)}")
                    result["evaluation_score_by_eval_llm"] = 1
                    result["evaluation_reasoning_by_eval_llm"] = f"评估失败: {str(e)}"
                    result["token_usage"]["evaluation"] = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        
        print(f"评估阶段token使用: {evaluation_tokens_used}, 累计总用量: {self.total_tokens_used}")
        return results
    
    def summarize_evaluation(self, results):
        """总结评估结果"""
        # 计算统计数据
        total_cases = len(results)
        scores = [res["evaluation_score_by_eval_llm"] for res in results if res["evaluation_score_by_eval_llm"] is not None]
        avg_score = sum(scores) / len(scores) if scores else 0
        perfect_scores = sum(1 for s in scores if s == 5)
        
        print(f"\n评估总结:")
        print(f"总用例数: {total_cases}, 平均分: {avg_score:.2f}, 满分用例数: {perfect_scores}/{total_cases}")
        
        # 构建总结提示
        prompt_for_summary = f"""
        以下是对提示词 '{self.current_prompt}' 在多个测试用例上表现的评估汇总：

        总体统计：
        - 测试集模式: {self.test_set["mode"]}
        - 总用例数：{total_cases}
        - 满分（5分）用例数：{perfect_scores}
        - 平均分：{avg_score:.2f}

        各用例评估详情 (摘录部分或全部)：
        """
        
        # 添加部分测试用例的详情
        # 优先添加非满分的用例
        non_perfect_cases = [res for res in results if res["evaluation_score_by_eval_llm"] != 5]
        cases_to_show = non_perfect_cases[:5]  # 最多展示5个非满分用例
        
        # 如果非满分用例不足5个，添加一些满分用例
        if len(cases_to_show) < 5:
            perfect_cases = [res for res in results if res["evaluation_score_by_eval_llm"] == 5]
            cases_to_show.extend(perfect_cases[:5 - len(cases_to_show)])
        
        for res in cases_to_show:
            prompt_for_summary += f"\n- 用例 #{res['case_index']}: 输入='{res['input'][:50]}...', 评分={res['evaluation_score_by_eval_llm']}, 理由='{res['evaluation_reasoning_by_eval_llm'][:100]}...'"

        prompt_for_summary += f"""

        请基于以上评估详情，总结当前提示词的主要优点和缺点。
        特别指出常见的失败模式或需要改进的关键方面。

        总结报告：
        """
        
        # 调用评估LLM获取总结
        try:
            response = invoke_llm(
                model="qwen-plus-1127",  # 评估LLM
                stream=False,
                messages=[
                    {"role": "user", "content": prompt_for_summary}
                ],
            )
            
            # 记录token使用情况
            prompt_tokens = response.usage.prompt_tokens if hasattr(response, 'usage') and hasattr(response.usage, 'prompt_tokens') else 0
            completion_tokens = response.usage.completion_tokens if hasattr(response, 'usage') and hasattr(response.usage, 'completion_tokens') else 0
            total_tokens = response.usage.total_tokens if hasattr(response, 'usage') and hasattr(response.usage, 'total_tokens') else 0
            
            self.total_tokens_used += total_tokens
            print(f"总结阶段token使用: {total_tokens}, 累计总用量: {self.total_tokens_used}")
            
            evaluation_summary_report = response.choices[0].message.content.strip()
            
            # 记录迭代历史
            iteration_record = {
                "iteration": self.iteration_count,
                "prompt": self.current_prompt,
                "results": results,
                "avg_score": avg_score,
                "perfect_score_count": perfect_scores,
                "total_cases": total_cases,
                "summary_report": evaluation_summary_report,
                "token_usage": {
                    "summary": {
                        "prompt_tokens": prompt_tokens,
                        "completion_tokens": completion_tokens, 
                        "total_tokens": total_tokens
                    },
                    "iteration_total": self.total_tokens_used
                }
            }
            
            self.prompt_history.append(iteration_record)
            
            print(f"\n总结报告: {evaluation_summary_report[:200]}...")
            
            return evaluation_summary_report, avg_score, perfect_scores, total_cases
            
        except Exception as e:
            print(f"生成评估总结时出错: {str(e)}")
            error_summary = f"生成总结失败: {str(e)}"
            
            # 记录迭代历史（即使有错误）
            iteration_record = {
                "iteration": self.iteration_count,
                "prompt": self.current_prompt,
                "results": results,
                "avg_score": avg_score,
                "perfect_score_count": perfect_scores,
                "total_cases": total_cases,
                "summary_report": error_summary,
                "token_usage": {
                    "summary": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
                    "iteration_total": self.total_tokens_used
                }
            }
            
            self.prompt_history.append(iteration_record)
            
            return error_summary, avg_score, perfect_scores, total_cases
    
    def get_user_feedback(self):
        """在交互模式下获取用户反馈"""
        if not self.human_feedback:
            return None
        
        print("\n" + "-" * 50)
        print(f"迭代 {self.iteration_count} 完成。")
        print(f"请输入您对提示词的优化建议 (直接输入建议内容)，或输入:")
        print("'S' (或直接回车) - 跳过建议，让评估LLM自动优化")
        print("'Q' - 退出优化流程")
        
        user_input = input("您的输入: ").strip()
        
        if user_input.upper() == 'Q':
            print("用户选择退出优化流程")
            raise KeyboardInterrupt()
        elif user_input == '' or user_input.upper() == 'S':
            return None
        else:
            return user_input
    
    def optimize_prompt(self, evaluation_summary, user_feedback=None):
        """根据评估结果优化提示词"""
        print(f"\n优化提示词...")
        
        # 获取表现较差的用例
        low_scoring_cases = []
        for record in self.prompt_history[-1]["results"]:
            if record["evaluation_score_by_eval_llm"] <= 4:
                low_scoring_cases.append(record)
        
        # 如果没有低分用例但仍有用例未达到满分，添加一些代表性用例
        if not low_scoring_cases and self.prompt_history[-1]["perfect_score_count"] < self.prompt_history[-1]["total_cases"]:
            for record in self.prompt_history[-1]["results"]:
                if record["evaluation_score_by_eval_llm"] < 5:
                    low_scoring_cases.append(record)
                    if len(low_scoring_cases) >= 3:
                        break
        
        # 构建优化提示
        prompt_for_optimization = f"""
        当前正在优化的提示词如下：
        原始提示词：
        '{self.current_prompt}'

        该提示词在测试中的表现总结如下 (测试集模式: {self.test_set["mode"]}):
        {evaluation_summary}

        以下是一些表现不佳的用例详情 (例如，评分为4分及以下，或在strict模式下不匹配的用例)：
        """
        
        # 添加低分用例详情
        for i, case in enumerate(low_scoring_cases[:5]):  # 最多添加5个低分用例
            prompt_for_optimization += f"""
            用例 #{i+1}:
            - 输入: '{case["input"]}'
            - 期望输出: '{case["expected_guideline_or_output"]}'
            - 实际输出: '{case["actual_output_by_target_llm"]}'
            - 评分: {case["evaluation_score_by_eval_llm"]}
            - 评估理由: '{case["evaluation_reasoning_by_eval_llm"]}'
            """

        # 添加用户反馈（如果有）
        if user_feedback:
            prompt_for_optimization += f"""
            用户提供了以下优化建议：
            '{user_feedback}'
            请务必结合用户的建议进行优化。
            """

        prompt_for_optimization += """
        请基于以上信息，对原始提示词进行优化，生成一个新版本的提示词，旨在解决已发现的问题并提高整体表现。
        请仅返回优化后的新提示词内容，不要包含其他解释性文字或标记。

        优化后的新提示词：
        """
        
        # 调用评估LLM优化提示词
        try:
            response = invoke_llm(
                model="qwen-plus-1127",  # 评估LLM
                stream=False,
                messages=[
                    {"role": "user", "content": prompt_for_optimization}
                ],
            )
            
            new_prompt = response.choices[0].message.content.strip()
            
            # 清理可能的多余前缀/后缀
            lines = new_prompt.split("\n")
            cleaned_lines = []
            capture = False
            
            for line in lines:
                # 跳过可能的标题行
                if not capture and ("优化后的新提示词" in line or "新提示词" in line):
                    capture = True
                    continue
                
                if capture:
                    cleaned_lines.append(line)
            
            # 如果通过上面的方法无法获得有效结果，则使用原始响应
            if not cleaned_lines:
                return new_prompt
            
            return "\n".join(cleaned_lines)
            
        except Exception as e:
            print(f"优化提示词时出错: {str(e)}")
            # 出错时返回原始提示词
            return self.current_prompt
    
    def optimize(self):
        """执行完整的优化流程"""
        all_perfect = False
        
        while self.iteration_count <= self.max_iterations and not all_perfect:
            print(f"\n{'='*30} 迭代 #{self.iteration_count} {'='*30}")
            
            # 步骤1: 执行测试
            current_results = self.execute_tests()
            
            # 步骤2: 评估结果
            evaluated_results = self.evaluate_results(current_results)
            
            # 步骤3: 总结评估
            summary, avg_score, perfect_count, total_cases = self.summarize_evaluation(evaluated_results)
            
            # 保存检查点
            self.save_checkpoint()
            
            # 检查是否全部满分
            all_perfect = (perfect_count == total_cases)
            
            if all_perfect:
                print("\n恭喜！所有测试用例均已达到满分!")
                break
                
            if self.iteration_count >= self.max_iterations:
                print(f"\n已达到最大迭代次数 ({self.max_iterations})，优化流程结束")
                break
            
            # 获取用户反馈
            user_feedback = self.get_user_feedback()
            
            # 优化提示词
            new_prompt = self.optimize_prompt(summary, user_feedback)
            
            # 准备下一次迭代
            self.current_prompt = new_prompt
            self.iteration_count += 1
            
            print(f"\n新提示词已生成: '{new_prompt[:100]}...'")
            
        # 返回最终优化的提示词
        final_result = self.current_prompt
        
        # 验证最终结果是否比初始提示词有更好的性能
        if self.prompt_history:
            initial_score = self.prompt_history[0]["avg_score"] if self.prompt_history[0]["avg_score"] else 0
            final_score = self.prompt_history[-1]["avg_score"] if self.prompt_history[-1]["avg_score"] else 0
            
            if final_score > initial_score:
                print(f"\n优化成功! 平均分数从 {initial_score:.2f} 提升到 {final_score:.2f}")
            else:
                print(f"\n警告: 优化可能未能提高性能。初始分数: {initial_score:.2f}, 最终分数: {final_score:.2f}")
        
        return final_result

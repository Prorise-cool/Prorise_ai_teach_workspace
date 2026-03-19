"""
Copyright (c) 2025 lynkframe. All rights reserved.
This file is part of 帧合智创.

Commercial License - Proprietary Software
Unauthorized copying, distribution, or modification is prohibited.
Contact: support@lynkframe.com
"""
import asyncio
import logging
import os
import httpx
import json
from typing import Dict, List, Optional, Union,Any
from pydantic import BaseModel
from .json_fix import try_parse_json_object
import re
import yaml

from dotenv import load_dotenv
load_dotenv()


class Message(BaseModel):
    role: str
    content: Union[str, List[Dict[str, Any]]]


# 加载配置文件
with open('config.yaml', 'r', encoding='utf-8') as file:
    model_config = yaml.safe_load(file)

# 提供非流式调用
class AIModel:
    def __init__(self,agent:str=None, std_model_name:str=None,system_prompt:str=''):
        global model_config
        
        # 输入std_model_name或者agent_name即可，平台与model_name根据配置文件自动配置
        if not agent and not std_model_name:
            logging.error("AIModel类初始化时，agent与std_model_name至少需要提供一个")
        if agent:
            std_model_name = model_config['agents'][agent]['model']
        
        self.platform = model_config['models'][std_model_name][0]['platform']
        
        # 初始化时要选择模型，设置系统提示词
        self.url = os.getenv(self.platform+"_BASE_URL_ORIGINAL")

        self.system_prompt = system_prompt
        self.model_name = model_config['models'][std_model_name][0]['model_name']
        self.kwargs = {}
        if system_prompt != '':
            if std_model_name=="visual_model":
                self.message_history = [Message(role="system", content=[{"type":"text","text":self.system_prompt}])]
            else:
                self.message_history = [Message(role="system", content=self.system_prompt)]
        else:
            self.message_history = []
        self.reasoning_content = "" # 存储当前消息的思考内容（对于思考模型）

        self.agent = agent
        self.std_model_name = std_model_name
 
        
    def set_params(self, **kwargs):
        self.kwargs = kwargs
    def refresh_model_config(self):
        # 刷新模型配置
        global model_config
        
        # 输入std_model_name或者agent_name即可，平台与model_name根据配置文件自动配置
        if not self.agent and not self.std_model_name:
            logging.error("AIModel类初始化时，agent与std_model_name至少需要提供一个")
        if self.agent:
            self.std_model_name = model_config['agents'][self.agent]['model']
        
        self.platform = model_config['models'][self.std_model_name][0]['platform']
        
        # 初始化时要选择模型，设置系统提示词
        self.url = os.getenv(self.platform+"_BASE_URL_ORIGINAL")
        self.model_name = model_config['models'][self.std_model_name][0]['model_name']

    def _get_headers(self) -> Dict[str, str]:
       
        self.key = os.getenv(f'{self.platform}_API_KEY')
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.key}"
        }


    def _get_payload(self, messages: List[Message],stream:bool) -> Dict:       
        return {
            "model": self.model_name,
            "messages": [msg.model_dump() for msg in messages],
            "stream": stream,
            **self.kwargs
        }
    
    
        
    # 非流式请求，自定义上下文
    async def send_msg_custom_history(self, message: str, context: Optional[List[Dict]] = None) -> str:
        """
        message:当前准备发送的消息
        context:自定义传入历史聊天上下文，不包括当前准备发送的消息
        
        """
        # 加入系统提示词
        if self.system_prompt != '':
            messages = [Message(role="system", content=self.system_prompt)]
        else:
            messages = []

        if context:
            messages.extend(Message(**msg) for msg in context)
        messages.append(Message(role="user", content=message))

        # 发送消息
        response = await self._send(messages)
        
        return self._extract_response(response)
    

    # 流式请求
    async def send_msg_custom_history_stream(self, context: List[Dict]):
        """
        message:当前准备发送的消息
        context:自定义传入历史聊天上下文，不包括当前准备发送的消息
        """
        # 加入系统提示词
        messages = [Message(role="system", content=self.system_prompt)]

        if context:
            messages.extend(Message(**msg) for msg in context)
        
        try:
           
            async with httpx.AsyncClient() as client:
                 async with client.stream('POST',self.url, json=self._get_payload(messages,True), headers=self._get_headers()) as response:
                    pos = 0 # 记录输出到的位置
                    async for line in response.aiter_lines():
                        
                        if line.startswith('data:'):
                            try:
                                text_data = line[len(b'data: '):].strip()
                                # 检查是否是 [DONE] 标记
                                if text_data == "[DONE]":
                                    continue
                                json_data = json.loads(text_data)
                               
                                if self.platform == "YI":
                                    current_content = json_data['content'][pos:]
                                    pos = len(json_data['content'])
                                    yield current_content
                                else:
                                    yield json_data['choices'][0]['delta']['content']
                            except json.JSONDecodeError:
                                continue  # 跳过无法解析的行
                            except KeyError:
                                continue
        except Exception as e:
            yield f"Error: {str(e)}"



    async def send_msg(self,message):
       
        """发送消息并保持对话历史"""
        self.message_history.append(Message(role="user", content=message))
        response = await self._send(self.message_history)
        res_content = self._extract_response(response)
        self.message_history.append(Message(role="assistant", content=res_content))

        return res_content
    
    

    async def send_msg_multi(self, message: str, num: int):
        """
        并行发送多条相同的消息（异步版本），默认不会保存对话上下文
        
        Args:
            message: 要发送的消息内容
            num: 需要同时发送的消息数量
        
        Returns:
            List[Any]: 包含所有消息响应的列表
        """
        
        # 创建多个异步任务
        tasks = [
            self.send_msg_custom_history(message)
            for _ in range(num)
        ]
        
        try:
            # 并行执行所有任务并等待所有结果
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # 处理结果，将异常转换为None
            processed_results = []
            for result in results:
                if isinstance(result, Exception):
                    print(f"发送消息时发生错误: {result}")
                    processed_results.append(None)
                else:
                    processed_results.append(result)
                    
            return processed_results
            
        except Exception as e:
            print(f"执行过程中发生错误: {e}")
            return [None] * num
        
    async def text_to_code(self,task,msg):
        '''
        将视频描述文本转成Manim代码
        '''
        
        ai_response_content = await self.send_msg(msg) # 保存上下文

        code = self.extract_code(ai_response_content)
        
        return code


    async def send_msg_vl(self,msg:str,imgs:list=[],memory:bool=True):
        '''
        支持视觉的模型对话，默认保存上下文
        msg: 消息
        img: url或者base64，列表，可以传多张,其中base64要求已经添加好前缀
            PNG图像：  f"data:image/png;base64,{base64_image}"
            JPEG图像： f"data:image/jpeg;base64,{base64_image}"
            WEBP图像： f"data:image/webp;base64,{base64_image}"
        memory: 是否保存上下文
        '''
        if not memory:
            # 刷新消息列表
            if self.system_prompt != '':
                self.message_history = [Message(role="system", content=[{"type":"text","text":self.system_prompt}])]
            else:
                self.message_history = []

        # 添加新消息
        all_content = []
        for img in imgs:
            all_content.append({"type":"image_url","image_url":{"url":img}})
        all_content.append({"type":"text","text":msg})
        self.message_history.append(Message(role="user", content=all_content))
        response = await self._send(self.message_history)
        res_content = self._extract_response(response)
        if memory:
            # 保存ai回复
            self.message_history.append(Message(role="assistant", content=[{"type":"text","text":res_content}]))

        return res_content
            


    async def _send(self, messages, max_retries: int = 3) -> Optional[httpx.Response]:
        retries = 0
        response = None
        model_options_len = len(model_config['models'][self.std_model_name])
        max_retries = max(3,model_options_len)
        while retries < max_retries:
            try:
                
                async with httpx.AsyncClient(timeout=1200.0) as client:
                    response = await client.post(
                        url=self.url,
                        json=self._get_payload(messages,False),
                        headers=self._get_headers()
                    )
                    response.raise_for_status()
                    return response
                    
            except Exception as e:
                retries += 1
                # 请求出错应该自动切换其它平台,切换self.url、self.platform和self.model_name就可以了，都是openai协议
                model_index = min(retries,model_options_len-1) # retries从1开始增加
                self.platform = model_config['models'][self.std_model_name][model_index]['platform']
                self.model_name = model_config['models'][self.std_model_name][model_index]['model_name']
          
                self.url = os.getenv(self.platform+"_BASE_URL_ORIGINAL")
                
                if retries < max_retries:
                    # 使用指数退避策略，每次重试等待时间翻倍
                    wait_time = 2 ** retries  # 1秒、2秒、4秒
            
                    error_msg = f"Request failed: {response.text if response else str(e)}, retrying in {wait_time} seconds..."
                    logging.error(error_msg)
                    await asyncio.sleep(wait_time)
                
        # 所有重试都失败后，抛出最后一次的异常
        raise RuntimeError(f"API request failed after {max_retries} attempts: {str(response.text)}")


    def _extract_response(self, response):
        # 提取回复
        data = response.json()
        self.reasoning_content = data['choices'][0]['message'].get('reasoning_content','')
        return data['choices'][0]['message']['content']


    def clear_chat(self):
        # 清空聊天记录
        if self.system_prompt != '':
            self.message_history = [Message(role="system", content=self.system_prompt)]
        else:
            self.message_history = []


    async def trans_json(self,content_str):
        # 将输入的JSON字符串内容转成字典
        d = None
        try:
            d = try_parse_json_object(content_str)
            d = d[1]
        except Exception as e:
            # 在这里增加重试，要求AI用标准的JSON输出
            print(f"内容{content_str}转成字典失败，错误信息{e}")
            # 重试一次就可以了，因为一般AI看到这句话就会改过来
            if self.message_history[-1].role != "assistant":
                # 说明没有保存AI对话上下文，保存一下
                self.message_history.append(Message(role="assistant", content=content_str))
            prompt = f"你之前的回答格式不是JSON格式，请严格按照JSON格式输出！错误信息{e}"
            self.message_history.append(Message(role="user", content=prompt))
            response = await self._send(self.message_history)
            res_content = self._extract_response(response)
            res_content_dict = try_parse_json_object(res_content) # 再报错上级进行异常捕获
            return res_content_dict[1]
        return d


    def extract_code(self,prompt):
        # 定义正则表达式模式
        python_pattern = r"```python\n(.*?)\n```"

        # 搜索并提取所有匹配的部分
        python_matches = re.findall(python_pattern, prompt, re.DOTALL)

        if python_matches:
            # 返回最长的代码块
            return max(filter(lambda x:x is not None,python_matches),key=len)
        elif prompt.startswith("{"):
            return prompt
        else:
            return prompt

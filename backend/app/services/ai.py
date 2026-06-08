import os
import json
import re
from typing import Optional, Any, Dict
from app.core.config import settings

class AIService:
    def __init__(self):
        self.default_provider = settings.DEFAULT_AI_PROVIDER
        
        # Init Gemini
        self.gemini_key = settings.GEMINI_API_KEY
        if self.gemini_key:
            import google.generativeai as genai
            genai.configure(api_key=self.gemini_key)
            
        # Init OpenAI & Groq
        self.openai_key = settings.OPENAI_API_KEY
        self.groq_key = settings.GROQ_API_KEY

    def _get_provider(self, provider: Optional[str] = None) -> str:
        prov = provider or self.default_provider
        # Fallbacks if keys are not present
        if prov == "gemini" and not self.gemini_key:
            if self.openai_key:
                return "openai"
            elif self.groq_key:
                return "groq"
        elif prov == "openai" and not self.openai_key:
            if self.gemini_key:
                return "gemini"
            elif self.groq_key:
                return "groq"
        elif prov == "groq" and not self.groq_key:
            if self.gemini_key:
                return "gemini"
            elif self.openai_key:
                return "openai"
        return prov

    def generate_completion(
        self, 
        prompt: str, 
        provider: Optional[str] = None, 
        system_instruction: Optional[str] = None
    ) -> str:
        provider = self._get_provider(provider)
        
        if provider == "openai":
            return self._call_openai(prompt, system_instruction)
        elif provider == "groq":
            return self._call_groq(prompt, system_instruction)
        else:
            # Default is Gemini
            return self._call_gemini(prompt, system_instruction)

    def generate_json(
        self, 
        prompt: str, 
        provider: Optional[str] = None, 
        system_instruction: Optional[str] = None
    ) -> Dict[str, Any]:
        provider = self._get_provider(provider)
        json_prompt = prompt + "\n\nCRITICAL: Return ONLY valid, raw, parseable JSON. Do not include markdown wraps (like ```json) or trailing text. The root element must be a JSON object or array."
        
        response_text = self.generate_completion(json_prompt, provider, system_instruction)
        
        try:
            # Try to parse directly
            return json.loads(self._clean_json_string(response_text))
        except Exception as e:
            # Try regex extraction
            match = re.search(r"(\{.*\}|\[.*\])", response_text, re.DOTALL)
            if match:
                try:
                    return json.loads(self._clean_json_string(match.group(0)))
                except:
                    pass
            raise ValueError(f"AI response did not return parseable JSON. Response content: {response_text}. Error: {e}")

    def _call_gemini(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        import google.generativeai as genai
        
        model_name = "gemini-2.5-flash"
        
        config = {}
        if system_instruction:
            # Newer versions of SDK support system_instruction directly in GenerativeModel
            model = genai.GenerativeModel(
                model_name=model_name,
                system_instruction=system_instruction
            )
        else:
            model = genai.GenerativeModel(model_name=model_name)
            
        response = model.generate_content(prompt)
        return response.text

    def _call_openai(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        from openai import OpenAI
        client = OpenAI(api_key=self.openai_key)
        
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})
        
        response = client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=messages,
            temperature=0.2
        )
        return response.choices[0].message.content

    def _call_groq(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        from openai import OpenAI
        # Groq conforms to the OpenAI API spec
        client = OpenAI(
            api_key=self.groq_key,
            base_url="https://api.groq.com/openai/v1"
        )
        
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})
        
        response = client.chat.completions.create(
            model="mixtral-8x7b-32768",
            messages=messages,
            temperature=0.2
        )
        return response.choices[0].message.content

    def _clean_json_string(self, text: str) -> str:
        """Cleans common LLM formatting issues from JSON text."""
        cleaned = text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        return cleaned.strip()

ai_service = AIService()

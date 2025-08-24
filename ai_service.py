# ai_service.py
import os
import openai
# Assuming deepseek-llm is the library name, adjust if different.
# For now, we'll use the OpenAI client with DeepSeek's base_url.
# import deepseek_llm as deepseek # Uncomment and use if a dedicated SDK exists

def generate_text(model_choice: str, prompt: str, openai_key: str = None, deepseek_key: str = None, temperature: float = 0.7) -> str:
    """
    Generates text using the specified AI model.

    Args:
        model_choice: 'openai' or 'deepseek'.
        prompt: The text prompt for the AI.
        openai_key: The OpenAI API key.
        deepseek_key: The DeepSeek API key.
        temperature: The sampling temperature for text generation.

    Returns:
        The generated text content.

    Raises:
        ValueError: If a required API key is missing or model_choice is unknown.
        RuntimeError: If there's an error during the API call.
    """
    generated_content = ""

    if model_choice == "openai":
        if not openai_key:
            raise ValueError("OpenAI API key is missing for 'openai' model.")
        try:
            client = openai.OpenAI(api_key=openai_key)
            response = client.chat.completions.create(
                model="gpt-4o", # Or "gpt-4-turbo", "gpt-3.5-turbo"
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=temperature
            )
            generated_content = response.choices[0].message.content
        except openai.APIError as e:
            raise RuntimeError(f"OpenAI API error: {e}")
        except Exception as e:
            raise RuntimeError(f"An unexpected error occurred with OpenAI: {e}")

    elif model_choice == "deepseek":
        if not deepseek_key:
            raise ValueError("DeepSeek API key is missing for 'deepseek' model.")
        try:
            # DeepSeek API is often compatible with OpenAI's client, just with a different base_url
            deepseek_client = openai.OpenAI(
                api_key=deepseek_key,
                base_url="https://api.deepseek.com/v1" # DeepSeek's specific base URL
            )
            response = deepseek_client.chat.completions.create(
                model="deepseek-chat", # DeepSeek's chat model name
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=temperature
            )
            generated_content = response.choices[0].message.content
            
            # If a dedicated DeepSeek SDK exists and you installed it (e.g., deepseek-llm)
            # You would use it like this:
            # deepseek_client = deepseek.DeepSeekClient(api_key=deepseek_key)
            # response = deepseek_client.chat(model="deepseek-chat", messages=[{"role": "user", "content": prompt}])
            # generated_content = response.text

        except Exception as e: # Catch their specific error types if available
            raise RuntimeError(f"DeepSeek API error: {e}")

    else:
        raise ValueError(f"Unknown AI model choice: {model_choice}")

    return generated_content

# --- Local Testing Block (for debugging ai_service.py directly) ---
if __name__ == '__main__':
    # For local testing, ensure you have a .env file with OPENAI_API_KEY and DEEPSEEK_API_KEY
    from dotenv import load_dotenv
    load_dotenv() # Load local .env variables

    openai_test_key = os.getenv("OPENAI_API_KEY")
    deepseek_test_key = os.getenv("DEEPSEEK_API_KEY")

    print("\n--- Testing AI Service Locally ---")

    if not openai_test_key:
        print("WARNING: OPENAI_API_KEY not found in local environment or .env. Skipping OpenAI test.")
    else:
        try:
            print("\nTesting OpenAI (GPT-4o)...")
            openai_result = generate_text("openai", "Write a short, uplifting haiku about new beginnings.", openai_test_key, None)
            print(f"OpenAI Result:\n{openai_result}\n")
        except Exception as e:
            print(f"OpenAI test failed: {e}")

    if not deepseek_test_key:
        print("WARNING: DEEPSEEK_API_KEY not found in local environment or .env. Skipping DeepSeek test.")
    else:
        try:
            print("\nTesting DeepSeek (deepseek-chat)...")
            deepseek_result = generate_text("deepseek", "Describe the feeling of fresh spring rain in two sentences.", None, deepseek_test_key)
            print(f"DeepSeek Result:\n{deepseek_result}\n")
        except Exception as e:
            print(f"DeepSeek test failed: {e}")
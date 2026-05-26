from flask import Flask, request, jsonify
from groqchat import config, getGroqClient
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.DEBUG)

@app.route('/generate', methods=['POST'])
def generate():
    data = request.json
    logging.debug(f"Received request data: {data}")
    chunks = data.get('chunks', [])
    user_prompt = data.get('userPrompt', '')

    messages = [{"role": "system", "content": config.systemMessage_groq}] + [{"role": "system", "content": chunk} for chunk in chunks]
    messages.append({"role": "user", "content": user_prompt})

    try:
        completion = getGroqClient().chat.completions.create(
            model=config.groqApi_chat_model,
            messages=messages,
            temperature=config.llmTemperature,
            max_tokens=config.groqApi_max_tokens,
            n=1,
            stream=False,
            **config.groqApi_chat_model_additional_chat_options,
        )
        response = completion.choices[0].message.content  # Correctly access the response content
        logging.debug(f"Generated response: {response}")
        return jsonify({"response": response})
    except Exception as e:
        logging.error(f"Error generating response: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)

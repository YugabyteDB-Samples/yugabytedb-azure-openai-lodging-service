const { OpenAI } = require("openai");

class OpenAIChatService {
    #openai;

    constructor() { }

    connect() {
        this.#openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    async searchPlaces(prompt) {
        const chatCompletion = await this.#openai.chat.completions.create({
            messages: [
                {
                    role: "system", content:
                        "You're a helpful assistant that helps to find lodging. Suggest three options. Send back a JSON object in the format below." +
                        "[{\"name\": \"<hotel name>\", \"description\": \"<hotel description>\", \"price\": <hotel price>}]" +
                        "Don't add any other text to the response. Don't add the new line or any other symbols to the response, just the raw JSON."
                },
                {
                    role: "user", content: prompt
                }
            ],
            model: "gpt-4",
        });

        chatCompletion.choices.forEach(choice => {
            console.log(choice)
        });

        const places = JSON.parse(chatCompletion.choices[0].message.content);

        return places;
    }
}

module.exports.OpenAIChatService = OpenAIChatService;
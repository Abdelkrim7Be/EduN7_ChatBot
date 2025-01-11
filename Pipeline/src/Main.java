import java.util.Arrays;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        ChatbotPipeline pipeline = new ChatbotPipeline();
        List<String> chunks = Arrays.asList(
            "This is the first chunk of text.",
            "Here is the second chunk.",
            "And this is the third chunk."
        );
        String userPrompt = "What can you tell me about these texts?";

        String response = pipeline.generateResponse(chunks, userPrompt);
        System.out.println("Chatbot response: " + response);
    }
}

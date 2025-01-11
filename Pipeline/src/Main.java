import java.util.Arrays;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        ChatbotPipeline pipeline = new ChatbotPipeline();
        List<String> chunks = Arrays.asList(
            "The quick brown fox jumps over the lazy dog.",
            "In a distant galaxy, far far away, there was a small planet inhabited by intelligent beings.",
            "Artificial intelligence is transforming the world in unprecedented ways, impacting various industries."
        );
        String userPrompt = "Can you analyze the structure and content of these texts?";

        String response = pipeline.generateResponse(chunks, userPrompt);
        System.out.println(formatResponse(response));
    }

    private static String formatResponse(String response) {
        StringBuilder formattedResponse = new StringBuilder();
        formattedResponse.append("\n=== Chatbot Response ===\n");
        formattedResponse.append(response);
        formattedResponse.append("\n========================\n");
        return formattedResponse.toString();
    }
}

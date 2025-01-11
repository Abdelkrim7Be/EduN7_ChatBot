import java.util.Arrays;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        ChatbotPipeline pipeline = new ChatbotPipeline();
        List<String> chunks = Arrays.asList(
            "Cloud computing provides scalable computing resources over the internet.",
            "Machine learning algorithms can analyze vast amounts of data to identify patterns.",
            "Cybersecurity measures are essential to protect sensitive information from unauthorized access."
        );

        // Static part of the prompt
        String staticPrompt = "Using the provided chunks as context, ";

        // Dynamic part of the prompt
        String dynamicPrompt = "create a cohesive narrative that integrates these concepts without explicitly mentioning them.";

        // Combine the static and dynamic parts
        String userPrompt = staticPrompt + dynamicPrompt;

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

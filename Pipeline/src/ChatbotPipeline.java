import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;

public class ChatbotPipeline {

    public String generateResponse(List<String> chunks, String userPrompt) {
        String formattedRequest = formatRequest(chunks, userPrompt);
        try {
            return sendRequest(formattedRequest);
        } catch (Exception e) {
            return "Error: Unable to get response from the LLM API.";
        }
    }

    private String formatRequest(List<String> chunks, String userPrompt) {
        StringBuilder requestBuilder = new StringBuilder();
        for (String chunk : chunks) {
            requestBuilder.append(chunk).append("\n");
        }
        requestBuilder.append("User: ").append(userPrompt);
        return requestBuilder.toString();
    }

    private String sendRequest(String request) throws Exception {
        URL url = new URL("https://example.com/llm-api");
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setRequestMethod("POST");
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setDoOutput(true);

        try (OutputStream os = connection.getOutputStream()) {
            byte[] input = request.getBytes("utf-8");
            os.write(input, 0, input.length);
        }

        int responseCode = connection.getResponseCode();
        if (responseCode == HttpURLConnection.HTTP_OK) {
            try (BufferedReader br = new BufferedReader(new InputStreamReader(connection.getInputStream(), "utf-8"))) {
                StringBuilder response = new StringBuilder();
                String responseLine;
                while ((responseLine = br.readLine()) != null) {
                    response.append(responseLine.trim());
                }
                return response.toString();
            }
        } else {
            return "Error: Received HTTP " + responseCode;
        }
    }
}

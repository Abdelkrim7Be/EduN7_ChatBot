import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.util.List;
import java.util.Properties;
import java.io.FileInputStream;

public class ChatbotPipeline {

    public ChatbotPipeline() {
        loadEnv();
    }

    private void loadEnv() {
        try (FileInputStream fis = new FileInputStream("../.env")) {
            Properties env = new Properties();
            env.load(fis);
            System.setProperty("GROQ_API_KEY", env.getProperty("GROQ_API_KEY"));
        } catch (Exception e) {
            throw new RuntimeException("Failed to load .env file", e);
        }
    }

    public String generateResponse(List<String> chunks, String userPrompt) {
        String formattedRequest = formatRequest(chunks, userPrompt);
        System.out.println("Formatted request: " + formattedRequest); // Debugging statement
        try {
            return sendRequest(formattedRequest);
        } catch (Exception e) {
            e.printStackTrace(); // Debugging statement
            return "Error: Unable to get response from the LLM API.";
        }
    }

    private String formatRequest(List<String> chunks, String userPrompt) {
        StringBuilder requestBuilder = new StringBuilder();
        requestBuilder.append("{");
        requestBuilder.append("\"chunks\": [");
        for (int i = 0; i < chunks.size(); i++) {
            requestBuilder.append("\"").append(chunks.get(i)).append("\"");
            if (i < chunks.size() - 1) {
                requestBuilder.append(",");
            }
        }
        requestBuilder.append("],");
        requestBuilder.append("\"userPrompt\": \"").append(userPrompt).append("\"");
        requestBuilder.append("}");
        return requestBuilder.toString();
    }

    private String sendRequest(String request) throws Exception {
        URI uri = new URI("http://localhost:5000/generate"); // Ensure this is the correct endpoint
        URL url = uri.toURL();
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setRequestMethod("POST");
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setDoOutput(true);

        try (OutputStream os = connection.getOutputStream()) {
            byte[] input = request.getBytes("utf-8");
            os.write(input, 0, input.length);
        }

        int responseCode = connection.getResponseCode();
        System.out.println("Response code: " + responseCode); // Debugging statement
        if (responseCode == HttpURLConnection.HTTP_OK) {
            try (BufferedReader br = new BufferedReader(new InputStreamReader(connection.getInputStream(), "utf-8"))) {
                StringBuilder response = new StringBuilder();
                String responseLine;
                while ((responseLine = br.readLine()) != null) {
                    response.append(responseLine.trim());
                }
                String formattedResponse = formatResponse(response.toString());
                System.out.println("Formatted response: " + formattedResponse); // Debugging statement
                return formattedResponse;
            }
        } else {
            return "Error: Received HTTP " + responseCode;
        }
    }

    private String formatResponse(String response) {
        // Implement your response formatting logic here
        return response;
    }
}

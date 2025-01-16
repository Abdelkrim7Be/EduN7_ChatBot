package com.abdelkrim.rag_impl.presentation.UIcontrollers;

import javafx.fxml.FXML;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import javafx.stage.FileChooser;
import javafx.scene.input.DragEvent;
import javafx.scene.input.Dragboard;
import javafx.scene.input.TransferMode;
import javafx.util.Duration;
import javafx.animation.PauseTransition;
import javafx.stage.Stage;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.stream.Collectors;

import com.abdelkrim.rag_impl.service.ChromaDB.Chroma;
import com.abdelkrim.rag_impl.service.Document.DocumentHandler2;
import com.abdelkrim.rag_impl.service.pipelineToLLM.ChatbotPipeline;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.store.embedding.EmbeddingMatch;

public class ChatController {
    @FXML private VBox uploadBox;
    @FXML private ScrollPane chatScrollPane;
    @FXML private VBox messageContainer;
    @FXML private TextField messageInput;
    @FXML private TextField documentPath;
    private ChatbotPipeline chatbotPipeline = new ChatbotPipeline();

    @FXML
    private void initialize() {
        uploadBox.setOnDragOver(this::handleDragOver);
        uploadBox.setOnDragDropped(this::handleDragDropped);
    }

    @FXML
    private void handleFileUpload() {
        FileChooser fileChooser = new FileChooser();
        fileChooser.getExtensionFilters().add(
                new FileChooser.ExtensionFilter("PDF Files", "*.pdf")
        );

        List<File> selectedFiles = fileChooser.showOpenMultipleDialog(null);
        if (selectedFiles != null && !selectedFiles.isEmpty()) {
            for (File file : selectedFiles) {
                processFile(file);
            }
            hideUploadBox();
        }
    }

    private void handleDragOver(DragEvent event) {
        if (event.getGestureSource() != uploadBox && event.getDragboard().hasFiles()) {
            event.acceptTransferModes(TransferMode.COPY_OR_MOVE);
        }
        event.consume();
    }

    private void handleDragDropped(DragEvent event) {
        Dragboard db = event.getDragboard();
        boolean success = false;
        if (db.hasFiles()) {
            success = true;
            for (File file : db.getFiles()) {
                processFile(file);
            }
            hideUploadBox();
        }
        event.setDropCompleted(success);
        event.consume();
    }

    private void processFile(File file) {
        try {
            Path targetDir = Paths.get("src/main/resources/com/abdelkrim/rag_impl/view/DOCS");
            Files.createDirectories(targetDir);
            Path targetPath = targetDir.resolve(file.getName());
            Files.copy(file.toPath(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            documentPath.setText(targetPath.toString()); // Store the document path
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private void hideUploadBox() {
        ((Pane) uploadBox.getParent()).getChildren().remove(uploadBox);
        chatScrollPane.setVisible(true);
        chatScrollPane.setManaged(true);
    }

    private void showPopupNotification(String title, String message) {
        Alert alert = new Alert(Alert.AlertType.INFORMATION);
        alert.setTitle(title);
        alert.setHeaderText(null);
        alert.setContentText(message);
        alert.show();

        // Auto close the alert after 2 seconds
        PauseTransition delay = new PauseTransition(Duration.seconds(2));
        delay.setOnFinished(event -> alert.close());
        delay.play();
    }

    @FXML
    private void handleSendMessage() throws Exception {
        String message = messageInput.getText().trim();
        String document = documentPath.getText();
        if (!message.isEmpty() && !document.isEmpty()) {
            System.out.println("User Input: " + message); // Print user input
            System.out.println("Document Path: " + document); // Print document path

            addMessage(message, true);
            messageInput.clear();

            // Extract text content from the document
            try (DocumentHandler2 documentHandler = new DocumentHandler2(new File(document))) {
                String pdfContent = documentHandler.getPdfContent();
                System.out.println("PDF Content extracted successfully!");

                // Split the content into segments and store as embeddings
                String[] delimiters = { "\n" , ","}; // Delimiters for splitting text
                int maxLength = 2000; // Maximum length for each text segment

                List<com.abdelkrim.rag_impl.service.Document.TextSegment> segments = documentHandler.splitText(pdfContent, delimiters, maxLength);
                for (com.abdelkrim.rag_impl.service.Document.TextSegment segment : segments) {
                    String text = segment.getText().trim();
                    if (!text.isEmpty()) {
                        Chroma.addDocuments(text, new dev.langchain4j.data.document.Metadata());
                        // Debugging: Print stored text segments
                        System.out.println("Stored segment: " + text);
                    }
                }

                System.out.println("Text segments stored as embeddings in ChromaDB!");

                // Query ChromaDB for relevant answers
                List<EmbeddingMatch<TextSegment>> results = Chroma.search(message, 5); // Get top 5 results

                // Debugging: Print the results
                System.out.println("Query results:");
                for (EmbeddingMatch<TextSegment> result : results) {
                    System.out.println("Match Text: " + result.embedded().text());
                    System.out.println("Match Score: " + result.score());
                    System.out.println("--------------------------------------------------");
                }

                // Retrieve the top chunk from the results
                EmbeddingMatch<TextSegment> topResult = results.stream()
                                                .sorted((r1, r2) -> Double.compare(r2.score(), r1.score())) // Sort by score in descending order
                                                .findFirst() // Get the top result
                                                .orElse(null);

                if (topResult != null) {
                    // Debugging: Print the top chunk before passing to the pipeline
                    System.out.println("Top chunk before passing to the pipeline:");
                    System.out.println("--------------------------------------------------");
                    System.out.println("Chunk: " + topResult.embedded().text());
                    System.out.println("Score: " + topResult.score());
                    System.out.println("--------------------------------------------------");

                    // Extract the text of the top chunk
                    String topChunk = topResult.embedded().text();

                    // Fetch response from pipeline
                    String response = chatbotPipeline.generateResponse(List.of(topChunk), message);
                    System.out.println("LLM Response: " + response); // Print LLM response

                    // Display the question and response in the chat
                    addMessage("You: " + message, true);
                    addMessage("LLM: " + response, false);
                } else {
                    System.out.println("No relevant chunks found.");
                }

                // Clear all documents from ChromaDB
                Chroma.removeAll();

            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }

    private void addMessage(String content, boolean isUser) {
        Label messageLabel = new Label(content);
        messageLabel.setWrapText(true);
        messageLabel.getStyleClass().add("message-bubble");
        messageLabel.getStyleClass().add(isUser ? "user-message" : "llm-message");

        HBox messageWrapper = new HBox();
        messageWrapper.getChildren().add(messageLabel);
        messageWrapper.setStyle("-fx-alignment: " + (isUser ? "CENTER_RIGHT" : "CENTER_LEFT"));

        messageContainer.getChildren().add(messageWrapper);

        // Auto scroll to bottom
        chatScrollPane.setVvalue(1.0);
    }

    private void simulateLLMResponse() {
        // Simulate a delayed response (replace with actual LLM integration)
        new Thread(() -> {
            try {
                Thread.sleep(1000);
                javafx.application.Platform.runLater(() -> {
                    addMessage("This is a simulated response from the LLM. Replace this with actual PDF-based responses.", false);
                });
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }).start();
    }
}
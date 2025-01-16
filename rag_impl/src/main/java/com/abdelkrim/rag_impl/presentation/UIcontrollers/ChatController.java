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

public class ChatController {
    @FXML private VBox uploadBox;
    @FXML private ScrollPane chatScrollPane;
    @FXML private VBox messageContainer;
    @FXML private TextField messageInput;

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
    private void handleSendMessage() {
        String message = messageInput.getText().trim();
        if (!message.isEmpty()) {
            addMessage(message, true);
            messageInput.clear();

            // Simulate LLM response (replace with actual implementation)
            simulateLLMResponse();
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
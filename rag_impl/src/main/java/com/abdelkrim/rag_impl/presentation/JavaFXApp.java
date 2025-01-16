package com.abdelkrim.rag_impl.presentation;

import javafx.application.Application;
import javafx.fxml.FXMLLoader;
import javafx.scene.Scene;
import javafx.stage.Stage;

public class JavaFXApp extends Application {
    @Override
    public void start(Stage stage) throws Exception {
        // Load the FXML file for the layout

        System.out.println("Hey");
        FXMLLoader loader = new FXMLLoader(getClass().getResource("/com/abdelkrim/rag_impl/view/fxml/chat.fxml"));
        Scene scene = new Scene(loader.load());
        stage.setScene(scene);
        scene.getStylesheets().add(getClass().getResource("/com/abdelkrim/rag_impl/view/css/style.css").toExternalForm());
        stage.setTitle("Chat Application");
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}

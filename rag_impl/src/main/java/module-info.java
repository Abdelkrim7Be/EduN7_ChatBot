module com.abdelkrim.rag_impl {
    requires javafx.controls;
    requires javafx.fxml;


    opens com.abdelkrim.rag_impl to javafx.fxml;
    exports com.abdelkrim.rag_impl;
}
module com.abdelkrim.rag_impl {
    requires javafx.controls;
    requires javafx.fxml;
    requires org.apache.pdfbox;
    requires langchain4j.chroma;
    requires langchain4j.core;
    requires langchain4j.embeddings.all.minilm.l6.v2;
    requires langchain4j.embeddings;


    opens com.abdelkrim.rag_impl to javafx.fxml;

}
package com.abdelkrim.rag_impl;
import com.abdelkrim.rag_impl.ChromaDB.Chroma;
import com.abdelkrim.rag_impl.Document.DocumentHandler2;
import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.store.embedding.EmbeddingMatch;
import dev.langchain4j.data.segment.TextSegment;

import java.io.File;
import java.io.IOException;
import java.net.URISyntaxException;
import java.util.List;

public class TestApp {

    public static void main(String[] args) {
        try {
            // Step 1: Load the PDF document

            String path = TestApp.class.getResource("/com/abdelkrim/rag_impl/Docs/JAVAFX.pdf").toURI().getPath();
            File documentFile = new File(path);
            DocumentHandler2 documentHandler = new DocumentHandler2(documentFile);

            // Step 2: Extract content from the PDF
            String pdfContent = documentHandler.getPdfContent();
            System.out.println("PDF Content extracted successfully!");

            // Step 3: Split the content into segments and store as embeddings
            String[] delimiters = { "." }; // Delimiters for splitting text
            int maxLength = 10000; // Maximum length for each text segment

//            List<TextSegment> segments = documentHandler.splitText(pdfContent, delimiters, maxLength);
//            for (TextSegment segment : segments) {
//                Chroma.addDocuments(segment.text(), new Metadata());
//            }
            Chroma.deleteDocuments();
            System.out.println("Text segments stored as embeddings in ChromaDB!");

            // Step 4: Query ChromaDB for relevant answers
            String query = "What is JavaFX, and when did it become the official library for graphical interfaces in Java?";
            List<EmbeddingMatch<TextSegment>> results = Chroma.search(query, 5); // Get top 5 results

            // Step 5: Print the results
            System.out.println("Query Results:");
            for (EmbeddingMatch<TextSegment> result : results) {
                System.out.println("Match Text: " + result.embedded().text());
                System.out.println("Match Score: " + result.score());
                System.out.println("--------------------------------------------------");
            }

        } catch (IOException e) {
            System.err.println("Error handling the document: " + e.getMessage());
        } catch (URISyntaxException e) {
            throw new RuntimeException(e);
        }
    }
}

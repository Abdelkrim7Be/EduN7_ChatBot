package com.abdelkrim.rag_impl.presentation;

import com.abdelkrim.rag_impl.service.ChromaDB.Chroma;
import com.abdelkrim.rag_impl.service.Document.DocumentHandler2;
import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.store.embedding.EmbeddingMatch;
import dev.langchain4j.data.segment.TextSegment;
import com.abdelkrim.rag_impl.service.pipelineToLLM.ChatbotPipeline;

import java.io.File;
import java.io.IOException;
import java.net.URISyntaxException;
import java.util.List;
import java.util.stream.Collectors;

public class AppConsole {

    public static void main(String[] args) {
        try {
            // Step 1: Load the PDF document
            String path = AppConsole.class.getResource("/com/abdelkrim/rag_impl/Docs/JAVAFX.pdf").toURI().getPath();
            File documentFile = new File(path);
            DocumentHandler2 documentHandler = new DocumentHandler2(documentFile);

            // Step 2: Extract content from the PDF
            String pdfContent = documentHandler.getPdfContent();
            System.out.println("PDF Content extracted successfully!");

            // Step 3: Split the content into segments and store as embeddings
            String[] delimiters = { "\n" , ","}; // Delimiters for splitting text
            int maxLength = 2000; // Maximum length for each text segment

            // Uncomment the following lines if you need to store the segments in ChromaDB
            List<com.abdelkrim.rag_impl.service.Document.TextSegment> segments = documentHandler.splitText(pdfContent, delimiters, maxLength);
            for (com.abdelkrim.rag_impl.service.Document.TextSegment segment : segments) {
                String text = segment.getText().trim();
                if (!text.isEmpty()) {
                    Chroma.addDocuments(text, new Metadata());
                    // Debugging: Print stored text segments
                    System.out.println("Stored segment: " + text);
                }
            }
            
            System.out.println("Text segments stored as embeddings in ChromaDB!");

            // Step 4: Query ChromaDB for relevant answers
            String query = "Talk to me about Ethical Considerations of AI";
            List<EmbeddingMatch<TextSegment>> results = Chroma.search(query, 5); // Get top 5 results

            // Debugging: Print the results
            System.out.println("Query results:");
            for (EmbeddingMatch<TextSegment> result : results) {
                System.out.println("Match Text: " + result.embedded().text());
                System.out.println("Match Score: " + result.score());
                System.out.println("--------------------------------------------------");
            }

            // Step 5: Retrieve the chunks from the results
            List<String> chunks = results.stream()
                                         .map(result -> result.embedded().text())
                                         .filter(text -> text != null && !text.trim().isEmpty())
                                         .collect(Collectors.toList());

            // Debugging: Print the chunks before passing to the pipeline
            System.out.println("Chunks before passing to the pipeline:");
            for (String chunk : chunks) {
                System.out.println(chunk);
            }

            // Step 6: Use the ChatbotPipeline to generate a response
            ChatbotPipeline pipeline = new ChatbotPipeline();
            System.out.println("Using model: " + pipeline.getModelName());
            String response = pipeline.generateResponse(chunks, query);

            // Debugging: Print the chunks after passing to the pipeline
            System.out.println("Chunks after passing to the pipeline:");
            for (String chunk : chunks) {
                System.out.println(chunk);
            }

            // Step 7: Print the response
            System.out.println("Chatbot response: " + response);

            // Clear all documents from ChromaDB
            Chroma.removeAll();

        } catch (IOException e) {
            System.err.println("Error handling the document: " + e.getMessage());
        } catch (URISyntaxException e) {
            throw new RuntimeException(e);
        }
    }
}

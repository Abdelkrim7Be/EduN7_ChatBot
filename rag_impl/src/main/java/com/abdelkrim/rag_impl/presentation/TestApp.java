package com.abdelkrim.rag_impl.presentation;

import com.abdelkrim.rag_impl.service.ChromaDB.Chroma;
import com.abdelkrim.rag_impl.service.Document.DocumentHandler;
import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.store.embedding.EmbeddingMatch;

import java.io.File;
import java.net.URISyntaxException;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class TestApp {
    public static void main(String[] args) {
        try {
            // Get the file path
            String path = DocumentHandler.class.getResource("/com/abdelkrim/rag_impl/Docs/ChatPDF.pdf").toURI().getPath();
            File documentFile = new File(path);

            System.out.println("Starting RAG Integration Test...\n");

            // Step 1: Process the PDF document
            try (DocumentHandler docHandler = new DocumentHandler(documentFile)) {
                // Get PDF content
                String content = docHandler.getPdfContent();
                System.out.println("PDF Content (first 200 chars):");
                System.out.println(content.substring(0, Math.min(content.length(), 200)) + "...\n");

                // Split content into paragraphs
                List<TextSegment> paragraphs = docHandler.splitByParagraph(1000, 50);
                System.out.println("Number of paragraphs: " + paragraphs.size());

                // Step 2: Store paragraphs in ChromaDB
                System.out.println("\nStoring paragraphs in ChromaDB...");
                // First, clean existing documents
                Chroma.deleteDocuments();

                // Add each paragraph to ChromaDB with metadata
                for (int i = 0; i < paragraphs.size(); i++) {
                    TextSegment paragraph = paragraphs.get(i);
                    Map<String, Object> metadataMap = new HashMap<>();
                    metadataMap.put("source", documentFile.getName());
                    metadataMap.put("paragraph", String.valueOf(i + 1));

                    Metadata metadata = Metadata.from(metadataMap);
                    Chroma.addDocuments(paragraph.text(), metadata);
                }
                System.out.println("Successfully stored " + paragraphs.size() + " paragraphs\n");

                // Step 3: Perform some test searches
                System.out.println("Performing test searches...\n");

                // Test search queries
                String[] testQueries = {
                        "What is the main topic of this document?",
                        "Can you summarize the key points?",

                };

                for (String query : testQueries) {
                    System.out.println("Query: " + query);
                    List<EmbeddingMatch<TextSegment>> results = Chroma.search(query, 3);

                    System.out.println("Top 3 relevant passages:");
                    for (int i = 0; i < results.size(); i++) {
                        EmbeddingMatch<TextSegment> match = results.get(i);
                        System.out.printf("Match %d (Score: %.4f):%n", i + 1, match.score());
                        System.out.println(match.embedded().text());
                        System.out.println();
                    }
                    System.out.println("-".repeat(80) + "\n");
                }

            } catch (IOException e) {
                System.err.println("Error processing document: " + e.getMessage());
                e.printStackTrace();
            }

        } catch (URISyntaxException e) {
            System.err.println("Error with file path: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
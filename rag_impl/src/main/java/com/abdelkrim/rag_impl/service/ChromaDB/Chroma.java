package com.abdelkrim.rag_impl.service.ChromaDB;

import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.embedding.onnx.allminilml6v2.AllMiniLmL6V2EmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingMatch;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.chroma.ChromaEmbeddingStore;

import java.util.List;

public class Chroma {

    // Ensure Chroma server is running on the provided URL.
    public static final EmbeddingStore<TextSegment> embeddingStore = ChromaEmbeddingStore.builder()
            .baseUrl("http://localhost:8000/")  // Ensure Chroma server is up and running at this URL
            .collectionName("my-collection")
            .build();

    public static EmbeddingModel embeddingModel =  new AllMiniLmL6V2EmbeddingModel();

    public static void addDocuments(String text) {
        // Create a text segment from the provided text
        TextSegment segment = TextSegment.from(text, new Metadata());
        // Generate embedding for the segment
        Embedding embedding = embeddingModel.embed(segment).content();
        // Add the embedding to the Chroma store
        embeddingStore.add(embedding, segment);
    }

    public static void addDocuments(String text, Metadata metadata) {
        // Create a text segment with the given metadata
        TextSegment segment = TextSegment.from(text, metadata);
        // Generate embedding for the segment
        Embedding embedding = embeddingModel.embed(segment).content();
        // Add the embedding to the Chroma store
        embeddingStore.add(embedding, segment);
    }

    public static List<EmbeddingMatch<TextSegment>> search(String query, int maxResults) {
        // Embed the query text
        Embedding queryEmbedding = embeddingModel.embed(query).content();
        // Return the search results with the given maximum number of results
        return embeddingStore.findRelevant(queryEmbedding, maxResults);
    }

    public static void removeAll() {
        embeddingStore.removeAll();
    }

    public static void deleteDocuments(){
        embeddingStore.removeAll();
    }
}

package com.abdelkrim.rag_impl.service.Document;

import java.util.Map;


public class TextSegment {

    private String text;
    private Map<String, Object> metadata;  // Metadata to store extra information related to this text segment

    // Constructor to initialize the text and metadata




    public TextSegment(String text, Map<String, Object> metadata) {
        this.text = text;
        this.metadata = metadata;
    }

    // Constructor to initialize the text without metadata (empty metadata)
    public TextSegment(String text) {
        this.text = text;
        this.metadata = null; // Or initialize with an empty map if preferred
    }

    // Get the text of the segment
    public String getText() {
        return text;
    }

    // Set the text of the segment
    public void setText(String text) {
        this.text = text;
    }

    // Get the metadata associated with this segment
    public Map<String, Object> getMetadata() {
        return metadata;
    }

    // Set the metadata associated with this segment
    public void setMetadata(Map<String, Object> metadata) {
        this.metadata = metadata;
    }

    // Helper method to add a single metadata entry
    public void addMetadata(String key, Object value) {
        if (this.metadata != null) {
            this.metadata.put(key, value);
        }
    }

    @Override
    public String toString() {
        return "TextSegment{" +
                "text='" + text + '\'' +
                ", metadata=" + metadata +
                '}';
    }
}

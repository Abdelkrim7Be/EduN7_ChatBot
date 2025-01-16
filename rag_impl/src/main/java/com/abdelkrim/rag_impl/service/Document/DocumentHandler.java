package com.abdelkrim.rag_impl.service.Document;

import dev.langchain4j.data.document.Document;
import dev.langchain4j.data.document.DocumentSplitter;
import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.data.document.splitter.*;
import dev.langchain4j.data.segment.TextSegment;

import dev.langchain4j.model.Tokenizer;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class DocumentHandler implements AutoCloseable {
    private final File documentFile;
    private final PDDocument doc;
    private String text;

    // Configurable parameters for chunking
    private static final int DEFAULT_MAX_SEGMENT_SIZE = 1024;
    private static final int DEFAULT_OVERLAP = 0;

    public DocumentHandler(File documentFile) throws IOException {
        this.documentFile = documentFile;
        this.doc = PDDocument.load(documentFile);
    }

    /**
     * Extracts text content from PDF document
     */
    public String getPdfContent() throws IOException {
        if (text == null) {
            PDFTextStripper pdfStripper = new PDFTextStripper();
            text = pdfStripper.getText(doc);
        }
        return text;
    }

    /**
     * Splits text by paragraphs with configurable size and overlap
     */
    public List<TextSegment> splitByParagraph(int maxSegmentSize, int overlap) throws IOException {
        Document document = createDocument();
        DocumentSplitter splitter = new DocumentByParagraphSplitter(maxSegmentSize, overlap);
        return splitter.split(document);
    }

    /**
     * Splits text by paragraphs with default parameters
     */
    public List<TextSegment> splitByParagraph() throws IOException {
        return splitByParagraph(DEFAULT_MAX_SEGMENT_SIZE, DEFAULT_OVERLAP);
    }

    /**
     * Splits text into segments with a maximum of 3 lines each
     */
    public List<TextSegment> splitByLines(int maxLines) throws IOException {
        if (text == null) {
            getPdfContent();
        }
        String[] lines = text.split("\r?\n");
        List<TextSegment> segments = new ArrayList<>();
        StringBuilder segmentBuilder = new StringBuilder();
        int lineCount = 0;

        for (String line : lines) {
            if (lineCount < maxLines) {
                segmentBuilder.append(line).append("\n");
                lineCount++;
            } else {
                segments.add(TextSegment.from(segmentBuilder.toString().trim()));
                segmentBuilder.setLength(0);
                segmentBuilder.append(line).append("\n");
                lineCount = 1;
            }
        }

        if (segmentBuilder.length() > 0) {
            segments.add(TextSegment.from(segmentBuilder.toString().trim()));
        }

        return segments;
    }

    /**
     * Splits text line by line with character-based size limits
     */
    public List<TextSegment> splitByLine(int maxSegmentSizeInChars, int maxOverlapSizeInChars) throws IOException {
        Document document = createDocument();
        DocumentSplitter splitter = new DocumentByLineSplitter(maxSegmentSizeInChars, maxOverlapSizeInChars);
        return splitter.split(document);
    }

    /**
     * Splits text line by line with character-based size limits and a subsplitter
     */
    public List<TextSegment> splitByLine(int maxSegmentSizeInChars, int maxOverlapSizeInChars,
                                         DocumentSplitter subSplitter) throws IOException {
        Document document = createDocument();
        DocumentSplitter splitter = new DocumentByLineSplitter(maxSegmentSizeInChars, maxOverlapSizeInChars, subSplitter);
        return splitter.split(document);
    }

    /**
     * Splits text line by line with token-based size limits
     */
    public List<TextSegment> splitByLine(int maxSegmentSizeInTokens, int maxOverlapSizeInTokens,
                                         Tokenizer tokenizer) throws IOException {
        Document document = createDocument();
        DocumentSplitter splitter = new DocumentByLineSplitter(maxSegmentSizeInTokens, maxOverlapSizeInTokens, tokenizer);
        return splitter.split(document);
    }

    /**
     * Splits text line by line with token-based size limits and a subsplitter
     */
    public List<TextSegment> splitByLine(int maxSegmentSizeInTokens, int maxOverlapSizeInTokens,
                                         Tokenizer tokenizer, DocumentSplitter subSplitter) throws IOException {
        Document document = createDocument();
        DocumentSplitter splitter = new DocumentByLineSplitter(maxSegmentSizeInTokens, maxOverlapSizeInTokens,
                tokenizer, subSplitter);
        return splitter.split(document);
    }

    /**
     * Splits text into fixed-size chunks
     */
    public List<TextSegment> splitByFixedSize(int maxSegmentSize, int overlap) throws IOException {
        Document document = createDocument();
        DocumentSplitter splitter = DocumentSplitters.recursive(maxSegmentSize, overlap);
        return splitter.split(document);
    }

    /**
     * Splits text by sentences
     */
    public List<TextSegment> splitBySentence(int maxSegmentSize, int overlap) throws IOException {
        Document document = createDocument();
        DocumentSplitter splitter = new DocumentBySentenceSplitter(maxSegmentSize, overlap);
        return splitter.split(document);
    }

    /**
     * Creates a Document object from the PDF content
     */
    private Document createDocument() throws IOException {
        if (text == null) {
            getPdfContent();
        }
        return Document.from(text, Metadata.from("source", documentFile.getName()));
    }

    /**
     * Gets metadata about the document
     */
    public Metadata getMetadata() {
        return Metadata.from("source", documentFile.getName());
    }

    @Override
    public void close() throws IOException {
        if (doc != null) {
            doc.close();
        }
    }
}
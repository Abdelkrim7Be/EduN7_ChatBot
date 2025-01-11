package com.abdelkrim.rag_impl.Document;

import ma.enset.rag.Document.TextSegment;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class DocumentHandler2 {

    private String path;
    private File documentFile;
    private PDDocument doc;
    private String text;

    public DocumentHandler2(File documentFile) throws IOException {
        this.documentFile = documentFile;
        this.doc = PDDocument.load(documentFile);
    }

    public String getPdfContent() throws IOException {
        PDFTextStripper pdfStripper = new PDFTextStripper();
        text = pdfStripper.getText(doc);
        return text;
    }

    public List<TextSegment> splitText(String pdfContent, String[] delimiters, int maxLength) {
        return recursiveSplit(pdfContent, delimiters, 0, maxLength);
    }

    private List<TextSegment> recursiveSplit(String text, String[] delimiters, int startIndex, int maxLength) {
        List<TextSegment> segments = new ArrayList<>();

        // If the text is small enough, create a single TextSegment
        if (text.length() <= maxLength) {
            Map<String, Object> metadata = new HashMap<>();
            metadata.put("startIndex", startIndex);
            metadata.put("endIndex", startIndex + text.length());
            // Assuming TextSegment constructor accepts text and metadata
            segments.add(new TextSegment(text, metadata));
            return segments;
        }

        // Split by sentences or paragraphs, and also account for the delimiters
        String currentDelimiter = delimiters[0];
        String[] parts = text.split(currentDelimiter);

        int currentIndex = startIndex;
        for (String part : parts) {
            // If the part is too long and there are other delimiters, split it recursively
            if (part.length() > maxLength && delimiters.length > 1) {
                String[] remainingDelimiters = new String[delimiters.length - 1];
                System.arraycopy(delimiters, 1, remainingDelimiters, 0, remainingDelimiters.length);
                segments.addAll(recursiveSplit(part, remainingDelimiters, currentIndex, maxLength));
            } else {
                Map<String, Object> metadata = new HashMap<>();
                metadata.put("startIndex", currentIndex);
                metadata.put("endIndex", currentIndex + part.length());
                // Create a new TextSegment for the current part
                segments.add(new TextSegment(part, metadata));
            }

            // Adjust index for next part
            currentIndex += part.length() + currentDelimiter.length();
        }

        return segments;
    }


    public static void main(String[] args) throws URISyntaxException, IOException {
        // Specify the path to the PDF document
        String path = DocumentHandler2.class.getResource("/com/abdelkrim/rag_impl/Docs/JAVAFX.pdf").toURI().getPath();
        File documentFile = new File(path);

        // Create an instance of DocumentHandler2
        DocumentHandler2 documentHandler = new DocumentHandler2(documentFile);

        // Extract the content from the PDF
        String pdfContent = documentHandler.getPdfContent();

        // Define delimiters for splitting the content
        // We will use line breaks ("\n") and space (" ") as our delimiters for this example
        String[] delimiters = {"\n", " "};
        int maxLength = 1000;  // Max length for each chunk (in characters)

        // Split the document into TextSegment objects
        List<TextSegment> segments = documentHandler.splitText(pdfContent, delimiters, maxLength);

        // Print out each segment's text and metadata
        System.out.println("PDF Content Split into Segments:");
        for (TextSegment segment : segments) {
            System.out.println("Segment Text: " + segment.getText());
            System.out.println("Metadata: " + segment.getMetadata());
            System.out.println("--------------------------------------------------");
        }
    }

}

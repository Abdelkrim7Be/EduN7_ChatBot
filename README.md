# eduN7 - RAG-Based Multimodal Chatbot

eduN7 is an innovative multimodal chatbot designed to deliver precise and contextual responses using a **Retrieval-Augmented Generation (RAG)** architecture. This project integrates advanced natural language processing (NLP) techniques, semantic search, and user-friendly interfaces to transform static documents into interactive resources.

## Features
- **Multimodal Input**: Handles textual questions and provides tailored responses.
- **RAG Architecture**: Combines document retrieval and generative AI for relevant and enriched responses.
- **Flexible Integration**: Supports user-uploaded documents for custom context generation.
- **User-Friendly Interfaces**: Includes both console-based and graphical user interfaces (GUIs).

---

## Technologies Used
- **Frontend**: JavaFX for GUI applications.
- **Backend**: Python Flask and Groqchat for managing LLM interactions.
- **LLM**: Llama 3.2 for text generation.
- **Vector Database**: Chroma for semantic search and embedding storage.
- **Document Processing**: LangChain4J for chunking and embedding generation.

---

## Project Setup

### Prerequisites
1. **Docker** (for Chroma DB)
2. **Python 3.x** (for backend)
3. **Java Development Kit (JDK)** and **Maven** (for JavaFX frontend)

### Installation Steps
1. **Start the Vector Database**
   ```bash
   cd rag_impl
   docker run -p 8000:8000 chromadb/chroma

2. **Start the Backend Server**
   ```bash
   cd LLM/package/groqchat
   python server.py

3. **Compile and Run Console Application**
   ```bash
   cd rag_impl/src/main/java/com/abdelkrim/rag_impl/presentation
   javac AppConsole.java
   java AppConsole

4. **Run JavaFX GUI Application**
   ```bash
   mvn javafx:run -f rag_impl/src/main/java/com/abdelkrim/rag_impl/presentation/JavaFXApp.java


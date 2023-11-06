import "dotenv/config";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { DocxLoader } from "langchain/document_loaders/fs/docx";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { prisma } from "./prisma";

import { createVectorStore } from "./vector";

export const run = async () => {
  try {
    /*load raw docs from all the files in the directory */
    const directoryLoader = new DirectoryLoader(
      "documents",
      {
        ".pdf": (path) => new PDFLoader(path),
        ".docx": (path) => new DocxLoader(path),
        ".txt": (path) => new TextLoader(path),
        ".md": (path) => new TextLoader(path),
        ".mdx": (path) => new TextLoader(path),
        '.*': (path) => new TextLoader(path),
      },
      true
    );

    console.log("Loading documents...");
    const rawDocs = await directoryLoader.load();

    /* Split text into chunks */
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 3000,
      chunkOverlap: 200,
    });

    console.log("Splitting documents...");
    const docs = await textSplitter.splitDocuments(rawDocs);

    console.log("Storing to vector database...", docs);

    const removeNullBytes = (str: string) => {
      return str.replace(/\0/g, "");
    };
    const vectorStore = createVectorStore();
    const documents = await prisma.$transaction(
      docs.map((doc) =>
        prisma.document.create({
          data: { content: removeNullBytes(doc.pageContent) },
        })
      )
    );
    console.log(documents);
    await vectorStore.addModels(documents);
  } catch (error) {
    console.log("error", error);
    throw new Error("Failed to ingest your data");
  }
};

(async () => {
  try {
    // Clear the existing documents from the table
    console.log("Clearing document table...");
    await prisma.document.deleteMany({});
    console.log("Document table cleared.");

    await run();
    console.log("Done");
  } catch (error) {
    console.log("error", error);
    throw new Error("Failed to ingest your data");
  }
})();

import { OpenAI } from "langchain/llms/openai";
import { PrismaVectorStore } from "langchain/vectorstores/prisma";
import { ConversationalRetrievalQAChain } from "langchain/chains";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Prisma, PrismaClient, Document } from "@prisma/client";
import { prisma } from "./prisma";

// const CONDENSE_PROMPT = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

// Chat History:
// {chat_history}
// Follow Up Input: {question}
// Standalone question:`;

// const QA_PROMPT = `Assuming you are the GPT-4 model, please play the role of a Chinese legal expert.
// I will provide a legal scenario, and you need to provide related advice and legal regulations. Please give advice only for this situation. Answer the question based on the specific clauses in the document, using only the information in the document.

// Please note that if there are any updates to the legal regulations, refer to the latest content. Your output must be in Chinese. If you are unsure, or the answer is not clearly written in the document, please reply: "Sorry, I can't help."

// Context: {context}
// Question: {question}
// Please provide an answer:`

// export const makeChain = (vectorstore: PrismaVectorStore<Document, 'Document', any>) => {
//   const model = new OpenAI({
//     temperature: 0.5,
//     modelName: 'gpt-3.5-turbo',
//   }, {
//     basePath: process.env.OPENAI_BASE_URL + '/v1'
//   });

//   const chain = ConversationalRetrievalQAChain.fromLLM(
//     model,
//     vectorstore.asRetriever(),
//     {
//       qaTemplate: QA_PROMPT,
//       // questionGeneratorTemplate: CONDENSE_PROMPT,
//       returnSourceDocuments: true, //The number of source documents returned is 4 by default
//     },
//   );
//   return chain;
// }

export const createVectorStore = (): any => {
  const embeddings = new OpenAIEmbeddings(
    {},
    {
      basePath: "https://api.openai.com/v1",
    }
  );

  const vectorStore = PrismaVectorStore.withModel<Document>(prisma).create(
    embeddings,
    {
      prisma: Prisma,
      tableName: "Document",
      vectorColumnName: "vector",
      columns: {
        id: PrismaVectorStore.IdColumn,
        content: PrismaVectorStore.ContentColumn,
      },
    }
  );

  return vectorStore;
};
